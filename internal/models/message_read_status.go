package models

import "time"

// MessageReadStatus rastreia quais mensagens foram lidas por cada usuário
type MessageReadStatus struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	MessageID      uint      `gorm:"index:idx_message_user;not null" json:"message_id"`
	UserID         uint      `gorm:"index:idx_message_user;not null" json:"user_id"`
	ConversationID uint      `gorm:"index;not null" json:"conversation_id"`
	ReadAt         time.Time `gorm:"not null" json:"read_at"`
	CreatedAt      time.Time `json:"created_at"`

	// Relacionamentos
	Message      Message      `gorm:"foreignKey:MessageID" json:"-"`
	User         User         `gorm:"foreignKey:UserID" json:"-"`
	Conversation Conversation `gorm:"foreignKey:ConversationID" json:"-"`
}

func (MessageReadStatus) TableName() string {
	return "message_read_status"
}
