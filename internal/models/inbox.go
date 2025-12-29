package models

import (
	"time"
)

type Inbox struct {
	ID                         uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	ChannelID                  uint64    `gorm:"not null" json:"channel_id"`
	ChannelType                string    `gorm:"not null" json:"channel_type"`
	AccountID                  uint64    `gorm:"not null;index" json:"account_id"`
	Name                       string    `gorm:"not null" json:"name"`
	AvatarURL                  string    `json:"avatar_url"`
	GreetingEnabled            bool      `gorm:"default:false" json:"greeting_enabled"`
	GreetingMessage            string    `json:"greeting_message"`
	CreatedAt                  time.Time `json:"created_at"`
	UpdatedAt                  time.Time `json:"updated_at"`
	WorkingHoursEnabled        bool      `gorm:"default:false" json:"working_hours_enabled"`
	OutofOfficeMessage         string    `gorm:"column:out_of_office_message" json:"out_of_office_message"`
	Timezone                   string    `gorm:"default:'UTC'" json:"timezone"`
	EnableAutoAssignment       bool      `gorm:"default:true" json:"enable_auto_assignment"`
	ExternalID                 *string   `json:"external_id"`
	PortalID                   uint64    `json:"portal_id"`
	CSATSurveyEnabled          bool      `gorm:"default:false" json:"csat_survey_enabled"`
	AllowMessagesAfterResolved bool      `gorm:"default:true" json:"allow_messages_after_resolved"`

	// Relacionamentos
	Account Account `gorm:"foreignKey:AccountID" json:"-"`
}

func (Inbox) TableName() string {
	return "inboxes"
}
