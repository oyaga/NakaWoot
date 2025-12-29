package repository

import (
	"mensager-go/internal/db"
	"mensager-go/internal/models"

	"gorm.io/gorm"
)

// CreateMessage cria uma nova mensagem
func CreateMessage(message *models.Message) error {
	return db.Instance.Create(message).Error
}

// GetMessageByID busca uma mensagem por ID
func GetMessageByID(id uint) (*models.Message, error) {
	var message models.Message
	err := db.Instance.First(&message, id).Error
	return &message, err
}

// GetMessageByWhatsAppID busca uma mensagem pelo ID do WhatsApp
func GetMessageByWhatsAppID(whatsappMessageID string) (*models.Message, error) {
	var message models.Message
	err := db.Instance.Where("whatsapp_message_id = ?", whatsappMessageID).First(&message).Error
	return &message, err
}

// UpsertMessage cria ou atualiza mensagem baseado no WhatsApp Message ID
func UpsertMessage(message *models.Message) error {
	if message.WhatsAppMessageID == nil || *message.WhatsAppMessageID == "" {
		// Se não tem WhatsApp Message ID, apenas cria
		return CreateMessage(message)
	}

	// Tenta encontrar mensagem existente
	var existing models.Message
	err := db.Instance.Where("whatsapp_message_id = ?", *message.WhatsAppMessageID).First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		// Não existe, cria novo
		return CreateMessage(message)
	} else if err != nil {
		return err
	}

	// Existe, atualiza
	message.ID = existing.ID
	return db.Instance.Save(message).Error
}

// ListMessagesByConversation lista mensagens de uma conversa
func ListMessagesByConversation(conversationID uint, limit int, offset int) ([]models.Message, error) {
	var messages []models.Message
	query := db.Instance.Where("conversation_id = ?", conversationID).
		Order("created_at ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Find(&messages).Error
	return messages, err
}

// ListMessagesByInbox lista mensagens de uma inbox
func ListMessagesByInbox(inboxID uint, limit int, offset int) ([]models.Message, error) {
	var messages []models.Message
	query := db.Instance.Where("inbox_id = ?", inboxID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Find(&messages).Error
	return messages, err
}

// UpdateMessageStatus atualiza o status de uma mensagem
func UpdateMessageStatus(id uint, status int) error {
	return db.Instance.Model(&models.Message{}).Where("id = ?", id).Update("status", status).Error
}

// UpdateMessageByWhatsAppID atualiza mensagem pelo WhatsApp Message ID
func UpdateMessageByWhatsAppID(whatsappMessageID string, updates map[string]interface{}) error {
	return db.Instance.Model(&models.Message{}).
		Where("whatsapp_message_id = ?", whatsappMessageID).
		Updates(updates).Error
}

// DeleteMessage deleta uma mensagem
func DeleteMessage(id uint) error {
	return db.Instance.Delete(&models.Message{}, id).Error
}

// CountMessagesByConversation conta mensagens de uma conversa
func CountMessagesByConversation(conversationID uint) (int64, error) {
	var count int64
	err := db.Instance.Model(&models.Message{}).Where("conversation_id = ?", conversationID).Count(&count).Error
	return count, err
}

// GetUnreadMessagesCount conta mensagens não lidas de uma conversa
func GetUnreadMessagesCount(conversationID uint) (int64, error) {
	var count int64
	err := db.Instance.Model(&models.Message{}).
		Where("conversation_id = ? AND message_type = ? AND status < ?",
			conversationID, models.MessageTypeIncoming, models.MessageStatusRead).
		Count(&count).Error
	return count, err
}

// MarkMessagesAsRead marca todas as mensagens de uma conversa como lidas
func MarkMessagesAsRead(conversationID uint) error {
	return db.Instance.Model(&models.Message{}).
		Where("conversation_id = ? AND status < ?", conversationID, models.MessageStatusRead).
		Update("status", models.MessageStatusRead).Error
}
