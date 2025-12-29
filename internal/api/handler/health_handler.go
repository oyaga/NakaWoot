package handler

import (
	"mensager-go/internal/db"
	"net/http"

	"github.com/gin-gonic/gin"
)

func HealthCheck(c *gin.Context) {
	// Verificar DB
	sqlDB, err := db.Instance.DB()
	dbStatus := "online"
	if err != nil || sqlDB.Ping() != nil {
		dbStatus = "offline"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "operational",
		"database": dbStatus,
		"version":  "1.0.0-nk",
	})
}
