package models

import (
	"database/sql"
	"time"
)

// Account representa a tabela 'accounts' do Chatwoot schema
type Account struct {
	ID                  uint          `gorm:"primarykey;serial;column:id;autoIncrement"`
	Name                string        `gorm:"type:varchar;not null;size:255;column:name"`
	CreatedAt           time.Time     `gorm:"column:created_at;precision:6;autoCreateTime"`
	UpdatedAt           time.Time     `gorm:"column:updated_at;precision:6;autoUpdateTime"`
	Locale              int           `gorm:"column:locale;default:0"`
	Domain              string        `gorm:"column:domain;size:100"`
	SupportEmail        string        `gorm:"column:support_email;size:100"`
	FeatureFlags        int64         `gorm:"column:feature_flags;type:bigint;default:0;not null"`
	AutoResolveDuration sql.NullInt64 `gorm:"column:auto_resolve_duration"`                 // nullable int
	Limits              []byte        `gorm:"column:limits;type:jsonb;default:'{}'::jsonb"` // jsonb as []byte for GORM
	CustomAttributes    []byte        `gorm:"column:custom_attributes;type:jsonb;default:'{}'::jsonb"`
	Status              int           `gorm:"column:status;default:0"`
	InternalAttributes  []byte        `gorm:"column:internal_attributes;type:jsonb;default:'{}'::jsonb;not null"`
	Settings            []byte        `gorm:"column:settings;type:jsonb;default:'{}'::jsonb"`
}

func (Account) TableName() string {
	return "accounts"
}
