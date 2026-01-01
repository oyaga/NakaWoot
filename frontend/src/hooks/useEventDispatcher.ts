/**
 * useEventDispatcher Hook
 *
 * Hook React para facilitar o uso do EventDispatcher.
 * Gerencia automaticamente cleanup de listeners quando componente desmonta.
 */

import { useEffect, useRef } from 'react'
import { globalEventDispatcher } from '@/lib/event-dispatcher'
import type { EventType, EventHandler, EventHandlerMap } from '@/types/events'

/**
 * Hook para registrar um listener para um tipo de evento específico
 *
 * @param eventType - Tipo do evento a escutar
 * @param handler - Função que será chamada quando o evento ocorrer
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useEventListener(EventType.MESSAGE_NEW, (payload) => {
 *     console.log('Nova mensagem:', payload)
 *   })
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useEventListener<T extends EventType>(
  eventType: T,
  handler: EventHandler<T>
) {
  // Usar ref para evitar re-registrar listener quando handler muda
  const handlerRef = useRef(handler)

  // Atualizar ref quando handler muda
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    // Wrapper que usa a ref para sempre chamar a versão mais recente do handler
    const wrappedHandler: EventHandler<T> = (payload) => {
      return handlerRef.current(payload)
    }

    // Registrar listener
    const unsubscribe = globalEventDispatcher.on(eventType, wrappedHandler)

    // Cleanup ao desmontar
    return () => {
      unsubscribe()
    }
  }, [eventType])
}

/**
 * Hook para registrar múltiplos listeners de uma vez
 *
 * @param handlers - Mapa de tipo de evento para handler
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useEventListeners({
 *     [EventType.MESSAGE_NEW]: (payload) => {
 *       console.log('Nova mensagem:', payload)
 *     },
 *     [EventType.CONVERSATION_UPDATED]: (payload) => {
 *       console.log('Conversa atualizada:', payload)
 *     },
 *   })
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useEventListeners(handlers: EventHandlerMap) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    // Criar wrappers para cada handler
    const wrappedHandlers: EventHandlerMap = {}
    for (const [eventType] of Object.entries(handlers)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wrappedHandlers[eventType as EventType] = (payload: any) => {
        const currentHandler = handlersRef.current[eventType as EventType]
        if (currentHandler) {
          return currentHandler(payload)
        }
      }
    }

    // Registrar todos os listeners
    const unsubscribe = globalEventDispatcher.onMany(wrappedHandlers)

    // Cleanup ao desmontar
    return () => {
      unsubscribe()
    }
  }, []) // Array vazio - apenas registrar uma vez
}

/**
 * Hook para obter acesso direto ao dispatcher
 * Use apenas quando precisar despachar eventos manualmente
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const dispatcher = useEventDispatcher()
 *
 *   const handleClick = () => {
 *     dispatcher.emit(EventType.MESSAGE_NEW, {
 *       id: 1,
 *       content: 'Test',
 *       // ... outros campos
 *     })
 *   }
 *
 *   return <button onClick={handleClick}>Enviar Evento</button>
 * }
 * ```
 */
export function useEventDispatcher() {
  return globalEventDispatcher
}

/**
 * Hook para obter estatísticas do dispatcher
 * Útil para debugging
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const stats = useEventStats()
 *
 *   return (
 *     <div>
 *       <p>Tipos registrados: {stats.registeredTypes.join(', ')}</p>
 *       {stats.handlerCounts.map(([type, count]) => (
 *         <p key={type}>{type}: {count} handlers</p>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useEventStats() {
  const registeredTypes = globalEventDispatcher.getRegisteredEventTypes()
  const handlerCounts = registeredTypes.map((type) => [
    type,
    globalEventDispatcher.getHandlerCount(type),
  ] as const)

  return {
    registeredTypes,
    handlerCounts,
    totalHandlers: handlerCounts.reduce((sum, [, count]) => sum + count, 0),
  }
}
