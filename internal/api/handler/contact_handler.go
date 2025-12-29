package handler

import (
	"encoding/json"
	"fmt"
	"mensager-go/internal/models"
	"mensager-go/internal/repository"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// ListContacts - GET /api/v1/contacts
func ListContacts(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account_id not found"})
		return
	}

	// Paginação
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage := 15

	// Busca opcional
	search := c.Query("q")

	contacts, total, err := repository.ListContacts(accountID.(uint), page, perPage, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"contacts": contacts,
		"meta": gin.H{
			"count":        len(contacts),
			"total_count":  total,
			"current_page": page,
			"per_page":     perPage,
		},
	})
}

// GetContact - GET /api/v1/contacts/:id
func GetContact(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account_id not found"})
		return
	}

	contactID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid contact id"})
		return
	}

	contact, err := repository.GetContact(uint(contactID), accountID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
		return
	}

	c.JSON(http.StatusOK, contact)
}

// CreateContact - POST /api/v1/contacts
func CreateContact(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account_id not found"})
		return
	}

	var req struct {
		Name                 string      `json:"name"`
		Email                string      `json:"email"`
		PhoneNumber          string      `json:"phone_number"`
		Identifier           string      `json:"identifier"`
		AvatarURL            string      `json:"avatar_url"`
		AdditionalAttributes interface{} `json:"additional_attributes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validação básica - ao menos um identificador é necessário
	if req.Email == "" && req.PhoneNumber == "" && req.Identifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "at least email, phone_number or identifier is required",
		})
		return
	}

	// Verificar duplicidade (Lógica Anti-Duplicação)
	existingContact, err := repository.FindContactByEmailOrPhoneOrIdentifier(accountID.(uint), req.Email, req.PhoneNumber, req.Identifier)
	if err == nil && existingContact != nil {
		// Contato já existe! Retornamos ele ao invés de criar um novo ou dar erro.
		// Isso garante idempotência e evita duplicatas.
		c.JSON(http.StatusOK, gin.H{
			"payload": gin.H{
				"contact": existingContact,
			},
			"message": "Contact already exists",
		})
		return
	}

	contact := &models.Contact{
		AccountID:   accountID.(uint),
		Name:        req.Name,
		Email:       req.Email,
		PhoneNumber: req.PhoneNumber,
		Identifier:  req.Identifier,
		AvatarURL:   req.AvatarURL,
	}

	// Convert additional_attributes to JSON
	if req.AdditionalAttributes != nil {
		jsonData, err := json.Marshal(req.AdditionalAttributes)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid additional_attributes format"})
			return
		}
		contact.AdditionalAttributes = datatypes.JSON(jsonData)
	}

	if err := repository.CreateContact(contact); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Retorno compatível com Chatwoot API
	c.JSON(http.StatusCreated, gin.H{
		"payload": gin.H{
			"contact": contact,
		},
	})
}

// UpdateContact - PUT /api/v1/contacts/:id
func UpdateContact(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account_id not found"})
		return
	}

	contactID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid contact id"})
		return
	}

	// Verificar se o contato existe e pertence à conta
	existingContact, err := repository.GetContact(uint(contactID), accountID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
		return
	}

	var req struct {
		Name                 *string     `json:"name"`
		Email                *string     `json:"email"`
		PhoneNumber          *string     `json:"phone_number"`
		AvatarURL            *string     `json:"avatar_url"`
		AdditionalAttributes interface{} `json:"additional_attributes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Atualizar apenas campos enviados
	if req.Name != nil {
		existingContact.Name = *req.Name
	}
	if req.Email != nil {
		existingContact.Email = *req.Email
	}
	if req.PhoneNumber != nil {
		existingContact.PhoneNumber = *req.PhoneNumber
	}
	if req.AvatarURL != nil {
		existingContact.AvatarURL = *req.AvatarURL
	}
	if req.AdditionalAttributes != nil {
		jsonData, err := json.Marshal(req.AdditionalAttributes)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid additional_attributes format"})
			return
		}
		existingContact.AdditionalAttributes = datatypes.JSON(jsonData)
	}

	if err := repository.UpdateContact(existingContact); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, existingContact)
}

// DeleteContact - DELETE /api/v1/contacts/:id
func DeleteContact(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account_id not found"})
		return
	}

	contactID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid contact id"})
		return
	}

	// Verificar se o contato existe e pertence à conta
	_, err = repository.GetContact(uint(contactID), accountID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
		return
	}

	if err := repository.DeleteContact(uint(contactID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "contact deleted successfully"})
}

// DeleteContacts - DELETE /api/v1/contacts/batch
func DeleteContacts(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account_id not found"})
		return
	}

	var req struct {
		IDs []uint `json:"ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("Error binding JSON: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("Deleting contacts: %v\n", req.IDs)

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids cannot be empty"})
		return
	}

	if err := repository.DeleteContacts(req.IDs, accountID.(uint)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "contacts deleted successfully"})
}

// DeleteAllContacts - DELETE /api/v1/contacts/all
func DeleteAllContacts(c *gin.Context) {
	accountID, exists := c.Get("account_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account_id not found"})
		return
	}

	if err := repository.DeleteAllContacts(accountID.(uint)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "all contacts deleted successfully"})
}
