package api

import (
	"mensager-go/internal/api/handler"
	"mensager-go/internal/api/middleware"
	"mensager-go/internal/repository"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Servir arquivos estáticos (uploads)
	r.Static("/uploads", "./uploads")

	// Servir arquivos de mídia com Content-Type correto
	r.GET("/media/:filename", handler.ServeMedia)

	v1 := r.Group("/api/v1")
	{
		// Public routes (Authentication & Onboarding)
		v1.POST("/webhooks/evolution", handler.EvolutionWebhookHandler)
		v1.GET("/health", handler.HealthCheck)
		v1.GET("/debug/token", handler.GenerateDebugToken) // Temp debug

		// Onboarding & Auth
		v1.GET("/installation/check", handler.CheckInstallation)
		v1.POST("/installation/onboard", handler.CreateInitialAccount)
		v1.POST("/auth/login", handler.Login)
		v1.POST("/auth/logout", handler.Logout)

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

	// IMPORTANTE: Frontend deve ser a última rota (fallback para SPA)
	// Servir arquivos estáticos do frontend compilado em /manager/dist
	frontendPath := os.Getenv("FRONTEND_PATH")
	if frontendPath == "" {
		frontendPath = "./manager/dist"
	}

	// Servir arquivos estáticos do Next.js
	r.Static("/_next", frontendPath+"/_next")

	// Servir favicon
	r.StaticFile("/favicon.ico", frontendPath+"/favicon.ico")

	// Servir arquivos SVG específicos
	r.StaticFile("/next.svg", frontendPath+"/next.svg")
	r.StaticFile("/vercel.svg", frontendPath+"/vercel.svg")
	r.StaticFile("/file.svg", frontendPath+"/file.svg")
	r.StaticFile("/globe.svg", frontendPath+"/globe.svg")
	r.StaticFile("/window.svg", frontendPath+"/window.svg")

	// Rota raiz
	r.GET("/", func(c *gin.Context) {
		c.File(frontendPath + "/index.html")
	})

	// Catch-all para SPA / Static Export
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Não servir para rotas da API
		if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/uploads/") || strings.HasPrefix(path, "/media/") {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}

		// Tentar servir arquivo HTML específico (ex: /login -> /login.html)
		if _, err := os.Stat(frontendPath + path + ".html"); err == nil {
			c.File(frontendPath + path + ".html")
			return
		}

		// Tentar servir index de diretório (ex: /login/ -> /login/index.html)
		if _, err := os.Stat(frontendPath + path + "/index.html"); err == nil {
			c.File(frontendPath + path + "/index.html")
			return
		}

		// Servir index.html para qualquer outra rota (SPA Fallback)
		c.File(frontendPath + "/index.html")
	})
}
