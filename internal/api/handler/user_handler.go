package handler

import (
	"mensager-go/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetMe(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Usuário não encontrado no contexto"})
		return
	}

	c.JSON(http.StatusOK, user.(models.User))
}
