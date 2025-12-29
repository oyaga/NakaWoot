package models

import (
	"time"
)

// APIToken representa um token de API para integrações externas
type APIToken struct {
	ID         uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uint       `gorm:"not null;index" json:"user_id"`
	AccountID  uint       `gorm:"not null;index" json:"account_id"`
	Name       string     `gorm:"not null" json:"name"`
	Token      string     `gorm:"uniqueIndex;not null" json:"token"`
	ExpiresAt  *time.Time `json:"expires_at"`
	LastUsedAt *time.Time `json:"last_used_at"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`

	// Relacionamentos
	User    User    `gorm:"foreignKey:UserID" json:"-"`
	Account Account `gorm:"foreignKey:AccountID" json:"-"`
}

func (APIToken) TableName() string {
	return "api_tokens"
}
