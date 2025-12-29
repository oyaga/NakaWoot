# 📥 Como Criar Inboxes no Mensager-Go

## ✅ Problema Resolvido

O bug que impedia a criação de inboxes foi **corrigido**! O campo `external_id` agora aceita valores NULL corretamente.

---

## 🎯 3 Formas de Criar uma Inbox

### 1️⃣ Via Interface Web (Mais Fácil)

1. Acesse: **http://localhost:3003/dashboard/inboxes**
2. Clique em **"Nova Inbox"**
3. Preencha o formulário:
   - **Nome da Inbox:** Ex: "WhatsApp Atendimento"
   - **Tipo de Canal:** Selecione (web, whatsapp, facebook, etc.)
   - **Fuso Horário:** America/Sao_Paulo
   - **Mensagem de Saudação:** (Opcional)
   - **Auto-atribuição:** Marque se quiser atribuir automaticamente
4. Clique em **"Criar Inbox"**

**✅ Pronto!** Sua inbox foi criada.

---

### 2️⃣ Via Script Python (Automático + Evolution)

**Uso:**
```bash
cd mensager-go
python scripts/create_evolution_inbox.py "Nome da Inbox" "nome_instancia_evolution"
```

**Exemplo:**
```bash
python scripts/create_evolution_inbox.py "WhatsApp Principal" "principal"
```

**O que o script faz:**
- ✅ Cria a inbox automaticamente
- ✅ Cria a integração com Evolution
- ✅ Mostra a URL do webhook para você configurar
- ✅ Mostra o comando curl pronto

**Resultado:**
```
============================================================
✨ Inbox criada com sucesso!
============================================================

📊 Informações da Inbox:
   ID: 10
   Nome: WhatsApp Principal
   Tipo: whatsapp

🔗 URL do Webhook:
   http://mensager-go-api-1:8080/api/v1/webhooks/evolution?inbox_id=10
```

---

### 3️⃣ Via API Manual (curl)

**Passo 1: Obter Token**
```bash
curl -s http://localhost:8080/api/v1/debug/token
```

**Passo 2: Criar Inbox**
```bash
curl -X POST http://localhost:8080/api/v1/inboxes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "name": "Minha Inbox",
    "channel_type": "whatsapp",
    "channel_id": 1,
    "timezone": "America/Sao_Paulo",
    "greeting_enabled": true,
    "greeting_message": "Olá! Como posso ajudar?",
    "enable_auto_assignment": true
  }'
```

**Resposta de sucesso:**
```json
{
  "id": 10,
  "name": "Minha Inbox",
  "channel_type": "whatsapp",
  "account_id": 1,
  ...
}
```

---

## 🔗 Conectar Evolution API

Depois de criar a inbox, configure o webhook no Evolution:

### Via Interface Evolution (se tiver)
1. Acesse a interface do Evolution
2. Selecione sua instância
3. Configure o webhook:
   - **URL:** `http://mensager-go-api-1:8080/api/v1/webhooks/evolution?inbox_id=10`
   - **Eventos:** MESSAGES_UPSERT, MESSAGES_UPDATE, CONNECTION_UPDATE

### Via API Evolution
```bash
curl -X POST http://localhost:8082/webhook/set/NOME_INSTANCIA \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_API_KEY_EVOLUTION" \
  -d '{
    "url": "http://mensager-go-api-1:8080/api/v1/webhooks/evolution?inbox_id=10",
    "webhook_by_events": true,
    "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"]
  }'
```

---

## 📋 Verificar Inboxes Criadas

### Via Interface
Acesse: **http://localhost:3003/dashboard/inboxes**

### Via API
```bash
curl -s http://localhost:8080/api/v1/inboxes \
  -H "Authorization: Bearer $(cat token.txt)" | python -m json.tool
```

---

## 🎨 Tipos de Canal Disponíveis

| Tipo | Descrição |
|------|-----------|
| `web` | Widget web no site |
| `whatsapp` | WhatsApp via Evolution |
| `facebook` | Facebook Messenger |
| `instagram` | Instagram Direct |
| `email` | Email |
| `api` | API customizada |

---

## 🐛 Troubleshooting

### Erro: "Failed to create inbox"
**Solução:** Verifique os logs detalhados:
```bash
docker logs mensager-go-api-1 -f
```

### Erro: "duplicate key value violates unique constraint"
**Solução:** Este erro foi corrigido! Reconstrua a imagem:
```bash
docker-compose build api
docker-compose up -d api
```

### Webhook Evolution retorna 404
**Verificações:**
1. ✅ API rodando: `curl http://localhost:8080/health`
2. ✅ Inbox existe: Use o ID correto
3. ✅ URL correta: `/api/v1/webhooks/evolution?inbox_id=XX`

---

## 📚 Documentação Completa

- **Guia de Integração:** [GUIA_INTEGRACAO_EVOLUTION.md](./GUIA_INTEGRACAO_EVOLUTION.md)
- **Script Python:** [scripts/create_evolution_inbox.py](./scripts/create_evolution_inbox.py)
- **Script Bash:** [scripts/create_evolution_inbox.sh](./scripts/create_evolution_inbox.sh)

---

## 🚀 Quick Start

**Criar inbox + integração em 1 comando:**
```bash
python scripts/create_evolution_inbox.py "WhatsApp Atendimento" "principal"
```

**Copiar a URL do webhook e configurar no Evolution.**

**Pronto! Sua inbox está conectada! 🎉**
