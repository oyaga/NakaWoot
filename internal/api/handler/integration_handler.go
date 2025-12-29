package handler

import (
	"encoding/json"
	"fmt"
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
func GenerateDebugToken(c *gin.Context) {
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
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"token": tokenString, "secret_len": len(secret)})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Create Integration (acts as Channel)
	integration := models.Integration{
		AccountID: accountID,
		Provider:  input.Channel.Type,                   // e.g., "api"
		Config:    datatypes.JSON(input.Channel.Config), // Store full config/url if needed
		Status:    "active",
	}

	// Helper to store webhook_url in config if present
	if input.Channel.WebhookURL != "" {
		configMap := map[string]interface{}{}
		_ = json.Unmarshal(input.Channel.Config, &configMap)
		configMap["webhook_url"] = input.Channel.WebhookURL
		configBytes, _ := json.Marshal(configMap)
		integration.Config = datatypes.JSON(configBytes)
	}

	if err := db.Instance.Create(&integration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create channel/integration"})
		return
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
