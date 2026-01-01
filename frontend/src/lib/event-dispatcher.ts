/**
 * Event Dispatcher
 *
 * Sistema centralizado para gerenciar e despachar eventos em tempo real.
 * Fornece API type-safe para registro e disparo de eventos.
 */

import type {
  EventType,
  EventHandler,
  EventHandlerMap,
  RealtimeEvent,
  EventPayloadMap,
} from '@/types/events'

/**
 * EventDispatcher gerencia listeners e dispatch de eventos
 */
export class EventDispatcher {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers: Map<EventType, Set<EventHandler<any>>> = new Map()

  /**
   * Registra um handler para um tipo de evento específico
   *
   * @param eventType - Tipo do evento a escutar
   * @param handler - Função que será chamada quando o evento ocorrer
   * @returns Função para desregistrar o handler
   *
   * @example
   * ```ts
   * const dispatcher = new EventDispatcher()
   * const unsubscribe = dispatcher.on(EventType.MESSAGE_NEW, (payload) => {
   *   console.log('Nova mensagem:', payload)
   * })
   *
   * // Quando não precisar mais do listener:
   * unsubscribe()
   * ```
   */
  on<T extends EventType>(eventType: T, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }

    this.handlers.get(eventType)!.add(handler)

    // Retornar função de cleanup
    return () => {
      this.off(eventType, handler)
    }
  }

  /**
   * Remove um handler de um tipo de evento
   *
   * @param eventType - Tipo do evento
   * @param handler - Handler a ser removido
   */
  off<T extends EventType>(eventType: T, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.handlers.delete(eventType)
      }
    }
  }

  /**
   * Registra múltiplos handlers de uma vez
   *
   * @param handlerMap - Mapa de tipo de evento para handler
   * @returns Função para desregistrar todos os handlers
   *
   * @example
   * ```ts
   * const unsubscribe = dispatcher.onMany({
   *   [EventType.MESSAGE_NEW]: (payload) => console.log('Nova mensagem'),
   *   [EventType.CONVERSATION_UPDATED]: (payload) => console.log('Conversa atualizada'),
   * })
   * ```
   */
  onMany(handlerMap: EventHandlerMap): () => void {
    const unsubscribers: Array<() => void> = []

    for (const [eventType, handler] of Object.entries(handlerMap)) {
      if (handler) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unsubscribers.push(this.on(eventType as EventType, handler as EventHandler<any>))
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }

  /**
   * Despacha um evento para todos os handlers registrados
   *
   * @param event - Evento a ser despachado
   *
   * @example
   * ```ts
   * dispatcher.dispatch({
   *   type: EventType.MESSAGE_NEW,
   *   payload: { id: 1, content: 'Hello', ... }
   * })
   * ```
   */
  async dispatch<T extends EventType>(event: RealtimeEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type)

    if (!handlers || handlers.size === 0) {
      return
    }

    // Executar todos os handlers
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event.payload)
      } catch (error) {
        console.error(
          `[EventDispatcher] Error in handler for ${event.type}:`,
          error
        )
      }
    })

    await Promise.all(promises)
  }

  /**
   * Despacha um evento de forma type-safe
   *
   * @param eventType - Tipo do evento
   * @param payload - Payload do evento
   *
   * @example
   * ```ts
   * dispatcher.emit(EventType.MESSAGE_NEW, {
   *   id: 1,
   *   content: 'Hello',
   *   // ... outros campos de Message
   * })
   * ```
   */
  async emit<T extends EventType>(
    eventType: T,
    payload: EventPayloadMap[T]
  ): Promise<void> {
    await this.dispatch({ type: eventType, payload } as RealtimeEvent<T>)
  }

  /**
   * Remove todos os handlers
   */
  clear(): void {
    this.handlers.clear()
  }

  /**
   * Retorna número de handlers registrados para um evento
   */
  getHandlerCount(eventType: EventType): number {
    return this.handlers.get(eventType)?.size ?? 0
  }

  /**
   * Retorna todos os tipos de evento que têm handlers registrados
   */
  getRegisteredEventTypes(): EventType[] {
    return Array.from(this.handlers.keys())
  }
}

/**
 * Instância global do dispatcher
 * Use esta instância compartilhada em toda a aplicação
 */
export const globalEventDispatcher = new EventDispatcher()
