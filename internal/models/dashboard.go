package models

type AccountSummary struct {
	AccountID             uint    `gorm:"primaryKey" json:"account_id"`
	ConversationsCount    int64   `json:"conversations_count"`
	IncomingMessagesCount int64   `json:"incoming_messages_count"`
	OutgoingMessagesCount int64   `json:"outgoing_messages_count"`
	AvgResponseTime       float64 `json:"avg_response_time"`
	ResolutionTime        float64 `json:"resolution_time"`
}

func (AccountSummary) TableName() string {
	return "account_summaries" // Assumindo uma view ou tabela de cache
}
