package models

import (
	"time"

	"gorm.io/datatypes"
)

// Message representa uma mensagem no sistema
type Message struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	Content        string         `gorm:"type:text" json:"content"`
	AccountID      uint           `gorm:"index" json:"account_id"`
	InboxID        uint           `gorm:"index" json:"inbox_id"`
	ConversationID uint           `gorm:"index" json:"conversation_id"`
	MessageType    int            `json:"message_type"` // 0=incoming, 1=outgoing, 2=activity, 3=template
	ContentType    string         `json:"content_type"` // text, image, video, audio, file, location, contact
	Private        bool           `json:"private"`
	SenderType     string         `json:"sender_type"` // User, Contact
	SenderID       uint           `json:"sender_id"`
	UserID         *uint          `json:"user_id"` // ID do usuário que enviou (para agentes)
	Status         string         `json:"status"` // sent, delivered, read, failed

	// Campos específicos para Evolution/WhatsApp
	SourceID          string         `gorm:"index" json:"source_id"`                                         // ID da mensagem no WhatsApp
	ExternalSourceIDs datatypes.JSON `json:"external_source_ids"`                                            // IDs externos em JSON
	WhatsAppMessageID *string        `gorm:"column:whatsapp_message_id;uniqueIndex" json:"whatsapp_message_id"` // ID único do WhatsApp
	RemoteJid         *string        `gorm:"column:remote_jid;index" json:"remote_jid"`                      // JID do chat (55119999@s.whatsapp.net)
	PushName          *string        `json:"push_name"`                                // Nome do contato
	IsFromMe          bool           `gorm:"default:false" json:"is_from_me"`          // Se a mensagem é do próprio usuário
	IsGroup           bool           `gorm:"default:false" json:"is_group"`            // Se é mensagem de grupo
	Timestamp         *time.Time     `json:"timestamp"`                                // Timestamp original do WhatsApp
	QuotedMessageID   *string        `json:"quoted_message_id"`                        // ID da mensagem citada
	MediaURL          *string        `json:"media_url"`                                // URL da mídia (imagem, vídeo, etc)
	MimeType          *string        `json:"mime_type"`                                // Tipo MIME do arquivo
	FileName          *string        `json:"file_name"`                                // Nome do arquivo
	FileSize          *int64         `json:"file_size"`                                // Tamanho do arquivo em bytes
	Caption           *string        `gorm:"type:text" json:"caption"`                 // Legenda para mídia
	GroupData         datatypes.JSON `json:"group_data"`                               // Dados do grupo em JSON
	Metadata          datatypes.JSON `json:"metadata"`                                 // Metadados adicionais em JSON
	Revoked           bool           `gorm:"default:false" json:"revoked"`             // Se mensagem foi revogada
	Edited            bool           `gorm:"default:false" json:"edited"`              // Se mensagem foi editada

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relacionamentos
	Conversation Conversation `gorm:"foreignKey:ConversationID" json:"-"`
	Inbox        Inbox        `gorm:"foreignKey:InboxID" json:"-"`
	Account      Account      `gorm:"foreignKey:AccountID" json:"-"`
}

func (Message) TableName() string {
	return "messages"
}

// MessageStatus representa os status possíveis de uma mensagem
const (
	MessageStatusSent      = "sent"
	MessageStatusDelivered = "delivered"
	MessageStatusRead      = "read"
	MessageStatusFailed    = "failed"
)

// MessageType representa os tipos de mensagem
const (
	MessageTypeIncoming = 0
	MessageTypeOutgoing = 1
	MessageTypeActivity = 2
	MessageTypeTemplate = 3
)
