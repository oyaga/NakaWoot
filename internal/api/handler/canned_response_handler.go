package handler

import (
	"mensager-go/internal/models"
	"mensager-go/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ListCannedResponses(c *gin.Context) {
	val, _ := c.Get("account_id")
	accountID := val.(uint)

	responses, err := repository.ListCannedResponses(accountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, responses)
}

func CreateCannedResponse(c *gin.Context) {
	val, _ := c.Get("account_id")
	accountID := val.(uint)

	var input struct {
		ShortCode string `json:"short_code" binding:"required"`
		Content   string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res := &models.CannedResponse{
		AccountID: accountID,
		ShortCode: input.ShortCode,
		Content:   input.Content,
	}

	if err := repository.CreateCannedResponse(res); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, res)
}
