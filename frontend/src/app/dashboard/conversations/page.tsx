'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Search, Send, MoreVertical, Inbox, MessageSquare,
  Paperclip, Image as ImageIcon, FileText, Grip, Check, CheckCheck, X,
  Reply, Copy, Trash2, Edit2, Bell, BellOff, Volume2, Download, Mic,
  CheckSquare, Square, Sparkles, Plus, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useConversationStore } from '@/store/useConversationStore'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Contact {
  id: number
  name: string
  email: string
  phone_number: string
  identifier?: string
  avatar_url?: string
}

interface Conversation {
  id: number
  inbox_id: number
  contact_id: number
  status: string
  assignee_id: number | null
  unread_count: number
  last_activity_at: string
  created_at: string
  contact?: Contact
}

interface Message {
  id: number
  content: string
  account_id: number
  inbox_id: number
  conversation_id: number
  message_type: number
  content_type: string
  status: string
  is_from_me: boolean
  is_group?: boolean
  sender_type: string
  sender_id: number
  created_at: string
  timestamp?: string
  media_url?: string
  file_name?: string
  file_size?: number
  caption?: string
  whatsapp_message_id?: string
  group_data?: Record<string, unknown>
}

export default function ConversationsPage() {
  const searchParams = useSearchParams()
  const inboxId = searchParams.get('inbox_id')
  const conversationIdParam = searchParams.get('conversation_id')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [activeConversation, setActiveConversation] = useState<number | null>(null)
  const activeConversationRef = useRef<number | null>(null)

  // Manter ref sincronizado com o state para uso em callbacks de eventos (evitar stale closure)
  useEffect(() => {
    activeConversationRef.current = activeConversation
  }, [activeConversation])

  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState(true)
  const [conversationType, setConversationType] = useState<'all' | 'private' | 'group'>('all')

  // Seleção múltipla
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedConversations, setSelectedConversations] = useState<Set<number>>(new Set())

  // Nova conversa
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [inboxes, setInboxes] = useState<Array<{ id: number; name: string }>>([])

  // Upload de arquivos
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Gravação de áudio
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Redimensionamento
  const [sidebarWidth, setSidebarWidth] = useState(384)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // SSE é gerenciado globalmente pelo RealtimeProvider

  const scrollToBottom = (instant: boolean = false) => {
    const performScroll = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: instant ? 'instant' : 'smooth', 
          block: 'end' 
        })
      }
    }

    // Tenta imediatamente se possível
    performScroll()

    // E tenta novamente após um curto delay para garantir renderização do DOM
    setTimeout(performScroll, instant ? 50 : 100)
    
    // Se for instantâneo (carregamento inicial), tenta uma terceira vez um pouco depois
    if (instant) {
      setTimeout(performScroll, 200)
    }
  }

  // Função para formatar tamanho de arquivo
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  // Helper para ordenar conversas
  // Prioridade: 1) last_activity_at
  //             2) created_at
  const sortConversations = (params: Conversation[]) => {
    return [...params].sort((a, b) => {
      const timestampA = a.last_activity_at || a.created_at || new Date(0).toISOString()
      const timestampB = b.last_activity_at || b.created_at || new Date(0).toISOString()

      const dateA = new Date(timestampA).getTime()
      const dateB = new Date(timestampB).getTime()

      return dateB - dateA
    })
  }

  // REMOVIDO: Contadores separados não são mais necessários
  // O unread_count já vem do backend em cada conversation

  const showNotification = (message: Message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const conv = conversations.find(c => c.id === message.conversation_id)
      const contactName = conv?.contact?.name || 'Novo contato'

      new Notification(`Nova mensagem de ${contactName}`, {
        body: message.content || 'Mídia recebida',
        icon: '/logo.png',
        tag: `message-${message.id}`
      })
    }

    // Toast como fallback
    toast.info('Nova mensagem recebida', {
      description: message.content || 'Mídia recebida'
    })
  }

  const handleNewMessage = (message: Message) => {

    // Verificar se a mensagem é da conversa ativa usando o Ref para garantir valor atualizado
    if (message.conversation_id === activeConversationRef.current) {
      setMessages(prev => {
        const exists = prev.some(m => {
          const isDuplicate = m.id === message.id || (m.whatsapp_message_id && message.whatsapp_message_id && m.whatsapp_message_id === message.whatsapp_message_id)
          return isDuplicate
        })

        if (exists) return prev
        return [...prev, message]
      })

      // Scroll para baixo e marcar como lida
      scrollToBottom()
      if (activeConversationRef.current) {
        api.post(`/conversations/${activeConversationRef.current}/read`).catch(console.error)
      }
    }

    // Se a nova mensagem não é nossa e não estamos nela, mostrar notificação
    if (!message.is_from_me && message.message_type !== 1 && notifications && message.conversation_id !== activeConversationRef.current) {
      showNotification(message)
    }

    // Atualizar lista de conversas em tempo real
    setConversations(prev => {
      const conversationIndex = prev.findIndex(c => c.id === message.conversation_id)

      if (conversationIndex === -1) {
        if (inboxId && message.inbox_id.toString() !== inboxId) return prev
        return prev
      }

      const updated = [...prev]
      const conv = { ...updated[conversationIndex] }

      // Atualizar timestamp local - isso mantém a conversa no topo até ser aberta
      const now = new Date().toISOString()
      conv.last_activity_at = now

      // Incrementar contador se não for a conversa ativa E se for mensagem incoming
      if (activeConversationRef.current !== message.conversation_id && !message.is_from_me && message.message_type !== 1) {
        conv.unread_count = (conv.unread_count || 0) + 1
      }

      updated[conversationIndex] = conv
      return sortConversations(updated)
    })

    // Também atualizar filteredConversations
    setFilteredConversations(prev => {
      const conversationIndex = prev.findIndex(c => c.id === message.conversation_id)
      if (conversationIndex === -1) return prev

      const updated = [...prev]
      const conv = { ...updated[conversationIndex] }

      // Atualização automática via backend (conversation.updated event)
      const now = new Date().toISOString()
      conv.last_activity_at = now

      if (activeConversationRef.current !== message.conversation_id && !message.is_from_me && message.message_type !== 1) {
        // Mantém sincronizado
        conv.unread_count = (conv.unread_count || 0) + 1
      }

      updated[conversationIndex] = conv
      return sortConversations(updated)
    })
  }

  const handleConversationUpdated = (conversation: Conversation) => {

    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === conversation.id ? conversation : c
      )
      // Re-ordenar após atualizar
      return sortConversations(updated)
    })

    setFilteredConversations(prev => {
      const updated = prev.map(c =>
        c.id === conversation.id ? conversation : c
      )
      // Re-ordenar após atualizar
      return sortConversations(updated)
    })
  }

  // Busca de conversas
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = conversations.filter(conv => {
        // Identificar se é grupo pelo identifier do contato
        const isGroup = conv.contact?.identifier?.endsWith('@g.us') || false

        // Filtro por tipo
        if (conversationType === 'private' && isGroup) return false
        if (conversationType === 'group' && !isGroup) return false

        // Filtro por busca
        const contactName = conv.contact?.name?.toLowerCase() || ''
        const contactPhone = conv.contact?.phone_number?.toLowerCase() || ''
        const contactEmail = conv.contact?.email?.toLowerCase() || ''
        const query = searchQuery.toLowerCase()

        return contactName.includes(query) ||
               contactPhone.includes(query) ||
               contactEmail.includes(query)
      })
      setFilteredConversations(filtered)
    } else {
      // Se não tem busca, filtrar apenas por tipo
      const filtered = conversations.filter(conv => {
        const isGroup = conv.contact?.identifier?.endsWith('@g.us') || false
        if (conversationType === 'private') return !isGroup
        if (conversationType === 'group') return isGroup
        return true
      })
      setFilteredConversations(filtered)
    }
  }, [searchQuery, conversations, conversationType])

  useEffect(() => {
    fetchConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxId, conversationType])

  const fetchMessages = useCallback(async (conversationId: number) => {
    try {
      setLoadingMessages(true)
      const response = await api.get(`/conversations/${conversationId}/messages`)
      setMessages(response.data.messages || [])
      
      // Finalizar loading antes de tentar o scroll para garantir que o DOM renderizou as mensagens
      setLoadingMessages(false)

      // Scroll imediato para o final após carregar mensagens
      setTimeout(() => scrollToBottom(true), 50)

      // Marcar como lida no backend (não precisa dar await aqui para não atrasar a UI)
      api.post(`/conversations/${conversationId}/read`).catch(console.error)

      // Zerar unread_count local após marcar como lida
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      )
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Erro ao carregar mensagens')
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation)

      // Zerar unread_count localmente (feedback imediato)
      setConversations(prev => prev.map(c =>
        c.id === activeConversation ? { ...c, unread_count: 0 } : c
      ))

      setFilteredConversations(prev => prev.map(c =>
        c.id === activeConversation ? { ...c, unread_count: 0 } : c
      ))

      // Marcar como lida no backend (que atualiza no banco e envia broadcast)
      api.post(`/conversations/${activeConversation}/read`).catch(console.error)
    }
  }, [activeConversation, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Detectar quando a conversa ativa foi deletada
  useEffect(() => {
    if (activeConversation) {
      const conversationExists = conversations.some(c => c.id === activeConversation)
      if (!conversationExists) {
        setActiveConversation(null)
        setMessages([])
        toast.info('A conversa foi deletada')
      }
    }
  }, [activeConversation, conversations])

  // Conectar ao store para receber eventos em tempo real
  useEffect(() => {
    const unsubscribe = useConversationStore.subscribe((state, prevState) => {
      // Quando uma nova mensagem chega via realtime
      if (state.messages.length > prevState.messages.length) {
        const newMessages = state.messages.filter(
          msg => !prevState.messages.some(m => m.id === msg.id)
        )

        newMessages.forEach(newMsg => {
          handleNewMessage(newMsg as unknown as Message)
        })
      }

      // Quando uma conversa é atualizada via realtime
      state.conversations.forEach(conv => {
        const prevConv = prevState.conversations.find(c => c.id === conv.id)
        // Verificar se last_activity_at mudou (indica atualização)
        if (prevConv && (conv as unknown as Conversation).last_activity_at !== (prevConv as unknown as Conversation).last_activity_at) {
          handleConversationUpdated(conv as unknown as Conversation)
        }
      })
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle mouse resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 320 && newWidth <= 600) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Handlers para eventos SSE recebidos via RealtimeProvider
  // Os eventos são processados no realtime-provider.tsx e propagados via stores




  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev)
    setSelectedConversations(new Set())
  }

  const toggleConversationSelection = (conversationId: number) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId)
      } else {
        newSet.add(conversationId)
      }
      return newSet
    })
  }

  const selectAllConversations = () => {
    const allIds = new Set(filteredConversations.map(c => c.id))
    setSelectedConversations(allIds)
  }

  const deleteSelectedConversations = async () => {
    if (selectedConversations.size === 0) {
      toast.error('Nenhuma conversa selecionada')
      return
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedConversations.size} conversa(s)?`)) {
      return
    }

    try {
      // Deletar cada conversa selecionada
      const deletePromises = Array.from(selectedConversations).map(id =>
        api.delete(`/conversations/${id}`)
      )

      await Promise.all(deletePromises)

      // Remover conversas deletadas do estado
      setConversations(prev => prev.filter(c => !selectedConversations.has(c.id)))
      setSelectedConversations(new Set())
      setSelectionMode(false)

      toast.success(`${selectedConversations.size} conversa(s) excluída(s) com sucesso`)
    } catch (error) {
      console.error('Error deleting conversations:', error)
      toast.error('Erro ao excluir conversas')
    }
  }

  const markAllAsRead = async () => {
    try {
      const params = inboxId ? { inbox_id: inboxId } : {}
      await api.post('/conversations/mark-all-read', null, { params })
      
      // Atualizar estado local
      setConversations(prev => prev.map(c => ({ ...c, unread_count: 0 })))
      setFilteredConversations(prev => prev.map(c => ({ ...c, unread_count: 0 })))
      
      toast.success('Todas as conversas marcadas como lidas')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Erro ao marcar todas como lidas')
    }
  }

  // Calcular total de mensagens não lidas diretamente do unread_count
  const totalUnreadCount = filteredConversations.reduce((total, conv) => {
    const count = conv.unread_count || 0
    return total + count
  }, 0)

  // Debug: log do contador quando mudar
  useEffect(() => {
  }, [totalUnreadCount, filteredConversations])

  // Solicitar permissão de notificação
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Buscar inboxes ao abrir dialog
  useEffect(() => {
    if (isNewConversationOpen) {
      fetchInboxes()
      fetchContactsForNewConversation()
    }
  }, [isNewConversationOpen])

  const fetchInboxes = async () => {
    try {
      const response = await api.get('/inboxes')
      // Suporta formato Chatwoot { payload: [...] } e formato direto [...]
      const inboxes = response.data.payload || response.data || []
      setInboxes(inboxes)
    } catch (error) {
      console.error('Erro ao carregar inboxes:', error)
    }
  }

  const fetchContactsForNewConversation = async () => {
    try {
      setLoadingContacts(true)
      const response = await api.get('/contacts')
      setContacts(response.data.contacts || [])
    } catch (error) {
      console.error('Erro ao carregar contatos:', error)
      toast.error('Erro ao carregar contatos')
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleCreateConversation = async (contact: Contact) => {
    if (inboxes.length === 0) {
      toast.error('Nenhuma inbox disponível', {
        description: 'Crie uma inbox antes de iniciar conversas'
      })
      return
    }

    try {
      setCreatingConversation(true)
      const defaultInbox = inboxes[0]

      const response = await api.post('/conversations', {
        contact_id: contact.id,
        inbox_id: defaultInbox.id
      })

      toast.success('Conversa iniciada!', {
        description: `Conversa com ${contact.name} foi criada`
      })

      setIsNewConversationOpen(false)
      setContactSearch('')

      // Recarregar conversas e abrir a nova
      await fetchConversations()
      setActiveConversation(response.data.id)
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } }
      console.error('Erro ao criar conversa:', error)
      toast.error('Erro ao iniciar conversa', {
        description: err.response?.data?.error || 'Tente novamente'
      })
    } finally {
      setCreatingConversation(false)
    }
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const params: { inbox_id?: string; type?: string } = inboxId ? { inbox_id: inboxId } : {}

      // Adicionar filtro de tipo se não for 'all'
      if (conversationType !== 'all') {
        params.type = conversationType
      }

      const response = await api.get('/conversations', { params })

      // Ordenar conversas por last_activity_at
      const sortedConversations = sortConversations(response.data || [])

      setConversations(sortedConversations)
      setFilteredConversations(sortedConversations)

      // Se há conversationIdParam na URL, abrir essa conversa
      if (conversationIdParam) {
        const convId = parseInt(conversationIdParam, 10)
        setActiveConversation(convId)
      } else if (response.data && response.data.length > 0) {
        setActiveConversation(response.data[0].id)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast.error('Erro ao carregar conversas')
    } finally {
      setLoading(false)
    }
  }



  const sendMessage = async () => {

    if (!messageInput.trim()) {
      return
    }

    if (!activeConversation) {
      toast.error('Selecione uma conversa primeiro')
      return
    }

    if (sending) {
      return
    }

    try {
      setSending(true)

      const response = await api.post(`/conversations/${activeConversation}/messages`, {
        content: messageInput,
        content_type: 'text'
      })

      setMessages(prev => [...prev, response.data])
      setMessageInput('')
      scrollToBottom()
      toast.success('Mensagem enviada!')
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      console.error('[sendMessage] Erro ao enviar mensagem:', error)
      toast.error(axiosError.response?.data?.error || 'Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  // Upload de arquivo
  const handleFileUpload = async (file: File, contentType: string) => {
    if (!activeConversation) return

    try {
      setUploading(true)

      // Upload do arquivo para o backend
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const { url: mediaUrl, file_name } = uploadResponse.data

      // Enviar mensagem com o arquivo
      const response = await api.post(`/conversations/${activeConversation}/messages`, {
        content: file_name || file.name,
        content_type: contentType,
        media_url: mediaUrl
      })

      setMessages(prev => [...prev, response.data])
      toast.success('Arquivo enviado!')
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      console.error('Error uploading file:', error)
      toast.error(axiosError.response?.data?.error || 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = event.target.files?.[0]
    if (!file) return

    const contentType = type === 'image'
      ? 'image'
      : file.type.includes('video') ? 'video'
      : file.type.includes('audio') ? 'audio'
      : 'document'

    handleFileUpload(file, contentType)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyMessageText = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Texto copiado!')
  }

  const deleteMessage = async (messageId: number) => {
    try {
      await api.delete(`/messages/${messageId}`)
      setMessages(prev => prev.filter(m => m.id !== messageId))
      toast.success('Mensagem deletada')
    } catch {
      toast.error('Erro ao deletar mensagem')
    }
  }



  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      default:
        return null
    }
  }

  const formatMessageTime = (timestamp: string) => {
    if (!timestamp || timestamp === '0001-01-01T00:00:00Z') return ''
    try {
      const date = new Date(timestamp)
      // Se data inválida ou anterior a 2024 (projeto recente), retorna vazio
      if (isNaN(date.getTime()) || date.getFullYear() < 2024) return ''

      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: ptBR
      })
    } catch {
      return ''
    }
  }

  // Funções de gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudio(audioBlob)

        // Parar todos os tracks de mídia
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Timer de gravação
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Erro ao acessar o microfone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      audioChunksRef.current = []

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }

      // Parar stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
    }
  }

  const sendAudio = async (audioBlob: Blob) => {
    if (!activeConversation) return

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('attachments[]', audioBlob, `audio_${Date.now()}.webm`)
      formData.append('content', 'Áudio')
      formData.append('message_type', 'outgoing')
      formData.append('content_type', 'audio')

      await api.post(
        `/accounts/1/conversations/${activeConversation}/messages`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      toast.success('Áudio enviado com sucesso')
    } catch (error) {
      console.error('Error sending audio:', error)
      toast.error('Erro ao enviar áudio')
    } finally {
      setUploading(false)
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (isRecording) {
        cancelRecording()
      }
    }
  }, [isRecording])

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'file')}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />

      {/* Sidebar de Conversas - Redimensionável */}
      <div
        ref={sidebarRef}
        className="border-r border-border bg-background flex flex-col relative flex-shrink-0"
        style={{ width: `${sidebarWidth}px`, minWidth: '320px', maxWidth: '600px' }}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNewConversationOpen(true)}
              className="text-foreground0 hover:bg-primary/10"
              title="Nova Conversa"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifications(!notifications)}
              className={notifications ? 'text-foreground0' : 'text-muted-foreground'}
              title={notifications ? 'Notificações ativadas' : 'Notificações desativadas'}
            >
              {notifications ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {inboxId && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Inbox className="h-4 w-4 mr-2" />
                  Inbox #{inboxId}
                </div>
                {totalUnreadCount > 0 && (
                  <Badge className="bg-destructive text-white text-xs px-2 py-0.5">
                    {totalUnreadCount} não lida{totalUnreadCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectionMode}
                className={`flex-1 text-xs ${selectionMode ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {selectionMode ? <CheckSquare className="h-3.5 w-3.5 mr-1" /> : <Square className="h-3.5 w-3.5 mr-1" />}
                {selectionMode ? 'Cancelar' : 'Selecionar'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="flex-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                title="Marcar todas como lidas"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Ler todas
              </Button>

              {selectionMode && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllConversations}
                    className="text-xs text-primary hover:text-primary/80"
                    title="Selecionar todas"
                  >
                    Todas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deleteSelectedConversations}
                    disabled={selectedConversations.size === 0}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                    title={`Excluir ${selectedConversations.size} selecionada(s)`}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {selectedConversations.size > 0 ? `(${selectedConversations.size})` : 'Excluir'}
                  </Button>
                </>
              )}

              {/* Botão Limpar Inbox temporariamente desabilitado - usar seleção múltipla + excluir */}
            </div>

            {/* Filtro de tipo de conversa */}
            <div className="flex gap-1 p-1 bg-accent rounded-lg">
              <button
                onClick={() => setConversationType('all')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  conversationType === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setConversationType('private')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  conversationType === 'private'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                Privadas
              </button>
              <button
                onClick={() => setConversationType('group')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  conversationType === 'group'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                Grupos
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Carregando conversas...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa'}
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                {searchQuery
                  ? 'Tente buscar por outro termo'
                  : inboxId
                    ? 'Esta inbox ainda não possui conversas.'
                    : 'Você não possui conversas ainda.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {filteredConversations.map((conversation) => {
                // Badge "NOVA" baseado diretamente em unread_count
                const unreadCount = conversation.unread_count || 0
                const isNew = unreadCount > 0
                const isSelected = selectedConversations.has(conversation.id)

                return (
                  <div
                    key={conversation.id}
                    className={`flex items-start gap-2 p-3 mx-2 rounded-xl transition-all group relative ${
                      activeConversation === conversation.id
                        ? 'bg-primary/10 border border-primary/20'
                        : isSelected
                          ? 'bg-primary/5 border border-primary/20'
                          : 'hover:bg-accent border border-transparent'
                    }`}
                  >
                    {/* Checkbox para seleção */}
                    {selectionMode && (
                      <button
                        onClick={() => toggleConversationSelection(conversation.id)}
                        className="shrink-0 mt-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5 text-muted-foreground hover:text-muted-foreground" />
                        )}
                      </button>
                    )}

                    {/* Conteúdo da conversa */}
                    <button
                      onClick={() => !selectionMode && setActiveConversation(conversation.id)}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-border shrink-0">
                          {conversation.contact?.avatar_url && (
                            <AvatarImage
                              src={conversation.contact.avatar_url}
                              alt={conversation.contact?.name || 'Contact'}
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className={`${activeConversation === conversation.id ? 'bg-primary' : 'bg-muted'} text-foreground  font-medium`}>
                            {conversation.contact?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {/* Indicador de nova conversa */}
                        {isNew && (
                          <div className="absolute -top-1 -right-1 flex items-center">
                            <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className={`font-medium truncate text-sm ${activeConversation === conversation.id ? 'text-primary dark:text-primary' : 'text-foreground group-hover:text-foreground'}`}>
                              {conversation.contact?.name || `Contato #${conversation.contact_id}`}
                            </span>
                            {isNew && (
                              <Badge className="h-4 px-1.5 text-[9px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg shadow-yellow-500/30">
                                NOVA
                              </Badge>
                            )}
                          </div>
                          {conversation.last_activity_at && formatMessageTime(conversation.last_activity_at) && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatMessageTime(conversation.last_activity_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {conversation.contact?.identifier?.replace('@s.whatsapp.net', '')?.replace('@g.us', '') || 'Sem info'}
                          </p>
                          {unreadCount > 0 && (
                            <Badge className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-primary text-white text-[10px] font-bold border-0 shadow-lg shadow-green-500/20">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary transition-colors group"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Grip className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-background">
              <div className="flex items-center gap-3">
                <Avatar className="border-2 border-border">
                  {(() => {
                    const contact = conversations.find(c => c.id === activeConversation)?.contact
                    return contact?.avatar_url && (
                      <AvatarImage
                        src={contact.avatar_url}
                        alt={contact?.name || 'Contact'}
                        className="object-cover"
                      />
                    )
                  })()}
                  <AvatarFallback className="bg-muted text-foreground">
                    {conversations.find(c => c.id === activeConversation)?.contact?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {conversations.find(c => c.id === activeConversation)?.contact?.name || `Conversa #${activeConversation}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {conversations.find(c => c.id === activeConversation)?.contact?.phone_number || 'Sem telefone'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-background">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Carregando mensagens...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Início da conversa</p>
                    <p className="text-muted-foreground text-sm mt-1">Envie sua primeira mensagem</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((message, index) => {
                    const isFromMe = message.is_from_me || message.message_type === 1
                    const showAvatar = index === 0 || messages[index - 1].is_from_me !== message.is_from_me

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-2 group ${isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isFromMe && showAvatar && (
                          <Avatar className="h-8 w-8 border-2 border-border">
                            <AvatarFallback className="bg-muted text-foreground text-xs">
                              {conversations.find(c => c.id === activeConversation)?.contact?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isFromMe && !showAvatar && <div className="w-8" />}

                        <div className={`max-w-[70%] relative ${isFromMe ? 'order-first' : ''}`}>
                          {/* Menu de contexto */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`absolute ${isFromMe ? 'left-0' : 'right-0'} top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded`}>
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isFromMe ? 'start' : 'end'} className="bg-popover border-border">
                              <DropdownMenuItem onClick={() => copyMessageText(message.content)} className="text-popover-foreground hover:bg-accent">
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar texto
                              </DropdownMenuItem>
                              {message.media_url && (
                                <DropdownMenuItem onClick={() => window.open(message.media_url, '_blank')} className="text-popover-foreground hover:bg-accent">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-border" />
                              {isFromMe && (
                                <>
                                  <DropdownMenuItem className="text-popover-foreground hover:bg-accent">
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteMessage(message.id)} className="text-destructive hover:bg-accent">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Deletar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!isFromMe && (
                                <DropdownMenuItem className="text-popover-foreground hover:bg-accent">
                                  <Reply className="h-4 w-4 mr-2" />
                                  Responder
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {message.content_type !== 'text' && message.media_url && (
                            <div className="mb-2">
                              {message.content_type === 'image' && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={message.media_url}
                                  alt={message.file_name || 'Image'}
                                  referrerPolicy="no-referrer"
                                  className="rounded-lg max-w-full max-h-96 object-cover cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(message.media_url, '_blank')}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<div class="p-4 bg-muted text-muted-foreground text-sm rounded-lg flex items-center justify-center">Imagem indisponível</div>')
                                  }}
                                />
                              )}
                              {message.content_type === 'video' && (
                                <video
                                  src={message.media_url}
                                  controls
                                  className="rounded-lg max-w-full max-h-96"
                                />
                              )}
                              {message.content_type === 'audio' && (
                                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                                  <audio src={message.media_url} controls className="max-w-full" />
                                </div>
                              )}
                              {message.content_type === 'document' && (
                                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg min-w-[200px]">
                                  <FileText className="h-10 w-10 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate font-medium">{message.file_name || 'Document'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatFileSize(message.file_size)}
                                    </p>
                                  </div>
                                  <a
                                    href={message.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 p-2 bg-primary hover:bg-primary rounded-lg transition-colors"
                                    title="Download"
                                  >
                                    <Download className="h-4 w-4 text-foreground" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {message.content && (
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                isFromMe
                                  ? 'bg-primary text-foreground'
                                  : 'bg-muted text-foreground'
                              } max-w-full break-words shadow-sm`}
                            >
                              <div className="flex flex-col">
                                {!isFromMe && activeConversation && conversations.find(c => c.id === activeConversation)?.contact?.identifier?.endsWith('@g.us') && (
                                  <span className="text-[10px] text-primary font-bold mb-1 opacity-90 block">
                                    {(() => {
                                      if (!message.content) return null
                                      const match = message.content.match(/^\*\*([^-]+) - ([^:]+):\*\*\s*/)
                                      if (match) {
                                        return match[2].trim()
                                      }
                                      return message.sender_id || 'Membro'
                                    })()}
                                  </span>
                                )}
                                
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {(() => {
                                    // Remover o prefixo do remetente se existir e for grupo
                                    if (!message.content) return ''
                                    if (!isFromMe && activeConversation && conversations.find(c => c.id === activeConversation)?.contact?.identifier?.endsWith('@g.us')) {
                                      return message.content.replace(/^\*\*([^-]+) - ([^:]+):\*\*\s*/, '').trim()
                                    }
                                    return message.content
                                  })()}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className={`flex items-center gap-1 mt-1 px-1 ${
                            isFromMe ? 'justify-end text-muted-foreground' : 'justify-start text-muted-foreground'
                          }`}>
                            <span className="text-[10px] opacity-70">
                              {formatMessageTime(message.created_at)}
                            </span>
                            {isFromMe && getMessageStatusIcon(message.status)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-background">
              {isRecording ? (
                // UI de gravação ativa
                <div className="flex items-center gap-3 bg-destructive/10 border border-red-600/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative">
                      <Mic className="h-5 w-5 text-red-500 animate-pulse" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-ping" />
                    </div>
                    <span className="text-red-400 font-mono font-semibold">
                      {formatRecordingTime(recordingTime)}
                    </span>
                    <span className="text-muted-foreground text-sm">Gravando áudio...</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelRecording}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent"
                      title="Cancelar"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={stopRecording}
                      className="bg-destructive hover:bg-destructive text-foreground"
                      title="Enviar áudio"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ) : (
                // UI normal de input
                <div className="flex gap-2 items-end">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      title="Enviar arquivo"
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      title="Enviar imagem"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-red-400 hover:bg-destructive/10"
                      onClick={startRecording}
                      disabled={uploading}
                      title="Gravar áudio"
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-accent border-border text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                    disabled={sending || uploading}
                  />
                  <Button
                    size="icon"
                    className="bg-primary hover:bg-primary/90"
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || sending || uploading}
                  >
                    {sending || uploading ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Selecione uma conversa</p>
              <p className="text-muted-foreground text-sm mt-2">Escolha uma conversa da lista para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Nova Conversa */}
      <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecione um contato para iniciar uma nova conversa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Busca de contatos */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-10 bg-secondary border-border text-foreground"
              />
            </div>

            {/* Lista de contatos */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {loadingContacts ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando contatos...
                </div>
              ) : contacts.filter(c =>
                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  c.phone_number.includes(contactSearch) ||
                  c.email.toLowerCase().includes(contactSearch.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum contato encontrado
                </div>
              ) : (
                contacts
                  .filter(c =>
                    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.phone_number.includes(contactSearch) ||
                    c.email.toLowerCase().includes(contactSearch.toLowerCase())
                  )
                  .map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleCreateConversation(contact)}
                      disabled={creatingConversation}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left disabled:opacity-50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-foreground">
                          {contact.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{contact.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{contact.phone_number}</p>
                      </div>
                      {creatingConversation && (
                        <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </button>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
