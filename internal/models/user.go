package models

import (
	"time"

	"gorm.io/datatypes"
)

// User mapeia a tabela 'users' do Chatwoot
type User struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	UUID              string         `gorm:"column:uuid;uniqueIndex;not null" json:"uuid"`
	AccountID         uint           `gorm:"index" json:"account_id"`
	Email             string         `gorm:"uniqueIndex;not null" json:"email"`
	EncryptedPassword string         `gorm:"not null" json:"-"`
	Name              string         `gorm:"not null" json:"name"`
	DisplayName       string         `json:"display_name"`
	AvatarURL         string         `json:"avatar_url"`
	Role              string         `json:"role"`
	Type              string         `json:"type"`
	Availability      int            `json:"availability"`
	CustomAttributes  datatypes.JSON `json:"custom_attributes"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}
