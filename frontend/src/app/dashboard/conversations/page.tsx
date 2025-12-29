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
  CheckSquare, Square, Sparkles, Plus
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
// useAuthStore não é mais necessário aqui - SSE é gerenciado pelo RealtimeProvider
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
  thumbnail?: string
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
    if (messagesEndRef.current) {
      // Usar setTimeout para garantir que o DOM foi atualizado
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: instant ? 'instant' : 'smooth', 
          block: 'end' 
        })
      }, instant ? 50 : 100)
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

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation)
    }
  }, [activeConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

  const handleNewMessage = (message: Message) => {
    console.log('[handleNewMessage] Received message:', {
      messageId: message.id,
      conversationId: message.conversation_id,
      activeConversation: activeConversation,
      content: message.content,
      whatsapp_message_id: message.whatsapp_message_id
    })

    // Verificar se a mensagem é da conversa ativa
    if (message.conversation_id === activeConversation) {
      console.log('[handleNewMessage] Message is for active conversation, adding to state')
      setMessages(prev => {
        console.log('[handleNewMessage] Current messages count:', prev.length)
        // Verificar se a mensagem já existe (evitar duplicatas)
        const exists = prev.some(m => {
          const isDuplicate = m.id === message.id || (m.whatsapp_message_id && message.whatsapp_message_id && m.whatsapp_message_id === message.whatsapp_message_id)
          if (isDuplicate) {
            console.log('[handleNewMessage] Found duplicate:', {
              existingId: m.id,
              newId: message.id,
              existingWhatsappId: m.whatsapp_message_id,
              newWhatsappId: message.whatsapp_message_id
            })
          }
          return isDuplicate
        })

        if (exists) {
          console.log('[handleNewMessage] Message already exists, skipping')
          return prev
        }

        console.log('[handleNewMessage] Adding new message to list, new count will be:', prev.length + 1)
        return [...prev, message]
      })

      // Scroll para baixo ao receber nova mensagem
      scrollToBottom()

      // Se a nova mensagem não é nossa, mostrar notificação
      console.log('[Notification Debug]', { is_from_me: message.is_from_me, message_type: message.message_type, notifications })
      if (!message.is_from_me && message.message_type !== 1 && notifications) {
        console.log('[Notification Debug] Showing notification for message:', message.id)
        showNotification(message)
      } else {
        console.log('[Notification Debug] Skipping notification - fromMe or outgoing or notifications disabled')
      }

      // Atualizar lista de conversas em tempo real
      setConversations(prev => {
        const conversationIndex = prev.findIndex(c => c.id === message.conversation_id)

        // Se a conversa não existe na lista, verificar se deveria estar (por inbox)
        if (conversationIndex === -1) {
          // Se temos filtro de inbox e a mensagem não é dessa inbox, ignorar
          if (inboxId && message.inbox_id.toString() !== inboxId) {
            return prev
          }
          // Caso contrário, a conversa será adicionada quando fetchConversations for chamado
          return prev
        }

        const updatedConversation = { ...prev[conversationIndex] }

        // Atualizar timestamp
        updatedConversation.last_activity_at = new Date().toISOString()

        // Incrementar contador se não for a conversa ativa E se for mensagem incoming (message_type = 0)
        if (activeConversation !== message.conversation_id && !message.is_from_me && message.message_type !== 1) {
          updatedConversation.unread_count = (updatedConversation.unread_count || 0) + 1
          console.log('[Badge Debug] Incremented unread_count for conversation', message.conversation_id, 'to', updatedConversation.unread_count)
        } else {
          console.log('[Badge Debug] NOT incrementing unread_count -', {
            isActiveConv: activeConversation === message.conversation_id,
            isFromMe: message.is_from_me,
            messageType: message.message_type
          })
        }

        // Remover a conversa da posição atual e adicionar no topo
        const newConversations = [...prev]
        newConversations.splice(conversationIndex, 1)
        return [updatedConversation, ...newConversations]
      })

      // Marcar como lida se a conversa está ativa
      if (activeConversation === message.conversation_id) {
        api.post(`/conversation/${activeConversation}/read`).catch(console.error)
      }
    }
  }

  const handleMessageUpdated = (message: Message) => {
    setMessages(prev => prev.map(m =>
      m.id === message.id ? message : m
    ))
  }

  const handleConversationNew = (conversation: Conversation) => {
    setConversations(prev => {
      // Verificar se a conversa já existe (evitar duplicatas)
      const exists = prev.some(c => c.id === conversation.id)
      if (exists) return prev

      // Adicionar nova conversa no topo da lista
      return [conversation, ...prev]
    })
  }

  const handleConversationUpdated = (conversation: Conversation) => {
    setConversations(prev => prev.map(c =>
      c.id === conversation.id ? conversation : c
    ))
  }

  const showNotification = (message: Message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const conv = conversations.find(c => c.id === activeConversation)
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

  // Funções de seleção e gerenciamento
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

  const clearInbox = async () => {
    if (!inboxId) {
      toast.error('Nenhuma inbox selecionada')
      return
    }

    if (!confirm('Tem certeza que deseja limpar TODAS as conversas desta inbox?')) {
      return
    }

    try {
      await api.post(`/inbox-clear/${inboxId}`)
      setConversations([])
      setFilteredConversations([])
      setActiveConversation(null)
      toast.success('Inbox limpa com sucesso')
    } catch (error) {
      console.error('Error clearing inbox:', error)
      toast.error('Erro ao limpar inbox')
    }
  }

  // Calcular total de mensagens não lidas
  const totalUnreadCount = filteredConversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)

  // Debug: log do contador quando mudar
  useEffect(() => {
    if (totalUnreadCount > 0) {
      console.log('[Badge Debug] Total unread count:', totalUnreadCount)
      console.log('[Badge Debug] Filtered conversations:', filteredConversations.map(c => ({ id: c.id, unread: c.unread_count })))
    }
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
      setInboxes(response.data || [])
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
      setConversations(response.data || [])
      setFilteredConversations(response.data || [])

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

  const fetchMessages = async (conversationId: number) => {
    try {
      setLoadingMessages(true)
      const response = await api.get(`/conversation/${conversationId}/messages`)
      setMessages(response.data.messages || [])

      // Scroll imediato para o final após carregar mensagens
      setTimeout(() => scrollToBottom(true), 150)

      // Marcar como lida
      await api.post(`/conversation/${conversationId}/read`)

      // Atualizar contador local
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
    } finally {
      setLoadingMessages(false)
    }
  }

  const sendMessage = async () => {
    console.log('[sendMessage] Iniciando envio...', {
      messageInput: messageInput,
      activeConversation: activeConversation,
      sending: sending,
      messageInputTrimmed: messageInput.trim()
    })

    if (!messageInput.trim()) {
      console.log('[sendMessage] Mensagem vazia, abortando')
      return
    }

    if (!activeConversation) {
      console.log('[sendMessage] Nenhuma conversa ativa, abortando')
      toast.error('Selecione uma conversa primeiro')
      return
    }

    if (sending) {
      console.log('[sendMessage] Já está enviando, abortando')
      return
    }

    try {
      setSending(true)
      console.log('[sendMessage] Enviando para:', `/conversation/${activeConversation}/messages`)

      const response = await api.post(`/conversation/${activeConversation}/messages`, {
        content: messageInput,
        content_type: 'text'
      })

      console.log('[sendMessage] Resposta recebida:', response.data)
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
      console.log('[sendMessage] Finalizando envio')
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
      const response = await api.post(`/conversation/${activeConversation}/messages`, {
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
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
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
        className="border-r border-slate-800 bg-slate-950 flex flex-col relative flex-shrink-0"
        style={{ width: `${sidebarWidth}px`, minWidth: '320px', maxWidth: '600px' }}
      >
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-slate-500 hover:text-white" />
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNewConversationOpen(true)}
              className="text-green-500 hover:bg-green-600/10"
              title="Nova Conversa"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifications(!notifications)}
              className={notifications ? 'text-green-500' : 'text-slate-500'}
              title={notifications ? 'Notificações ativadas' : 'Notificações desativadas'}
            >
              {notifications ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {inboxId && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-400">
                  <Inbox className="h-4 w-4 mr-2" />
                  Inbox #{inboxId}
                </div>
                {totalUnreadCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">
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
                className={`flex-1 text-xs ${selectionMode ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
              >
                {selectionMode ? <CheckSquare className="h-3.5 w-3.5 mr-1" /> : <Square className="h-3.5 w-3.5 mr-1" />}
                {selectionMode ? 'Cancelar' : 'Selecionar'}
              </Button>

              {selectionMode && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllConversations}
                    className="text-xs text-blue-400 hover:text-blue-300"
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
            <div className="flex gap-1 p-1 bg-slate-900 rounded-lg">
              <button
                onClick={() => setConversationType('all')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  conversationType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setConversationType('private')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  conversationType === 'private'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Privadas
              </button>
              <button
                onClick={() => setConversationType('group')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  conversationType === 'group'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Grupos
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-slate-500">Carregando conversas...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-slate-700 mb-4" />
              <p className="text-slate-500 font-medium">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa'}
              </p>
              <p className="text-slate-600 text-sm mt-2">
                {searchQuery
                  ? 'Tente buscar por outro termo'
                  : inboxId
                    ? 'Esta inbox ainda não possui conversas.'
                    : 'Você não possui conversas ainda.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {filteredConversations.map((conversation, index) => {
                const isNew = index === 0 && conversation.unread_count > 0
                const isSelected = selectedConversations.has(conversation.id)

                return (
                  <div
                    key={conversation.id}
                    className={`flex items-start gap-2 p-3 mx-2 rounded-xl transition-all group relative ${
                      activeConversation === conversation.id
                        ? 'bg-blue-600/10 border border-blue-600/20'
                        : isSelected
                          ? 'bg-green-600/10 border border-green-600/20'
                          : 'hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    {/* Checkbox para seleção */}
                    {selectionMode && (
                      <button
                        onClick={() => toggleConversationSelection(conversation.id)}
                        className="shrink-0 mt-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-green-400" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>
                    )}

                    {/* Conteúdo da conversa */}
                    <button
                      onClick={() => !selectionMode && setActiveConversation(conversation.id)}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-slate-800 shrink-0">
                          {(conversation.contact?.avatar_url || conversation.contact?.thumbnail) && (
                            <AvatarImage 
                              src={conversation.contact?.avatar_url || conversation.contact?.thumbnail} 
                              alt={conversation.contact?.name || 'Contact'}
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className={`${activeConversation === conversation.id ? 'bg-blue-600' : 'bg-slate-800'} text-white font-medium`}>
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
                            <span className={`font-medium truncate text-sm ${activeConversation === conversation.id ? 'text-blue-400' : 'text-slate-200 group-hover:text-white'}`}>
                              {conversation.contact?.name || `Contato #${conversation.contact_id}`}
                            </span>
                            {isNew && (
                              <Badge className="h-4 px-1.5 text-[9px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg shadow-yellow-500/30">
                                NOVA
                              </Badge>
                            )}
                          </div>
                          {conversation.last_activity_at && formatMessageTime(conversation.last_activity_at) && (
                            <span className="text-[10px] text-slate-500 shrink-0">
                              {formatMessageTime(conversation.last_activity_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500 truncate max-w-[140px]">
                            {conversation.contact?.identifier?.replace('@s.whatsapp.net', '')?.replace('@g.us', '') || 'Sem info'}
                          </p>
                          {conversation.unread_count > 0 && (
                            <Badge className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-green-500 text-white text-[10px] font-bold border-0 shadow-lg shadow-green-500/20">
                              {conversation.unread_count}
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
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-green-500 transition-colors group"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Grip className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col bg-slate-950 min-w-0 overflow-hidden">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900">
              <div className="flex items-center gap-3">
                <Avatar className="border-2 border-slate-700">
                  <AvatarFallback className="bg-slate-700 text-white">
                    {conversations.find(c => c.id === activeConversation)?.contact?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-white">
                    {conversations.find(c => c.id === activeConversation)?.contact?.name || `Conversa #${activeConversation}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {conversations.find(c => c.id === activeConversation)?.contact?.phone_number || 'Sem telefone'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-slate-500">Carregando mensagens...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500">Início da conversa</p>
                    <p className="text-slate-600 text-sm mt-1">Envie sua primeira mensagem</p>
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
                          <Avatar className="h-8 w-8 border-2 border-slate-800">
                            <AvatarFallback className="bg-slate-700 text-white text-xs">
                              {conversations.find(c => c.id === activeConversation)?.contact?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isFromMe && !showAvatar && <div className="w-8" />}

                        <div className={`max-w-[70%] relative ${isFromMe ? 'order-first' : ''}`}>
                          {/* Menu de contexto */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`absolute ${isFromMe ? 'left-0' : 'right-0'} top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded`}>
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isFromMe ? 'start' : 'end'} className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem onClick={() => copyMessageText(message.content)} className="text-white hover:bg-slate-700">
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar texto
                              </DropdownMenuItem>
                              {message.media_url && (
                                <DropdownMenuItem onClick={() => window.open(message.media_url, '_blank')} className="text-white hover:bg-slate-700">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-slate-700" />
                              {isFromMe && (
                                <>
                                  <DropdownMenuItem className="text-white hover:bg-slate-700">
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteMessage(message.id)} className="text-red-400 hover:bg-slate-700">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Deletar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!isFromMe && (
                                <DropdownMenuItem className="text-white hover:bg-slate-700">
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
                                  className="rounded-lg max-w-full max-h-96 object-cover cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(message.media_url, '_blank')}
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
                                <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                                  <Volume2 className="h-5 w-5 text-slate-400" />
                                  <audio src={message.media_url} controls className="max-w-full" />
                                </div>
                              )}
                              {message.content_type === 'document' && (
                                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg min-w-[200px]">
                                  <FileText className="h-10 w-10 text-slate-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate font-medium">{message.file_name || 'Document'}</p>
                                    <p className="text-xs text-slate-400">
                                      {formatFileSize(message.file_size)}
                                    </p>
                                  </div>
                                  <a
                                    href={message.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                    title="Download"
                                  >
                                    <Download className="h-4 w-4 text-white" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {message.content && (
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                isFromMe
                                  ? 'bg-green-600 text-white'
                                  : 'bg-slate-800 text-white'
                              } max-w-full break-words shadow-sm`}
                            >
                              <div className="flex flex-col">
                                {!isFromMe && activeConversation && conversations.find(c => c.id === activeConversation)?.contact?.identifier?.endsWith('@g.us') && (
                                  <span className="text-[10px] text-blue-300 font-bold mb-1 opacity-90 block">
                                    {(() => {
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
                            isFromMe ? 'justify-end text-slate-300' : 'justify-start text-slate-500'
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
            <div className="p-4 border-t border-slate-800 bg-slate-900">
              {isRecording ? (
                // UI de gravação ativa
                <div className="flex items-center gap-3 bg-red-600/10 border border-red-600/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative">
                      <Mic className="h-5 w-5 text-red-500 animate-pulse" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <span className="text-red-400 font-mono font-semibold">
                      {formatRecordingTime(recordingTime)}
                    </span>
                    <span className="text-slate-400 text-sm">Gravando áudio...</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelRecording}
                      className="text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Cancelar"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-700 text-white"
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
                      className="text-slate-400 hover:text-white"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      title="Enviar arquivo"
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      title="Enviar imagem"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-400 hover:bg-red-600/10"
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
                    className="flex-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                    disabled={sending || uploading}
                  />
                  <Button
                    size="icon"
                    className="bg-green-600 hover:bg-green-700"
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
              <MessageSquare className="h-16 w-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Selecione uma conversa</p>
              <p className="text-slate-600 text-sm mt-2">Escolha uma conversa da lista para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Nova Conversa */}
      <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-green-50 max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription className="text-green-200/60">
              Selecione um contato para iniciar uma nova conversa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Busca de contatos */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar contato..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-green-50"
              />
            </div>

            {/* Lista de contatos */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {loadingContacts ? (
                <div className="text-center py-8 text-slate-500">
                  Carregando contatos...
                </div>
              ) : contacts.filter(c =>
                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  c.phone_number.includes(contactSearch) ||
                  c.email.toLowerCase().includes(contactSearch.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
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
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-left disabled:opacity-50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-green-600 text-white">
                          {contact.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-green-50 truncate">{contact.name}</p>
                        <p className="text-sm text-slate-400 truncate">{contact.phone_number}</p>
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
