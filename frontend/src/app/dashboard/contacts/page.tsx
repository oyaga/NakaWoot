'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Plus, User, Mail, Phone, Search, Edit, Trash2, MoreVertical, MessageCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

interface Contact {
  id: number
  name: string
  email: string
  phone_number: string
  avatar_url: string
  additional_attributes?: any
  created_at: string
  updated_at: string
}

interface ContactsResponse {
  contacts: Contact[]
  meta: {
    count: number
    total_count: number
    current_page: number
    per_page: number
  }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedContacts, setSelectedContacts] = useState<number[]>([])
  const [isDeleteSelectedOpen, setIsDeleteSelectedOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)
  const [inboxes, setInboxes] = useState<any[]>([])
  const [isStartingConversation, setIsStartingConversation] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    avatar_url: '',
  })

  const fetchInboxes = useCallback(async () => {
    try {
      const response = await api.get('/inboxes')
      // Suporta formato Chatwoot { payload: [...] } e formato direto [...]
      const inboxes = response.data.payload || response.data || []
      setInboxes(inboxes)
    } catch (error) {
      console.error('Erro ao carregar inboxes:', error)
    }
  }, [])

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
      })

      if (searchQuery) {
        params.append('q', searchQuery)
      }

      const response = await api.get<ContactsResponse>(`/contacts?${params}`)
      setContacts(response.data.contacts || [])
      setTotalCount(response.data.meta?.total_count || 0)
    } catch (error: any) {
      toast.error('Erro ao carregar contatos', {
        description: error.response?.data?.error || 'Tente novamente mais tarde'
      })
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery])

  useEffect(() => {
    fetchContacts()
    fetchInboxes()
  }, [fetchContacts, fetchInboxes])

  const handleCreateContact = async () => {
    if (!formData.name || (!formData.email && !formData.phone_number)) {
      toast.error('Preencha os campos obrigatórios', {
        description: 'Nome e pelo menos Email ou Telefone são necessários'
      })
      return
    }

    try {
      setIsSubmitting(true)
      await api.post('/contacts', formData)
      toast.success('Contato criado com sucesso!')
      setIsCreateDialogOpen(false)
      resetForm()
      fetchContacts()
    } catch (error: any) {
      toast.error('Erro ao criar contato', {
        description: error.response?.data?.error || 'Tente novamente'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateContact = async () => {
    if (!selectedContact || !formData.name) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      setIsSubmitting(true)
      await api.put(`/contacts/${selectedContact.id}`, formData)
      toast.success('Contato atualizado com sucesso!')
      setIsEditDialogOpen(false)
      setSelectedContact(null)
      resetForm()
      fetchContacts()
    } catch (error: any) {
      toast.error('Erro ao atualizar contato', {
        description: error.response?.data?.error || 'Tente novamente'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteContact = async () => {
    if (!selectedContact) return

    try {
      setIsSubmitting(true)
      await api.delete(`/contacts/${selectedContact.id}`)
      toast.success('Contato excluído com sucesso!')
      setIsDeleteDialogOpen(false)
      setSelectedContact(null)
      fetchContacts()
    } catch (error: any) {
      toast.error('Erro ao excluir contato', {
        description: error.response?.data?.error || 'Tente novamente'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (contact: Contact) => {
    setSelectedContact(contact)
    setFormData({
      name: contact.name,
      email: contact.email,
      phone_number: contact.phone_number,
      avatar_url: contact.avatar_url || '',
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (contact: Contact) => {
    setSelectedContact(contact)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone_number: '',
      avatar_url: '',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleDeleteSelected = async () => {
    if (selectedContacts.length === 0) return

    try {
      setIsSubmitting(true)
      await api.delete('/contacts-batch', { data: { ids: selectedContacts } })
      toast.success('Contatos excluídos com sucesso!')
      setIsDeleteSelectedOpen(false)
      setSelectedContacts([])
      fetchContacts()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const err = error as any // Ensure we can access response
      toast.error('Erro ao excluir contatos', {
        description: err.response?.data?.error || 'Tente novamente'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAll = async () => {
    try {
      setIsSubmitting(true)
      await api.delete('/contacts-all')
      toast.success('Todos os contatos excluídos com sucesso!')
      setIsDeleteAllOpen(false)
      setSelectedContacts([])
      fetchContacts()
    } catch (error: unknown) {
      const err = error as any
      toast.error('Erro ao excluir todos contatos', {
        description: err.response?.data?.error || 'Tente novamente'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartConversation = async (contact: Contact) => {

    if (inboxes.length === 0) {
      toast.error('Nenhuma inbox disponível', {
        description: 'Crie uma inbox antes de iniciar conversas'
      })
      return
    }

    try {
      setIsStartingConversation(true)

      // Usar a primeira inbox disponível
      const defaultInbox = inboxes[0]

      const payload = {
        contact_id: contact.id,
        inbox_id: defaultInbox.id
      }

      const response = await api.post('/conversations', payload)

      toast.success('Conversa iniciada com sucesso!', {
        description: `Conversa com ${contact.name} foi criada`
      })

      // Redirecionar para a página de conversas com a conversa selecionada
      window.location.href = `/dashboard/conversations?conversation_id=${response.data.id}`
    } catch (error: any) {
      console.error('Erro ao criar conversa:', error)
      console.error('Detalhes do erro:', error.response?.data)
      toast.error('Erro ao iniciar conversa', {
        description: error.response?.data?.error || 'Tente novamente mais tarde'
      })
    } finally {
      setIsStartingConversation(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus contatos e clientes
          </p>
        </div>
        <div className="flex gap-2">
          {selectedContacts.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteSelectedOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Selecionados ({selectedContacts.length})
            </Button>
          )}
          {contacts.length > 0 && (
            <Button
              variant="outline"
              className="border-red-900/30 text-red-400 hover:bg-red-950/30"
              onClick={() => setIsDeleteAllOpen(true)}
            >
              Excluir Todos
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary text-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>Criar Novo Contato</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Adicione um novo contato ao sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome do contato"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="+55 11 99999-9999"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL (opcional)</Label>
                <Input
                  id="avatar"
                  placeholder="https://..."
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="border-border text-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateContact}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary text-foreground"
              >
                {isSubmitting ? 'Criando...' : 'Criar Contato'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setCurrentPage(1)
          }}
          className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded-full mb-4 bg-secondary" />
                <Skeleton className="h-4 w-3/4 mb-2 bg-secondary" />
                <Skeleton className="h-3 w-1/2 bg-secondary" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
            </h3>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              {searchQuery
                ? 'Tente buscar com outros termos'
                : 'Comece criando seu primeiro contato clicando no botão "Novo Contato"'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id} className="bg-card border-border hover:border-green-500/50 transition-colors relative group">
                 <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity data-[checked=true]:opacity-100" data-checked={selectedContacts.includes(contact.id)}>
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => {
                        setSelectedContacts(prev =>
                          prev.includes(contact.id) ? prev.filter(id => id !== contact.id) : [...prev, contact.id]
                        )
                      }}
                      className="data-[state=checked]:bg-primary border-border bg-background/50"
                    />
                 </div>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4 pl-6">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback className="bg-primary text-foreground">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4 text-primary" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-secondary border-border">
                        <DropdownMenuItem
                          onClick={() => handleStartConversation(contact)}
                          disabled={isStartingConversation}
                          className="text-primary focus:bg-secondary focus:text-primary"
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Iniciar Conversa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openEditDialog(contact)}
                          className="text-foreground focus:bg-secondary focus:text-foreground"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(contact)}
                          className="text-red-400 focus:bg-secondary focus:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{contact.name}</h3>
                  <div className="space-y-1 text-sm">
                    {contact.email && (
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="h-3 w-3 mr-2 text-primary" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone_number && (
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="h-3 w-3 mr-2 text-primary" />
                        {contact.phone_number}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Criado em {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Info */}
          {totalCount > 15 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-border text-foreground"
              >
                Anterior
              </Button>
              <span className="text-muted-foreground text-sm">
                Página {currentPage} - {contacts.length} de {totalCount} contatos
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={contacts.length < 15}
                className="border-border text-foreground"
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Atualize as informações do contato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-avatar">Avatar URL</Label>
              <Input
                id="edit-avatar"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="bg-secondary border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                resetForm()
              }}
              className="border-border text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateContact}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary text-foreground"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir o contato <strong className="text-foreground">{selectedContact?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive text-foreground"
            >
              {isSubmitting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Selected Dialog */}
      <AlertDialog open={isDeleteSelectedOpen} onOpenChange={setIsDeleteSelectedOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir Selecionados</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir <strong>{selectedContacts.length}</strong> contatos selecionados?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive text-foreground">
              {isSubmitting ? 'Excluindo...' : 'Excluir Selecionados'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Dialog */}
      <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir TODOS os Contatos</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir <strong>TODOS</strong> os contatos?
              Isso apagará permanentemente todos os registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive text-foreground">
              {isSubmitting ? 'Excluindo...' : 'EXCLUIR TUDO'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
