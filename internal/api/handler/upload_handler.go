package handler

import (
	"fmt"
	"io"
	"log"
	"mensager-go/internal/service"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UploadResponse resposta do upload
type UploadResponse struct {
	URL      string `json:"url"`
	FileName string `json:"file_name"`
	FileSize int64  `json:"file_size"`
	MimeType string `json:"mime_type"`
}

// UploadFile faz upload de arquivo e retorna URL
func UploadFile(c *gin.Context) {
	// Pega o arquivo do formulário
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Validar tamanho (max 50MB)
	if header.Size > 50*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large (max 50MB)"})
		return
	}

	// Ler dados do arquivo
	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// Detectar MIME type
	mimeType := service.DetectMimeType(data)
	if mimeType == "" {
		ext := filepath.Ext(header.Filename)
		mimeType = detectMimeType(ext)
	}

	// Gerar nome único
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = service.GetExtensionFromMimeType(mimeType)
	}
	uniqueName := fmt.Sprintf("%s_%s%s", time.Now().Format("20060102150405"), uuid.New().String()[:8], ext)

	// Usar MediaStorage se disponível
	if service.GlobalMediaStorage != nil {
		fileURL, err := service.GlobalMediaStorage.Store(c.Request.Context(), data, uniqueName, mimeType)
		if err != nil {
			log.Printf("[UploadFile] Error storing file: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store file"})
			return
		}

		log.Printf("[UploadFile] Successfully uploaded file: %s -> %s", header.Filename, fileURL)

		c.JSON(http.StatusOK, UploadResponse{
			URL:      fileURL,
			FileName: header.Filename,
			FileSize: int64(len(data)),
			MimeType: mimeType,
		})
		return
	}

	// Fallback para storage local antigo
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	filePath := filepath.Join(uploadDir, uniqueName)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = fmt.Sprintf("http://%s", c.Request.Host)
	}
	fileURL := fmt.Sprintf("%s/uploads/%s", baseURL, uniqueName)

	c.JSON(http.StatusOK, UploadResponse{
		URL:      fileURL,
		FileName: header.Filename,
		FileSize: int64(len(data)),
		MimeType: mimeType,
	})
}

// detectMimeType detecta MIME type pela extensão
func detectMimeType(ext string) string {
	ext = strings.ToLower(ext)
	mimeTypes := map[string]string{
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".webp": "image/webp",
		".mp4":  "video/mp4",
		".webm": "video/webm",
		".mp3":  "audio/mpeg",
		".ogg":  "audio/ogg",
		".wav":  "audio/wav",
		".pdf":  "application/pdf",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls":  "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".zip":  "application/zip",
		".rar":  "application/x-rar-compressed",
	}

	if mime, ok := mimeTypes[ext]; ok {
		return mime
	}
	return "application/octet-stream"
}
