package repository

import (
	"mensager-go/internal/db"
	"mensager-go/internal/models"
)

// ListContacts retorna todos os contatos de uma conta com paginação e busca opcional
func ListContacts(accountID uint, page, perPage int, search string) ([]models.Contact, int64, error) {
	var contacts []models.Contact
	var total int64

	query := db.Instance.Model(&models.Contact{}).Where("account_id = ?", accountID)

	// Busca opcional por nome, email ou telefone
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where(
			"name ILIKE ? OR email ILIKE ? OR phone_number ILIKE ?",
			searchPattern, searchPattern, searchPattern,
		)
	}

	// Contar total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Buscar com paginação
	offset := (page - 1) * perPage
	if err := query.
		Order("created_at DESC").
		Limit(perPage).
		Offset(offset).
		Find(&contacts).Error; err != nil {
		return nil, 0, err
	}

	return contacts, total, nil
}

// GetContact retorna um contato específico por ID e account_id
func GetContact(contactID, accountID uint) (*models.Contact, error) {
	var contact models.Contact
	if err := db.Instance.Where("id = ? AND account_id = ?", contactID, accountID).First(&contact).Error; err != nil {
		return nil, err
	}
	return &contact, nil
}

// CreateContact cria um novo contato
func CreateContact(contact *models.Contact) error {
	return db.Instance.Create(contact).Error
}

// UpdateContact atualiza um contato existente
func UpdateContact(contact *models.Contact) error {
	return db.Instance.Save(contact).Error
}

// DeleteContact deleta um contato por ID
func DeleteContact(contactID uint) error {
	return db.Instance.Delete(&models.Contact{}, contactID).Error
}

// GetContactByEmail busca um contato por email dentro de uma conta
func GetContactByEmail(email string, accountID uint) (*models.Contact, error) {
	var contact models.Contact
	if err := db.Instance.Where("email = ? AND account_id = ?", email, accountID).First(&contact).Error; err != nil {
		return nil, err
	}
	return &contact, nil
}

// GetContactByPhoneNumber busca um contato por telefone dentro de uma conta
func GetContactByPhoneNumber(phoneNumber string, accountID uint) (*models.Contact, error) {
	var contact models.Contact
	if err := db.Instance.Where("phone_number = ? AND account_id = ?", phoneNumber, accountID).First(&contact).Error; err != nil {
		return nil, err
	}
	return &contact, nil
}

// FindOrCreateContactByPhone busca ou cria um contato pelo telefone
func FindOrCreateContactByPhone(accountID uint, phoneNumber string, remoteJid string) (*models.Contact, error) {
	// Tentar encontrar contato existente por phone_number
	contact, err := GetContactByPhoneNumber(phoneNumber, accountID)
	if err == nil {
		// Contato encontrado - atualizar identifier e avatar se necessário
		updated := false
		if contact.Identifier == "" && remoteJid != "" {
			contact.Identifier = remoteJid
			updated = true
		}
		if updated {
			db.Instance.Save(contact)
		}
		return contact, nil
	}

	// Tentar encontrar por identifier (remoteJid) como fallback
	if remoteJid != "" {
		var contactByJid models.Contact
		if err := db.Instance.Where("identifier = ? AND account_id = ?", remoteJid, accountID).First(&contactByJid).Error; err == nil {
			// Atualizar phone_number se estiver vazio
			if contactByJid.PhoneNumber == "" && phoneNumber != "" {
				contactByJid.PhoneNumber = phoneNumber
				db.Instance.Save(&contactByJid)
			}
			return &contactByJid, nil
		}
	}

	// Se não encontrado, criar novo
	newContact := &models.Contact{
		AccountID:   accountID,
		Name:        phoneNumber, // Será atualizado com pushName depois
		PhoneNumber: phoneNumber,
		Email:       "",
		Identifier:  remoteJid,
	}

	if err := CreateContact(newContact); err != nil {
		return nil, err
	}

	return newContact, nil
}

// FindContactByEmailOrPhone busca um contato por email ou telefone dentro de uma conta
func FindContactByEmailOrPhone(accountID uint, email, phoneNumber string) (*models.Contact, error) {
	var contact models.Contact
	db := db.Instance.Where("account_id = ?", accountID)

	// Lógica de busca condicional
	if email != "" && phoneNumber != "" {
		// Se ambos fornecidos, busca por um OU outro
		db = db.Where("email = ? OR phone_number = ?", email, phoneNumber)
	} else if email != "" {
		// Apenas email
		db = db.Where("email = ?", email)
	} else if phoneNumber != "" {
		// Apenas telefone
		db = db.Where("phone_number = ?", phoneNumber)
	} else {
		// Nenhum identificador fornecido
		return nil, nil
	}

	if err := db.First(&contact).Error; err != nil {
		return nil, err
	}
	return &contact, nil
}

// FindContactByEmailOrPhoneOrIdentifier busca um contato por email, telefone ou identifier dentro de uma conta
func FindContactByEmailOrPhoneOrIdentifier(accountID uint, email, phoneNumber, identifier string) (*models.Contact, error) {
	var contact models.Contact
	db := db.Instance.Where("account_id = ?", accountID)

	// Construir condições de busca dinamicamente
	conditions := []string{}
	args := []interface{}{}

	if email != "" {
		conditions = append(conditions, "email = ?")
		args = append(args, email)
	}
	if phoneNumber != "" {
		conditions = append(conditions, "phone_number = ?")
		args = append(args, phoneNumber)
	}
	if identifier != "" {
		conditions = append(conditions, "identifier = ?")
		args = append(args, identifier)
	}

	// Se nenhum identificador fornecido
	if len(conditions) == 0 {
		return nil, nil
	}

	// Combinar condições com OR
	query := conditions[0]
	for i := 1; i < len(conditions); i++ {
		query += " OR " + conditions[i]
	}

	db = db.Where(query, args...)

	if err := db.First(&contact).Error; err != nil {
		return nil, err
	}
	return &contact, nil
}

// DeleteContacts deleta múltiplos contatos por IDs
func DeleteContacts(contactIDs []uint, accountID uint) error {
	return db.Instance.Where("id IN ? AND account_id = ?", contactIDs, accountID).Delete(&models.Contact{}).Error
}

// DeleteAllContacts deleta todos os contatos de uma conta
func DeleteAllContacts(accountID uint) error {
	return db.Instance.Where("account_id = ?", accountID).Delete(&models.Contact{}).Error
}
