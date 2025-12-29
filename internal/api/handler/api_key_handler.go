package handler

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"mensager-go/internal/db"
	"mensager-go/internal/models"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// GetAPIKeys retorna as API keys do usuário
func GetAPIKeys(c *gin.Context) {
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account ID not found"})
		return
	}

	accountID := accountIDVal.(uint)
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	var user models.User
	if err := db.Instance.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}

	var account models.Account
	if err := db.Instance.First(&account, accountID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch account"})
		return
	}

	// Buscar tokens existentes (se houver uma tabela de tokens)
	// Por enquanto, vamos retornar o account_id e permitir gerar novos tokens

	c.JSON(http.StatusOK, gin.H{
		"account_id": accountID,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}

// GenerateAPIToken gera um novo token de API para integração
func GenerateAPIToken(c *gin.Context) {
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account ID not found"})
		return
	}

	accountID := accountIDVal.(uint)
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	var input struct {
		Name      string `json:"name" binding:"required"`
		ExpiresIn int64  `json:"expires_in"` // Em dias, 0 = nunca expira
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Gerar token aleatório de 32 bytes
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Codificar em base64
	tokenString := base64.URLEncoding.EncodeToString(randomBytes)

	// Calcular data de expiração
	var expiresAt *time.Time
	if input.ExpiresIn > 0 {
		expTime := time.Now().AddDate(0, 0, int(input.ExpiresIn))
		expiresAt = &expTime
	}

	// Criar registro de API token (você precisa criar o model)
	apiToken := models.APIToken{
		UserID:     userID,
		AccountID:  accountID,
		Name:       input.Name,
		Token:      tokenString,
		ExpiresAt:  expiresAt,
		LastUsedAt: nil,
	}

	if err := db.Instance.Create(&apiToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create token: %v", err)})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         apiToken.ID,
		"name":       apiToken.Name,
		"token":      tokenString,
		"expires_at": expiresAt,
		"created_at": apiToken.CreatedAt,
	})
}

// ListAPITokens lista todos os tokens de API do usuário
func ListAPITokens(c *gin.Context) {
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account ID not found"})
		return
	}

	accountID := accountIDVal.(uint)

	var tokens []models.APIToken
	if err := db.Instance.Where("account_id = ?", accountID).Order("created_at DESC").Find(&tokens).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tokens"})
		return
	}

	// Mascarar os tokens (mostrar apenas os primeiros e últimos caracteres)
	type TokenResponse struct {
		ID         uint       `json:"id"`
		Name       string     `json:"name"`
		Token      string     `json:"token"`
		ExpiresAt  *time.Time `json:"expires_at"`
		LastUsedAt *time.Time `json:"last_used_at"`
		CreatedAt  time.Time  `json:"created_at"`
	}

	var response []TokenResponse
	for _, token := range tokens {
		maskedToken := ""
		if len(token.Token) > 12 {
			maskedToken = token.Token[:6] + "..." + token.Token[len(token.Token)-6:]
		} else {
			maskedToken = "***"
		}

		response = append(response, TokenResponse{
			ID:         token.ID,
			Name:       token.Name,
			Token:      maskedToken,
			ExpiresAt:  token.ExpiresAt,
			LastUsedAt: token.LastUsedAt,
			CreatedAt:  token.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, response)
}

// DeleteAPIToken deleta um token de API
func DeleteAPIToken(c *gin.Context) {
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account ID not found"})
		return
	}

	accountID := accountIDVal.(uint)
	tokenID := c.Param("id")

	result := db.Instance.Where("id = ? AND account_id = ?", tokenID, accountID).Delete(&models.APIToken{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete token"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Token not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Token deleted successfully"})
}

// GenerateLongLivedToken gera um token JWT de longa duração para integrações
func GenerateLongLivedToken(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var user models.User
	if err := db.Instance.First(&user, userIDVal.(uint)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}

	// Gerar token JWT com expiração de 1 ano
	expirationTime := time.Now().Add(365 * 24 * time.Hour)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.UUID,
		"exp":  expirationTime.Unix(),
		"aud":  "authenticated",
		"role": "authenticated",
		"type": "api_token",
	})

	// Usar o mesmo secret do Supabase
	// Usar o mesmo secret do Supabase
	secret := os.Getenv("SUPABASE_JWT_SECRET")
	if secret == "" {
		// Fallback apenas para desenvolvimento local se a env não estiver setada (mas deveria estar)
		secret = "your-super-secret-jwt-token-with-at-least-32-characters-long"
	}
	jwtSecret := []byte(secret)

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      tokenString,
		"expires_at": expirationTime,
		"type":       "Bearer",
	})
}
