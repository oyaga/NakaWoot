package service

import (
	"log"
	"mensager-go/internal/models"
)

// BroadcastEvent representa um evento em tempo real
type BroadcastEvent struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Esta função será chamada pelo handler quando broadcast estiver disponível
var BroadcastToConversationFunc func(conversationID uint, event BroadcastEvent)
var BroadcastToAccountFunc func(accountID uint, event BroadcastEvent)

// NotifyNewMessage notifica sobre nova mensagem (será chamado internamente)
func NotifyNewMessage(message *models.Message) {
	if BroadcastToConversationFunc != nil {
		log.Printf("[NotifyNewMessage] Broadcasting message.new - ID: %d, ConvID: %d, Content: %s", message.ID, message.ConversationID, message.Content)
		BroadcastToConversationFunc(message.ConversationID, BroadcastEvent{
			Type:    "message.new",
			Payload: message,
		})
	} else {
		log.Printf("[NotifyNewMessage] WARNING: BroadcastToConversationFunc is nil!")
	}
}

// NotifyConversationUpdated notifica sobre conversa atualizada
func NotifyConversationUpdated(conversation *models.Conversation) {
	if BroadcastToAccountFunc != nil {
		BroadcastToAccountFunc(uint(conversation.AccountID), BroadcastEvent{
			Type:    "conversation.updated",
			Payload: conversation,
		})
	}
}
