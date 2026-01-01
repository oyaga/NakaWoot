'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { User, Building, Key, Copy, Check, Trash2, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

interface APIKeyInfo {
  account_id: number
  user: {
    id: number
    email: string
    name: string
  }
}

interface APIToken {
  id: number
  name: string
  token: string
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

interface ServerInfo {
  server_url: string
  webhook_url: string
  api_url: string
  version: string
  name: string
  integration_guide: {
    evolution_webhook: string
    docs: string
  }
}

export default function SettingsPage() {
  const [apiKeyInfo, setApiKeyInfo] = useState<APIKeyInfo | null>(null)
  const [tokens, setTokens] = useState<APIToken[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTokenData, setNewTokenData] = useState<{ token: string; name: string } | null>(null)
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    expires_in: 365,
  })

  useEffect(() => {
    fetchAPIKeys()
    fetchTokens()
    fetchServerInfo()
  }, [])

  const fetchServerInfo = async () => {
    try {
      const response = await api.get('/server/info')
      setServerInfo(response.data)
    } catch (error) {
      console.error('Error fetching server info:', error)
    }
  }

  const fetchAPIKeys = async () => {
    try {
      const response = await api.get('/api-keys')
      setApiKeyInfo(response.data)
    } catch (error) {
      console.error('Error fetching API keys:', error)
      toast.error('Erro ao carregar informações da API')
    } finally {
      setLoading(false)
    }
  }

  const fetchTokens = async () => {
    try {
      const response = await api.get('/api-tokens')
      setTokens(response.data || [])
    } catch (error) {
      console.error('Error fetching tokens:', error)
    }
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('Copiado para área de transferência!')
    setTimeout(() => setCopiedField(''), 2000)
  }

  const generateToken = async () => {
    try {
      const response = await api.post('/api-tokens', formData)
      setNewTokenData({
        token: response.data.token,
        name: formData.name,
      })
      setFormData({ name: '', expires_in: 365 })
      toast.success('Token criado com sucesso!')
      fetchTokens()
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error generating token:', error)
      toast.error('Erro ao gerar token')
    }
  }

  const generateLongLivedToken = async () => {
    try {
      const response = await api.post('/api-tokens/long-lived')
      setNewTokenData({
        token: response.data.token,
        name: 'Token JWT de longa duração',
      })
      toast.success('Token JWT gerado com sucesso!')
    } catch (error) {
      console.error('Error generating long-lived token:', error)
      toast.error('Erro ao gerar token JWT')
    }
  }

  const deleteToken = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este token?')) return

    try {
      await api.delete(`/api-tokens/${id}`)
      toast.success('Token deletado com sucesso!')
      fetchTokens()
    } catch (error) {
      console.error('Error deleting token:', error)
      toast.error('Erro ao deletar token')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="text-center py-12">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-8 p-8 bg-background min-h-screen">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Configurações</h1>
        <p className="text-muted-foreground text-lg">Gerencie suas preferências e integrações.</p>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="bg-muted p-1 border border-border">
          <TabsTrigger value="profile" className="data-[state=active]:bg-secondary">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-secondary">
            <Building className="h-4 w-4 mr-2" />
            Conta
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-secondary">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Perfil do Usuário</CardTitle>
              <CardDescription className="text-muted-foreground">
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-muted-foreground">Nome</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  defaultValue={apiKeyInfo?.user.name}
                  className="bg-secondary border-border text-foreground"
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  disabled
                  defaultValue={apiKeyInfo?.user.email}
                  className="bg-secondary border-border text-muted-foreground"
                  autoComplete="email"
                />
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-foreground">Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Informações da Conta</CardTitle>
              <CardDescription className="text-muted-foreground">
                Detalhes da sua conta no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Account ID</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    readOnly
                    value={apiKeyInfo?.account_id || ''}
                    className="bg-secondary border-border text-foreground font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(String(apiKeyInfo?.account_id), 'account_id')}
                    className="bg-secondary border-border hover:bg-muted"
                  >
                    {copiedField === 'account_id' ? (
                      <Check className="h-4 w-4 text-foreground0" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Email</Label>
                <Input
                  readOnly
                  value={apiKeyInfo?.user.email || ''}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Nome</Label>
                <Input
                  readOnly
                  value={apiKeyInfo?.user.name || ''}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Credenciais da API</CardTitle>
              <CardDescription className="text-muted-foreground">
                Use estas credenciais para integrar com a API do Mensager
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Account ID</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    readOnly
                    value={apiKeyInfo?.account_id || ''}
                    className="bg-secondary border-border text-foreground font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(String(apiKeyInfo?.account_id), 'api_account_id')}
                    className="bg-secondary border-border hover:bg-muted"
                  >
                    {copiedField === 'api_account_id' ? (
                      <Check className="h-4 w-4 text-foreground0" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use este ID para fazer chamadas à API em /api/v1/accounts/:account_id
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Tokens de Acesso</h3>
                    <p className="text-sm text-muted-foreground">Gere tokens para autenticar suas integrações</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={generateLongLivedToken}
                      variant="outline"
                      className="bg-secondary border-border text-foreground hover:bg-muted"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Token JWT
                    </Button>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-foreground">
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Token
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border text-foreground">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Criar Novo Token de API</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            Tokens personalizados para diferentes integrações
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="grid gap-2">
                            <Label htmlFor="token_name" className="text-muted-foreground">Nome do Token</Label>
                            <Input
                              id="token_name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Ex: Evolution Integration"
                              className="bg-secondary border-border text-foreground"
                              autoComplete="off"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="expires_in" className="text-muted-foreground">Validade (dias)</Label>
                            <Input
                              id="expires_in"
                              type="number"
                              value={formData.expires_in}
                              onChange={(e) => setFormData({ ...formData, expires_in: parseInt(e.target.value) })}
                              className="bg-secondary border-border text-foreground"
                              autoComplete="off"
                            />
                            <p className="text-xs text-muted-foreground">0 = nunca expira</p>
                          </div>
                          <Button onClick={generateToken} className="w-full bg-primary hover:bg-primary/90">
                            Gerar Token
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {newTokenData && (
                  <Card className="mb-4 bg-green-950/20 border-green-500/30">
                    <CardHeader>
                      <CardTitle className="text-primary text-base flex items-center">
                        <Check className="h-5 w-5 mr-2" />
                        Token Criado com Sucesso!
                      </CardTitle>
                      <CardDescription className="text-green-300/70">
                        Copie este token agora. Ele não será mostrado novamente.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label className="text-green-300">Token: {newTokenData.name}</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            readOnly
                            value={newTokenData.token}
                            className="bg-card border-green-500/30 text-foreground font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              handleCopy(newTokenData.token, 'new_token')
                              setTimeout(() => setNewTokenData(null), 3000)
                            }}
                            className="bg-primary border-green-500 hover:bg-primary/90 text-foreground"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  {tokens.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum token criado ainda. Crie seu primeiro token para começar.
                    </div>
                  ) : (
                    tokens.map((token) => (
                      <Card key={token.id} className="bg-secondary border-border">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-medium text-foreground">{token.name}</h4>
                                {token.expires_at && (
                                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs">
                                    Expira em {new Date(token.expires_at).toLocaleDateString()}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <code className="text-sm font-mono text-muted-foreground">{token.token}</code>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Criado em {new Date(token.created_at).toLocaleString()}
                                {token.last_used_at && ` • Último uso: ${new Date(token.last_used_at).toLocaleString()}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteToken(token.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {serverInfo && (
            <Card className="bg-gradient-to-br from-green-950/20 to-emerald-950/20 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-primary-foreground flex items-center gap-2">
                  <Key className="w-5 h-5 text-foreground0" />
                  Informações do Servidor
                </CardTitle>
                <CardDescription className="text-green-300/70">
                  URLs e endpoints para configurar suas integrações externas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-green-200/70 uppercase tracking-wider">URL Base do Servidor</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-background border border-green-500/20 rounded text-sm font-mono text-green-300">
                        {serverInfo.server_url}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-primary hover:bg-primary/90 border-green-500 text-foreground"
                        onClick={() => handleCopy(serverInfo.server_url, 'server_url')}
                      >
                        {copiedField === 'server_url' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-green-200/70 uppercase tracking-wider">API Endpoint</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-background border border-green-500/20 rounded text-sm font-mono text-green-300">
                        {serverInfo.api_url}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-primary hover:bg-primary/90 border-green-500 text-foreground"
                        onClick={() => handleCopy(serverInfo.api_url, 'api_url')}
                      >
                        {copiedField === 'api_url' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-green-200/70 uppercase tracking-wider">Webhook Evolution API</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-background border border-green-500/20 rounded text-sm font-mono text-green-300 break-all">
                        {serverInfo.integration_guide?.evolution_webhook}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-primary hover:bg-primary/90 border-green-500 text-foreground"
                        onClick={() => handleCopy(serverInfo.integration_guide?.evolution_webhook, 'evolution_webhook')}
                      >
                        {copiedField === 'evolution_webhook' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-green-200/50 italic mt-2">
                      Substitua <code className="bg-secondary px-1 rounded">{'{INBOX_ID}'}</code> pelo ID da inbox que você criar.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-green-500/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-200/60">Versão: {serverInfo.version}</span>
                    <Badge variant="outline" className="border-green-500/30 text-primary">
                      {serverInfo.name}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Como usar a API</CardTitle>
              <CardDescription className="text-muted-foreground">
                Exemplos de integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Criar Inbox via API</Label>
                <pre className="bg-background border border-border rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm text-primary">{`curl -X POST ${serverInfo?.api_url || (typeof window !== 'undefined' ? window.location.origin + '/api/v1' : 'http://localhost:4120/api/v1')}/inboxes \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "WhatsApp Evolution",
    "channel_type": "whatsapp",
    "channel_id": 1
  }'`}</code>
                </pre>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Webhook do Evolution</Label>
                <pre className="bg-background border border-border rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm text-primary">{serverInfo?.integration_guide?.evolution_webhook || (typeof window !== 'undefined' ? window.location.origin + '/api/v1/webhooks/evolution?inbox_id={INBOX_ID}' : 'http://localhost:4120/api/v1/webhooks/evolution?inbox_id={INBOX_ID}')}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
