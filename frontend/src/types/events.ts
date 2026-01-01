/**
 * Sistema de Eventos em Tempo Real
 *
 * Este arquivo centraliza todas as definições de eventos usados no sistema de mensagens.
 * Eventos são transmitidos via Server-Sent Events (SSE) do backend para o frontend.
 */

import type { Message, ConversationSummary } from '@/store/useConversationStore'

/**
 * Tipos de eventos disponíveis no sistema
 */
export enum EventType {
  // Eventos de Mensagem
  MESSAGE_NEW = 'message.new',
  MESSAGE_UPDATED = 'message.updated',

  // Eventos de Conversa
  CONVERSATION_NEW = 'conversation.new',
  CONVERSATION_UPDATED = 'conversation.updated',
  CONVERSATION_DELETED = 'conversation.deleted',

  // Eventos de Inbox
  INBOX_CLEARED = 'inbox.cleared',

  // Eventos de Conexão
  CONNECTION_ESTABLISHED = 'connection.established',
  HEARTBEAT = 'heartbeat',
}

/**
 * Payload do evento message.new
 * Disparado quando uma nova mensagem é recebida ou enviada
 */
export interface MessageNewPayload extends Message {
  // Herda todos os campos de Message
}

/**
 * Payload do evento message.updated
 * Disparado quando uma mensagem existente é atualizada (status, edição, etc)
 */
export interface MessageUpdatedPayload extends Partial<Message> {
  id: number // ID é obrigatório para updates
}

/**
 * Payload do evento conversation.new
 * Disparado quando uma nova conversa é criada
 */
export interface ConversationNewPayload extends ConversationSummary {
  // Herda todos os campos de ConversationSummary
}

/**
 * Payload do evento conversation.updated
 * Disparado quando uma conversa é atualizada (nova mensagem, status, atribuição, etc)
 */
export interface ConversationUpdatedPayload extends ConversationSummary {
  // Herda todos os campos de ConversationSummary
}

/**
 * Payload do evento conversation.deleted
 * Disparado quando uma conversa é deletada
 */
export interface ConversationDeletedPayload {
  id: number
}

/**
 * Payload do evento inbox.cleared
 * Disparado quando todas as conversas de uma inbox são deletadas
 */
export interface InboxClearedPayload {
  inbox_id: number
  count: number
}

/**
 * Payload do evento connection.established
 * Enviado pelo servidor quando a conexão SSE é estabelecida
 */
export interface ConnectionEstablishedPayload {
  client_id: string
  timestamp: string
}

/**
 * Payload do evento heartbeat
 * Enviado periodicamente para manter a conexão ativa
 */
export interface HeartbeatPayload {
  timestamp: string
}

/**
 * Mapa de tipos de evento para seus payloads
 */
export interface EventPayloadMap {
  [EventType.MESSAGE_NEW]: MessageNewPayload
  [EventType.MESSAGE_UPDATED]: MessageUpdatedPayload
  [EventType.CONVERSATION_NEW]: ConversationNewPayload
  [EventType.CONVERSATION_UPDATED]: ConversationUpdatedPayload
  [EventType.CONVERSATION_DELETED]: ConversationDeletedPayload
  [EventType.INBOX_CLEARED]: InboxClearedPayload
  [EventType.CONNECTION_ESTABLISHED]: ConnectionEstablishedPayload
  [EventType.HEARTBEAT]: HeartbeatPayload
}

/**
 * Estrutura genérica de um evento
 */
export interface RealtimeEvent<T extends EventType = EventType> {
  type: T
  payload: EventPayloadMap[T]
}

/**
 * Handler function para processar eventos
 */
export type EventHandler<T extends EventType = EventType> = (
  payload: EventPayloadMap[T]
) => void | Promise<void>

/**
 * Mapa de handlers por tipo de evento
 */
export type EventHandlerMap = {
  [K in EventType]?: EventHandler<K>
}
