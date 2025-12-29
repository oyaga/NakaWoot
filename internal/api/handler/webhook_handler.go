package handler

import (
	"io"
	"log"
	"mensager-go/internal/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// EvolutionWebhookHandler processa webhooks da Evolution API
func EvolutionWebhookHandler(c *gin.Context) {
	inboxIDStr := c.Query("inbox_id")
	if inboxIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "inbox_id is required"})
		return
	}

	inboxID, err := strconv.ParseUint(inboxIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid inbox_id"})
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Error reading webhook body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read request body"})
		return
	}

	// Log do webhook recebido (opcional - pode ser removido em produção)
	log.Printf("Received Evolution webhook for inbox %d: %s", inboxID, string(body))

	// Processar webhook
	err = service.ProcessEvolutionWebhook(uint(inboxID), body)
	if err != nil {
		log.Printf("Error processing Evolution webhook: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "webhook processed successfully"})
}
