package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"mensager-go/internal/db"
	"mensager-go/internal/models"
	"mensager-go/internal/repository"
	"os"
	"strings"
	"time"

	"gorm.io/datatypes"
)

var (
	// GlobalMediaStorage instância global de storage de mídia
	GlobalMediaStorage MediaStorage
)

// InitMediaStorage inicializa o storage de mídia
func InitMediaStorage() {
	// Verificar se deve usar MinIO (mesma configuração do Evolution-Go)
	useMinio := os.Getenv("USE_MINIO")
	minioEndpoint := os.Getenv("MINIO_ENDPOINT")
	minioAccessKey := os.Getenv("MINIO_ACCESS_KEY")
	minioSecretKey := os.Getenv("MINIO_SECRET_KEY")
	minioBucket := os.Getenv("MINIO_BUCKET")
	minioUseSSL := os.Getenv("MINIO_USE_SSL") == "true"

	if useMinio == "true" && minioEndpoint != "" && minioAccessKey != "" && minioSecretKey != "" {
		if minioBucket == "" {
			minioBucket = "mensager-media"
		}

		// Usar MEDIA_BASE_URL para URL pública de acesso
		publicURL := os.Getenv("MEDIA_BASE_URL")
		if publicURL == "" {
			publicURL = "http://localhost:4120/media"
		}

		storage, err := NewMinioMediaStorage(minioEndpoint, minioAccessKey, minioSecretKey, minioBucket, minioUseSSL, publicURL)
		if err != nil {
			log.Printf("[MediaStorage] ERROR initializing MinIO: %v - falling back to local storage", err)
		} else {
			GlobalMediaStorage = storage
			log.Printf("[MediaStorage] Initialized with MinIO (endpoint=%s, bucket=%s)", minioEndpoint, minioBucket)
			return
		}
	}

	// Verificar se deve usar Supabase Storage
	useSupabase := os.Getenv("USE_SUPABASE_STORAGE")
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	bucketName := os.Getenv("SUPABASE_STORAGE_BUCKET")

	if useSupabase == "true" && supabaseURL != "" && supabaseKey != "" {
		if bucketName == "" {
			bucketName = "mensager-media"
		}
		GlobalMediaStorage = NewSupabaseMediaStorage(supabaseURL, supabaseKey, bucketName)
		log.Printf("[MediaStorage] Initialized with Supabase Storage (bucket=%s)", bucketName)
	} else {
		// Fallback para storage local
		basePath := os.Getenv("MEDIA_STORAGE_PATH")
		if basePath == "" {
			basePath = "./media"
		}

		baseURL := os.Getenv("MEDIA_BASE_URL")
		if baseURL == "" {
			baseURL = "http://localhost:4120/media"
		}

		GlobalMediaStorage = NewLocalMediaStorage(basePath, baseURL)
		log.Printf("[MediaStorage] Initialized with Local Storage (path=%s, baseURL=%s)", basePath, baseURL)
	}
}

// EvolutionWebhookPayload estrutura do webhook da Evolution API
type EvolutionWebhookPayload struct {
	Event         string                 `json:"event"`
	InstanceToken string                 `json:"instanceToken"`
	InstanceID    string                 `json:"instanceId"`
	InstanceName  string                 `json:"instanceName"`
	Data          map[string]interface{} `json:"data"`
}

// Evolution Message Key estrutura
type EvolutionMessageKey struct {
	RemoteJid string `json:"remoteJid"`
	FromMe    bool   `json:"fromMe"`
	ID        string `json:"id"`
}

// ProcessEvolutionWebhook processa webhook da Evolution API
func ProcessEvolutionWebhook(inboxID uint, payload []byte) error {
	var webhookData EvolutionWebhookPayload
	if err := json.Unmarshal(payload, &webhookData); err != nil {
		return fmt.Errorf("failed to parse webhook payload: %w", err)
	}

	// Ignorar eventos SendMessage para evitar duplicação
	// (processamos apenas eventos "messages.upsert" que é o evento Message)
	if webhookData.Event == "SendMessage" {
		log.Printf("[ProcessEvolutionWebhook] Ignoring SendMessage event to avoid duplication")
		return nil
	}

	// Processa apenas eventos de mensagem
	if webhookData.Event != "Message" {
		// Ignorar outros eventos por enquanto
		return nil
	}

	return processMessage(inboxID, &webhookData)
}

func processMessage(inboxID uint, webhook *EvolutionWebhookPayload) error {
	data := webhook.Data

	// Extrair chave da mensagem
	keyData, ok := data["key"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid message key structure")
	}

	remoteJid := getString(keyData, "remoteJid")
	fromMe := getBool(keyData, "fromMe")
	messageID := getString(keyData, "id")

	if messageID == "" {
		return fmt.Errorf("message ID is required")
	}

	// Verificar se a mensagem já foi processada (evitar duplicação)
	existingMsg, err := repository.GetMessageByWhatsAppID(messageID)
	if err == nil && existingMsg != nil {
		log.Printf("[processMessage] Message already exists with WhatsApp ID %s, skipping", messageID)
		return nil // Mensagem já processada, ignorar
	}

	// Buscar ou criar inbox
	inbox, err := repository.GetInboxByID(inboxID)
	if err != nil {
		return fmt.Errorf("inbox not found: %w", err)
	}

	// Extrair número do telefone do RemoteJid
	phoneNumber := extractPhoneNumber(remoteJid)

	// Buscar ou criar contato
	contact, err := repository.FindOrCreateContactByPhone(uint(inbox.AccountID), phoneNumber, remoteJid)
	if err != nil {
		return fmt.Errorf("failed to find/create contact: %w", err)
	}

	// Atualizar nome e avatar do contato se disponível
	pushName := getString(data, "pushName")
	profilePicUrl := getString(data, "profilePicUrl")

	updated := false
	if pushName != "" && contact.Name != pushName {
		contact.Name = pushName
		updated = true
	}
	if profilePicUrl != "" && contact.AvatarURL != profilePicUrl {
		contact.AvatarURL = profilePicUrl
		updated = true
	}

	if updated {
		repository.UpdateContact(contact)
	}

	// Buscar ou criar conversa
	conversation, err := repository.FindOrCreateConversation(uint(inbox.AccountID), inboxID, uint(contact.ID))
	if err != nil {
		return fmt.Errorf("failed to find/create conversation: %w", err)
	}

	// Extrair conteúdo da mensagem
	messageContent := ""
	contentType := "text"
	var mediaURL *string
	var mimeType *string
	var fileName *string
	var fileSize *int64
	var caption *string

	messageData, _ := data["message"].(map[string]interface{})
	if messageData != nil {
		// Texto simples
		if conv, ok := messageData["conversation"].(string); ok {
			messageContent = conv
		}

		// Mensagem de imagem
		if imgMsg, ok := messageData["imageMessage"].(map[string]interface{}); ok {
			contentType = "image"

			// Debug: log media URL field
			rawMediaUrl := data["mediaUrl"]
			log.Printf("[ProcessMessage] Image message detected. mediaUrl field: %v (type: %T)", rawMediaUrl, rawMediaUrl)

			if url, ok := data["mediaUrl"].(string); ok && url != "" {
				log.Printf("[ProcessMessage] Downloading media from: %s", url)
				// Fazer download e armazenar localmente
				localURL, err := downloadAndStoreMedia(url, messageID, contentType)
				if err != nil {
					log.Printf("[ProcessMessage] Error downloading image: %v", err)
					mediaURL = &url // Usar URL original como fallback
				} else {
					log.Printf("[ProcessMessage] Media downloaded and stored: %s", localURL)
					mediaURL = &localURL
				}
			} else {
				log.Printf("[ProcessMessage] WARNING: No mediaUrl found for image message")
			}
			if cap, ok := imgMsg["caption"].(string); ok {
				caption = &cap
				messageContent = cap
			}
			if mime, ok := imgMsg["mimetype"].(string); ok {
				mimeType = &mime
			}
		}

		// Mensagem de vídeo
		if vidMsg, ok := messageData["videoMessage"].(map[string]interface{}); ok {
			contentType = "video"
			if url, ok := data["mediaUrl"].(string); ok {
				// Fazer download e armazenar localmente
				localURL, err := downloadAndStoreMedia(url, messageID, contentType)
				if err != nil {
					log.Printf("[ProcessMessage] Error downloading video: %v", err)
					mediaURL = &url // Usar URL original como fallback
				} else {
					mediaURL = &localURL
				}
			}
			if cap, ok := vidMsg["caption"].(string); ok {
				caption = &cap
				messageContent = cap
			}
			if mime, ok := vidMsg["mimetype"].(string); ok {
				mimeType = &mime
			}
		}

		// Mensagem de áudio
		if audMsg, ok := messageData["audioMessage"].(map[string]interface{}); ok {
			contentType = "audio"
			if url, ok := data["mediaUrl"].(string); ok {
				// Fazer download e armazenar localmente
				localURL, err := downloadAndStoreMedia(url, messageID, contentType)
				if err != nil {
					log.Printf("[ProcessMessage] Error downloading audio: %v", err)
					mediaURL = &url // Usar URL original como fallback
				} else {
					mediaURL = &localURL
				}
			}
			if mime, ok := audMsg["mimetype"].(string); ok {
				mimeType = &mime
			}
			messageContent = "[Áudio]"
		}

		// Mensagem de documento
		if docMsg, ok := messageData["documentMessage"].(map[string]interface{}); ok {
			contentType = "document"
			if url, ok := data["mediaUrl"].(string); ok {
				// Fazer download e armazenar localmente
				localURL, err := downloadAndStoreMedia(url, messageID, contentType)
				if err != nil {
					log.Printf("[ProcessMessage] Error downloading document: %v", err)
					mediaURL = &url // Usar URL original como fallback
				} else {
					mediaURL = &localURL
				}
			}
			if name, ok := docMsg["fileName"].(string); ok {
				fileName = &name
				messageContent = name
			}
			if mime, ok := docMsg["mimetype"].(string); ok {
				mimeType = &mime
			}
			if size, ok := docMsg["fileLength"].(float64); ok {
				fs := int64(size)
				fileSize = &fs
			}
		}
	}

	// Determinar tipo de mensagem
	messageType := models.MessageTypeIncoming
	if fromMe {
		messageType = models.MessageTypeOutgoing
	}

	// Timestamp
	timestamp := time.Now()
	if ts, ok := data["timestamp"].(float64); ok {
		timestamp = time.Unix(int64(ts), 0)
	}

	// Status da mensagem
	status := models.MessageStatusSent
	statusStr := getString(data, "status")
	switch strings.ToLower(statusStr) {
	case "delivered":
		status = models.MessageStatusDelivered
	case "read":
		status = models.MessageStatusRead
	case "failed":
		status = models.MessageStatusFailed
	}

	// Mensagem citada
	var quotedMessageID *string
	if quoted, ok := data["quoted"].(map[string]interface{}); ok {
		if stanzaID, ok := quoted["stanzaID"].(string); ok {
			quotedMessageID = &stanzaID
		}
	}

	// Dados do grupo
	var groupData datatypes.JSON
	if grpData, ok := data["groupData"].(map[string]interface{}); ok {
		if jsonData, err := json.Marshal(grpData); err == nil {
			groupData = jsonData
		}
	}

	// Metadata
	metadataMap := map[string]interface{}{
		"instance_id":   webhook.InstanceID,
		"instance_name": webhook.InstanceName,
		"event":         webhook.Event,
	}
	metadataJSON, _ := json.Marshal(metadataMap)

	// Determinar sender_type e sender_id
	senderType := "Contact"
	senderID := contact.ID
	if fromMe {
		senderType = "User"
		// TODO: Buscar user_id baseado no inbox ou account
		senderID = 0 // Placeholder
	}

	isGroup := strings.HasSuffix(remoteJid, "@g.us")

	// Criar mensagem
	message := &models.Message{
		Content:           messageContent,
		AccountID:         uint(inbox.AccountID),
		InboxID:           inboxID,
		ConversationID:    uint(conversation.ID),
		MessageType:       messageType,
		ContentType:       contentType,
		Private:           false,
		SenderType:        senderType,
		SenderID:          senderID,
		Status:            status,
		SourceID:          messageID,
		WhatsAppMessageID: &messageID,
		RemoteJid:         &remoteJid,
		PushName:          &pushName,
		IsFromMe:          fromMe,
		IsGroup:           isGroup,
		Timestamp:         &timestamp,
		QuotedMessageID:   quotedMessageID,
		MediaURL:          mediaURL,
		MimeType:          mimeType,
		FileName:          fileName,
		FileSize:          fileSize,
		Caption:           caption,
		GroupData:         groupData,
		Metadata:          metadataJSON,
		Revoked:           getBool(data, "revoked"),
		Edited:            getBool(data, "edited"),
	}

	// Upsert mensagem (criar ou atualizar se já existe)
	if err := repository.UpsertMessage(message); err != nil {
		return fmt.Errorf("failed to save message: %w", err)
	}

	// Broadcast em tempo real
	NotifyNewMessage(message)

	// Atualizar última atividade da conversa
	now := time.Now()
	conversation.LastActivityAt = &now

	// Preparar campos a atualizar
	updates := map[string]interface{}{
		"last_activity_at": conversation.LastActivityAt,
		"updated_at":       now,
	}

	// Se for mensagem incoming, incrementar unread_count
	if messageType == models.MessageTypeIncoming {
		conversation.UnreadCount++
		updates["unread_count"] = conversation.UnreadCount
	}

	// Atualizar explicitamente no banco usando Updates para garantir persistência
	if err := db.Instance.Model(&conversation).Updates(updates).Error; err != nil {
		log.Printf("[ProcessMessage] Error updating conversation: %v", err)
	}

	// Notificar atualização da conversa para atualizar lista em tempo real
	NotifyConversationUpdated(conversation)

	return nil
}

// Helper functions
func getString(data map[string]interface{}, key string) string {
	if val, ok := data[key].(string); ok {
		return val
	}
	return ""
}

func getBool(data map[string]interface{}, key string) bool {
	if val, ok := data[key].(bool); ok {
		return val
	}
	return false
}

func extractPhoneNumber(jid string) string {
	// Remove sufixos como @s.whatsapp.net ou @g.us
	parts := strings.Split(jid, "@")
	if len(parts) > 0 {
		return parts[0]
	}
	return jid
}

// downloadAndStoreMedia faz download da mídia e armazena localmente
func downloadAndStoreMedia(mediaURL, messageID, contentType string) (string, error) {
	if GlobalMediaStorage == nil {
		return "", fmt.Errorf("media storage not initialized")
	}

	// Fazer download da mídia
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	data, mimeType, err := GlobalMediaStorage.Download(ctx, mediaURL)
	if err != nil {
		return "", fmt.Errorf("failed to download media: %w", err)
	}

	// Gerar nome do arquivo
	extension := GetExtensionFromMimeType(mimeType)
	fileName := fmt.Sprintf("%s%s", messageID, extension)

	// Armazenar arquivo localmente
	localURL, err := GlobalMediaStorage.Store(ctx, data, fileName, mimeType)
	if err != nil {
		return "", fmt.Errorf("failed to store media: %w", err)
	}

	log.Printf("[DownloadMedia] Successfully downloaded and stored: %s -> %s", mediaURL, localURL)
	return localURL, nil
}
