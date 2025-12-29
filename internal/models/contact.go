package models

import (
	"time"

	"gorm.io/datatypes"
)

type Contact struct {
	ID                   uint           `gorm:"primaryKey" json:"id"`
	AccountID            uint           `gorm:"index" json:"account_id"`
	Name                 string         `json:"name"`
	Email                string         `gorm:"index" json:"email"`
	PhoneNumber          string         `gorm:"index" json:"phone_number"`
	Identifier           string         `gorm:"index" json:"identifier"` // WhatsApp JID ou identificador único
	AvatarURL            string         `json:"avatar_url"`
	AdditionalAttributes datatypes.JSON `json:"additional_attributes"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
}

func (Contact) TableName() string {
	return "contacts"
}
