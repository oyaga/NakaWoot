package handler

import (
	"log"
	"mensager-go/internal/service"
	"net/http"
	"os"
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

	// Se estiver usando MinIO, buscar arquivo de lá
	if service.GlobalMediaStorage != nil {
		// Tentar usar o método GetFromMinio se disponível (MinioMediaStorage)
		if minioStorage, ok := service.GlobalMediaStorage.(*service.MinioMediaStorage); ok {
			data, contentType, err := minioStorage.GetFromMinio(c.Request.Context(), fileName)
			if err != nil {
				log.Printf("[ServeMedia] Error getting file from MinIO: %v", err)
				c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
				return
			}

			// Definir headers apropriados
			c.Header("Content-Type", contentType)
			c.Header("Cache-Control", "public, max-age=31536000") // Cache por 1 ano
			c.Data(http.StatusOK, contentType, data)
			return
		}
	}

	// Fallback para storage local
	basePath := os.Getenv("MEDIA_STORAGE_PATH")
	if basePath == "" {
		basePath = "./media"
	}

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
