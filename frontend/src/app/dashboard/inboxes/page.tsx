'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import api from '@/lib/api'
import { 
  Plus, 
  Inbox as InboxIcon, 
  MessageSquare, 
  Settings, 
  Trash2, 
  Globe, 
  Mail, 
  Facebook, 
  Instagram, 
  MessageCircle,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Inbox {
  id: number
  name: string
  channel_type: string
  channel_id: number
  greeting_enabled: boolean
  greeting_message: string
  working_hours_enabled: boolean
  out_of_office_message: string
  timezone: string
  enable_auto_assignment: boolean
  csat_survey_enabled: boolean
  allow_messages_after_resolved: boolean
  avatar_url: string
  created_at: string
  updated_at: string
}

export default function InboxesPage() {
  const router = useRouter()
  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    channel_type: 'web',
    channel_id: 1,
    timezone: 'America/Sao_Paulo',
    greeting_enabled: false,
    greeting_message: '',
    enable_auto_assignment: true,
  })

  useEffect(() => {
    fetchInboxes()
  }, [])

  const fetchInboxes = async () => {
    try {
      setLoading(true)
      const response = await api.get('/inboxes')
      setInboxes(response.data || [])
    } catch (error) {
      console.error('Error fetching inboxes:', error)
      toast.error('Erro ao carregar inboxes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInbox = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      await api.post('/inboxes', formData)
      toast.success('Inbox criada com sucesso!')
      setIsCreateDialogOpen(false)
      setFormData({
        name: '',
        channel_type: 'web',
        channel_id: 1,
        timezone: 'America/Sao_Paulo',
        greeting_enabled: false,
        greeting_message: '',
        enable_auto_assignment: true,
      })
      fetchInboxes()
    } catch (error) {
      console.error('Error creating inbox:', error)
      toast.error('Erro ao criar inbox')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteInbox = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta inbox?')) return

    try {
      await api.delete(`/inboxes/${id}`)
      toast.success('Inbox deletada com sucesso!')
      fetchInboxes()
    } catch (error) {
      console.error('Error deleting inbox:', error)
      toast.error('Erro ao deletar inbox')
    }
  }

  const handleOpenConversations = (inboxId: number) => {
    router.push(`/dashboard/conversations?inbox_id=${inboxId}`)
  }

  const getChannelConfig = (type: string) => {
    switch (type) {
      case 'web':
        return { icon: Globe, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' }
      case 'whatsapp':
        return { icon: MessageCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' }
      case 'facebook':
        return { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-600/10', border: 'border-blue-600/20' }
      case 'instagram':
        return { icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20' }
      case 'email':
        return { icon: Mail, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }
      default:
        return { icon: InboxIcon, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
    }
  }

  return (
    <div className="flex-1 space-y-8 p-8 bg-slate-950 min-h-screen">
      {/* Header with Gradient Effect */}
      <div className="relative">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
              Inboxes
            </h1>
            <p className="text-slate-400 text-lg">
              Gerencie seus canais de comunicação e conecte-se com seus clientes.
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-green-900/20 border-0 transition-all duration-300 hover:scale-[1.02]">
                <Plus className="mr-2 h-5 w-5" />
                Nova Inbox
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-slate-950 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-2xl text-white">Criar Nova Inbox</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Configure um novo canal de atendimento para receber mensagens.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInbox} className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-slate-300">Nome da Inbox</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Atendimento WhatsApp"
                      className="bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-600 focus:border-green-500/50 focus:ring-green-500/20"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="channel_type" className="text-slate-300">Tipo de Canal</Label>
                    <Select
                      value={formData.channel_type}
                      onValueChange={(value) => setFormData({ ...formData, channel_type: value })}
                    >
                      <SelectTrigger className="bg-slate-900/50 border-slate-800 text-white focus:border-green-500/50 focus:ring-green-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="web">Web Widget</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="timezone" className="text-slate-300">Fuso Horário</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                    >
                      <SelectTrigger className="bg-slate-900/50 border-slate-800 text-white focus:border-green-500/50 focus:ring-green-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                        <SelectItem value="America/New_York">New York (EST)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-slate-800/50">
                    <h3 className="text-sm font-medium text-slate-400">Configurações Opcionais</h3>
                    
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-900/30 border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        id="greeting_enabled"
                        checked={formData.greeting_enabled}
                        onChange={(e) => setFormData({ ...formData, greeting_enabled: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-800 text-green-500 focus:ring-green-500/20"
                      />
                      <Label htmlFor="greeting_enabled" className="cursor-pointer text-slate-300 flex-1">
                        Habilitar mensagem de saudação
                      </Label>
                    </div>

                    {formData.greeting_enabled && (
                      <div className="pl-8 animate-in slide-in-from-top-2 duration-200">
                        <Input
                          id="greeting_message"
                          value={formData.greeting_message}
                          onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                          placeholder="Olá! Como podemos ajudar?"
                          className="bg-slate-900/50 border-slate-800 text-white focus:border-green-500/50"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-900/30 border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        id="enable_auto_assignment"
                        checked={formData.enable_auto_assignment}
                        onChange={(e) => setFormData({ ...formData, enable_auto_assignment: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-800 text-green-500 focus:ring-green-500/20"
                      />
                      <Label htmlFor="enable_auto_assignment" className="cursor-pointer text-slate-300 flex-1">
                        Atribuição automática de conversas
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                  >
                    {isSubmitting ? 'Criando...' : 'Criar Inbox'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid Content */}
      <div className="relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-slate-950/50 border-slate-800">
                <CardHeader>
                  <Skeleton className="h-8 w-12 rounded-full bg-slate-800" />
                  <Skeleton className="h-6 w-3/4 mt-4 bg-slate-800" />
                  <Skeleton className="h-4 w-1/2 mt-2 bg-slate-800" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full bg-slate-800 rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : inboxes.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-800 bg-slate-950/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-xl shadow-black/20">
                <InboxIcon className="h-10 w-10 text-slate-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Nenhuma inbox configurada</h3>
              <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
                Comece conectando seus canais de comunicação. Suas messages do WhatsApp, Instagram e outros aparecerão aqui.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8">
                <Plus className="mr-2 h-5 w-5" />
                Criar Primeira Inbox
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inboxes.map((inbox) => {
              const config = getChannelConfig(inbox.channel_type)
              const Icon = config.icon

              return (
                <Card
                  key={inbox.id}
                  className="group relative overflow-hidden bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-300 backdrop-blur-sm cursor-pointer"
                  onClick={() => handleOpenConversations(inbox.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-xl ${config.bg} ${config.border} border shadow-lg`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-white hover:bg-slate-800/50 -mr-2 -mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-300">
                          <DropdownMenuItem className="hover:bg-slate-800 hover:text-white cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" /> Configurar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="hover:bg-red-900/20 text-red-400 hover:text-red-300 cursor-pointer focus:bg-red-900/20 focus:text-red-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteInbox(inbox.id)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="mt-4">
                      <CardTitle className="text-xl font-semibold text-white group-hover:text-green-400 transition-colors">
                        {inbox.name}
                      </CardTitle>
                      <CardDescription className="capitalize text-slate-400 mt-1 flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${config.bg.replace('/10', '')} ${config.color.replace('text-', 'bg-')}`}></span>
                        {inbox.channel_type}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {inbox.greeting_enabled && (
                        <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/5">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Saudação
                        </Badge>
                      )}
                      {inbox.enable_auto_assignment && (
                        <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5">
                          Auto-atribuição
                        </Badge>
                      )}
                      {inbox.csat_survey_enabled && (
                        <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/5">
                          CSAT
                        </Badge>
                      )}
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
                      <span>Timezone: {inbox.timezone}</span>
                      {/* Placeholder for potential stats */}
                      <span className="flex items-center text-green-500/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                        Online
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
