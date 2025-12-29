package api

import (
	"mensager-go/internal/api/handler"
	"mensager-go/internal/api/middleware"
	"mensager-go/internal/repository"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Servir arquivos estáticos (uploads)
	r.Static("/uploads", "./uploads")

	// Servir arquivos de mídia com Content-Type correto
	r.GET("/media/:filename", handler.ServeMedia)

	v1 := r.Group("/api/v1")
	{
		v1.POST("/webhooks/evolution", handler.EvolutionWebhookHandler)
		v1.GET("/health", handler.HealthCheck)
		v1.GET("/debug/token", handler.GenerateDebugToken) // Temp debug

		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/profile/me", handler.GetMe)

			// Dashboard
			protected.GET("/dashboard/stats", handler.GetDashboardStats)
			protected.GET("/dashboard/conversation-stats", handler.GetDashboardChartData)

			// Conversas & Timeline
			protected.GET("/conversations", handler.ListConversations)
			protected.POST("/conversations", handler.CreateConversation)
			protected.GET("/conversations/:id/activities", handler.ListConversationActivities)
			protected.POST("/conversations/:id/read", handler.MarkAsReadHandler)
			protected.POST("/conversations/:id/assign", handler.AssignHandler)
			protected.DELETE("/conversations/:id", handler.DeleteConversation)

			// Inboxes
			protected.GET("/inboxes", handler.ListInboxes)
			protected.POST("/inboxes", handler.CreateInbox)
			protected.POST("/inbox-clear/:id", handler.ClearInboxConversations) // Rota especial para limpar inbox
			protected.GET("/inboxes/:id", handler.GetInbox)
			protected.PUT("/inboxes/:id", handler.UpdateInbox)
			protected.DELETE("/inboxes/:id", handler.DeleteInbox)

			// Contacts
			protected.GET("/contacts", handler.ListContacts)
			protected.DELETE("/contacts-batch", handler.DeleteContacts)
			protected.DELETE("/contacts-all", handler.DeleteAllContacts)
			protected.GET("/contacts/:id", handler.GetContact)
			protected.POST("/contacts", handler.CreateContact)
			protected.PUT("/contacts/:id", handler.UpdateContact)
			protected.DELETE("/contacts/:id", handler.DeleteContact)

			// Messages
			protected.POST("/messages", handler.SendMessage)
			protected.GET("/messages/:id", handler.GetMessage)
			protected.DELETE("/messages/:id", handler.DeleteMessage)

			// Equipes
			protected.GET("/teams", func(c *gin.Context) {
				val, _ := c.Get("account_id")
				teams, _ := repository.ListTeams(val.(uint))
				c.JSON(200, teams)
			})

			// Integrations
			protected.GET("/integrations", handler.ListIntegrations)
			protected.POST("/integrations", handler.CreateIntegration)
			protected.DELETE("/integrations/:id", handler.DeleteIntegration)

			// API Keys / Tokens
			protected.GET("/api-keys", handler.GetAPIKeys)
			protected.GET("/api-tokens", handler.ListAPITokens)
			protected.POST("/api-tokens", handler.GenerateAPIToken)
			protected.POST("/api-tokens/long-lived", handler.GenerateLongLivedToken)
			protected.DELETE("/api-tokens/:id", handler.DeleteAPIToken)

			// Upload
			protected.POST("/upload", handler.UploadFile)

			// Realtime (SSE)
			protected.GET("/realtime", handler.RealtimeHandler)
		}

		// Conversation Messages Routes (separate group to avoid wildcard conflicts)
		convMessages := v1.Group("/conversation")
		convMessages.Use(middleware.AuthMiddleware())
		{
			convMessages.GET("/:id/messages", handler.ListMessages)
			convMessages.POST("/:id/messages", handler.SendMessageToConversation)
			convMessages.POST("/:id/read", handler.MarkConversationAsRead)
			convMessages.GET("/:id/stats", handler.GetConversationStats)
		}

		// Chatwoot Compatibility Routes
		cw := v1.Group("/accounts/:account_id")
		cw.Use(middleware.AuthMiddleware())
		{
			cw.GET("/inboxes", handler.ListInboxes)
			cw.POST("/inboxes", handler.CreateChatwootInbox)
			cw.GET("/conversations", handler.ListConversations)
			cw.POST("/conversations", handler.CreateConversation)
			cw.GET("/conversations/:conversation_id/messages", handler.ListConversationMessages)
			cw.POST("/conversations/:conversation_id/messages", handler.CreateChatwootMessage)
			cw.POST("/contacts", handler.CreateContact)
			cw.DELETE("/contacts/batch", handler.DeleteContacts)
			cw.DELETE("/contacts/all", handler.DeleteAllContacts)
			// Evolution specific endpoints can be mapped here
		}
	}
}
