package handler

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// ServeMedia serve arquivos de mídia com Content-Type correto
func ServeMedia(c *gin.Context) {
	// Obter o nome do arquivo da URL
	fileName := c.Param("filename")
	if fileName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "filename is required"})
		return
	}

	// Obter caminho base de mídia
	mediaPath := os.Getenv("MEDIA_STORAGE_PATH")
	if mediaPath == "" {
		mediaPath = "./media"
	}

	// Construir caminho completo do arquivo
	filePath := filepath.Join(mediaPath, fileName)

	// Verificar se arquivo existe
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		log.Printf("[ServeMedia] File not found: %s", filePath)
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	// Ler arquivo
	data, err := os.ReadFile(filePath)
	if err != nil {
		log.Printf("[ServeMedia] Error reading file %s: %v", filePath, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	// Detectar MIME type pela extensão
	mimeType := getMimeTypeFromExtension(filepath.Ext(fileName))

	// Se não conseguiu detectar pela extensão, usar detecção por conteúdo
	if mimeType == "" {
		mimeType = http.DetectContentType(data)
	}

	// Log para debug
	log.Printf("[ServeMedia] Serving file: %s, MIME: %s, Size: %d bytes", fileName, mimeType, len(data))

	// Definir headers de resposta
	c.Header("Content-Type", mimeType)
	c.Header("Content-Length", string(len(data)))
	c.Header("Cache-Control", "public, max-age=31536000") // Cache de 1 ano
	c.Header("Access-Control-Allow-Origin", "*")

	// Enviar arquivo
	c.Data(http.StatusOK, mimeType, data)
}

// getMimeTypeFromExtension retorna o MIME type baseado na extensão do arquivo
func getMimeTypeFromExtension(ext string) string {
	ext = strings.ToLower(ext)

	mimeTypes := map[string]string{
		// Imagens
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".webp": "image/webp",
		".bmp":  "image/bmp",
		".svg":  "image/svg+xml",
		".ico":  "image/x-icon",

		// Vídeos
		".mp4":  "video/mp4",
		".webm": "video/webm",
		".avi":  "video/x-msvideo",
		".mov":  "video/quicktime",
		".wmv":  "video/x-ms-wmv",
		".flv":  "video/x-flv",
		".mkv":  "video/x-matroska",

		// Áudios
		".mp3":  "audio/mpeg",
		".ogg":  "audio/ogg",
		".wav":  "audio/wav",
		".m4a":  "audio/mp4",
		".aac":  "audio/aac",
		".flac": "audio/flac",
		".wma":  "audio/x-ms-wma",
		".opus": "audio/opus",

		// Documentos
		".pdf":  "application/pdf",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls":  "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".ppt":  "application/vnd.ms-powerpoint",
		".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		".txt":  "text/plain",
		".csv":  "text/csv",

		// Arquivos compactados
		".zip":  "application/zip",
		".rar":  "application/x-rar-compressed",
		".7z":   "application/x-7z-compressed",
		".tar":  "application/x-tar",
		".gz":   "application/gzip",
	}

	if mime, ok := mimeTypes[ext]; ok {
		return mime
	}

	return "" // Retorna vazio para usar detecção automática
}
