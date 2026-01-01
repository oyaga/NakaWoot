# 🔄 Dashboard em Tempo Real

## 📋 Resumo

O dashboard agora atualiza automaticamente as estatísticas e atividades recentes quando novas mensagens ou conversas chegam, sem necessidade de recarregar a página ou clicar no botão "Atualizar".

---

## ✨ Funcionalidades Implementadas

### 1. Auto-Atualização de Estatísticas

**Quando atualiza**:
- Nova mensagem recebida (via webhook/SSE)
- Nova conversa criada
- Mudanças em conversas existentes

**O que é atualizado**:
- Total de Inboxes
- Total de Conversas
- Tempo Médio de Resposta
- Tendências (trends)
- Atividades Recentes

### 2. Debouncing Inteligente

**Delay de 2 segundos**: Evita atualizações excessivas quando múltiplas mensagens chegam rapidamente.

**Exemplo**:
```
Mensagem 1 chega → Aguarda 2s
Mensagem 2 chega → Cancela timer anterior, aguarda 2s
Mensagem 3 chega → Cancela timer anterior, aguarda 2s
... 2 segundos sem novas mensagens → Atualiza dashboard UMA VEZ
```

---

## 🔧 Implementação Técnica

### Arquivo Modificado

**`frontend/src/app/dashboard/page.tsx`**

### Mudanças Realizadas

#### 1. Imports Adicionados

```typescript
import { useCallback } from 'react'
import { useConversationStore } from '@/store/useConversationStore'
```

#### 2. Conexão com Store

```typescript
const { conversations, messages } = useConversationStore()
```

#### 3. fetchDashboardStats como useCallback

```typescript
const fetchDashboardStats = useCallback(async () => {
  try {
    setLoading(true)
    const response = await api.get<DashboardStats>('/dashboard/stats')
    setStats(response.data)
  } catch (error) {
    const err = error as { response?: { data?: { error?: string } } }
    toast.error('Erro ao carregar estatísticas', {
      description: err.response?.data?.error || 'Tente novamente mais tarde'
    })
  } finally {
    setLoading(false)
  }
}, [])
```

**Por que useCallback?**
- Previne re-criação da função a cada render
- Permite usar a função como dependência de outros useEffect
- Melhora performance

#### 4. useEffect de Auto-Atualização

```typescript
// Auto-atualizar dashboard quando conversas ou mensagens mudam (tempo real)
useEffect(() => {
  const timeoutId = setTimeout(() => {
    if (!loading && stats) {
      console.log('[Dashboard] Real-time update detected, refreshing stats...')
      fetchDashboardStats()
    }
  }, 2000) // 2 segundos de delay após mudança

  return () => clearTimeout(timeoutId)
}, [conversations.length, messages.length, loading, stats, fetchDashboardStats])
```

**Dependências**:
- `conversations.length`: Detecta quando novas conversas são criadas
- `messages.length`: Detecta quando novas mensagens chegam
- `loading`: Evita atualizar enquanto já está carregando
- `stats`: Evita atualizar quando ainda não há dados
- `fetchDashboardStats`: Referência estável da função

---

## 🎯 Fluxo de Funcionamento

### Cenário 1: Nova Mensagem Recebida

```
1. Webhook/Evolution API recebe mensagem do WhatsApp
   ↓
2. Backend processa e salva no banco
   ↓
3. Trigger SQL atualiza unread_count e last_activity_at
   ↓
4. Backend envia evento SSE: "message.created"
   ↓
5. RealtimeProvider recebe evento
   ↓
6. useConversationStore adiciona mensagem ao array
   ↓
7. messages.length aumenta
   ↓
8. useEffect no Dashboard detecta mudança
   ↓
9. Aguarda 2 segundos (debounce)
   ↓
10. Chama fetchDashboardStats()
    ↓
11. Dashboard atualiza com novos dados
```

### Cenário 2: Conversa Atualizada (Marcar como Lida)

```
1. Usuário clica em "Marcar como lida"
   ↓
2. API atualiza status das mensagens
   ↓
3. Trigger SQL recalcula unread_count
   ↓
4. Backend envia evento SSE: "conversation.updated"
   ↓
5. RealtimeProvider recebe evento
   ↓
6. useConversationStore atualiza conversa
   ↓
7. conversations array é modificado
   ↓
8. useEffect no Dashboard detecta mudança
   ↓
9. Aguarda 2 segundos
   ↓
10. Atualiza estatísticas
```

---

## 📊 Dados que Atualizam Automaticamente

### Total de Conversas
- Aumenta quando nova conversa é criada
- Atualiza tendência (trend)

### Atividades Recentes
- Adiciona novas atividades no topo
- Remove atividades antigas
- Mostra último status de cada conversa

### Tempo Médio de Resposta
- Recalcula baseado em todas as mensagens
- Atualiza tendência

### Total de Inboxes
- Atualiza se novos canais forem adicionados

---

## 🔍 Logs e Debug

### Console Logs

Quando atualização em tempo real acontece:

```
[Dashboard] Real-time update detected, refreshing stats...
```

### Como Testar

1. Abrir Dashboard no navegador
2. Abrir Console (F12 → Console)
3. Enviar mensagem via WhatsApp
4. Aguardar 2 segundos
5. Verificar log no console
6. Verificar se estatísticas atualizaram

---

## ⚙️ Configurações

### Ajustar Delay de Debounce

Para mudar o tempo de espera antes de atualizar:

```typescript
// Localização: frontend/src/app/dashboard/page.tsx linha ~65
}, 2000) // Alterar este valor (em milissegundos)

// Exemplos:
}, 1000)  // 1 segundo (mais rápido, mais requisições)
}, 3000)  // 3 segundos (mais lento, menos requisições)
}, 5000)  // 5 segundos (muito lento)
```

**Recomendação**: 2-3 segundos é ideal para balance entre responsividade e performance.

---

## 🚀 Performance

### Otimizações Implementadas

1. **useCallback**: Evita re-criação de função
2. **Debouncing**: Evita múltiplas requisições
3. **Condições**: Só atualiza se não está loading e stats existe
4. **Cleanup**: Cancela timers pendentes ao desmontar

### Impacto

- **Antes**: Necessário clicar em "Atualizar" manualmente
- **Depois**: Atualiza automaticamente em ~2s após mudanças
- **Requisições extras**: Mínimas (apenas quando há mudanças reais)

---

## 🆘 Troubleshooting

### Problema: Dashboard não atualiza automaticamente

**Verificar**:

1. Console do navegador tem erros?
2. RealtimeProvider está funcionando?
   ```typescript
   // Verificar em: frontend/src/providers/realtime-provider.tsx
   console.log('[SSE] Event received:', event.type)
   ```
3. useConversationStore está recebendo dados?
   ```typescript
   // Adicionar log temporário
   console.log('Conversations:', conversations.length, 'Messages:', messages.length)
   ```

### Problema: Atualiza muito rápido (muitas requisições)

**Solução**: Aumentar delay de debounce para 3000 ou 5000ms

### Problema: Atualiza muito devagar

**Solução**: Diminuir delay de debounce para 1000ms

---

## ✅ Checklist de Testes

- [ ] Dashboard carrega corretamente ao abrir
- [ ] Enviar mensagem via WhatsApp
- [ ] Aguardar 2-3 segundos
- [ ] Verificar se "Atividade Recente" atualizou
- [ ] Verificar se "Total Conversas" atualizou (se nova conversa)
- [ ] Marcar mensagens como lidas
- [ ] Verificar se estatísticas refletem mudança
- [ ] Verificar log no console: `[Dashboard] Real-time update detected...`
- [ ] Botão "Atualizar" manual ainda funciona

---

## 📝 Notas Importantes

1. **Não interfere com atualização manual**: Botão "Atualizar" continua funcionando
2. **Respeita estados**: Não atualiza enquanto loading=true
3. **Limpa recursos**: setTimeout é limpo corretamente no cleanup
4. **Compatível com SSE**: Funciona perfeitamente com RealtimeProvider existente

---

## 🔗 Arquivos Relacionados

- [frontend/src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) - Componente principal
- [frontend/src/store/useConversationStore.ts](src/store/useConversationStore.ts) - Store Zustand
- [frontend/src/providers/realtime-provider.tsx](src/providers/realtime-provider.tsx) - SSE Provider
- [API_MARK_AS_READ.md](../API_MARK_AS_READ.md) - Documentação de marcar como lida

---

**Data**: 30/12/2024
**Versão**: 1.0
**Status**: Implementado ✅
