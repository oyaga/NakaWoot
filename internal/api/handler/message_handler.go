package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mensager-go/internal/db"
	"mensager-go/internal/models"
	"mensager-go/internal/repository"
	"mensager-go/internal/service"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ListMessages lista mensagens de uma conversa
func ListMessages(c *gin.Context) {
	conversationIDStr := c.Param("id")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation_id"})
		return
	}

	// Limite e offset para paginação
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	messages, err := repository.ListMessagesByConversation(uint(conversationID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch messages"})
		return
	}

	// Contar total para paginação
	total, _ := repository.CountMessagesByConversation(uint(conversationID))

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"pagination": gin.H{
			"total":  total,
			"limit":  limit,
			"offset": offset,
		},
	})
}

// SendMessageInput input para enviar mensagem
type SendMessageInput struct {
	ConversationID uint   `json:"conversation_id" binding:"required"`
	Content        string `json:"content" binding:"required"`
	ContentType    string `json:"content_type"` // text, image, video, audio, document
	MediaURL       string `json:"media_url"`
	Private        bool   `json:"private"`
}

// SendMessage envia uma nova mensagem
func SendMessage(c *gin.Context) {
	var input SendMessageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Obter user_id do contexto
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found in context"})
		return
	}
	userID := userIDVal.(uint)

	// Definir content_type padrão
	if input.ContentType == "" {
		input.ContentType = "text"
	}

	// Usar o serviço para enviar
	message, err := service.SendMessage(input.ConversationID, input.Content, input.ContentType, input.MediaURL, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, message)
}

// SendMessageToConversation envia mensagem para uma conversa (usando path param)
func SendMessageToConversation(c *gin.Context) {
	conversationIDStr := c.Param("id")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		log.Printf("[SendMessageToConversation] Invalid conversation_id: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation_id"})
		return
	}

	var input struct {
		Content     string `json:"content" binding:"required"`
		ContentType string `json:"content_type"`
		MediaURL    string `json:"media_url"`
		Private     bool   `json:"private"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("[SendMessageToConversation] Invalid input: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[SendMessageToConversation] Processing message for conversation %d: content=%s, contentType=%s",
		conversationID, input.Content, input.ContentType)

	userIDVal, exists := c.Get("user_id")
	if !exists {
		log.Printf("[SendMessageToConversation] user_id not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	userID := userIDVal.(uint)
	log.Printf("[SendMessageToConversation] Found user_id in context: %d", userID)

	if input.ContentType == "" {
		input.ContentType = "text"
	}

	message, err := service.SendMessage(uint(conversationID), input.Content, input.ContentType, input.MediaURL, userID)
	if err != nil {
		log.Printf("[SendMessageToConversation] Error sending message: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[SendMessageToConversation] Message sent successfully: ID=%d", message.ID)

	// Broadcast em tempo real para a conversa E para a conta
	BroadcastToConversation(uint(conversationID), RealtimeEvent{
		Type:    "message.new",
		Payload: message,
	})

	// Também broadcast para a conta (RealtimeProvider conecta por conta, não por conversa)
	accountIDVal, _ := c.Get("account_id")
	if accountID, ok := accountIDVal.(uint); ok {
		BroadcastToAccount(accountID, RealtimeEvent{
			Type:    "message.new",
			Payload: message,
		})
	}

	c.JSON(http.StatusCreated, message)
}

// GetMessage busca uma mensagem específica
func GetMessage(c *gin.Context) {
	messageIDStr := c.Param("id")
	messageID, err := strconv.ParseUint(messageIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message id"})
		return
	}

	message, err := repository.GetMessageByID(uint(messageID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
		return
	}

	c.JSON(http.StatusOK, message)
}

// MarkConversationAsRead marca todas as mensagens de uma conversa como lidas
func MarkConversationAsRead(c *gin.Context) {
	conversationIDStr := c.Param("id")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation_id"})
		return
	}

	if err := repository.MarkMessagesAsRead(uint(conversationID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark messages as read"})
		return
	}

	// O trigger update_conversation_unread_count vai atualizar automaticamente o unread_count
	// Mas vamos forçar uma atualização também para garantir
	conversation, err := repository.GetConversationByID(uint(conversationID))
	if err == nil {
		// Broadcast atualização da conversa
		accountIDVal, _ := c.Get("account_id")
		if accountID, ok := accountIDVal.(uint); ok {
			BroadcastToAccount(accountID, RealtimeEvent{
				Type:    "conversation.updated",
				Payload: conversation,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "messages marked as read"})
}

// MarkMessagesAsReadInput input para marcar mensagens específicas como lidas
type MarkMessagesAsReadInput struct {
	MessageIDs []uint `json:"message_ids" binding:"required"`
}

// MarkMessagesAsReadBatch marca mensagens específicas como lidas
func MarkMessagesAsReadBatch(c *gin.Context) {
	var input MarkMessagesAsReadInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(input.MessageIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message_ids cannot be empty"})
		return
	}

	if err := repository.MarkSpecificMessagesAsRead(input.MessageIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark messages as read"})
		return
	}

	// O trigger vai atualizar o unread_count automaticamente
	// Broadcast para notificar clientes
	accountIDVal, _ := c.Get("account_id")
	if accountID, ok := accountIDVal.(uint); ok {
		// Buscar as conversas afetadas para broadcast
		var messages []models.Message
		db.Instance.Where("id IN ?", input.MessageIDs).Find(&messages)

		// Agrupar por conversation_id
		conversationIDs := make(map[uint]bool)
		for _, msg := range messages {
			conversationIDs[msg.ConversationID] = true
		}

		// Broadcast para cada conversa afetada
		for convID := range conversationIDs {
			conversation, err := repository.GetConversationByID(convID)
			if err == nil {
				BroadcastToAccount(accountID, RealtimeEvent{
					Type:    "conversation.updated",
					Payload: conversation,
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "messages marked as read",
		"count":        len(input.MessageIDs),
	})
}

// DeleteMessage deleta uma mensagem (soft delete ou hard delete)
func DeleteMessage(c *gin.Context) {
	messageIDStr := c.Param("id")
	messageID, err := strconv.ParseUint(messageIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message id"})
		return
	}

	if err := repository.DeleteMessage(uint(messageID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete message"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "message deleted"})
}

// GetConversationStats retorna estatísticas de uma conversa
func GetConversationStats(c *gin.Context) {
	conversationIDStr := c.Param("id")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation_id"})
		return
	}

	total, _ := repository.CountMessagesByConversation(uint(conversationID))
	unread, _ := repository.GetUnreadMessagesCount(uint(conversationID))

	c.JSON(http.StatusOK, gin.H{
		"conversation_id": conversationID,
		"total_messages":  total,
		"unread_messages": unread,
	})
}

// ListConversationMessages lista mensagens (Chatwoot-compatible)
func ListConversationMessages(c *gin.Context) {
	conversationIDStr := c.Param("conversation_id")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation_id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	messages, err := repository.ListMessagesByConversation(uint(conversationID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, messages)
}

// CreateChatwootMessage cria mensagem (Chatwoot-compatible)
func CreateChatwootMessage(c *gin.Context) {
	conversationIDStr := c.Param("conversation_id")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation_id"})
		return
	}

	var content string
	var messageType int
	var private bool
	var sourceID string
	var mediaURL string
	var contentType string
	var fileName string
	var fileSize int64

	// Detectar Content-Type para escolher parser correto
	contentTypeHeader := c.GetHeader("Content-Type")
	isMultipart := len(contentTypeHeader) >= 19 && (contentTypeHeader[:19] == "multipart/form-data") ||
		len(contentTypeHeader) >= 33 && (contentTypeHeader[:33] == "application/x-www-form-urlencoded")

	if isMultipart {
		// Parse multipart/form-data (Evolution API com mídia)
		log.Printf("[CreateChatwootMessage] Parsing multipart form data for conversation %d", conversationID)

		// Parse o form
		if err := c.Request.ParseMultipartForm(50 << 20); err != nil { // 50MB max
			log.Printf("[CreateChatwootMessage] Error parsing multipart form: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse multipart form"})
			return
		}

		// Extrair campos do form
		content = c.PostForm("content")
		sourceID = c.PostForm("source_id")
		contentType = c.PostForm("content_type")

		// Converter message_type
		messageTypeStr := c.PostForm("message_type")
		if messageTypeStr == "outgoing" {
			messageType = 1
		} else if messageTypeStr == "incoming" {
			messageType = 0
		}

		privateStr := c.PostForm("private")
		private = privateStr == "true"

		// Processar arquivo se existir
		file, header, err := c.Request.FormFile("attachments[]")
		if err == nil && file != nil {
			defer file.Close()

			// Ler arquivo
			fileData, err := io.ReadAll(file)
			if err != nil {
				log.Printf("[CreateChatwootMessage] Error reading file: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
				return
			}

			// Salvar arquivo usando MediaStorage
			if service.GlobalMediaStorage != nil {
				// Gerar nome único
				ext := filepath.Ext(header.Filename)
				uniqueName := fmt.Sprintf("%s_%s%s", time.Now().Format("20060102150405"), uuid.New().String()[:8], ext)

				// Detectar MIME type
				mimeType := http.DetectContentType(fileData)

				fileURL, err := service.GlobalMediaStorage.Store(c.Request.Context(), fileData, uniqueName, mimeType)
				if err != nil {
					log.Printf("[CreateChatwootMessage] Error storing file: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store file"})
					return
				}

				mediaURL = fileURL
				fileName = header.Filename
				fileSize = int64(len(fileData))

				// Detectar content_type baseado no MIME type e nome do arquivo
				// Verificar primeiro se é áudio pelo nome do arquivo (para WebM de áudio)
				isAudioFile := strings.HasPrefix(strings.ToLower(header.Filename), "audio_") ||
					strings.Contains(strings.ToLower(header.Filename), "_audio") ||
					strings.HasSuffix(strings.ToLower(header.Filename), ".ogg") ||
					strings.HasSuffix(strings.ToLower(header.Filename), ".opus") ||
					strings.HasSuffix(strings.ToLower(header.Filename), ".mp3") ||
					strings.HasSuffix(strings.ToLower(header.Filename), ".m4a")

				if isAudioFile || strings.HasPrefix(mimeType, "audio/") || mimeType == "application/ogg" {
					// application/ogg pode ser áudio (OGG Vorbis/Opus usado pelo WhatsApp)
					// WebM com nome "audio_*" é gravação de áudio do navegador
					contentType = "audio"
				} else if strings.HasPrefix(mimeType, "image/") {
					contentType = "image"
				} else if strings.HasPrefix(mimeType, "video/") {
					contentType = "video"
				} else {
					contentType = "document"
				}

				// Se content estiver vazio, usar o nome do arquivo
				if content == "" {
					content = fileName
				}

				log.Printf("[CreateChatwootMessage] File uploaded: %s -> %s (type: %s, mime: %s)", fileName, mediaURL, contentType, mimeType)
			}
		}

	} else {
		// Parse JSON (API normal)
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			log.Printf("[CreateChatwootMessage] Error reading body: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read request body"})
			return
		}

		// Debug: log raw body for troubleshooting
		log.Printf("[CreateChatwootMessage] Raw JSON body: %s", string(bodyBytes))

		// Parse manual para aceitar message_type como string ou int
		var rawInput map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &rawInput); err != nil {
			log.Printf("[CreateChatwootMessage] Error parsing JSON: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Debug: log parsed fields
		log.Printf("[CreateChatwootMessage] Parsed fields - content_type: %v, media_url: %v", rawInput["content_type"], rawInput["media_url"])

		// Extrair content (obrigatório)
		var ok bool
		content, ok = rawInput["content"].(string)
		if !ok || content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
			return
		}

		// Converter message_type (string ou int)
		messageType = 0 // default: incoming
		if mt, exists := rawInput["message_type"]; exists {
			switch v := mt.(type) {
			case string:
				if v == "outgoing" {
					messageType = 1
				} else if v == "incoming" {
					messageType = 0
				}
			case float64:
				messageType = int(v)
			case int:
				messageType = v
			}
		}

		// Extrair campos opcionais
		private = false
		if p, ok := rawInput["private"].(bool); ok {
			private = p
		}

		sourceID = ""
		if sid, ok := rawInput["source_id"].(string); ok {
			sourceID = sid
		}

		// Campos de mídia do JSON
		if ct, ok := rawInput["content_type"].(string); ok {
			contentType = ct
		}
		if mu, ok := rawInput["media_url"].(string); ok {
			mediaURL = mu
		}
	}

	// Validar content
	if content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	accountVal, _ := c.Get("account_id")
	accountID := accountVal.(uint)

	// Buscar a conversa para pegar o inbox_id
	conversation, err := repository.GetConversationByID(uint(conversationID))
	if err != nil {
		log.Printf("[CreateChatwootMessage] Error fetching conversation: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "conversation not found"})
		return
	}

	// Definir content_type padrão se não especificado
	if contentType == "" {
		contentType = "text"
	}

	// Criar mensagem no banco
	message := &models.Message{
		ConversationID: uint(conversationID),
		AccountID:      accountID,
		InboxID:        uint(conversation.InboxID),
		Content:        content,
		MessageType:    messageType,
		Private:        private,
		SourceID:       sourceID,
		SenderType:     "User",
		ContentType:    contentType,
		Status:         "sent",
		MediaURL:       &mediaURL,
		FileName:       &fileName,
		FileSize:       &fileSize,
	}

	// Limpar campos vazios de mídia
	if mediaURL == "" {
		message.MediaURL = nil
	}
	if fileName == "" {
		message.FileName = nil
	}
	if fileSize == 0 {
		message.FileSize = nil
	}

	if err := repository.CreateMessage(message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[CreateChatwootMessage] Message created: ID=%d, Type=%s, HasMedia=%v", message.ID, contentType, mediaURL != "")

	// Se for mensagem outgoing, enviar para WhatsApp via Evolution API
	// MAS NÃO enviar se a mensagem veio do WhatsApp (source_id começa com "WAID:")
	if messageType == 1 { // outgoing
		// Verificar se a mensagem originou do WhatsApp (fromMe)
		if strings.HasPrefix(sourceID, "WAID:") {
			log.Printf("[CreateChatwootMessage] Skipping WhatsApp send - message originated from WhatsApp (fromMe): source_id=%s", sourceID)
		} else {
			// Mensagem criada pelo agente ou sistema - enviar para WhatsApp
			go func() {
				// Enviar via Evolution API (async)
				_, err := service.SendMessage(uint(conversationID), content, contentType, mediaURL, 0)
				if err != nil {
					log.Printf("[CreateChatwootMessage] ERROR sending to WhatsApp: %v", err)
					// Atualizar status da mensagem para failed
					message.Status = "failed"
					db.Instance.Save(message)
				} else {
					log.Printf("[CreateChatwootMessage] Successfully sent to WhatsApp: ID=%d", message.ID)
				}
			}()
		}
	}

	// Broadcast em tempo real para clientes conectados
	log.Printf("[CreateChatwootMessage] Broadcasting message.new to conversation %d", conversationID)
	BroadcastToConversation(uint(conversationID), RealtimeEvent{
		Type:    "message.new",
		Payload: message,
	})

	// Também broadcast message.new para a conta (RealtimeProvider conecta por conta)
	BroadcastToAccount(accountID, RealtimeEvent{
		Type:    "message.new",
		Payload: message,
	})

	// Broadcast também para a conta (para atualizar lista de conversas)
	log.Printf("[CreateChatwootMessage] Broadcasting conversation.updated to account %d", accountID)
	BroadcastToAccount(accountID, RealtimeEvent{
		Type:    "conversation.updated",
		Payload: conversation,
	})

	c.JSON(http.StatusOK, message)
}
