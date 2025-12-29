package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// ServeFrontend serve os arquivos estáticos do frontend compilado
func ServeFrontend(staticPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// Se for uma rota da API, não processar aqui
		if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/uploads/") || strings.HasPrefix(path, "/media/") {
			c.Next()
			return
		}

		// Servir arquivo estático se existir
		filePath := filepath.Join(staticPath, path)
		if fileExists(filePath) && !isDirectory(filePath) {
			c.File(filePath)
			return
		}

		// Para rotas do React Router, servir index.html (SPA)
		indexPath := filepath.Join(staticPath, "index.html")
		if fileExists(indexPath) {
			c.File(indexPath)
			return
		}

		// Se não encontrou nada, 404
		c.Status(http.StatusNotFound)
	}
}

// fileExists verifica se um arquivo existe
func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

// isDirectory verifica se um path é um diretório
func isDirectory(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}
