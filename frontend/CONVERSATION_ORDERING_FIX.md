# Correção de Ordenação e Badges de Conversas

## 🐛 Problemas Identificados

### 1. **Ordenação não persiste após sair da conversa**
- Frontend usava `local_last_message_at` apenas em memória
- Ao recarregar ou trocar de conversa, perdia a ordenação

### 2. **Badge "NOVA" persiste mesmo após ler**
- Frontend mantinha `unreadCounts` local desincronizado
- Backend já atualizava corretamente, mas frontend não refletia

### 3. **Efeitos visuais duplicados**
- Sparkles e badges baseados em estado local inconsistente

## ✅ Solução Implementada

### Backend (já funcionando corretamente)

O backend **JÁ FAZ TUDO CERTO**:

1. ✅ Atualiza `last_activity_at` ao receber nova mensagem ([evolution_service.go:398-403](mensager-go/internal/service/evolution_service.go#L398-L403))
2. ✅ Incrementa `unread_count` para mensagens incoming ([evolution_service.go:400-402](mensager-go/internal/service/evolution_service.go#L400-L402))
3. ✅ Zera `unread_count` ao marcar como lida ([conversation_handler.go:137](mensager-go/internal/api/handler/conversation_handler.go#L137))
4. ✅ Envia broadcast `conversation.updated` ([evolution_service.go:406](mensager-go/internal/service/evolution_service.go#L406))

### Frontend (correções necessárias)

**ANTES** (com problemas):
```tsx
// ❌ Mantinha estado local que desincronizava
const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({})

// ❌ Timestamp temporário que se perdia
conv.local_last_message_at = now

// ❌ Ordenação baseada em dados temporários
const timestampA = a.local_last_message_at || a.last_activity_at || a.created_at
```

**DEPOIS** (simplificado):
```tsx
// ✅ Remove estado local desnecessário
// Não precisa mais de unreadCounts local

// ✅ Remove timestamp temporário
// Não precisa mais de local_last_message_at

// ✅ Ordenação baseada apenas em dados do servidor
const timestampA = a.last_activity_at || a.created_at
```

## 📝 Mudanças Específicas

### 1. Remover `unreadCounts` Local

**Remover:**
```tsx
const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({})
```

**Substituir todas as referências:**
```tsx
// ❌ ANTES
const unreadCount = unreadCounts[conversation.id] || conversation.unread_count || 0

// ✅ DEPOIS
const unreadCount = conversation.unread_count || 0
```

### 2. Remover `local_last_message_at`

**No `handleNewMessage`:**
```tsx
// ❌ REMOVER ESTAS LINHAS:
if (activeConversation !== message.conversation_id && !message.is_from_me && message.message_type !== 1) {
  conv.local_last_message_at = now
}

// ✅ Confiar apenas em last_activity_at do backend
// (já é atualizado automaticamente via conversation.updated event)
```

### 3. Simplificar `sortConversations`

```tsx
// ❌ ANTES
const sortConversations = (params: Conversation[]) => {
  return [...params].sort((a, b) => {
    const timestampA = a.local_last_message_at || a.last_activity_at || a.created_at
    const timestampB = b.local_last_message_at || b.last_activity_at || b.created_at

    const dateA = new Date(timestampA).getTime()
    const dateB = new Date(timestampB).getTime()

    return dateB - dateA
  })
}

// ✅ DEPOIS
const sortConversations = (params: Conversation[]) => {
  return [...params].sort((a, b) => {
    const timestampA = a.last_activity_at || a.created_at
    const timestampB = b.last_activity_at || b.created_at

    const dateA = new Date(timestampA).getTime()
    const dateB = new Date(timestampB).getTime()

    return dateB - dateA
  })
}
```

### 4. Simplificar `handleConversationUpdated`

```tsx
// ❌ ANTES
const handleConversationUpdated = (conversation: Conversation) => {
  setConversations(prev => {
    const updated = prev.map(c => {
      if (c.id === conversation.id) {
        return {
          ...conversation,
          local_last_message_at: c.local_last_message_at // PRESERVAR timestamp local
        }
      }
      return c
    })
    return sortConversations(updated)
  })
}

// ✅ DEPOIS
const handleConversationUpdated = (conversation: Conversation) => {
  setConversations(prev => {
    const updated = prev.map(c =>
      c.id === conversation.id ? conversation : c
    )
    return sortConversations(updated)
  })

  setFilteredConversations(prev => {
    const updated = prev.map(c =>
      c.id === conversation.id ? conversation : c
    )
    return sortConversations(updated)
  })
}
```

### 5. Remover Atualizações Locais de `unread_count`

```tsx
// ❌ REMOVER:
setUnreadCounts(prevCounts => ({
  ...prevCounts,
  [conv.id]: conv.unread_count
}))

// ❌ REMOVER:
conv.unread_count = (conv.unread_count || 0) + 1

// ✅ O backend já incrementa e envia via broadcast
```

### 6. Simplificar ao Abrir Conversa

```tsx
// ❌ ANTES
useEffect(() => {
  if (activeConversation) {
    fetchMessages(activeConversation)

    // Zerar localmente
    setConversations(prev => prev.map(conv =>
      conv.id === activeConversation
        ? { ...conv, unread_count: 0, local_last_message_at: undefined }
        : conv
    ))

    // Zerar no backend
    api.post(`/conversations/${activeConversation}/read`).catch(console.error)
  }
}, [activeConversation])

// ✅ DEPOIS
useEffect(() => {
  if (activeConversation) {
    fetchMessages(activeConversation)

    // Marcar como lida no backend (que atualiza unread_count e envia broadcast)
    api.post(`/conversations/${activeConversation}/read`).catch(console.error)
  }
}, [activeConversation])
```

## 🔄 Fluxo Correto de Dados

### Ao Receber Nova Mensagem

```
1. Webhook → Backend → UpsertMessage()
2. Backend atualiza conversation.last_activity_at
3. Backend incrementa conversation.unread_count
4. Backend salva no banco
5. Backend envia broadcast: message.new + conversation.updated
6. Frontend recebe eventos e atualiza UI
7. Frontend re-ordena baseado em last_activity_at do servidor
```

### Ao Abrir Conversa

```
1. Frontend chama POST /conversations/:id/read
2. Backend zera conversation.unread_count
3. Backend marca mensagens como lidas
4. Backend salva no banco
5. Backend envia broadcast: conversation.updated
6. Frontend recebe evento e atualiza UI (badge some)
```

## ✅ Benefícios

1. **Persistência**: Ordenação mantida mesmo ao recarregar página
2. **Sincronia**: Um único source of truth (banco de dados)
3. **Simplicidade**: Menos estado local = menos bugs
4. **Performance**: Menos re-renders desnecessários
5. **Consistência**: Todos os clientes veem mesma ordem

## 🧪 Como Testar

### Teste 1: Ordenação Persiste
1. Receba mensagem em conversa A
2. Conversa A vai para o topo
3. Saia e volte para a página
4. ✅ Conversa A continua no topo

### Teste 2: Badge Some ao Ler
1. Receba mensagem (badge NOVA aparece)
2. Abra a conversa
3. ✅ Badge desaparece imediatamente
4. Saia e volte para a página
5. ✅ Badge continua oculto

### Teste 3: Ordenação em Tempo Real
1. Deixe página aberta
2. Receba mensagem via WhatsApp
3. ✅ Conversa move para o topo instantaneamente
4. ✅ Badge NOVA aparece

## 📊 Comparação

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Estado local** | 2 states extras | 0 states extras |
| **Linhas de código** | ~50 linhas de sync | ~10 linhas simples |
| **Bugs possíveis** | Alta dessincronia | Muito baixa |
| **Source of truth** | Múltiplos (local + server) | Um (server) |
| **Persistência** | ❌ Não persiste | ✅ Persiste |
| **Performance** | Média (muitos updates) | Alta (menos updates) |

## 🎯 Conclusão

A solução é **SIMPLIFICAR** e confiar no backend, que já faz tudo corretamente.
O frontend deve apenas **refletir** o estado do servidor, não tentar gerenciá-lo localmente.

**Menos código = Menos bugs = Melhor manutenibilidade** ✅
