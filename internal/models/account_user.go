package models

import "time"

// AccountUser mapeia a tabela de junção 'account_users'
type AccountUser struct {
ID        uint      `gorm:"primaryKey" json:"id"`
AccountID uint      `gorm:"index;not null" json:"account_id"`
UserID    uint      `gorm:"index;not null" json:"user_id"`
Role      int       `gorm:"default:0" json:"role"` // 0: agent, 1: administrator
CreatedAt time.Time `json:"created_at"`
UpdatedAt time.Time `json:"updated_at"`

Account   Account   `gorm:"foreignKey:AccountID" json:"account,omitempty"`
User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (AccountUser) TableName() string {
return "account_users"
}