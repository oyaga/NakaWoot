# 🚀 Guia de Integração Evolution API → Mensager-Go

## 📋 Visão Geral

Este guia mostra como criar inboxes no Mensager-Go automaticamente quando você conecta uma instância do Evolution API.

## 🔄 Fluxo de Integração

```
Evolution API → Webhook → Mensager-Go → Criar Inbox + Contact + Conversation
```

## 📝 Passo a Passo

### 1. Configurar Webhook no Evolution API

Ao criar ou conectar uma instância no Evolution, configure o webhook para apontar para o Mensager-Go:

**URL do Webhook:**
```
http://mensager-go-api-1:8080/api/v1/webhooks/evolution?inbox_id={INBOX_ID}
```

**Eventos a serem monitorados:**
- `messages.upsert` - Mensagens recebidas/enviadas
- `messages.update` - Atualizações de mensagens
- `connection.update` - Status de conexão

### 2. Criar Inbox via API

#### Opção A: Via curl (Manual)

```bash
# 1. Obter token de autenticação
TOKEN=$(curl -s http://localhost:8080/api/v1/debug/token | jq -r '.token')

# 2. Criar inbox para WhatsApp Evolution
curl -X POST http://localhost:8080/api/v1/inboxes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "WhatsApp Evolution - Principal",
    "channel_type": "whatsapp",
    "channel_id": 1,
    "timezone": "America/Sao_Paulo",
    "greeting_enabled": true,
    "greeting_message": "Olá! Bem-vindo ao nosso atendimento.",
    "enable_auto_assignment": true
  }'
```

#### Opção B: Via Interface (Tela que você mostrou)

1. Acesse: `http://localhost:3003/dashboard/inboxes`
2. Clique em "Nova Inbox"
3. Preencha:
   - **Nome:** Nome da sua instância Evolution
   - **Tipo de Canal:** WhatsApp
   - **Timezone:** Seu fuso horário
   - **Saudação:** (Opcional) Mensagem de boas-vindas

#### Opção C: Via Chatwoot SDK (Automatizado)

Use a URL compatível com Chatwoot:

```bash
curl -X POST http://localhost:8080/api/v1/accounts/1/inboxes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "WhatsApp via Evolution",
    "channel": {
      "type": "api",
      "webhook_url": "http://evolution-go:8080/chatwoot/send"
    }
  }'
```

### 3. Conectar Evolution à Inbox

Após criar a inbox, você receberá um response com o `inbox_id`. Use esse ID para configurar o webhook no Evolution:

**Exemplo de resposta:**
```json
{
  "id": 9,
  "name": "WhatsApp Evolution - Principal",
  "channel_type": "whatsapp",
  "account_id": 1,
  ...
}
```

**Configure no Evolution com inbox_id = 9:**
```
http://mensager-go-api-1:8080/api/v1/webhooks/evolution?inbox_id=9
```

### 4. Configurar Integration (Opcional - para gerenciamento)

Para rastrear qual integração Evolution está conectada a qual inbox:

```bash
curl -X POST http://localhost:8080/api/v1/integrations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "provider": "evolution",
    "config": {
      "instance_name": "principal",
      "evolution_url": "http://evolution-go:8080",
      "inbox_id": 9,
      "api_key": "SUA_API_KEY_EVOLUTION"
    }
  }'
```

## 🔧 Configuração do Evolution API

### Usando a Interface Web do Evolution

1. Acesse: `http://localhost:8082` (ou porta configurada)
2. Crie uma nova instância
3. Na configuração de Webhooks:
   - **URL:** `http://mensager-go-api-1:8080/api/v1/webhooks/evolution?inbox_id=9`
   - **Eventos:** Selecione todos relacionados a mensagens

### Usando API do Evolution

```bash
# Configurar webhook na instância
curl -X POST http://localhost:8082/webhook/set/INSTANCE_NAME \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_EVOLUTION_API_KEY" \
  -d '{
    "url": "http://mensager-go-api-1:8080/api/v1/webhooks/evolution?inbox_id=9",
    "webhook_by_events": true,
    "webhook_base64": false,
    "events": [
      "QRCODE_UPDATED",
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "MESSAGES_DELETE",
      "SEND_MESSAGE",
      "CONNECTION_UPDATE"
    ]
  }'
```

## 📊 Verificar Inboxes Criadas

```bash
# Listar todas as inboxes
curl -s http://localhost:8080/api/v1/inboxes \
  -H "Authorization: Bearer $TOKEN" | jq
```

## 🐛 Troubleshooting

### Problema: Erro "Failed to create inbox"

**Solução:** Verifique se o `external_id` não está duplicado. O campo foi corrigido para aceitar NULL.

### Problema: Webhook retorna 404

**Solução:** Verifique se:
1. A API do Mensager-Go está rodando: `curl http://localhost:8080/health`
2. A rota está correta: `/api/v1/webhooks/evolution`
3. O inbox_id existe no banco

### Problema: Mensagens não aparecem

**Solução:**
1. Verifique se o webhook do Evolution está configurado corretamente
2. Veja os logs: `docker logs mensager-go-api-1 -f`
3. Verifique se o `inbox_id` está correto no webhook URL

## 📈 Próximos Passos

- [ ] Implementar processamento de webhooks do Evolution
- [ ] Criar contacts automaticamente
- [ ] Criar conversations automaticamente
- [ ] Sincronizar status de leitura
- [ ] Implementar envio de mensagens via Evolution

## 🔗 URLs Importantes

- **Frontend:** http://localhost:3003
- **API Mensager-Go:** http://localhost:8080
- **Evolution API:** http://localhost:8082
- **Health Check:** http://localhost:8080/health
- **Debug Token:** http://localhost:8080/api/v1/debug/token

## 📚 Documentação Adicional

- [Evolution API Docs](https://doc.evolution-api.com)
- [Chatwoot API Docs](https://www.chatwoot.com/developers/api)
