# Troubleshooting - Sistema de Onboarding

## Erro: ERR_BLOCKED_BY_CLIENT

### Problema
Ao tentar criar a conta inicial, a requisição para `/api/v1/installation/onboard` é bloqueada pelo navegador.

### Causa
Este erro é causado por **extensões de bloqueio** instaladas no navegador, como:
- uBlock Origin
- AdBlock Plus
- Privacy Badger
- Brave Shields (navegador Brave)
- Outras extensões de privacidade/segurança

Essas extensões bloqueiam requisições que contêm palavras-chave como:
- `ad`, `track`, `analytics`, etc.
- Neste caso, a palavra `onboard` pode estar sendo detectada

### Soluções

#### Solução 1: Desativar extensões temporariamente
1. Desative todas as extensões de bloqueio
2. Recarregue a página
3. Tente criar a conta novamente

#### Solução 2: Adicionar exceção
1. Adicione `localhost:8080` ou seu domínio às exceções da extensão
2. No uBlock Origin: clique no ícone → Desativar para este site
3. No AdBlock Plus: clique no ícone → Pausar no site

#### Solução 3: Usar modo anônimo
1. Abra uma janela anônita/privativa (Ctrl+Shift+N)
2. As extensões geralmente não funcionam no modo anônimo
3. Acesse `http://localhost:8080` ou seu domínio

#### Solução 4: Usar outro navegador
Teste com outro navegador que não tenha extensões instaladas:
- Chrome sem extensões
- Firefox sem extensões
- Edge

## Verificar se o erro foi resolvido

Abra o Console do Navegador (F12 → Console) e procure por:
- ✅ **Sucesso**: `[Onboarding] Success: {...}`
- ❌ **Erro**: `ERR_BLOCKED_BY_CLIENT`

## Teste manual da API

Você pode testar diretamente via curl para confirmar que o backend está funcionando:

```bash
# Verificar instalação
curl http://localhost:8080/api/v1/installation/check

# Deve retornar:
# {"is_first_installation":true,"accounts_count":0}

# Criar conta inicial
curl -X POST http://localhost:8080/api/v1/installation/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "account_name": "Minha Empresa",
    "user_name": "Admin",
    "email": "admin@empresa.com",
    "password": "senha123"
  }'

# Deve retornar:
# {"success":true,"message":"Conta criada com sucesso! Bem-vindo ao Nakawoot.","user":{...},"account":{...}}
```

## Logs do Backend

Para debugar, verifique os logs do container:

```bash
# Ver logs em tempo real
docker logs -f mensager-go-app-1

# Ou se usando docker-compose
docker-compose logs -f app
```

Procure por:
- `[Onboarding] Account created with ID: X`
- `[Onboarding] User created with ID: X, UUID: ...`

## Fluxo esperado

1. **Primeira visita** → Redireciona para `/onboarding`
2. **Preencher formulário** → Enviar dados
3. **Backend cria Account + User** → Retorna sucesso
4. **Redireciona para `/login`** → Fazer login

## Endpoints da API

- `GET /api/v1/installation/check` - Verifica se é primeira instalação
- `POST /api/v1/installation/onboard` - Cria conta inicial
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout

## Configuração CORS

O backend já está configurado com CORS permissivo:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS, GET, PUT, DELETE, PATCH`
- `Access-Control-Allow-Headers: Content-Type, Authorization, ...`

## Problemas conhecidos

### 1. Ad Blocker bloqueando `/onboard`
**Solução**: Desativar extensões ou adicionar exceção

### 2. Senha muito curta
**Solução**: Mínimo 6 caracteres

### 3. Email já cadastrado
**Solução**: Usar outro email ou limpar banco de dados

### 4. Banco de dados não inicializado
**Solução**: Verificar conexão com Postgres

```bash
# Testar conexão com banco
docker exec mensager-go-app-1 /bin/sh -c "wget -qO- http://localhost:8080/api/v1/health"
```

## Suporte

Se o problema persistir:
1. Verifique os logs do backend
2. Teste via curl para isolar o problema
3. Use modo anônimo do navegador
4. Verifique se o banco de dados está acessível
