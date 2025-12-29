package repository

import (
	"mensager-go/internal/db"
	"mensager-go/internal/models"
)

// GetInboxByID busca uma inbox por ID
func GetInboxByID(id uint) (*models.Inbox, error) {
	var inbox models.Inbox
	err := db.Instance.First(&inbox, id).Error
	return &inbox, err
}

// ListInboxesByAccount lista todas as inboxes de uma conta
func ListInboxesByAccount(accountID uint) ([]models.Inbox, error) {
	var inboxes []models.Inbox
	err := db.Instance.Where("account_id = ?", accountID).Find(&inboxes).Error
	return inboxes, err
}
