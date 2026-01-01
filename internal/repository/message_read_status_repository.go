package repository

import (
	"mensager-go/internal/db"
	"mensager-go/internal/models"
	"time"
)

// MarkMessageAsReadByUser marca uma mensagem específica como lida para um usuário
func MarkMessageAsReadByUser(messageID uint, userID uint, conversationID uint) error {
	// Verificar se já existe registro
	var existing models.MessageReadStatus
	err := db.Instance.Where("message_id = ? AND user_id = ?", messageID, userID).First(&existing).Error

	if err == nil {
		// Já existe, atualizar timestamp
		return db.Instance.Model(&existing).Update("read_at", time.Now()).Error
	}

	// Criar novo registro
	readStatus := models.MessageReadStatus{
		MessageID:      messageID,
		UserID:         userID,
		ConversationID: conversationID,
		ReadAt:         time.Now(),
	}

	return db.Instance.Create(&readStatus).Error
}

// MarkAllMessagesAsReadByUser marca todas as mensagens de uma conversa como lidas para um usuário
func MarkAllMessagesAsReadByUser(conversationID uint, userID uint) error {
	// Buscar todas as mensagens não lidas da conversa (mensagens recebidas, não enviadas pelo usuário)
	var messages []models.Message
	err := db.Instance.
		Where("conversation_id = ? AND message_type = ?", conversationID, models.MessageTypeIncoming).
		Find(&messages).Error

	if err != nil {
		return err
	}

	// Marcar cada mensagem como lida
	now := time.Now()
	for _, message := range messages {
		// Verificar se já existe
		var existing models.MessageReadStatus
		err := db.Instance.Where("message_id = ? AND user_id = ?", message.ID, userID).First(&existing).Error

		if err != nil {
			// Não existe, criar novo
			readStatus := models.MessageReadStatus{
				MessageID:      message.ID,
				UserID:         userID,
				ConversationID: conversationID,
				ReadAt:         now,
			}
			db.Instance.Create(&readStatus)
		}
	}

	return nil
}

// GetUnreadMessageIDsForUser retorna os IDs das mensagens não lidas de uma conversa para um usuário
func GetUnreadMessageIDsForUser(conversationID uint, userID uint) ([]uint, error) {
	var messageIDs []uint

	// Buscar mensagens da conversa que não estão na tabela de leitura para este usuário
	err := db.Instance.Table("messages").
		Select("messages.id").
		Joins("LEFT JOIN message_read_status ON message_read_status.message_id = messages.id AND message_read_status.user_id = ?", userID).
		Where("messages.conversation_id = ? AND messages.message_type = ? AND message_read_status.id IS NULL", conversationID, models.MessageTypeIncoming).
		Pluck("messages.id", &messageIDs).Error

	return messageIDs, err
}

// GetUnreadCountForUser retorna o número de mensagens não lidas de uma conversa para um usuário
func GetUnreadCountForUser(conversationID uint, userID uint) (int64, error) {
	var count int64

	err := db.Instance.Table("messages").
		Joins("LEFT JOIN message_read_status ON message_read_status.message_id = messages.id AND message_read_status.user_id = ?", userID).
		Where("messages.conversation_id = ? AND messages.message_type = ? AND message_read_status.id IS NULL", conversationID, models.MessageTypeIncoming).
		Count(&count).Error

	return count, err
}

// GetUnreadCountByConversation retorna o número de mensagens não lidas por conversa para um usuário
func GetUnreadCountByConversation(userID uint) (map[uint]int64, error) {
	type Result struct {
		ConversationID uint  `json:"conversation_id"`
		UnreadCount    int64 `json:"unread_count"`
	}

	var results []Result
	err := db.Instance.Table("messages").
		Select("messages.conversation_id, COUNT(*) as unread_count").
		Joins("LEFT JOIN message_read_status ON message_read_status.message_id = messages.id AND message_read_status.user_id = ?", userID).
		Where("messages.message_type = ? AND message_read_status.id IS NULL", models.MessageTypeIncoming).
		Group("messages.conversation_id").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	// Converter para map
	unreadMap := make(map[uint]int64)
	for _, result := range results {
		unreadMap[result.ConversationID] = result.UnreadCount
	}

	return unreadMap, nil
}

// IsMessageReadByUser verifica se uma mensagem foi lida por um usuário específico
func IsMessageReadByUser(messageID uint, userID uint) (bool, error) {
	var count int64
	err := db.Instance.Model(&models.MessageReadStatus{}).
		Where("message_id = ? AND user_id = ?", messageID, userID).
		Count(&count).Error

	return count > 0, err
}

// GetReadStatusForMessages retorna o status de leitura de múltiplas mensagens para um usuário
func GetReadStatusForMessages(messageIDs []uint, userID uint) (map[uint]bool, error) {
	if len(messageIDs) == 0 {
		return make(map[uint]bool), nil
	}

	var readStatuses []models.MessageReadStatus
	err := db.Instance.
		Where("message_id IN ? AND user_id = ?", messageIDs, userID).
		Find(&readStatuses).Error

	if err != nil {
		return nil, err
	}

	// Criar map de status
	statusMap := make(map[uint]bool)
	for _, messageID := range messageIDs {
		statusMap[messageID] = false
	}
	for _, status := range readStatuses {
		statusMap[status.MessageID] = true
	}

	return statusMap, nil
}
