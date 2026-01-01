# Debug: Badge e Contador Não Aparecem

## 🔧 Correções Aplicadas

### 1. Removido Estado `unreadCounts` Duplicado

**ANTES (com bug):**
```tsx
const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({})

const fetchUnreadCounts = async () => {
  const response = await api.get('/conversations/unread-counts')
  setUnreadCounts(response.data.unread_counts || {})
}

// Usava unreadCounts[conversation.id]
const count = unreadCounts[conversation.id] !== undefined
  ? unreadCounts[conversation.id]
  : (conversation.unread_count || 0)
```

**DEPOIS (simplificado):**
```tsx
// Removido estado separado - usar diretamente conversation.unread_count
const unreadCount = conversation.unread_count || 0
const isNew = unreadCount > 0
```

### 2. Simplificado Renderização do Badge

**ANTES:**
```tsx
{(() => {
  const count = unreadCounts[conversation.id] !== undefined
    ? unreadCounts[conversation.id]
    : (conversation.unread_count || 0)
  return count > 0 && (
    <Badge>{count}</Badge>
  )
})()}
```

**DEPOIS:**
```tsx
{unreadCount > 0 && (
  <Badge>{unreadCount}</Badge>
)}
```

### 3. Atualização ao Receber Mensagem

```tsx
// Incrementar contador local para feedback instantâneo
if (activeConversation !== message.conversation_id && !message.is_from_me && message.message_type !== 1) {
  conv.unread_count = (conv.unread_count || 0) + 1
  console.log('[handleNewMessage] Incremented unread_count:', {
    conversationId: conv.id,
    newCount: conv.unread_count
  })
}
```

### 4. Zerar ao Abrir Conversa

```tsx
useEffect(() => {
  if (activeConversation) {
    fetchMessages(activeConversation)

    // Zerar unread_count localmente (feedback imediato)
    setConversations(prev => prev.map(c =>
      c.id === activeConversation ? { ...c, unread_count: 0 } : c
    ))

    setFilteredConversations(prev => prev.map(c =>
      c.id === activeConversation ? { ...c, unread_count: 0 } : c
    ))

    // Marcar como lida no backend
    api.post(`/conversations/${activeConversation}/read`).catch(console.error)
  }
}, [activeConversation])
```

## 🔍 Verificações Necessárias

### 1. Backend Retorna `unread_count`?

Verificar no console do navegador:
```javascript
console.log('[fetchConversations] Loaded conversations:', sortedConversations)
```

Deve mostrar cada conversa com:
- `id`: number
- `unread_count`: number (0 ou maior)
- `last_activity_at`: timestamp

### 2. Conversas Estão Sendo Ordenadas?

O backend já ordena em [conversation_repository.go:38](mensager-go/internal/repository/conversation_repository.go#L38):
```go
Order("conversations.last_activity_at DESC NULLS LAST, conversations.created_at DESC")
```

Frontend também ordena localmente:
```tsx
const sortConversations = (params: Conversation[]) => {
  return [...params].sort((a, b) => {
    const timestampA = a.last_activity_at || a.created_at || new Date(0).toISOString()
    const timestampB = b.last_activity_at || b.created_at || new Date(0).toISOString()
    return new Date(timestampB).getTime() - new Date(timestampA).getTime()
  })
}
```

### 3. Badge Renderiza Corretamente?

```tsx
// Badge "NOVA"
{isNew && (
  <Badge className="h-4 px-1.5 text-[9px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
    NOVA
  </Badge>
)}

// Contador
{unreadCount > 0 && (
  <Badge className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-primary text-white text-[10px] font-bold">
    {unreadCount}
  </Badge>
)}
```

## 🧪 Passos de Debug

### Passo 1: Verificar Console
1. Abra DevTools (F12)
2. Vá para aba Console
3. Recarregue a página
4. Procure por: `[fetchConversations] Loaded conversations:`
5. Verifique se cada conversa tem `unread_count` com valor correto

### Passo 2: Testar Nova Mensagem
1. Receba mensagem via WhatsApp
2. Verifique no console: `[handleNewMessage] Incremented unread_count:`
3. Confirme que `newCount` está incrementando

### Passo 3: Inspecionar Elemento
1. Clique direito no item da conversa
2. "Inspecionar elemento"
3. Procure pelo componente Badge
4. Verifique se `unreadCount > 0` é verdadeiro

## 📊 Possíveis Causas

### Causa 1: Backend não retorna `unread_count`
**Sintoma:** Console mostra `unread_count: undefined` ou `unread_count: null`

**Solução:** Verificar se o campo está no MarshalJSON:
```go
// Em conversation.go - o *Alias já inclui todos os campos
type Alias Conversation
return json.Marshal(&struct {
  *Alias  // ← Isso inclui UnreadCount
  ...
}{
  Alias: (*Alias)(&c),
  ...
})
```

### Causa 2: Timestamp Float64 Confunde Frontend
**Sintoma:** `last_activity_at` é um número grande (ex: 1735599123.0)

**Solução:** Frontend já trata isso corretamente:
```tsx
const timestampA = a.last_activity_at || a.created_at || new Date(0).toISOString()
const dateA = new Date(timestampA).getTime()  // Converte para milliseconds
```

**IMPORTANTE:** Se `last_activity_at` vem como float64 (Unix timestamp em segundos), precisa multiplicar por 1000:
```tsx
// Se timestamp está em segundos (float64 do backend)
const dateA = typeof timestampA === 'number'
  ? timestampA * 1000  // Converter segundos → milliseconds
  : new Date(timestampA).getTime()
```

### Causa 3: Conversa Não Atualiza ao Receber Mensagem
**Sintoma:** Mensagem chega, mas badge não aparece

**Solução:** Verificar se `handleConversationUpdated` está sendo chamado:
```tsx
const handleConversationUpdated = (conversation: Conversation) => {
  console.log('[handleConversationUpdated] Conversation updated:', conversation)

  setConversations(prev => {
    const updated = prev.map(c =>
      c.id === conversation.id ? conversation : c
    )
    return sortConversations(updated)
  })
}
```

## ✅ Checklist de Validação

- [ ] Console mostra conversas com `unread_count` correto
- [ ] Badge "NOVA" aparece quando `unread_count > 0`
- [ ] Contador mostra número correto
- [ ] Conversa move para topo ao receber mensagem
- [ ] Badge desaparece ao abrir conversa
- [ ] Ordenação persiste após recarregar
- [ ] Logs de debug aparecem no console

## 🎯 Próximos Passos

1. **Testar no navegador** - Verificar console e inspecionar elementos
2. **Enviar mensagem de teste** - Via WhatsApp para inbox conectada
3. **Analisar logs** - Conferir todos os console.log adicionados
4. **Reportar achados** - Informar qual causa está ocorrendo
