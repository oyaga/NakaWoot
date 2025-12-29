package repository

import (
	"mensager-go/internal/db"
	"mensager-go/internal/models"
)

func ListCannedResponses(accountID uint) ([]models.CannedResponse, error) {
	var responses []models.CannedResponse
	err := db.Instance.Where("account_id = ?", accountID).Find(&responses).Error
	return responses, err
}

func CreateCannedResponse(res *models.CannedResponse) error {
	return db.Instance.Create(res).Error
}
