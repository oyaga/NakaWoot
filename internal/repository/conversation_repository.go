package repository

import (
	"mensager-go/internal/db"
	"mensager-go/internal/models"
)

func ListConversationsByAccount(accountID uint) ([]models.Conversation, error) {
	// Usar raw SQL para carregar conversas com contatos via JOIN
	type ConversationWithContact struct {
		models.Conversation
		ContactID       uint64 `gorm:"column:contact_id"`
		ContactName     string `gorm:"column:contact_name"`
		ContactEmail    string `gorm:"column:contact_email"`
		ContactPhone    string `gorm:"column:contact_phone"`
		ContactAvatar   string `gorm:"column:contact_avatar"`
		ContactIdentifier string `gorm:"column:contact_identifier"`
	}

	var results []ConversationWithContact
	err := db.Instance.
		Table("conversations").
		Select(`conversations.*,
			contacts.id as contact_id,
			contacts.name as contact_name,
			contacts.email as contact_email,
			contacts.phone_number as contact_phone,
			contacts.avatar_url as contact_avatar,
			contacts.identifier as contact_identifier`).
		Joins("LEFT JOIN contacts ON contacts.id = conversations.contact_id").
		Where("conversations.account_id = ?", accountID).
		Order("conversations.last_activity_at DESC NULLS LAST, conversations.created_at DESC").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	// Converter para []models.Conversation e popular Contact
	conversations := make([]models.Conversation, len(results))
	for i, result := range results {
		conversations[i] = result.Conversation
		conversations[i].Contact = models.Contact{
			ID:          uint(result.ContactID),
			Name:        result.ContactName,
			Email:       result.ContactEmail,
			PhoneNumber: result.ContactPhone,
			AvatarURL:   result.ContactAvatar,
			Identifier:  result.ContactIdentifier,
		}
	}

	return conversations, nil
}

func ListMyConversations(accountID uint, userID uint) ([]models.Conversation, error) {
	var conversations []models.Conversation
	err := db.Instance.Where("account_id = ? AND assignee_id = ?", accountID, userID).Find(&conversations).Error
	return conversations, err
}

func AssignConversation(convID uint, userID uint, accountID uint) error {
	return db.Instance.Model(&models.Conversation{}).Where("id = ? AND account_id = ?", convID, accountID).Update("assignee_id", userID).Error
}

func GetActivitiesByConversation(convID uint, accountID uint) ([]models.Message, error) {
	var messages []models.Message
	err := db.Instance.Where("conversation_id = ? AND account_id = ?", convID, accountID).Order("created_at asc").Find(&messages).Error
	return messages, err
}

// GetConversationByID busca uma conversa pelo ID
func GetConversationByID(id uint, conversation *models.Conversation) error {
	return db.Instance.First(conversation, id).Error
}

// FindOrCreateConversation busca ou cria uma conversa
func FindOrCreateConversation(accountID uint, inboxID uint, contactID uint) (*models.Conversation, error) {
	// Tentar encontrar conversa existente (incluindo as resolvidas)
	var conversation models.Conversation
	err := db.Instance.
		Where("account_id = ? AND inbox_id = ? AND contact_id = ?", accountID, inboxID, contactID).
		Order("created_at DESC").
		First(&conversation).Error

	if err == nil {
		// Conversa encontrada - reabrir se estiver resolvida
		if conversation.Status == models.ConversationStatusResolved {
			conversation.Status = models.ConversationStatusOpen
			db.Instance.Save(&conversation)
		}

		// Carregar contato manualmente
		var contact models.Contact
		if err := db.Instance.First(&contact, contactID).Error; err == nil {
			conversation.Contact = contact
		}

		return &conversation, nil
	}

	// Se não encontrado, criar nova
	newConversation := &models.Conversation{
		AccountID:   uint64(accountID),
		InboxID:     uint64(inboxID),
		ContactID:   uint64(contactID),
		Status:      models.ConversationStatusOpen,
		UnreadCount: 0,
		Priority:    "medium",
	}

	if err := db.Instance.Create(newConversation).Error; err != nil {
		return nil, err
	}

	// Carregar contato manualmente
	var contact models.Contact
	if err := db.Instance.First(&contact, contactID).Error; err == nil {
		newConversation.Contact = contact
	}

	return newConversation, nil
}

// UpdateConversation atualiza uma conversa
func UpdateConversation(conversation *models.Conversation) error {
	return db.Instance.Save(conversation).Error
}

// ListGroupConversations lista conversas de grupos
func ListGroupConversations(accountID uint, inboxID *uint) ([]models.Conversation, error) {
	// Buscar conversas cujos contatos têm identifier terminando em @g.us (grupos do WhatsApp)
	type ConversationWithContact struct {
		models.Conversation
		ContactID         uint64 `gorm:"column:contact_id"`
		ContactName       string `gorm:"column:contact_name"`
		ContactEmail      string `gorm:"column:contact_email"`
		ContactPhone      string `gorm:"column:contact_phone"`
		ContactAvatar     string `gorm:"column:contact_avatar"`
		ContactIdentifier string `gorm:"column:contact_identifier"`
	}

	var results []ConversationWithContact
	query := db.Instance.
		Table("conversations").
		Select(`conversations.*,
			contacts.id as contact_id,
			contacts.name as contact_name,
			contacts.email as contact_email,
			contacts.phone_number as contact_phone,
			contacts.avatar_url as contact_avatar,
			contacts.identifier as contact_identifier`).
		Joins("LEFT JOIN contacts ON contacts.id = conversations.contact_id").
		Where("conversations.account_id = ? AND contacts.identifier LIKE '%@g.us'", accountID)

	// Aplicar filtro de inbox_id se fornecido
	if inboxID != nil {
		query = query.Where("conversations.inbox_id = ?", *inboxID)
	}

	err := query.
		Order("conversations.last_activity_at DESC NULLS LAST, conversations.created_at DESC").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	// Converter para []models.Conversation e popular Contact
	conversations := make([]models.Conversation, len(results))
	for i, result := range results {
		conversations[i] = result.Conversation
		conversations[i].Contact = models.Contact{
			ID:          uint(result.ContactID),
			Name:        result.ContactName,
			Email:       result.ContactEmail,
			PhoneNumber: result.ContactPhone,
			AvatarURL:   result.ContactAvatar,
			Identifier:  result.ContactIdentifier,
		}
	}

	return conversations, nil
}

// ListPrivateConversations lista conversas privadas (não-grupo)
func ListPrivateConversations(accountID uint, inboxID *uint) ([]models.Conversation, error) {
	// Buscar conversas cujos contatos NÃO têm identifier terminando em @g.us
	type ConversationWithContact struct {
		models.Conversation
		ContactID         uint64 `gorm:"column:contact_id"`
		ContactName       string `gorm:"column:contact_name"`
		ContactEmail      string `gorm:"column:contact_email"`
		ContactPhone      string `gorm:"column:contact_phone"`
		ContactAvatar     string `gorm:"column:contact_avatar"`
		ContactIdentifier string `gorm:"column:contact_identifier"`
	}

	var results []ConversationWithContact
	query := db.Instance.
		Table("conversations").
		Select(`conversations.*,
			contacts.id as contact_id,
			contacts.name as contact_name,
			contacts.email as contact_email,
			contacts.phone_number as contact_phone,
			contacts.avatar_url as contact_avatar,
			contacts.identifier as contact_identifier`).
		Joins("LEFT JOIN contacts ON contacts.id = conversations.contact_id").
		Where("conversations.account_id = ? AND (contacts.identifier NOT LIKE '%@g.us' OR contacts.identifier IS NULL OR contacts.identifier = '')", accountID)

	// Aplicar filtro de inbox_id se fornecido
	if inboxID != nil {
		query = query.Where("conversations.inbox_id = ?", *inboxID)
	}

	err := query.
		Order("conversations.last_activity_at DESC NULLS LAST, conversations.created_at DESC").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	// Converter para []models.Conversation e popular Contact
	conversations := make([]models.Conversation, len(results))
	for i, result := range results {
		conversations[i] = result.Conversation
		conversations[i].Contact = models.Contact{
			ID:          uint(result.ContactID),
			Name:        result.ContactName,
			Email:       result.ContactEmail,
			PhoneNumber: result.ContactPhone,
			AvatarURL:   result.ContactAvatar,
			Identifier:  result.ContactIdentifier,
		}
	}

	return conversations, nil
}

// DeleteConversation exclui uma conversa e suas mensagens associadas
func DeleteConversation(conversationID uint) error {
	// Primeiro deletar todas as mensagens da conversa
	if err := db.Instance.Where("conversation_id = ?", conversationID).Delete(&models.Message{}).Error; err != nil {
		return err
	}

	// Depois deletar a conversa
	return db.Instance.Delete(&models.Conversation{}, conversationID).Error
}

// DeleteConversationsByInbox exclui todas as conversas de uma inbox e retorna a quantidade
func DeleteConversationsByInbox(inboxID uint) (int64, error) {
	// Buscar IDs das conversas da inbox
	var conversationIDs []uint
	if err := db.Instance.Model(&models.Conversation{}).
		Where("inbox_id = ?", inboxID).
		Pluck("id", &conversationIDs).Error; err != nil {
		return 0, err
	}

	if len(conversationIDs) == 0 {
		return 0, nil
	}

	// Deletar todas as mensagens dessas conversas
	if err := db.Instance.Where("conversation_id IN ?", conversationIDs).Delete(&models.Message{}).Error; err != nil {
		return 0, err
	}

	// Deletar todas as conversas
	result := db.Instance.Where("inbox_id = ?", inboxID).Delete(&models.Conversation{})
	if result.Error != nil {
		return 0, result.Error
	}

	return result.RowsAffected, nil
}
