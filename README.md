# 🦅 NakaWoot (Mensager-Go)

**NakaWoot** é uma plataforma de atendimento open-source moderna, desenvolvida para unificar e gerenciar conversas de múltiplos canais como WhatsApp, Facebook e Instagram.

É um fork otimizado e reescrito em **Go (Golang)** do backend do Chatwoot, focado em alta performance, baixo consumo de memória e fácil integração com [Evolution API](https://doc.evolution-api.com) para WhatsApp.

---

## 🚀 Funcionalidades

- **Backend em Go:** Alta performance e concorrência nativa.
- **Frontend em Next.js:** Interface moderna, rápida e responsiva construída com React e TailwindCSS.
- **Supabase Integrado:** Autenticação, Banco de Dados (PostgreSQL) e Realtime (WebSockets) prontos para uso.
- **Integração Nativa com Evolution API:**
  - Conecte instâncias de WhatsApp facilmente.
  - Webhooks automatizados para sincronização de mensagens.
  - Criação automática de contatos e conversas.
- **Multi-Inbox:** Gerencie vários canais (WhatsApp, Web Widget, etc) em um único painel.
- **Self-Hosted:** Controle total dos seus dados, rodando via Docker.

---

## 🛠️ Stack Tecnológica

### Backend

- **Linguagem:** Go (Golang) 1.21+
- **Frameworks:** Gin, GORM
- **Banco de Dados:** PostgreSQL (via Supabase)

### Frontend

- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS, Shadcn/UI, Lucide Icons
- **Estado:** Zustand

### Infraestrutura

- **Supabase:** Base de dados, Auth e Realtime
- **Docker:** Containerização completa (Backend, Frontend, Banco, Evolution)

---

## 🏁 Como Rodar

### Pré-requisitos

- Docker e Docker Compose instalados.

### Passos Rápidos

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/oyaga/NakaWoot.git
    cd NakaWoot
    ```

2.  **Configure o Ambiente:**
    Copie o arquivo de exemplo e ajuste se necessário:

    ```bash
    cp .env.template .env
    ```

3.  **Inicie os Serviços:**

    ```bash
    docker-compose up -d --build
    ```

4.  **Acesse:**
    - **Frontend:** [http://localhost:3003](http://localhost:3003)
    - **API:** [http://localhost:8080](http://localhost:8080)
    - **Evolution API:** [http://localhost:8082](http://localhost:8082)
    - **Supabase Studio:** [http://localhost:3000](http://localhost:3000)

---

## 📖 Documentação Importante

- **Criando Inboxes:** Veja [COMO_CRIAR_INBOX.md](./COMO_CRIAR_INBOX.md) para detalhes de como configurar canais.
- **Integração Evolution:** Veja [GUIA_INTEGRACAO_EVOLUTION.md](./GUIA_INTEGRACAO_EVOLUTION.md) para conectar seu WhatsApp.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

---

## 📄 Licença

Este projeto é distribuído sob a licença MIT.
