package handler

import (
	"log"
	"mensager-go/internal/repository"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ListConversations ... (Listagem geral)
func ListConversations(c *gin.Context) {
	val, _ := c.Get("account_id")
	accountID := val.(uint)

	// Suporte a query params: ?filter=mine, ?type=group, ?type=private, ?inbox_id=X
	filter := c.Query("filter")
	conversationType := c.Query("type") // "group" ou "private"
	inboxIDStr := c.Query("inbox_id")

	// Parse inbox_id se fornecido
	var inboxID *uint
	if inboxIDStr != "" {
		if id, err := strconv.ParseUint(inboxIDStr, 10, 32); err == nil {
			inboxIDUint := uint(id)
			inboxID = &inboxIDUint
		}
	}

	if filter == "mine" {
		userVal, _ := c.Get("user_id")
		userID := userVal.(uint)
		conversations, err := repository.ListMyConversations(accountID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, conversations)
		return
	}

	// Filtrar por tipo (grupo ou privado)
	if conversationType == "group" {
		conversations, err := repository.ListGroupConversations(accountID, inboxID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, conversations)
		return
	}

	if conversationType == "private" {
		conversations, err := repository.ListPrivateConversations(accountID, inboxID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, conversations)
		return
	}

	conversations, err := repository.ListConversationsByAccount(accountID, inboxID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, conversations)
}

// AssignHandler permite que um agente assuma a conversa
func AssignHandler(c *gin.Context) {
	idStr := c.Param("id")
	convID, _ := strconv.ParseUint(idStr, 10, 32)
	// Cast int to uint is safe here? convID is uint64.
	// user_id is uint.
	// account_id is uint.

	accountVal, _ := c.Get("account_id")
	accountID := accountVal.(uint)

	userVal, _ := c.Get("user_id")
	userID := userVal.(uint)

	if err := repository.AssignConversation(uint(convID), userID, accountID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "assigned"})
}

func MarkAsReadHandler(c *gin.Context) {
	idStr := c.Param("id")
	convID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation id"})
		return
	}

	accountVal, _ := c.Get("account_id")
	accountID := accountVal.(uint)

	userVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	userID := userVal.(uint)

	// Verificar se a conversa existe e pertence à conta
	conversation, err := repository.GetConversationByID(uint(convID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "conversation not found"})
		return
	}

	if uint(conversation.AccountID) != accountID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Marcar todas as mensagens da conversa como lidas para este usuário
	if err := repository.MarkAllMessagesAsReadByUser(uint(convID), userID); err != nil {
		log.Printf("Error marking messages as read for user %d in conversation %d: %v", userID, convID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark messages as read"})
		return
	}

	// Também marcar no status antigo para compatibilidade
	if err := repository.MarkMessagesAsRead(uint(convID)); err != nil {
		log.Printf("Warning: Error updating old message status for conversation %d: %v", convID, err)
	}

	// Atualizar o contador de não lidas da conversa para 0
	if err := repository.UpdateConversationUnreadCount(uint(convID), 0); err != nil {
		log.Printf("Error updating unread count for conversation %d: %v", convID, err)
	}

	c.JSON(http.StatusOK, gin.H{"status": "marked as read", "user_id": userID})
}

// MarkAllAsRead - POST /api/v1/conversations/mark-all-read
func MarkAllAsRead(c *gin.Context) {
	accountVal, _ := c.Get("account_id")
	accountID := accountVal.(uint)

	userVal, _ := c.Get("user_id")
	userID := userVal.(uint)

	inboxIDStr := c.Query("inbox_id")
	var inboxID *uint
	if inboxIDStr != "" {
		if id, err := strconv.ParseUint(inboxIDStr, 10, 32); err == nil {
			idUint := uint(id)
			inboxID = &idUint
		}
	}

	if err := repository.MarkAllConversationsAsRead(accountID, userID, inboxID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark all as read"})
		return
	}

	// Broadcast para atualizar a lista de conversas no frontend
	// Como muitas mudaram, o ideal é enviar um evento global ou múltiplos individuais
	// Para simplificar e evitar flood, vamos enviar um evento que force o refetch total ou apenas confirmar sucesso
	BroadcastToAccount(accountID, RealtimeEvent{
		Type:    "conversations.mark_all_read",
		Payload: gin.H{"inbox_id": inboxID},
	})

	c.JSON(http.StatusOK, gin.H{"status": "all marked as read"})
}

// CreateConversation cria uma nova conversa (Chatwoot-compatible)
func CreateConversation(c *gin.Context) {
	accountVal, _ := c.Get("account_id")
	accountID := accountVal.(uint)

	var payload struct {
		ContactID uint `json:"contact_id" binding:"required"`
		InboxID   uint `json:"inbox_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload: " + err.Error()})
		return
	}

	// Validar se contactID e inboxID existem e pertencem ao account
	// (Opcional: adicionar validações de existência)

	// Criar ou buscar conversa existente
	conversation, err := repository.FindOrCreateConversation(accountID, payload.InboxID, payload.ContactID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create conversation: " + err.Error()})
		return
	}

	// Broadcast em tempo real para clientes da conta
	log.Printf("[CreateConversation] Broadcasting conversation.new (ID=%d) to account %d", conversation.ID, accountID)
	BroadcastToAccount(accountID, RealtimeEvent{
		Type:    "conversation.new",
		Payload: conversation,
	})

	c.JSON(http.StatusOK, conversation)
}

// DeleteConversation exclui uma conversa específica
func DeleteConversation(c *gin.Context) {
	accountVal, _ := c.Get("account_id")
	accountID := accountVal.(uint)

	idStr := c.Param("id")
	conversationID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}

	// Verificar se a conversa pertence à conta do usuário
	conversation, err := repository.GetConversationByID(uint(conversationID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	if uint(conversation.AccountID) != accountID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Deletar a conversa
	if err := repository.DeleteConversation(uint(conversationID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete conversation"})
		return
	}

	log.Printf("[DeleteConversation] Deleted conversation %d for account %d", conversationID, accountID)

	// Broadcast para atualizar UI
	BroadcastToAccount(accountID, RealtimeEvent{
		Type:    "conversation.deleted",
		Payload: gin.H{"id": conversationID},
	})

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// ClearInboxConversations exclui todas as conversas de uma inbox
func ClearInboxConversations(c *gin.Context) {
	accountVal, _ := c.Get("account_id")
	accountID := accountVal.(uint)

	idStr := c.Param("id")
	inboxID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inbox ID"})
		return
	}

	// Verificar se a inbox pertence à conta do usuário
	inbox, err := repository.GetInboxByID(uint(inboxID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inbox not found"})
		return
	}

	if uint(inbox.AccountID) != accountID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Deletar todas as conversas da inbox
	count, err := repository.DeleteConversationsByInbox(uint(inboxID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear inbox"})
		return
	}

	log.Printf("[ClearInboxConversations] Deleted %d conversations from inbox %d for account %d", count, inboxID, accountID)

	// Broadcast para atualizar UI
	BroadcastToAccount(accountID, RealtimeEvent{
		Type:    "inbox.cleared",
		Payload: gin.H{"inbox_id": inboxID, "count": count},
	})

	c.JSON(http.StatusOK, gin.H{"status": "cleared", "count": count})
}

// GetUnreadCounts retorna o número de mensagens não lidas por conversa para o usuário logado
func GetUnreadCounts(c *gin.Context) {
	userVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	userID := userVal.(uint)

	unreadCounts, err := repository.GetUnreadCountByConversation(userID)
	if err != nil {
		log.Printf("Error getting unread counts for user %d: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get unread counts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"unread_counts": unreadCounts})
}
