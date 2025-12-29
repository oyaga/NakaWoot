package handler

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// ServeMedia serve arquivos de mídia com proteção contra Path Traversal
func ServeMedia(c *gin.Context) {
	// Obter o nome do arquivo da URL
	fileName := c.Param("filename")
	if fileName == "" {
		fileName = c.Query("file")
	}

	if fileName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Filename is required"})
		return
	}

	// SEGURANÇA: Validar o nome do arquivo para prevenir Path Traversal
	if !isValidFileName(fileName) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	// Path do arquivo
	basePath := "./media"
	fullPath := filepath.Join(basePath, fileName)

	// SEGURANÇA: Garantir que o caminho final está dentro do diretório base
	cleanedPath := filepath.Clean(fullPath)
	if !strings.HasPrefix(cleanedPath, filepath.Clean(basePath)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Servir o arquivo
	c.File(cleanedPath)
}

// isValidFileName valida o nome do arquivo para prevenir Path Traversal
func isValidFileName(fileName string) bool {
	// Não permitir:
	// - Path traversal patterns (../)
	// - Caminhos absolutos
	// - Caracteres especiais perigosos
	if strings.Contains(fileName, "..") {
		return false
	}
	if strings.Contains(fileName, "/") && !isValidPath(fileName) {
		return false
	}
	if strings.Contains(fileName, "\\") {
		return false
	}
	if filepath.IsAbs(fileName) {
		return false
	}

	// Verificar caracteres perigosos
	dangerousChars := []string{"\x00", "\n", "\r", "|", "&", ";", "$", "`"}
	for _, char := range dangerousChars {
		if strings.Contains(fileName, char) {
			return false
		}
	}

	return true
}

// isValidPath verifica se um caminho com / é válido (permitir subdiretórios legítimos)
func isValidPath(path string) bool {
	// Permitir apenas caminhos relativos simples como "2024/01/file.jpg"
	// mas não permitir "..", caminhos absolutos, etc.
	parts := strings.Split(path, "/")
	for _, part := range parts {
		if part == ".." || part == "." || part == "" {
			return false
		}
	}
	return true
}
