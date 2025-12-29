package handler

import (
	"mensager-go/internal/db"
	"mensager-go/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ListInboxes retorna todas as inboxes de uma conta
func ListInboxes(c *gin.Context) {
	// Pegar account_id do contexto (setado pelo middleware)
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account ID not found"})
		return
	}

	accountID := accountIDVal.(uint)

	var inboxes []models.Inbox
	result := db.Instance.Where("account_id = ?", accountID).Order("created_at DESC").Find(&inboxes)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch inboxes"})
		return
	}

	c.JSON(http.StatusOK, inboxes)
}

// GetInbox retorna uma inbox específica
func GetInbox(c *gin.Context) {
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account ID not found"})
		return
	}

	accountID := accountIDVal.(uint)
	inboxID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inbox ID"})
		return
	}

	var inbox models.Inbox
	result := db.Instance.Where("id = ? AND account_id = ?", inboxID, accountID).First(&inbox)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inbox not found"})
		return
	}

	c.JSON(http.StatusOK, inbox)
}

// CreateInbox cria uma nova inbox
func CreateInbox(c *gin.Context) {
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account ID not found"})
		return
	}

	accountID := accountIDVal.(uint)

	var input struct {
		ChannelID                  uint64 `json:"channel_id" binding:"required"`
		ChannelType                string `json:"channel_type" binding:"required"`
		Name                       string `json:"name" binding:"required"`
		AvatarURL                  string `json:"avatar_url"`
		GreetingEnabled            bool   `json:"greeting_enabled"`
		GreetingMessage            string `json:"greeting_message"`
		WorkingHoursEnabled        bool   `json:"working_hours_enabled"`
		OutofOfficeMessage         string `json:"out_of_office_message"`
		Timezone                   string `json:"timezone"`
		EnableAutoAssignment       bool   `json:"enable_auto_assignment"`
		CSATSurveyEnabled          bool   `json:"csat_survey_enabled"`
		AllowMessagesAfterResolved bool   `json:"allow_messages_after_resolved"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inbox := models.Inbox{
		AccountID:                  uint64(accountID),
		ChannelID:                  input.ChannelID,
		ChannelType:                input.ChannelType,
		Name:                       input.Name,
		AvatarURL:                  input.AvatarURL,
		GreetingEnabled:            input.GreetingEnabled,
		GreetingMessage:            input.GreetingMessage,
		WorkingHoursEnabled:        input.WorkingHoursEnabled,
		OutofOfficeMessage:         input.OutofOfficeMessage,
		Timezone:                   input.Timezone,
		EnableAutoAssignment:       input.EnableAutoAssignment,
		CSATSurveyEnabled:          input.CSATSurveyEnabled,
		AllowMessagesAfterResolved: input.AllowMessagesAfterResolved,
	}

	// Define timezone padrão se não fornecido
	if inbox.Timezone == "" {
		inbox.Timezone = "UTC"
	}

	result := db.Instance.Create(&inbox)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create inbox", "details": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, inbox)
}

// UpdateInbox atualiza uma inbox existente
func UpdateInbox(c *gin.Context) {
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account ID not found"})
		return
	}

	accountID := accountIDVal.(uint)
	inboxID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inbox ID"})
		return
	}

	var inbox models.Inbox
	result := db.Instance.Where("id = ? AND account_id = ?", inboxID, accountID).First(&inbox)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inbox not found"})
		return
	}

	var input struct {
		ChannelID                  *uint64 `json:"channel_id"`
		Name                       string  `json:"name"`
		AvatarURL                  string  `json:"avatar_url"`
		GreetingEnabled            bool    `json:"greeting_enabled"`
		GreetingMessage            string  `json:"greeting_message"`
		WorkingHoursEnabled        bool    `json:"working_hours_enabled"`
		OutofOfficeMessage         string  `json:"out_of_office_message"`
		Timezone                   string  `json:"timezone"`
		EnableAutoAssignment       bool    `json:"enable_auto_assignment"`
		CSATSurveyEnabled          bool    `json:"csat_survey_enabled"`
		AllowMessagesAfterResolved bool    `json:"allow_messages_after_resolved"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Atualizar campos
	updates := map[string]interface{}{
		"name":                          input.Name,
		"avatar_url":                    input.AvatarURL,
		"greeting_enabled":              input.GreetingEnabled,
		"greeting_message":              input.GreetingMessage,
		"working_hours_enabled":         input.WorkingHoursEnabled,
		"out_of_office_message":         input.OutofOfficeMessage,
		"timezone":                      input.Timezone,
		"enable_auto_assignment":        input.EnableAutoAssignment,
		"csat_survey_enabled":           input.CSATSurveyEnabled,
		"allow_messages_after_resolved": input.AllowMessagesAfterResolved,
	}

	// Adicionar channel_id se fornecido
	if input.ChannelID != nil {
		updates["channel_id"] = *input.ChannelID
	}

	result = db.Instance.Model(&inbox).Updates(updates)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update inbox"})
		return
	}

	c.JSON(http.StatusOK, inbox)
}

// DeleteInbox deleta uma inbox
func DeleteInbox(c *gin.Context) {
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account ID not found"})
		return
	}

	accountID := accountIDVal.(uint)
	inboxID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inbox ID"})
		return
	}

	var inbox models.Inbox
	result := db.Instance.Where("id = ? AND account_id = ?", inboxID, accountID).First(&inbox)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inbox not found"})
		return
	}

	result = db.Instance.Delete(&inbox)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete inbox"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inbox deleted successfully"})
}
