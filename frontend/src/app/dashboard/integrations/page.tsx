'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import api from '@/lib/api'
import { 
  MessageCircle, 
  Facebook, 
  Instagram, 
  Globe, 
  MoreVertical, 
  CheckCircle2, 
  AlertCircle,
  Link as LinkIcon,
  Trash2,
  Settings
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from '@/components/ui/skeleton'

interface Integration {
  id: number
  provider: string
  status: string
  config: any
  created_at: string
}

const PROVIDERS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Cloud',
    description: 'Conecte sua conta do WhatsApp Business API.',
    icon: MessageCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    description: 'Integre mensagens da sua página do Facebook.',
    icon: Facebook,
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
    border: 'border-blue-600/20',
  },
  {
    id: 'instagram',
    name: 'Instagram Direct',
    description: 'Receba DMs do Instagram diretamente aqui.',
    icon: Instagram,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  {
    id: 'evolution',
    name: 'Evolution Device',
    description: 'Conecte instâncias do Evolution API.',
    icon: Globe, // Placeholder for Evolution icon
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  {
    id: 'others',
    name: 'Outras Integrações',
    description: 'Webhooks e APIs personalizadas.',
    icon: LinkIcon,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
  }
]

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/integrations')
      setIntegrations(response.data || [])
    } catch (error) {
      console.error('Error fetching integrations:', error)
      toast.error('Erro ao carregar integrações')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProvider) return

    try {
      setIsSubmitting(true)
      await api.post('/integrations', {
        provider: selectedProvider,
        config: formData 
      })
      toast.success('Integração conectada com sucesso!')
      setIsDialogOpen(false)
      setFormData({})
      fetchIntegrations()
    } catch (error) {
      console.error('Error connecting integration:', error)
      toast.error('Erro ao conectar integração')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta integração?')) return

    try {
      await api.delete(`/integrations/${id}`)
      toast.success('Integração removida com sucesso!')
      fetchIntegrations()
    } catch (error) {
      console.error('Error deleting integration:', error)
      toast.error('Erro ao remover integração')
    }
  }

  const getActiveIntegration = (providerId: string) => {
    return integrations.find(i => i.provider === providerId)
  }

  const renderFormFields = (providerId: string) => {
    switch(providerId) {
      case 'whatsapp':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone_number_id">Phone Number ID</Label>
              <Input 
                id="phone_number_id" 
                className="bg-slate-900 border-slate-700" 
                value={formData.phone_number_id || ''}
                onChange={e => setFormData({...formData, phone_number_id: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token</Label>
              <Input 
                id="access_token" 
                type="password"
                className="bg-slate-900 border-slate-700" 
                value={formData.access_token || ''}
                onChange={e => setFormData({...formData, access_token: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waba_id">WhatsApp Business Account ID</Label>
              <Input 
                id="waba_id" 
                className="bg-slate-900 border-slate-700" 
                value={formData.waba_id || ''}
                onChange={e => setFormData({...formData, waba_id: e.target.value})}
                required
              />
            </div>
          </>
        )
      case 'evolution':
        return (
          <>
             <div className="space-y-2">
              <Label htmlFor="instance_name">Nome da Instância</Label>
              <Input 
                id="instance_name" 
                className="bg-slate-900 border-slate-700" 
                value={formData.instance_name || ''}
                onChange={e => setFormData({...formData, instance_name: e.target.value})}
                required
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="api_key">API Key (Token)</Label>
              <Input 
                id="api_key" 
                type="password"
                className="bg-slate-900 border-slate-700" 
                value={formData.api_key || ''}
                onChange={e => setFormData({...formData, api_key: e.target.value})}
                required
              />
            </div>
          </>
        )
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor="api_key">Token / API Key</Label>
            <Input 
              id="api_key" 
              type="password"
              className="bg-slate-900 border-slate-700" 
              value={formData.api_key || ''}
              onChange={e => setFormData({...formData, api_key: e.target.value})}
              required
            />
          </div>
        )
    }
  }

  return (
    <div className="flex-1 space-y-8 p-8 bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Integrações</h1>
          <p className="text-slate-400 text-lg">Conecte seus canais de comunicação favoritos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROVIDERS.map((provider) => {
          const activeIntegration = getActiveIntegration(provider.id)
          const isConnected = !!activeIntegration
          const Icon = provider.icon

          return (
            <Card key={provider.id} className="bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-300 backdrop-blur-sm group">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${provider.bg} ${provider.border} border shadow-lg`}>
                    <Icon className={`h-8 w-8 ${provider.color}`} />
                  </div>
                  {isConnected && (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <CardTitle className="text-xl font-semibold text-white group-hover:text-green-400 transition-colors">
                    {provider.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">
                    {provider.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                   <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                      <div className="text-sm text-slate-500">
                        ID: {activeIntegration.id}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                            <Settings className="w-4 h-4 mr-2" /> Gerenciar
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-300">
                          <DropdownMenuItem className="hover:bg-red-900/20 text-red-400 cursor-pointer" onClick={() => handleDelete(activeIntegration.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Desconectar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                   </div>
                ) : (
                  <Dialog open={isDialogOpen && selectedProvider === provider.id} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) setSelectedProvider(null)
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                        onClick={() => {
                          setSelectedProvider(provider.id)
                          setFormData({})
                        }}
                      >
                        Conectar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-950 border-slate-800 text-white">
                      <DialogHeader>
                        <DialogTitle>Conectar {provider.name}</DialogTitle>
                        <DialogDescription>
                          Preencha as informações abaixo para estabelecer a conexão.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleConnect} className="space-y-4 mt-4">
                        {renderFormFields(provider.id)}
                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                          <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                            {isSubmitting ? 'Conectando...' : 'Salvar Conexão'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}