package models

import (
	"encoding/json"
	"time"

	"gorm.io/datatypes"
)

type Conversation struct {
	ID                   uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	AccountID            uint64         `gorm:"not null;index" json:"account_id"`
	InboxID              uint64         `gorm:"not null;index" json:"inbox_id"`
	Status               int            `gorm:"default:0" json:"status"` // 0: open, 1: resolved, 2: pending
	ContactID            uint64         `gorm:"not null;index" json:"contact_id"`
	AssigneeID           *uint64        `json:"assignee_id,omitempty"`
	AdditionalAttributes datatypes.JSON `json:"additional_attributes,omitempty"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DisplayID            *uint64        `json:"display_id,omitempty"`
	LastMessageAt        *time.Time     `gorm:"column:last_message_at" json:"last_message_at,omitempty"`
	FirstReplyCreatedAt  *time.Time     `json:"first_reply_created_at,omitempty"`
	Priority             string         `gorm:"default:medium" json:"priority,omitempty"`
	UnreadCount          int            `gorm:"default:0" json:"unread_count"`
	LastActivityAt       *time.Time     `json:"last_activity_at,omitempty"`

	// Relacionamentos
	Account  Account `gorm:"foreignKey:AccountID" json:"-"`
	Inbox    Inbox   `gorm:"foreignKey:InboxID" json:"-"`
	Contact  Contact `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	Assignee *User   `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
}

// ConversationStatus representa os status possíveis de uma conversa
const (
	ConversationStatusOpen     = 0
	ConversationStatusResolved = 1
	ConversationStatusPending  = 2
)

func (Conversation) TableName() string {
	return "conversations"
}

// MarshalJSON customizado para retornar status como string e timestamps como Unix (compatível com Chatwoot e Evolution API)
func (c Conversation) MarshalJSON() ([]byte, error) {
	type Alias Conversation
	statusStr := "open"
	switch c.Status {
	case ConversationStatusResolved:
		statusStr = "resolved"
	case ConversationStatusPending:
		statusStr = "pending"
	default:
		statusStr = "open"
	}

	// Converter timestamps para Unix (float64) para compatibilidade com Evolution API
	var lastActivityAt *float64
	if c.LastActivityAt != nil {
		unix := float64(c.LastActivityAt.Unix())
		lastActivityAt = &unix
	}

	var lastMessageAt *float64
	if c.LastMessageAt != nil {
		unix := float64(c.LastMessageAt.Unix())
		lastMessageAt = &unix
	}

	var firstReplyCreatedAt *float64
	if c.FirstReplyCreatedAt != nil {
		unix := float64(c.FirstReplyCreatedAt.Unix())
		firstReplyCreatedAt = &unix
	}

	createdAt := float64(c.CreatedAt.Unix())
	updatedAt := float64(c.UpdatedAt.Unix())

	return json.Marshal(&struct {
		*Alias
		Status              string   `json:"status"`
		CreatedAt           float64  `json:"created_at"`
		UpdatedAt           float64  `json:"updated_at"`
		LastActivityAt      *float64 `json:"last_activity_at,omitempty"`
		LastMessageAt       *float64 `json:"last_message_at,omitempty"`
		FirstReplyCreatedAt *float64 `json:"first_reply_created_at,omitempty"`
	}{
		Alias:               (*Alias)(&c),
		Status:              statusStr,
		CreatedAt:           createdAt,
		UpdatedAt:           updatedAt,
		LastActivityAt:      lastActivityAt,
		LastMessageAt:       lastMessageAt,
		FirstReplyCreatedAt: firstReplyCreatedAt,
	})
}
