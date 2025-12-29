package models

import (
"time"

"gorm.io/datatypes"
)

type Integration struct {
ID        uint           `gorm:"primaryKey" json:"id"`
AccountID uint           `gorm:"not null" json:"account_id"`
Provider  string         `gorm:"type:varchar(50);not null" json:"provider"` // 'whatsapp', 'facebook'
Config    datatypes.JSON `gorm:"type:jsonb" json:"config"`                  // Tokens, secrets
Status    string         `gorm:"type:varchar(20);default:'active'" json:"status"`
CreatedAt time.Time      `json:"created_at"`
UpdatedAt time.Time      `json:"updated_at"`

Account Account `gorm:"foreignKey:AccountID" json:"-"`
}

func (Integration) TableName() string {
return "integrations"
}