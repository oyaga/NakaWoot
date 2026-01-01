package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"mensager-go/internal/db"
	"mensager-go/internal/models"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/datatypes"
)

type CreateIntegrationInput struct {
	Provider string          `json:"provider" binding:"required"`
	Config   json.RawMessage `json:"config" binding:"required"`
}

// GenerateDebugToken - GET /api/v1/debug/token
// SEGURANÇA: Este endpoint só deve estar disponível em ambiente de desenvolvimento
func GenerateDebugToken(c *gin.Context) {
	// Verificar se está em ambiente de desenvolvimento
	env := os.Getenv("ENVIRONMENT")
	if env == "production" || env == "prod" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Debug endpoint not available in production"})
		return
	}

	// Only for development/debug
	userUUID := "d449afb9-e077-4121-b1a1-34878c100cf1"

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  userUUID,
		"exp":  time.Now().Add(time.Hour * 24).Unix(),
		"aud":  "authenticated",
		"role": "authenticated",
	})

	secret := []byte(os.Getenv("SUPABASE_JWT_SECRET"))
	tokenString, err := token.SignedString(secret)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      tokenString,
		"secret_len": len(secret),
		"warning":    "This is a development-only endpoint",
	})
}

// CreateChatwootInbox - POST /api/v1/accounts/:account_id/inboxes
func CreateChatwootInbox(c *gin.Context) {
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	accountID := accountIDVal.(uint)

	// Chatwoot payload structure
	var input struct {
		Name    string `json:"name" binding:"required"`
		Channel struct {
			Type       string          `json:"type" binding:"required"`
			WebhookURL string          `json:"webhook_url"`
			Config     json.RawMessage `json:"config"`
		} `json:"channel" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("[Integration] Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Extrair credenciais da Evolution API dos headers HTTP
	evolutionAPIURL := c.GetHeader("X-Evolution-Base-URL")
	evolutionAPIKey := c.GetHeader("apikey") // Evolution usa "apikey" header
	evolutionInstance := c.GetHeader("instanceid")

	// Se não vier nos headers, tentar extrair da URL de referer
	if evolutionAPIURL == "" {
		referer := c.GetHeader("Referer")
		if referer != "" {
			// Extrair base URL do referer (ex: https://evolution.domain.com/manager -> https://evolution.domain.com)
			// Parse URL logic here if needed
			log.Printf("[Integration] Referer header: %s", referer)
		}
	}

	log.Printf("[Integration] Creating inbox: Name=%s, ChannelType=%s, WebhookURL=%s", input.Name, input.Channel.Type, input.Channel.WebhookURL)
	log.Printf("[Integration] Evolution credentials from headers - BaseURL=%s, Instance=%s, HasAPIKey=%v",
		evolutionAPIURL, evolutionInstance, evolutionAPIKey != "")

	// 1. Buscar ou criar Integration (acts as Channel)
	var integration models.Integration

	// Tentar encontrar integração existente do mesmo tipo para esta conta
	err := db.Instance.Where("account_id = ? AND provider = ?", accountID, input.Channel.Type).First(&integration).Error

	if err != nil {
		// Se não existir, criar nova integração
		log.Printf("[Integration] No existing integration found, creating new one")
		integration = models.Integration{
			AccountID: accountID,
			Provider:  input.Channel.Type,                   // e.g., "api"
			Config:    datatypes.JSON(input.Channel.Config), // Store full config/url if needed
			Status:    "active",
		}

		// Montar config com credenciais da Evolution API
		configMap := map[string]interface{}{}
		_ = json.Unmarshal(input.Channel.Config, &configMap)

		// Adicionar webhook_url se presente
		if input.Channel.WebhookURL != "" {
			configMap["webhook_url"] = input.Channel.WebhookURL
		}

		// Adicionar credenciais da Evolution API para envio de mensagens
		if evolutionAPIURL != "" {
			configMap["base_url"] = evolutionAPIURL
			configMap["EvolutionAPIUrl"] = evolutionAPIURL // Alias compatível
		}
		if evolutionAPIKey != "" {
			configMap["api_key"] = evolutionAPIKey
			configMap["EvolutionAPIToken"] = evolutionAPIKey // Alias compatível
		}
		if evolutionInstance != "" {
			configMap["instance_name"] = evolutionInstance
			configMap["EvolutionInstanceName"] = evolutionInstance // Alias compatível
		}

		configBytes, _ := json.Marshal(configMap)
		integration.Config = datatypes.JSON(configBytes)

		if err := db.Instance.Create(&integration).Error; err != nil {
			log.Printf("[Integration] Error creating integration: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create channel/integration", "details": err.Error()})
			return
		}
		log.Printf("[Integration] New integration created: ID=%d, Provider=%s, Config=%s", integration.ID, integration.Provider, string(configBytes))
	} else {
		// Integração existente encontrada, atualizar config se necessário
		log.Printf("[Integration] Using existing integration: ID=%d, Provider=%s", integration.ID, integration.Provider)

		// Atualizar config com todas as informações disponíveis
		configMap := map[string]interface{}{}
		_ = json.Unmarshal(integration.Config, &configMap)

		if input.Channel.WebhookURL != "" {
			configMap["webhook_url"] = input.Channel.WebhookURL
		}
		// Atualizar credenciais da Evolution API se fornecidas
		if evolutionAPIURL != "" {
			configMap["base_url"] = evolutionAPIURL
			configMap["EvolutionAPIUrl"] = evolutionAPIURL
		}
		if evolutionAPIKey != "" {
			configMap["api_key"] = evolutionAPIKey
			configMap["EvolutionAPIToken"] = evolutionAPIKey
		}
		if evolutionInstance != "" {
			configMap["instance_name"] = evolutionInstance
			configMap["EvolutionInstanceName"] = evolutionInstance
		}

		configBytes, _ := json.Marshal(configMap)
		integration.Config = datatypes.JSON(configBytes)
		db.Instance.Model(&integration).Update("config", integration.Config)
		log.Printf("[Integration] Integration config updated: ID=%d, Config=%s", integration.ID, string(configBytes))
	}

	// 2. Create Inbox linked to this Integration
	inbox := models.Inbox{
		AccountID:                  uint64(accountID),
		Name:                       input.Name,
		ChannelID:                  uint64(integration.ID),
		ChannelType:                input.Channel.Type,
		EnableAutoAssignment:       true,
		AllowMessagesAfterResolved: true,
	}

	if err := db.Instance.Create(&inbox).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create inbox: %v", err)})
		return
	}

	// 3. Marcar integração como "connected" quando inbox é criada com sucesso
	if err := db.Instance.Model(&integration).Update("status", "connected").Error; err != nil {
		log.Printf("[Integration] Warning: Failed to update integration status: %v", err)
		// Não retornar erro, inbox foi criada com sucesso
	}

	log.Printf("[Integration] Inbox created successfully: ID=%d, Name=%s, IntegrationID=%d (status updated to 'connected')", inbox.ID, inbox.Name, integration.ID)

	c.JSON(http.StatusOK, inbox)
}

// ListIntegrations - GET /api/v1/integrations
func ListIntegrations(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var integrations []models.Integration
	if err := db.Instance.Where("account_id = ?", accountID.(uint)).Find(&integrations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integrations"})
		return
	}

	c.JSON(http.StatusOK, integrations)
}

// CreateIntegration - POST /api/v1/integrations
func CreateIntegration(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input CreateIntegrationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	integration := models.Integration{
		AccountID: accountID.(uint),
		Provider:  input.Provider,
		Config:    datatypes.JSON(input.Config),
		Status:    "active", // Default status
	}

	if err := db.Instance.Create(&integration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create integration"})
		return
	}

	c.JSON(http.StatusCreated, integration)
}

// UpdateIntegration - PUT /api/v1/integrations/:id
func UpdateIntegration(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id := c.Param("id")
	var integration models.Integration

	// Buscar integração existente
	if err := db.Instance.Where("id = ? AND account_id = ?", id, accountID.(uint)).First(&integration).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
		return
	}

	// Input com credenciais da Evolution API
	var input struct {
		BaseURL      string `json:"base_url"`
		APIKey       string `json:"api_key"`
		InstanceName string `json:"instance_name"`
		WebhookURL   string `json:"webhook_url"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Atualizar config
	configMap := map[string]interface{}{}
	_ = json.Unmarshal(integration.Config, &configMap)

	if input.BaseURL != "" {
		configMap["base_url"] = input.BaseURL
		configMap["EvolutionAPIUrl"] = input.BaseURL
	}
	if input.APIKey != "" {
		configMap["api_key"] = input.APIKey
		configMap["EvolutionAPIToken"] = input.APIKey
	}
	if input.InstanceName != "" {
		configMap["instance_name"] = input.InstanceName
		configMap["EvolutionInstanceName"] = input.InstanceName
	}
	if input.WebhookURL != "" {
		configMap["webhook_url"] = input.WebhookURL
	}

	configBytes, _ := json.Marshal(configMap)
	integration.Config = datatypes.JSON(configBytes)

	if err := db.Instance.Model(&integration).Update("config", integration.Config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update integration"})
		return
	}

	log.Printf("[Integration] Integration updated: ID=%d, Config=%s", integration.ID, string(configBytes))
	c.JSON(http.StatusOK, integration)
}

// DeleteIntegration - DELETE /api/v1/integrations/:id
func DeleteIntegration(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id := c.Param("id")
	if err := db.Instance.Where("id = ? AND account_id = ?", id, accountID.(uint)).Delete(&models.Integration{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete integration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Integration deleted"})
}
