package handlers

import (
"encoding/json"
"net/http"

"mensager-go/internal/models"

"github.com/gin-gonic/gin"
"gorm.io/datatypes"
"gorm.io/gorm"
)

type IntegrationsHandler struct {
DB *gorm.DB
}

func NewIntegrationsHandler(db *gorm.DB) *IntegrationsHandler {
return &IntegrationsHandler{DB: db}
}

// Create godoc
// @Summary Create a new integration
// @Tags integrations
// @Accept json
// @Produce json
// @Param integration body CreateIntegrationInput true "Integration Config"
// @Success 201 {object} models.Integration
// @Router /integrations [post]
func (h *IntegrationsHandler) Create(c *gin.Context) {
var input struct {
AccountID uint            `json:"account_id" binding:"required"`
Provider  string          `json:"provider" binding:"required"`
Config    json.RawMessage `json:"config" binding:"required"`
}

if err := c.ShouldBindJSON(&input); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

integration := models.Integration{
AccountID: input.AccountID,
Provider:  input.Provider,
Config:    datatypes.JSON(input.Config),
Status:    "active",
}

if err := h.DB.Create(&integration).Error; err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create integration"})
return
}

c.JSON(http.StatusCreated, integration)
}

// List godoc
// @Summary List integrations
// @Tags integrations
// @Produce json
// @Param account_id query int true "Account ID"
// @Success 200 {array} models.Integration
// @Router /integrations [get]
func (h *IntegrationsHandler) List(c *gin.Context) {
accountID := c.Query("account_id")
if accountID == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "account_id is required"})
return
}

var integrations []models.Integration
if err := h.DB.Where("account_id = ?", accountID).Find(&integrations).Error; err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integrations"})
return
}

c.JSON(http.StatusOK, integrations)
}