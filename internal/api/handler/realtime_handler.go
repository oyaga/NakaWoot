package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RealtimeEvent representa um evento em tempo real
type RealtimeEvent struct {
	Type    string      `json:"type"`    // message.new, message.updated, conversation.updated
	Payload interface{} `json:"payload"` // dados do evento
}

// Client representa uma conexão SSE
type Client struct {
	ID             string
	AccountID      uint
	ConversationID *uint
	Channel        chan RealtimeEvent
}

// Hub gerencia todas as conexões SSE
type Hub struct {
	clients    map[string]*Client
	broadcast  chan RealtimeEvent
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

var hub *Hub

func init() {
	hub = &Hub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan RealtimeEvent, 100),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	go hub.run()
}

// run processa eventos do hub
func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.ID] = client
			h.mu.Unlock()
			log.Printf("Client %s connected (total: %d)", client.ID, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.ID]; ok {
				close(client.Channel)
				delete(h.clients, client.ID)
			}
			h.mu.Unlock()
			log.Printf("Client %s disconnected (total: %d)", client.ID, len(h.clients))

		case event := <-h.broadcast:
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.Channel <- event:
				default:
					// Channel cheio, pular
					log.Printf("Client %s channel full, skipping event", client.ID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastEvent envia evento para todos os clientes
func BroadcastEvent(event RealtimeEvent) {
	hub.broadcast <- event
}

// BroadcastToAccount envia evento apenas para clientes de uma conta
func BroadcastToAccount(accountID uint, event RealtimeEvent) {
	hub.mu.RLock()
	defer hub.mu.RUnlock()

	for _, client := range hub.clients {
		if client.AccountID == accountID {
			select {
			case client.Channel <- event:
			default:
				log.Printf("Client %s channel full, skipping event", client.ID)
			}
		}
	}
}

// BroadcastToConversation envia evento apenas para clientes de uma conversa
func BroadcastToConversation(conversationID uint, event RealtimeEvent) {
	hub.mu.RLock()
	defer hub.mu.RUnlock()

	sentCount := 0
	for _, client := range hub.clients {
		if client.ConversationID != nil && *client.ConversationID == conversationID {
			select {
			case client.Channel <- event:
				sentCount++
			default:
				log.Printf("Client %s channel full, skipping event", client.ID)
			}
		}
	}
	log.Printf("[BroadcastToConversation] Sent event %s to %d clients for conversation %d", event.Type, sentCount, conversationID)
}

// RealtimeHandler gerencia conexões SSE (Server-Sent Events)
func RealtimeHandler(c *gin.Context) {
	// Verificar autenticação
	accountIDVal, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	accountID := accountIDVal.(uint)

	// Pegar conversation_id opcional
	var conversationID *uint
	if convIDStr := c.Query("conversation_id"); convIDStr != "" {
		var convID uint
		fmt.Sscanf(convIDStr, "%d", &convID)
		conversationID = &convID
	}

	// Configurar headers SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	// Criar cliente
	client := &Client{
		ID:             fmt.Sprintf("%d-%d", accountID, time.Now().UnixNano()),
		AccountID:      accountID,
		ConversationID: conversationID,
		Channel:        make(chan RealtimeEvent, 10),
	}

	// Registrar cliente
	hub.register <- client

	// Cleanup ao desconectar
	defer func() {
		hub.unregister <- client
	}()

	// Flusher para SSE
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
		return
	}

	// Enviar mensagem inicial
	initialEvent := RealtimeEvent{
		Type: "connection.established",
		Payload: map[string]interface{}{
			"client_id": client.ID,
			"timestamp": time.Now(),
		},
	}
	sendSSE(c.Writer, flusher, initialEvent)

	// Heartbeat ticker (a cada 30s)
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Loop principal
	for {
		select {
		case <-c.Request.Context().Done():
			// Cliente desconectou
			return

		case event := <-client.Channel:
			// Enviar evento
			if err := sendSSE(c.Writer, flusher, event); err != nil {
				log.Printf("Error sending SSE: %v", err)
				return
			}

		case <-ticker.C:
			// Heartbeat
			heartbeat := RealtimeEvent{
				Type: "heartbeat",
				Payload: map[string]interface{}{
					"timestamp": time.Now(),
				},
			}
			if err := sendSSE(c.Writer, flusher, heartbeat); err != nil {
				log.Printf("Error sending heartbeat: %v", err)
				return
			}
		}
	}
}

// sendSSE envia um evento SSE
func sendSSE(w http.ResponseWriter, flusher http.Flusher, event RealtimeEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	fmt.Fprintf(w, "data: %s\n\n", data)
	flusher.Flush()
	return nil
}
