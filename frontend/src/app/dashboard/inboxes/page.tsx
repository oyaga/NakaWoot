'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  AlertTriangle,
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
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [selectedInbox, setSelectedInbox] = useState<Inbox | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [inboxToDelete, setInboxToDelete] = useState<Inbox | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    channel_type: 'web',
    channel_id: 1,
    timezone: 'America/Sao_Paulo',
    greeting_enabled: false,
    greeting_message: '',
    enable_auto_assignment: true,
  })

  const [configData, setConfigData] = useState({
    name: '',
    channel_type: 'web',
    greeting_enabled: false,
    greeting_message: '',
    enable_auto_assignment: false,
    csat_survey_enabled: false,
    allow_messages_after_resolved: true,
  })

  useEffect(() => {
    fetchInboxes()
  }, [])

  const fetchInboxes = async () => {
    try {
      setLoading(true)
      const response = await api.get('/inboxes')
      // Suporta formato Chatwoot { payload: [...] } e formato direto [...]
      const inboxes = response.data.payload || response.data || []
      setInboxes(inboxes)
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

  const openDeleteDialog = (inbox: Inbox) => {
    setInboxToDelete(inbox)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteInbox = async () => {
    if (!inboxToDelete) return

    try {
      setIsDeleting(true)
      await api.delete(`/inboxes/${inboxToDelete.id}`)
      toast.success('Inbox deletada com sucesso!')
      setIsDeleteDialogOpen(false)
      setInboxToDelete(null)
      fetchInboxes()
    } catch (error) {
      console.error('Error deleting inbox:', error)
      toast.error('Erro ao deletar inbox')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenConfig = (inbox: Inbox) => {
    setSelectedInbox(inbox)
    setConfigData({
      name: inbox.name,
      channel_type: inbox.channel_type || 'web',
      greeting_enabled: inbox.greeting_enabled,
      greeting_message: inbox.greeting_message || '',
      enable_auto_assignment: inbox.enable_auto_assignment,
      csat_survey_enabled: inbox.csat_survey_enabled,
      allow_messages_after_resolved: inbox.allow_messages_after_resolved,
    })
    setIsConfigDialogOpen(true)
  }

  const handleUpdateInbox = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInbox) return

    try {
      setIsSubmitting(true)
      await api.put(`/inboxes/${selectedInbox.id}`, configData)
      toast.success('Configurações atualizadas com sucesso!')
      setIsConfigDialogOpen(false)
      fetchInboxes()
    } catch (error) {
      console.error('Error updating inbox:', error)
      toast.error('Erro ao atualizar configurações')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenConversations = (inboxId: number) => {
    router.push(`/dashboard/conversations?inbox_id=${inboxId}`)
  }

  const getChannelConfig = (type: string) => {
    switch (type) {
      case 'web':
        return { icon: Globe, color: 'text-primary', bg: 'bg-blue-400/10', border: 'border-blue-400/20' }
      case 'whatsapp':
        return { icon: MessageCircle, color: 'text-foreground0', bg: 'bg-primary/10', border: 'border-green-500/20' }
      case 'facebook':
        return { icon: Facebook, color: 'text-primary', bg: 'bg-primary/10', border: 'border-blue-600/20' }
      case 'instagram':
        return { icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20' }
      case 'email':
        return { icon: Mail, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }
      default:
        return { icon: InboxIcon, color: 'text-muted-foreground', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
    }
  }

  return (
    <div className="flex-1 space-y-8 p-8 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Inboxes</h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Gerencie seus canais de comunicação
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all duration-300">
              <Plus className="mr-2 h-5 w-5" />
              Nova Inbox
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>Criar Nova Inbox</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Configure um novo canal de atendimento para receber mensagens.
              </DialogDescription>
            </DialogHeader>
              <form onSubmit={handleCreateInbox} className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-foreground">Nome da Inbox</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Atendimento WhatsApp"
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="channel_type" className="text-muted-foreground">Tipo de Canal</Label>
                    <Select
                      value={formData.channel_type}
                      onValueChange={(value) => setFormData({ ...formData, channel_type: value })}
                    >
                      <SelectTrigger className="bg-secondary border-border text-foreground focus:border-primary/50 focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="web">Web Widget</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="timezone" className="text-muted-foreground">Fuso Horário</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                    >
                      <SelectTrigger className="bg-secondary border-border text-foreground focus:border-primary/50 focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                        <SelectItem value="America/New_York">New York (EST)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-border/50">
                    <h3 className="text-sm font-medium text-muted-foreground">Configurações Opcionais</h3>
                    
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-card border border-border hover:border-border transition-colors">
                      <input
                        type="checkbox"
                        id="greeting_enabled"
                        checked={formData.greeting_enabled}
                        onChange={(e) => setFormData({ ...formData, greeting_enabled: e.target.checked })}
                        className="rounded border-border bg-secondary text-primary focus:ring-primary/20"
                      />
                      <Label htmlFor="greeting_enabled" className="cursor-pointer text-muted-foreground flex-1">
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
                          className="bg-secondary border-border text-foreground focus:border-primary/50"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-card border border-border hover:border-border transition-colors">
                      <input
                        type="checkbox"
                        id="enable_auto_assignment"
                        checked={formData.enable_auto_assignment}
                        onChange={(e) => setFormData({ ...formData, enable_auto_assignment: e.target.checked })}
                        className="rounded border-border bg-secondary text-foreground0 focus:ring-green-500/20"
                      />
                      <Label htmlFor="enable_auto_assignment" className="cursor-pointer text-muted-foreground flex-1">
                        Atribuição automática de conversas
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
                  >
                    {isSubmitting ? 'Criando...' : 'Criar Inbox'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Config Dialog */}
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogContent className="sm:max-w-[700px] bg-background border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl text-foreground">Configurar Inbox</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Configure as opções de atendimento e comportamento da inbox {selectedInbox?.name}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateInbox} className="space-y-6 mt-4">
                <div className="space-y-6">
                  {/* Nome */}
                  <div className="grid gap-2">
                    <Label htmlFor="config_name" className="text-muted-foreground">Nome da Inbox</Label>
                    <Input
                      id="config_name"
                      value={configData.name}
                      onChange={(e) => setConfigData({ ...configData, name: e.target.value })}
                      placeholder="Ex: Atendimento WhatsApp"
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
                      required
                    />
                  </div>

                  {/* Tipo de Canal */}
                  <div className="grid gap-2">
                    <Label htmlFor="config_channel_type" className="text-muted-foreground">Tipo de Canal</Label>
                    <div className="p-4 rounded-lg bg-card border border-border">
                      <div className="grid grid-cols-5 gap-3">
                        {[
                          { value: 'web', icon: Globe, label: 'Web', color: 'text-primary', bg: 'bg-blue-400/10' },
                          { value: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: 'text-foreground0', bg: 'bg-primary/10' },
                          { value: 'facebook', icon: Facebook, label: 'Facebook', color: 'text-primary', bg: 'bg-primary/10' },
                          { value: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-pink-500', bg: 'bg-pink-500/10' },
                          { value: 'email', icon: Mail, label: 'Email', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                        ].map((channel) => {
                          const Icon = channel.icon
                          const isSelected = configData.channel_type === channel.value
                          return (
                            <button
                              key={channel.value}
                              type="button"
                              onClick={() => setConfigData({ ...configData, channel_type: channel.value })}
                              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 ${
                                isSelected
                                  ? `${channel.bg} border-${channel.color.replace('text-', '')} ${channel.color}`
                                  : 'bg-secondary border-border text-muted-foreground hover:border-border'
                              }`}
                            >
                              <Icon className={`h-6 w-6 ${isSelected ? channel.color : 'text-muted-foreground'}`} />
                              <span className="text-xs font-medium">{channel.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Mensagem de Saudação */}
                  <div className="space-y-3 p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="config_greeting" className="text-foreground font-semibold">Mensagem de Saudação</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="config_greeting"
                          checked={configData.greeting_enabled}
                          onChange={(e) => setConfigData({ ...configData, greeting_enabled: e.target.checked })}
                          className="rounded border-border bg-secondary text-primary focus:ring-primary/20"
                        />
                        <Label htmlFor="config_greeting" className="cursor-pointer text-muted-foreground text-sm">
                          Habilitar
                        </Label>
                      </div>
                    </div>
                    {configData.greeting_enabled && (
                      <div className="animate-in slide-in-from-top-2 duration-200">
                        <Input
                          value={configData.greeting_message}
                          onChange={(e) => setConfigData({ ...configData, greeting_message: e.target.value })}
                          placeholder="Olá! Como podemos ajudar?"
                          className="bg-secondary border-border text-foreground focus:border-primary/50"
                        />
                        <p className="text-xs text-muted-foreground mt-2">Mensagem enviada automaticamente quando um novo contato inicia uma conversa.</p>
                      </div>
                    )}
                  </div>

                  {/* Configurações Avançadas */}
                  <div className="space-y-3 p-4 rounded-lg bg-card border border-border">
                    <Label className="text-foreground font-semibold">Configurações Avançadas</Label>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border hover:border-border transition-colors">
                        <div className="flex-1">
                          <Label htmlFor="config_auto_assign" className="cursor-pointer text-muted-foreground">
                            Atribuição Automática
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">Distribui conversas automaticamente entre agentes disponíveis</p>
                        </div>
                        <input
                          type="checkbox"
                          id="config_auto_assign"
                          checked={configData.enable_auto_assignment}
                          onChange={(e) => setConfigData({ ...configData, enable_auto_assignment: e.target.checked })}
                          className="rounded border-border bg-background text-primary focus:ring-primary/20"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border hover:border-border transition-colors">
                        <div className="flex-1">
                          <Label htmlFor="config_csat" className="cursor-pointer text-muted-foreground">
                            Pesquisa de Satisfação (CSAT)
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">Solicita feedback após resolução de conversas</p>
                        </div>
                        <input
                          type="checkbox"
                          id="config_csat"
                          checked={configData.csat_survey_enabled}
                          onChange={(e) => setConfigData({ ...configData, csat_survey_enabled: e.target.checked })}
                          className="rounded border-border bg-background text-primary focus:ring-primary/20"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border hover:border-border transition-colors">
                        <div className="flex-1">
                          <Label htmlFor="config_allow_after_resolved" className="cursor-pointer text-muted-foreground">
                            Permitir Mensagens Após Resolução
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">Permite que contatos enviem mensagens em conversas resolvidas</p>
                        </div>
                        <input
                          type="checkbox"
                          id="config_allow_after_resolved"
                          checked={configData.allow_messages_after_resolved}
                          onChange={(e) => setConfigData({ ...configData, allow_messages_after_resolved: e.target.checked })}
                          className="rounded border-border bg-background text-primary focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsConfigDialogOpen(false)}
                    className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
      </div>

      {/* Grid Content */}
      <div className="relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-background/50 border-border">
                <CardHeader>
                  <Skeleton className="h-8 w-12 rounded-full bg-secondary" />
                  <Skeleton className="h-6 w-3/4 mt-4 bg-secondary" />
                  <Skeleton className="h-4 w-1/2 mt-2 bg-secondary" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full bg-secondary rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : inboxes.length === 0 ? (
          <Card className="border-2 border-dashed border-border bg-secondary/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-full bg-card border border-border flex items-center justify-center mb-6 shadow-xl shadow-black/20">
                <InboxIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Nenhuma inbox configurada</h3>
              <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                Comece conectando seus canais de comunicação. Suas messages do WhatsApp, Instagram e outros aparecerão aqui.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8">
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
                  className="group relative overflow-hidden bg-card border-border hover:border-primary/50 hover:bg-secondary/50 transition-all duration-300 backdrop-blur-sm cursor-pointer shadow-sm hover:shadow-md"
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
                            className="text-muted-foreground hover:text-foreground hover:bg-secondary -mr-2 -mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                          <DropdownMenuItem
                            className="hover:bg-secondary hover:text-foreground cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenConfig(inbox)
                            }}
                          >
                            <Settings className="mr-2 h-4 w-4" /> Configurar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="hover:bg-destructive/10 text-destructive hover:text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeleteDialog(inbox)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="mt-4">
                      <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors">
                        {inbox.name}
                      </CardTitle>
                      <CardDescription className="capitalize text-muted-foreground mt-1 flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${config.bg.replace('/10', '')} ${config.color.replace('text-', 'bg-')}`}></span>
                        {inbox.channel_type}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {inbox.greeting_enabled && (
                        <Badge variant="outline" className="border-green-500/30 text-primary bg-primary/5">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Saudação
                        </Badge>
                      )}
                      {inbox.enable_auto_assignment && (
                        <Badge variant="outline" className="border-blue-500/30 text-primary bg-blue-500/5">
                          Auto-atribuição
                        </Badge>
                      )}
                      {inbox.csat_survey_enabled && (
                        <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/5">
                          CSAT
                        </Badge>
                      )}
                    </div>

                    <div className="pt-4 mt-2 border-t border-border/50 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">ID: {inbox.id}</span>
                      {/* Placeholder for potential stats */}
                      <span className="flex items-center text-foreground0/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse"></span>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-background border-border max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-destructive/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <AlertDialogTitle className="text-xl text-center text-foreground">
              Excluir Inbox
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground">
              Tem certeza que deseja excluir a inbox{' '}
              <span className="font-semibold text-foreground">{inboxToDelete?.name}</span>?
              <br />
              <span className="text-red-400/80 text-sm mt-2 block">
                Esta ação não pode ser desfeita. Todas as conversas e mensagens associadas serão perdidas.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:justify-center mt-2">
            <AlertDialogCancel 
              className="flex-1 sm:flex-none bg-secondary border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInbox}
              disabled={isDeleting}
              className="flex-1 sm:flex-none bg-destructive hover:bg-destructive text-white border-0"
            >
              {isDeleting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Inbox
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
