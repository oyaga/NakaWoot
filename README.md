# 🚀 NakaWoot

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.23-00ADD8?logo=go" alt="Go">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

**NakaWoot** é uma plataforma de mensagens unificada construída com Go (backend) e Next.js (frontend), projetada para integrar múltiplos canais de comunicação como WhatsApp via Evolution API.

---

## ✨ Features

- 📱 **Multi-Inbox**: Gerencie múltiplas caixas de entrada em uma interface
- 💬 **Conversas em Tempo Real**: WebSocket para atualizações instantâneas
- 🔗 **Integração Evolution API**: Conecte WhatsApp facilmente
- 🎨 **UI Moderna**: Interface responsiva com dark/light mode
- 🔐 **Autenticação Supabase**: Login seguro com JWT
- 📦 **Storage Flexível**: Suporte a MinIO ou Supabase Storage
- 🐳 **Docker Ready**: Deploy fácil via Docker Compose ou Swarm

---

## 🐳 Quick Start com Docker

```bash
docker run -d \
  --name nakawoot \
  -p 4120:4120 \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-password \
  -e SUPABASE_URL=http://your-supabase:8000 \
  -e SUPABASE_JWT_SECRET=your-jwt-secret \
  oyaga/nakawoot:latest
```

Acesse: `http://localhost:4120`

---

## 📋 Variáveis de Ambiente

| Variável                    | Descrição               | Padrão           |
| --------------------------- | ----------------------- | ---------------- |
| `PORT`                      | Porta do servidor       | `4120`           |
| `DB_HOST`                   | Host do PostgreSQL      | -                |
| `DB_PORT`                   | Porta do PostgreSQL     | `5432`           |
| `DB_USER`                   | Usuário do banco        | `supabase_admin` |
| `DB_PASSWORD`               | Senha do banco          | -                |
| `DB_NAME`                   | Nome do banco           | `postgres`       |
| `SUPABASE_URL`              | URL do Supabase Kong    | -                |
| `SUPABASE_JWT_SECRET`       | Secret para JWT         | -                |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key        | -                |
| `SUPABASE_ANON_KEY`         | Anon Key                | -                |
| `USE_MINIO`                 | Usar MinIO para storage | `false`          |
| `USE_SUPABASE_STORAGE`      | Usar Supabase Storage   | `true`           |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    NakaWoot                         │
├─────────────────────────────────────────────────────┤
│  Frontend (Next.js 15)     │  Backend (Go 1.23)    │
│  - React 19                │  - Chi Router         │
│  - Tailwind CSS            │  - Supabase Auth      │
│  - Zustand                 │  - WebSocket          │
└─────────────────────────────────────────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────┐        ┌─────────────────────┐
│   Supabase      │        │   Evolution API     │
│   (Auth + DB)   │        │   (WhatsApp)        │
└─────────────────┘        └─────────────────────┘
```

---

## 🛠️ Desenvolvimento Local

### Pré-requisitos

- Go 1.23+
- Node.js 20+
- Docker & Docker Compose
- Supabase (local ou cloud)

### Setup

```bash
# Clone o repositório
git clone https://github.com/oyaga/NakaWoot.git
cd NakaWoot

# Instalar dependências do frontend
cd frontend && npm install && cd ..

# Rodar com Docker Compose
docker-compose up -d --build
```

---

## 🚀 Deploy em Produção (Docker Swarm)

```bash
# Inicializar Swarm (se necessário)
docker swarm init

# Deploy da stack
docker stack deploy -c stack.yaml nakawoot

# Verificar serviços
docker service ls
```

---

## 📦 Docker Tags

| Tag                     | Descrição                  |
| ----------------------- | -------------------------- |
| `oyaga/nakawoot:latest` | Última versão estável      |
| `oyaga/nakawoot:stable` | Versão de produção testada |

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Feito com ❤️ por <a href="https://github.com/oyaga">Oyaga</a>
</p>
