package service

import (
	"log"
	"mensager-go/internal/models"
)

/**
 * Event Dispatcher - Sistema centralizado de eventos
 *
 * Este arquivo fornece funções padronizadas para disparar eventos em tempo real.
 * Todas as funções seguem o mesmo padrão e garantem consistência no broadcast.
 */

// EventType define os tipos de eventos disponíveis
type EventType string

const (
	// Eventos de Mensagem
	EventMessageNew     EventType = "message.new"
	EventMessageUpdated EventType = "message.updated"

	// Eventos de Conversa
	EventConversationNew     EventType = "conversation.new"
	EventConversationUpdated EventType = "conversation.updated"
	EventConversationDeleted EventType = "conversation.deleted"

	// Eventos de Inbox
	EventInboxCleared EventType = "inbox.cleared"

	// Eventos de Conexão
	EventConnectionEstablished EventType = "connection.established"
	EventHeartbeat             EventType = "heartbeat"
)

// DispatchMessageNew dispara evento de nova mensagem
// Faz broadcast tanto para a conversa específica quanto para a conta
func DispatchMessageNew(message *models.Message) {
	if message == nil {
		log.Printf("[EventDispatcher] WARNING: DispatchMessageNew called with nil message")
		return
	}

	log.Printf("[EventDispatcher] Dispatching %s - MessageID=%d, ConversationID=%d, AccountID=%d",
		EventMessageNew, message.ID, message.ConversationID, message.AccountID)

	event := BroadcastEvent{
		Type:    string(EventMessageNew),
		Payload: message,
	}

	// Broadcast para conversa específica (clientes conectados a essa conversa)
	if BroadcastToConversationFunc != nil {
		BroadcastToConversationFunc(message.ConversationID, event)
	}

	// Broadcast para conta (clientes conectados globalmente)
	if BroadcastToAccountFunc != nil {
		BroadcastToAccountFunc(message.AccountID, event)
	}
}

// DispatchMessageUpdated dispara evento de mensagem atualizada
func DispatchMessageUpdated(message *models.Message) {
	if message == nil {
		log.Printf("[EventDispatcher] WARNING: DispatchMessageUpdated called with nil message")
		return
	}

	log.Printf("[EventDispatcher] Dispatching %s - MessageID=%d", EventMessageUpdated, message.ID)

	event := BroadcastEvent{
		Type:    string(EventMessageUpdated),
		Payload: message,
	}

	// Broadcast para conversa e conta
	if BroadcastToConversationFunc != nil {
		BroadcastToConversationFunc(message.ConversationID, event)
	}
	if BroadcastToAccountFunc != nil {
		BroadcastToAccountFunc(message.AccountID, event)
	}
}

// DispatchConversationNew dispara evento de nova conversa
func DispatchConversationNew(conversation *models.Conversation) {
	if conversation == nil {
		log.Printf("[EventDispatcher] WARNING: DispatchConversationNew called with nil conversation")
		return
	}

	log.Printf("[EventDispatcher] Dispatching %s - ConversationID=%d, AccountID=%d",
		EventConversationNew, conversation.ID, conversation.AccountID)

	event := BroadcastEvent{
		Type:    string(EventConversationNew),
		Payload: conversation,
	}

	// Apenas broadcast para conta (nova conversa aparece na lista geral)
	if BroadcastToAccountFunc != nil {
		BroadcastToAccountFunc(uint(conversation.AccountID), event)
	}
}

// DispatchConversationUpdated dispara evento de conversa atualizada
func DispatchConversationUpdated(conversation *models.Conversation) {
	if conversation == nil {
		log.Printf("[EventDispatcher] WARNING: DispatchConversationUpdated called with nil conversation")
		return
	}

	log.Printf("[EventDispatcher] Dispatching %s - ConversationID=%d, AccountID=%d",
		EventConversationUpdated, conversation.ID, conversation.AccountID)

	event := BroadcastEvent{
		Type:    string(EventConversationUpdated),
		Payload: conversation,
	}

	// Broadcast para conta (atualiza lista de conversas)
	if BroadcastToAccountFunc != nil {
		BroadcastToAccountFunc(uint(conversation.AccountID), event)
	}
}

// ConversationDeletedPayload payload para evento de conversa deletada
type ConversationDeletedPayload struct {
	ID        uint64 `json:"id"`
	AccountID uint64 `json:"account_id"`
}

// DispatchConversationDeleted dispara evento de conversa deletada
func DispatchConversationDeleted(conversationID uint, accountID uint) {
	log.Printf("[EventDispatcher] Dispatching %s - ConversationID=%d, AccountID=%d",
		EventConversationDeleted, conversationID, accountID)

	event := BroadcastEvent{
		Type: string(EventConversationDeleted),
		Payload: ConversationDeletedPayload{
			ID:        uint64(conversationID),
			AccountID: uint64(accountID),
		},
	}

	// Broadcast para conta
	if BroadcastToAccountFunc != nil {
		BroadcastToAccountFunc(accountID, event)
	}
}

// InboxClearedPayload payload para evento de inbox limpa
type InboxClearedPayload struct {
	InboxID   uint64 `json:"inbox_id"`
	Count     int64  `json:"count"`
	AccountID uint64 `json:"account_id"`
}

// DispatchInboxCleared dispara evento de inbox limpa
func DispatchInboxCleared(inboxID uint, count int64, accountID uint) {
	log.Printf("[EventDispatcher] Dispatching %s - InboxID=%d, Count=%d, AccountID=%d",
		EventInboxCleared, inboxID, count, accountID)

	event := BroadcastEvent{
		Type: string(EventInboxCleared),
		Payload: InboxClearedPayload{
			InboxID:   uint64(inboxID),
			Count:     count,
			AccountID: uint64(accountID),
		},
	}

	// Broadcast para conta
	if BroadcastToAccountFunc != nil {
		BroadcastToAccountFunc(accountID, event)
	}
}

// ValidateEvent valida se um evento é válido
func ValidateEvent(eventType EventType) bool {
	validEvents := []EventType{
		EventMessageNew,
		EventMessageUpdated,
		EventConversationNew,
		EventConversationUpdated,
		EventConversationDeleted,
		EventInboxCleared,
		EventConnectionEstablished,
		EventHeartbeat,
	}

	for _, valid := range validEvents {
		if eventType == valid {
			return true
		}
	}

	return false
}

// GetEventTypeName retorna nome amigável do tipo de evento
func GetEventTypeName(eventType EventType) string {
	names := map[EventType]string{
		EventMessageNew:            "Nova Mensagem",
		EventMessageUpdated:        "Mensagem Atualizada",
		EventConversationNew:       "Nova Conversa",
		EventConversationUpdated:   "Conversa Atualizada",
		EventConversationDeleted:   "Conversa Deletada",
		EventInboxCleared:          "Inbox Limpa",
		EventConnectionEstablished: "Conexão Estabelecida",
		EventHeartbeat:             "Heartbeat",
	}

	if name, ok := names[eventType]; ok {
		return name
	}
	return string(eventType)
}
