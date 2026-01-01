package handler

import (
	"fmt"
	"mensager-go/internal/db"
	"mensager-go/internal/models"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
)

type DashboardStats struct {
	TotalInboxes        int64                `json:"total_inboxes"`
	TotalConversations  int64                `json:"total_conversations"`
	AverageResponseTime string               `json:"average_response_time"`
	ConversationTrend   string               `json:"conversation_trend"`
	InboxTrend          string               `json:"inbox_trend"`
	ResponseTimeTrend   string               `json:"response_time_trend"`
	RecentActivity      []RecentActivityItem `json:"recent_activity"`
}

type RecentActivityItem struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Status    string    `json:"status"`
	Type      string    `json:"type"`
	Time      string    `json:"time"`
	AvatarURL string    `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}

// GetDashboardStats - GET /api/v1/dashboard/stats
func GetDashboardStats(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account_id not found"})
		return
	}

	var stats DashboardStats

	// Total de Inboxes
	err := db.Instance.Model(&models.Inbox{}).
		Where("account_id = ?", accountID.(uint)).
		Count(&stats.TotalInboxes).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count inboxes"})
		return
	}

	// Total de Conversas
	err = db.Instance.Model(&models.Conversation{}).
		Where("account_id = ?", accountID.(uint)).
		Count(&stats.TotalConversations).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count conversations"})
		return
	}

	// Calcular trends
	lastMonth := time.Now().AddDate(0, -1, 0)

	// Trend de conversas
	var lastMonthConv, prevMonthConv int64
	db.Instance.Model(&models.Conversation{}).
		Where("account_id = ? AND created_at >= ?", accountID.(uint), lastMonth).
		Count(&lastMonthConv)

	twoMonthsAgo := time.Now().AddDate(0, -2, 0)
	db.Instance.Model(&models.Conversation{}).
		Where("account_id = ? AND created_at >= ? AND created_at < ?",
			accountID.(uint), twoMonthsAgo, lastMonth).
		Count(&prevMonthConv)

	if prevMonthConv > 0 {
		change := float64(lastMonthConv-prevMonthConv) / float64(prevMonthConv) * 100
		stats.ConversationTrend = fmt.Sprintf("%+.0f%%", change)
	} else if lastMonthConv > 0 {
		stats.ConversationTrend = "+100%"
	} else {
		stats.ConversationTrend = "0%"
	}

	// Trend de inboxes (real)
	var lastMonthInboxes, prevMonthInboxes int64
	db.Instance.Model(&models.Inbox{}).
		Where("account_id = ? AND created_at >= ?", accountID.(uint), lastMonth).
		Count(&lastMonthInboxes)

	db.Instance.Model(&models.Inbox{}).
		Where("account_id = ? AND created_at >= ? AND created_at < ?",
			accountID.(uint), twoMonthsAgo, lastMonth).
		Count(&prevMonthInboxes)

	if prevMonthInboxes > 0 {
		change := float64(lastMonthInboxes-prevMonthInboxes) / float64(prevMonthInboxes) * 100
		stats.InboxTrend = fmt.Sprintf("%+.0f%%", change)
	} else if lastMonthInboxes > 0 {
		stats.InboxTrend = "+100%"
	} else {
		stats.InboxTrend = "0%"
	}

	// Calcular tempo médio de resposta real
	stats.AverageResponseTime, stats.ResponseTimeTrend = calculateAverageResponseTime(accountID.(uint))

	// Atividade Recente
	stats.RecentActivity = []RecentActivityItem{}

	// Buscar últimos 6 contatos
	var recentContacts []models.Contact
	db.Instance.Where("account_id = ?", accountID.(uint)).
		Order("created_at DESC").
		Limit(6).
		Find(&recentContacts)

	for _, contact := range recentContacts {
		stats.RecentActivity = append(stats.RecentActivity, RecentActivityItem{
			ID:        contact.ID,
			Name:      contact.Name,
			Email:     contact.Email,
			Status:    "Novo contato",
			Type:      "contact",
			Time:      getTimeSince(contact.CreatedAt),
			AvatarURL: contact.AvatarURL,
			CreatedAt: contact.CreatedAt,
		})
	}

	// Buscar últimas 6 conversas
	var recentConversations []models.Conversation
	db.Instance.Where("account_id = ?", accountID.(uint)).
		Order("created_at DESC").
		Limit(6).
		Find(&recentConversations)

	for _, conv := range recentConversations {
		// Buscar contato da conversa se existir
		name := fmt.Sprintf("Conversa #%d", conv.ID)
		email := ""
		avatarURL := ""

		if conv.ContactID > 0 {
			var contact models.Contact
			err := db.Instance.First(&contact, conv.ContactID).Error
			if err == nil {
				name = contact.Name
				email = contact.Email
				avatarURL = contact.AvatarURL
			}
		}

		status := "Nova conversa"
		if conv.Status == 1 { // 1 = resolved
			status = "Conversa resolvida"
		} else if conv.AssigneeID != nil && *conv.AssigneeID > 0 {
			status = "Atribuído a você"
		}

		stats.RecentActivity = append(stats.RecentActivity, RecentActivityItem{
			ID:        uint(conv.ID),
			Name:      name,
			Email:     email,
			Status:    status,
			Type:      "conversation",
			Time:      getTimeSince(conv.CreatedAt),
			AvatarURL: avatarURL,
			CreatedAt: conv.CreatedAt,
		})
	}

	// Ordenar toda a atividade por data (mais recente primeiro)
	sort.Slice(stats.RecentActivity, func(i, j int) bool {
		return stats.RecentActivity[i].CreatedAt.After(stats.RecentActivity[j].CreatedAt)
	})

	// Limitar a 6 itens no total
	if len(stats.RecentActivity) > 6 {
		stats.RecentActivity = stats.RecentActivity[:6]
	}

	c.JSON(http.StatusOK, stats)
}

func getTimeSince(t time.Time) string {
	duration := time.Since(t)

	if duration.Minutes() < 1 {
		return "agora"
	} else if duration.Minutes() < 60 {
		mins := int(duration.Minutes())
		if mins == 1 {
			return "1 min atrás"
		}
		return fmt.Sprintf("%d min atrás", mins)
	} else if duration.Hours() < 24 {
		hours := int(duration.Hours())
		if hours == 1 {
			return "1 hora atrás"
		}
		return fmt.Sprintf("%d horas atrás", hours)
	} else {
		days := int(duration.Hours() / 24)
		if days == 1 {
			return "1 dia atrás"
		}
		return fmt.Sprintf("%d dias atrás", days)
	}
}

// ResponseTime representa o tempo de resposta de uma conversa
type ResponseTime struct {
	ConversationID uint
	ClientTime     time.Time
	AgentTime      time.Time
}

// calculateAverageResponseTime calcula o tempo médio de resposta
func calculateAverageResponseTime(accountID uint) (string, string) {
	// Buscar pares de mensagens: cliente -> primeira resposta do agente
	var responseTimes []ResponseTime

	// Query SQL para encontrar o tempo de resposta em cada conversa
	query := `
		WITH client_messages AS (
			SELECT
				conversation_id,
				created_at,
				ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at) as rn
			FROM messages
			WHERE account_id = ?
				AND message_type = 0  -- incoming (cliente)
				AND created_at >= ?   -- últimos 30 dias
		),
		agent_responses AS (
			SELECT
				m.conversation_id,
				m.created_at,
				(
					SELECT cm.created_at
					FROM client_messages cm
					WHERE cm.conversation_id = m.conversation_id
						AND cm.created_at < m.created_at
					ORDER BY cm.created_at DESC
					LIMIT 1
				) as client_time
			FROM messages m
			WHERE m.account_id = ?
				AND m.message_type = 1  -- outgoing (agente)
				AND m.created_at >= ?    -- últimos 30 dias
		)
		SELECT
			conversation_id,
			client_time,
			created_at as agent_time
		FROM agent_responses
		WHERE client_time IS NOT NULL
		LIMIT 100
	`

	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	err := db.Instance.Raw(query, accountID, thirtyDaysAgo, accountID, thirtyDaysAgo).Scan(&responseTimes).Error

	if err != nil {
		return "N/A", "0%"
	}

	if len(responseTimes) == 0 {
		return "N/A", "0%"
	}

	// Calcular média dos tempos de resposta
	var totalSeconds float64
	validResponses := 0

	for _, rt := range responseTimes {
		diff := rt.AgentTime.Sub(rt.ClientTime)

		// Ignorar tempos negativos ou muito grandes (> 24h, provavelmente erro)
		if diff > 0 && diff < 24*time.Hour {
			totalSeconds += diff.Seconds()
			validResponses++
		}
	}

	if validResponses == 0 {
		return "N/A", "0%"
	}

	avgSeconds := totalSeconds / float64(validResponses)

	// Formatar tempo médio
	avgTimeStr := formatDuration(time.Duration(avgSeconds) * time.Second)

	// Calcular trend (comparar últimos 15 dias vs 15 dias anteriores)
	fifteenDaysAgo := time.Now().AddDate(0, 0, -15)
	var recentTimes, previousTimes []ResponseTime

	db.Instance.Raw(query, accountID, fifteenDaysAgo, accountID, fifteenDaysAgo).Scan(&recentTimes)
	db.Instance.Raw(query, accountID, thirtyDaysAgo, accountID, fifteenDaysAgo).Scan(&previousTimes)

	recentAvg := calculateAvgFromTimes(recentTimes)
	previousAvg := calculateAvgFromTimes(previousTimes)

	trend := "0%"
	if previousAvg > 0 {
		change := ((recentAvg - previousAvg) / previousAvg) * 100
		// Tempo menor é melhor, então inverter o sinal
		trend = fmt.Sprintf("%+.0f%%", -change)
	}

	return avgTimeStr, trend
}

// formatDuration formata uma duração em formato legível
func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%.0fs", d.Seconds())
	} else if d < time.Hour {
		mins := int(d.Minutes())
		secs := int(d.Seconds()) % 60
		if secs > 0 {
			return fmt.Sprintf("%dm %ds", mins, secs)
		}
		return fmt.Sprintf("%dm", mins)
	} else {
		hours := int(d.Hours())
		mins := int(d.Minutes()) % 60
		if mins > 0 {
			return fmt.Sprintf("%dh %dm", hours, mins)
		}
		return fmt.Sprintf("%dh", hours)
	}
}

// calculateAvgFromTimes calcula a média de tempo de resposta de uma lista de ResponseTime
func calculateAvgFromTimes(times []ResponseTime) float64 {
	if len(times) == 0 {
		return 0
	}

	var totalSeconds float64
	validCount := 0

	for _, rt := range times {
		diff := rt.AgentTime.Sub(rt.ClientTime)
		if diff > 0 && diff < 24*time.Hour {
			totalSeconds += diff.Seconds()
			validCount++
		}
	}

	if validCount == 0 {
		return 0
	}

	return totalSeconds / float64(validCount)
}

// ConversationStatsResponse representa os dados para o gráfico de conversas
type ConversationStatsResponse struct {
	Period string                  `json:"period"`
	Data   []ConversationDataPoint `json:"data"`
}

type ConversationDataPoint struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

// GetDashboardChartData - GET /api/v1/dashboard/conversation-stats?period=7|15|30
func GetDashboardChartData(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account_id not found"})
		return
	}

	// Período padrão: 30 dias
	period := c.DefaultQuery("period", "30")

	var days int
	switch period {
	case "7":
		days = 7
	case "15":
		days = 15
	case "30":
		days = 30
	default:
		days = 30
	}

	// Data inicial
	startDate := time.Now().AddDate(0, 0, -days).Truncate(24 * time.Hour)

	// Criar array de dados para cada dia
	dataPoints := make([]ConversationDataPoint, days)

	for i := 0; i < days; i++ {
		currentDate := startDate.AddDate(0, 0, i)
		nextDate := currentDate.AddDate(0, 0, 1)

		var count int64
		err := db.Instance.Model(&models.Conversation{}).
			Where("account_id = ? AND created_at >= ? AND created_at < ?",
				accountID.(uint), currentDate, nextDate).
			Count(&count).Error

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch conversation stats"})
			return
		}

		// Formatar data como "DD/MM" para exibição
		dateStr := currentDate.Format("02/01")

		dataPoints[i] = ConversationDataPoint{
			Date:  dateStr,
			Count: count,
		}
	}

	response := ConversationStatsResponse{
		Period: period,
		Data:   dataPoints,
	}

	c.JSON(http.StatusOK, response)
}

// Legacy function - manter para compatibilidade
func GetDashboardSummary(c *gin.Context) {
	// Redirecionar para a nova função
	GetDashboardStats(c)
}
