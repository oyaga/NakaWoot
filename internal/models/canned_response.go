package models

import (
	"time"
)

type CannedResponse struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	AccountID uint      `gorm:"not null;index" json:"account_id"`
	ShortCode string    `gorm:"not null" json:"short_code"`
	Content   string    `gorm:"not null" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (CannedResponse) TableName() string {
	return "canned_responses"
}
