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

export default function SettingsPage() {
  const [apiKeyInfo, setApiKeyInfo] = useState<APIKeyInfo | null>(null)
  const [tokens, setTokens] = useState<APIToken[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTokenData, setNewTokenData] = useState<{ token: string; name: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    expires_in: 365,
  })

  useEffect(() => {
    fetchAPIKeys()
    fetchTokens()
  }, [])

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
    <div className="flex-1 space-y-8 p-8 bg-slate-950 min-h-screen">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Configurações</h1>
        <p className="text-slate-400 text-lg">Gerencie suas preferências e integrações.</p>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="bg-slate-900/50 p-1 border border-slate-800">
          <TabsTrigger value="profile" className="data-[state=active]:bg-slate-800">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-slate-800">
            <Building className="h-4 w-4 mr-2" />
            Conta
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-slate-800">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Perfil do Usuário</CardTitle>
              <CardDescription className="text-slate-400">
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-slate-300">Nome</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  defaultValue={apiKeyInfo?.user.name}
                  className="bg-slate-900/50 border-slate-800 text-white"
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  disabled
                  defaultValue={apiKeyInfo?.user.email}
                  className="bg-slate-900/50 border-slate-800 text-slate-500"
                  autoComplete="email"
                />
              </div>
              <Button className="bg-green-600 hover:bg-green-700 text-white">Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Informações da Conta</CardTitle>
              <CardDescription className="text-slate-400">
                Detalhes da sua conta no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-slate-300">Account ID</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    readOnly
                    value={apiKeyInfo?.account_id || ''}
                    className="bg-slate-900/50 border-slate-800 text-white font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(String(apiKeyInfo?.account_id), 'account_id')}
                    className="bg-slate-800 border-slate-700 hover:bg-slate-700"
                  >
                    {copiedField === 'account_id' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-slate-300">Email</Label>
                <Input
                  readOnly
                  value={apiKeyInfo?.user.email || ''}
                  className="bg-slate-900/50 border-slate-800 text-slate-300"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-slate-300">Nome</Label>
                <Input
                  readOnly
                  value={apiKeyInfo?.user.name || ''}
                  className="bg-slate-900/50 border-slate-800 text-slate-300"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Credenciais da API</CardTitle>
              <CardDescription className="text-slate-400">
                Use estas credenciais para integrar com a API do Mensager
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-slate-300">Account ID</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    readOnly
                    value={apiKeyInfo?.account_id || ''}
                    className="bg-slate-900/50 border-slate-800 text-white font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(String(apiKeyInfo?.account_id), 'api_account_id')}
                    className="bg-slate-800 border-slate-700 hover:bg-slate-700"
                  >
                    {copiedField === 'api_account_id' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Use este ID para fazer chamadas à API em /api/v1/accounts/:account_id
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Tokens de Acesso</h3>
                    <p className="text-sm text-slate-400">Gere tokens para autenticar suas integrações</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={generateLongLivedToken}
                      variant="outline"
                      className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Token JWT
                    </Button>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Token
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-950 border-slate-800">
                        <DialogHeader>
                          <DialogTitle className="text-white">Criar Novo Token de API</DialogTitle>
                          <DialogDescription className="text-slate-400">
                            Tokens personalizados para diferentes integrações
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="grid gap-2">
                            <Label htmlFor="token_name" className="text-slate-300">Nome do Token</Label>
                            <Input
                              id="token_name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Ex: Evolution Integration"
                              className="bg-slate-900/50 border-slate-800 text-white"
                              autoComplete="off"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="expires_in" className="text-slate-300">Validade (dias)</Label>
                            <Input
                              id="expires_in"
                              type="number"
                              value={formData.expires_in}
                              onChange={(e) => setFormData({ ...formData, expires_in: parseInt(e.target.value) })}
                              className="bg-slate-900/50 border-slate-800 text-white"
                              autoComplete="off"
                            />
                            <p className="text-xs text-slate-500">0 = nunca expira</p>
                          </div>
                          <Button onClick={generateToken} className="w-full bg-green-600 hover:bg-green-700">
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
                      <CardTitle className="text-green-400 text-base flex items-center">
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
                            className="bg-slate-900 border-green-500/30 text-white font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              handleCopy(newTokenData.token, 'new_token')
                              setTimeout(() => setNewTokenData(null), 3000)
                            }}
                            className="bg-green-600 border-green-500 hover:bg-green-700 text-white"
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
                    <div className="text-center py-8 text-slate-500">
                      Nenhum token criado ainda. Crie seu primeiro token para começar.
                    </div>
                  ) : (
                    tokens.map((token) => (
                      <Card key={token.id} className="bg-slate-900/30 border-slate-800">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-medium text-white">{token.name}</h4>
                                {token.expires_at && (
                                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs">
                                    Expira em {new Date(token.expires_at).toLocaleDateString()}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <code className="text-sm font-mono text-slate-400">{token.token}</code>
                              </div>
                              <p className="text-xs text-slate-500">
                                Criado em {new Date(token.created_at).toLocaleString()}
                                {token.last_used_at && ` • Último uso: ${new Date(token.last_used_at).toLocaleString()}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteToken(token.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
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

          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Como usar a API</CardTitle>
              <CardDescription className="text-slate-400">
                Exemplos de integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Criar Inbox via API</Label>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm text-green-400">{`curl -X POST http://localhost:8080/api/v1/inboxes \\
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
                <Label className="text-slate-300">Webhook do Evolution</Label>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm text-blue-400">{`http://mensager-go-api-1:8080/api/v1/webhooks/evolution?inbox_id=INBOX_ID`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
