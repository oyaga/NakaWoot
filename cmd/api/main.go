package main

import (
	"log"
	"os"

	"mensager-go/internal/api"
	"mensager-go/internal/api/handler"
	"mensager-go/internal/db"
	"mensager-go/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if os.Getenv("DOCKER_ENV") == "" {
		godotenv.Load()
	}

	// Inicializa Conexão com Banco via novo pacote
	db.Init()

	// Inicializa storage de mídia
	service.InitMediaStorage()

	r := gin.Default()

	// Configurar trusted proxies de forma segura
	// Em produção com Docker Swarm/Traefik, confiar apenas em redes Docker
	// Em desenvolvimento local, confiar apenas em localhost
	if os.Getenv("DOCKER_ENV") != "" {
		// Produção: confiar apenas em proxies da rede Docker
		r.SetTrustedProxies([]string{
			"172.16.0.0/12",  // Rede Docker padrão
			"10.0.0.0/8",     // Redes Docker customizadas
			"127.0.0.1",      // Localhost
		})
	} else {
		// Desenvolvimento: confiar apenas em localhost
		r.SetTrustedProxies([]string{"127.0.0.1", "::1"})
	}

	// CORS Middleware manual para evitar dependencia externa nova
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, api_access_token")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400") // 24 horas

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check básico
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "alive", "database": "connected"})
	})

	// Servir arquivos de mídia com Content-Type correto (não usar r.Static)
	// A rota /media/:filename é definida em routes.go usando handler customizado

	// Setup das rotas da API
	api.SetupRoutes(r)

	// Inicializar broadcast de eventos em tempo real
	initBroadcast()

	port := os.Getenv("PORT")
	if port == "" {
		port = "4120"
	}

	log.Printf("🚀 Mensager NK API started on port %s", port)
	r.Run(":" + port)
}

// initBroadcast conecta o sistema de broadcast do handler com o serviço
func initBroadcast() {
	// Conectar função de broadcast para conversações
	service.BroadcastToConversationFunc = func(conversationID uint, event service.BroadcastEvent) {
		handler.BroadcastToConversation(conversationID, handler.RealtimeEvent{
			Type:    event.Type,
			Payload: event.Payload,
		})
	}

	// Conectar função de broadcast para contas (para atualizar lista de conversas)
	service.BroadcastToAccountFunc = func(accountID uint, event service.BroadcastEvent) {
		handler.BroadcastToAccount(accountID, handler.RealtimeEvent{
			Type:    event.Type,
			Payload: event.Payload,
		})
	}

	log.Println("✅ Real-time broadcast initialized")
}
