package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mensager-go/internal/db"
	"mensager-go/internal/models"
	"mensager-go/internal/repository"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

// EvolutionSendService gerencia envio de mensagens via Evolution API
type EvolutionSendService struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// NewEvolutionSendService cria uma nova instância do serviço
func NewEvolutionSendService(baseURL, apiKey string) *EvolutionSendService {
	return &EvolutionSendService{
		baseURL:    baseURL,
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// SendTextMessageInput dados para envio de mensagem de texto
type SendTextMessageInput struct {
	InstanceName string `json:"instance_name"`
	Number       string `json:"number"`
	Text         string `json:"text"`
}

// SendMediaMessageInput dados para envio de mensagem com mídia
type SendMediaMessageInput struct {
	InstanceName string `json:"instance_name"`
	Number       string `json:"number"`
	MediaType    string `json:"media_type"` // image, video, audio, document
	MediaURL     string `json:"media_url"`
	Caption      string `json:"caption,omitempty"`
	FileName     string `json:"file_name,omitempty"`
}

// EvolutionTextPayload payload para API Evolution
type EvolutionTextPayload struct {
	Number  string          `json:"number"`
	Options EvolutionOption `json:"options"`
	Text    string          `json:"text"`
}

type EvolutionOption struct {
	Delay    int    `json:"delay"`
	Presence string `json:"presence"`
}

// EvolutionMediaPayload payload para mídia na API Evolution
type EvolutionMediaPayload struct {
	Number   string          `json:"number"`
	Options  EvolutionOption `json:"options"`
	Type     string          `json:"type"` // image, video, audio, document
	MediaURL string          `json:"url"`  // Evolution API espera "url" em minúsculo
	Caption  string          `json:"caption,omitempty"`
	FileName string          `json:"filename,omitempty"`
	MimeType string          `json:"mimetype,omitempty"`
}

// SendTextMessage envia uma mensagem de texto via Evolution API
func (s *EvolutionSendService) SendTextMessage(input SendTextMessageInput) (*models.Message, error) {
	// Evolution API v2 usa /send/text
	url := fmt.Sprintf("%s/send/text", s.baseURL)

	payload := EvolutionTextPayload{
		Number: input.Number,
		Options: EvolutionOption{
			Delay:    1200,
			Presence: "composing",
		},
		Text: input.Text,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("instanceid", input.InstanceName)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("evolution API error: %s - %s", resp.Status, string(respBody))
	}

	// Parse response para extrair message ID
	var evolutionResp map[string]interface{}
	if err := json.Unmarshal(respBody, &evolutionResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	var whatsappMessageID *string
	if key, ok := evolutionResp["key"].(map[string]interface{}); ok {
		if id, ok := key["id"].(string); ok && id != "" {
			whatsappMessageID = &id
		}
	}

	return &models.Message{
		Content:           input.Text,
		ContentType:       "text",
		MessageType:       models.MessageTypeOutgoing,
		Status:            models.MessageStatusSent,
		IsFromMe:          true,
		WhatsAppMessageID: whatsappMessageID,
	}, nil
}

// SendMediaMessage envia uma mensagem com mídia via Evolution API
func (s *EvolutionSendService) SendMediaMessage(input SendMediaMessageInput) (*models.Message, error) {
	// Evolution API v2 usa /send/media para todos os tipos de mídia
	url := fmt.Sprintf("%s/send/media", s.baseURL)

	payload := EvolutionMediaPayload{
		Number: input.Number,
		Options: EvolutionOption{
			Delay:    1200,
			Presence: "composing",
		},
		Type:     input.MediaType,
		MediaURL: input.MediaURL,
		Caption:  input.Caption,
		FileName: input.FileName,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("instanceid", input.InstanceName)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("evolution API error: %s - %s", resp.Status, string(respBody))
	}

	var evolutionResp map[string]interface{}
	if err := json.Unmarshal(respBody, &evolutionResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	var whatsappMessageID *string
	if key, ok := evolutionResp["key"].(map[string]interface{}); ok {
		if id, ok := key["id"].(string); ok && id != "" {
			whatsappMessageID = &id
		}
	}

	mediaURL := input.MediaURL
	return &models.Message{
		Content:           input.Caption,
		ContentType:       input.MediaType,
		MessageType:       models.MessageTypeOutgoing,
		Status:            models.MessageStatusSent,
		IsFromMe:          true,
		WhatsAppMessageID: whatsappMessageID,
		MediaURL:          &mediaURL,
		FileName:          &input.FileName,
	}, nil
}

// SendMessage é um wrapper conveniente que persiste a mensagem no banco
func SendMessage(conversationID uint, content string, contentType string, mediaURL string, userID uint) (*models.Message, error) {
	log.Printf("[SendMessage] CALLED: conversationID=%d, content=%s, contentType=%s", conversationID, content, contentType)

	// Buscar conversa
	var conversation models.Conversation
	if err := db.Instance.Preload("Inbox").Preload("Contact").First(&conversation, conversationID).Error; err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	// Buscar inbox para config
	inbox, err := repository.GetInboxByID(uint(conversation.InboxID))
	if err != nil {
		return nil, fmt.Errorf("inbox not found: %w", err)
	}

	// Buscar integration associada para obter config da Evolution
	// Primeiro tenta buscar por channel_id, depois por provider evolution e account_id
	var integration models.Integration
	err = db.Instance.Where("id = ?", inbox.ChannelID).First(&integration).Error
	if err != nil {
		// Se não encontrou por channel_id, buscar integration Evolution do account
		log.Printf("[SendMessage] Integration not found by channel_id=%d, searching by provider", inbox.ChannelID)
		err = db.Instance.Where("account_id = ? AND provider = ?", inbox.AccountID, "evolution").First(&integration).Error
		if err != nil {
			return nil, fmt.Errorf("integration not found for account: %w", err)
		}
	}

	// Buscar contato para o número
	var contact models.Contact
	if err := db.Instance.First(&contact, conversation.ContactID).Error; err != nil {
		return nil, fmt.Errorf("contact not found: %w", err)
	}

	// Determinar número do contato
	phoneNumber := contact.PhoneNumber
	if phoneNumber == "" && contact.Identifier != "" {
		phoneNumber = contact.Identifier
	}

	// Criar serviço de envio - extrair config do JSON
	var configMap map[string]interface{}
	if err := json.Unmarshal(integration.Config, &configMap); err != nil {
		return nil, fmt.Errorf("failed to parse integration config: %w", err)
	}

	baseURL := ""
	apiKey := ""
	instanceName := ""
	if url, ok := configMap["base_url"].(string); ok {
		baseURL = url
	}
	if key, ok := configMap["api_key"].(string); ok {
		apiKey = key
	}
	if instance, ok := configMap["instance_name"].(string); ok {
		instanceName = instance
	}

	evolutionService := NewEvolutionSendService(baseURL, apiKey)

	// Formatar número para WhatsApp
	whatsappNumber := formatWhatsAppNumber(phoneNumber)

	var sentMessage *models.Message
	var sendErr error

	if contentType == "text" || contentType == "" {
		sentMessage, sendErr = evolutionService.SendTextMessage(SendTextMessageInput{
			InstanceName: instanceName,
			Number:       whatsappNumber,
			Text:         content,
		})
	} else {
		// Converter URL de localhost para URL interna do Docker para Evolution API acessar
		internalMediaURL := mediaURL
		if strings.Contains(mediaURL, "localhost:8080") {
			internalMediaURL = strings.Replace(mediaURL, "localhost:8080", "mensager-go-api-1:8080", 1)
			log.Printf("[SendMessage] Converted media URL for Evolution: %s -> %s", mediaURL, internalMediaURL)
		}

		sentMessage, sendErr = evolutionService.SendMediaMessage(SendMediaMessageInput{
			InstanceName: instanceName,
			Number:       whatsappNumber,
			MediaType:    contentType,
			MediaURL:     internalMediaURL,
			Caption:      content,
		})
	}

	// Gerar source_id único para mensagens do frontend
	sourceID := fmt.Sprintf("frontend-%s", uuid.New().String())

	if sendErr != nil {
		// Log detalhado do erro
		log.Printf("[SendMessage] ERROR sending message to Evolution API: %v", sendErr)
		log.Printf("[SendMessage] Details - ConversationID: %d, Number: %s, ContentType: %s, Instance: %s",
			conversationID, whatsappNumber, contentType, instanceName)

		// Salvar mensagem como falha
		failedMsg := &models.Message{
			Content:        content,
			AccountID:      uint(inbox.AccountID),
			InboxID:        uint(inbox.ID),
			ConversationID: conversationID,
			MessageType:    models.MessageTypeOutgoing,
			ContentType:    contentType,
			SenderType:     "User",
			SenderID:       userID,
			Status:         models.MessageStatusFailed,
			SourceID:       sourceID,
			IsFromMe:       true,
		}
		repository.CreateMessage(failedMsg)
		return nil, fmt.Errorf("failed to send message via Evolution API: %w", sendErr)
	}

	// Salvar mensagem enviada com sucesso
	now := time.Now()

	// Usar mediaURL original (para frontend) em vez de sentMessage.MediaURL (URL interna)
	var savedMediaURL *string
	if mediaURL != "" {
		savedMediaURL = &mediaURL
	} else if sentMessage.MediaURL != nil {
		savedMediaURL = sentMessage.MediaURL
	}

	message := &models.Message{
		Content:           content,
		AccountID:         uint(inbox.AccountID),
		InboxID:           uint(inbox.ID),
		ConversationID:    conversationID,
		MessageType:       models.MessageTypeOutgoing,
		ContentType:       contentType,
		SenderType:        "User",
		SenderID:          userID,
		Status:            models.MessageStatusSent,
		SourceID:          sourceID,
		IsFromMe:          true,
		WhatsAppMessageID: sentMessage.WhatsAppMessageID,
		MediaURL:          savedMediaURL,
		FileName:          sentMessage.FileName,
		Timestamp:         &now,
	}

	if err := repository.CreateMessage(message); err != nil {
		return nil, fmt.Errorf("failed to save message: %w", err)
	}

	// Atualizar última atividade da conversa
	conversation.LastActivityAt = &now
	repository.UpdateConversation(&conversation)

	return message, nil
}

// formatWhatsAppNumber formata número para formato WhatsApp
func formatWhatsAppNumber(phone string) string {
	// Remove caracteres não numéricos
	var digits string
	for _, c := range phone {
		if c >= '0' && c <= '9' {
			digits += string(c)
		}
	}

	// Se não tem código do país, assume Brasil (+55)
	if len(digits) <= 11 {
		digits = "55" + digits
	}

	return digits
}
