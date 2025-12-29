package handler

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"mensager-go/internal/db"
	"mensager-go/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// OnboardingRequest estrutura do payload de cadastro inicial
type OnboardingRequest struct {
	AccountName string `json:"account_name" binding:"required"`
	UserName    string `json:"user_name" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
}

// OnboardingResponse resposta do cadastro inicial
type OnboardingResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
	User    *User  `json:"user,omitempty"`
	Account *struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
	} `json:"account,omitempty"`
}

// User estrutura simplificada para resposta
type User struct {
	ID          uint   `json:"id"`
	UUID        string `json:"uuid"`
	Email       string `json:"email"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
	Role        string `json:"role"`
	AccountID   uint   `json:"account_id"`
}

// CheckInstallation verifica se é a primeira instalação
func CheckInstallation(c *gin.Context) {
	var count int64
	if err := db.Instance.Model(&models.Account{}).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao verificar instalação",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"is_first_installation": count == 0,
		"accounts_count":        count,
	})
}

// CreateInitialAccount cria a conta inicial e o primeiro usuário
func CreateInitialAccount(c *gin.Context) {
	var req OnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Dados inválidos",
			"details": err.Error(),
		})
		return
	}

	// Verificar se já existe alguma conta
	var accountCount int64
	if err := db.Instance.Model(&models.Account{}).Count(&accountCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao verificar contas existentes"})
		return
	}

	if accountCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Sistema já foi configurado. Use o login para acessar.",
		})
		return
	}

	// Verificar se email já existe
	var existingUser models.User
	if err := db.Instance.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Email já cadastrado",
		})
		return
	}

	// Criar hash da senha
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao processar senha"})
		return
	}

	// Iniciar transação
	tx := db.Instance.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Criar Account
	account := models.Account{
		Name:      req.AccountName,
		Status:    0, // Ativo
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := tx.Create(&account).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao criar conta",
			"details": err.Error(),
		})
		return
	}

	log.Printf("[Onboarding] Account created with ID: %d", account.ID)

	// 2. Criar UUID para o usuário
	userUUID := uuid.New().String()

	// 3. Criar User (Admin)
	user := models.User{
		UUID:              userUUID,
		AccountID:         account.ID,
		Email:             req.Email,
		EncryptedPassword: string(hashedPassword),
		Name:              req.UserName,
		DisplayName:       req.UserName,
		Role:              "administrator", // Primeiro usuário é sempre admin
		Type:              "User",
		Availability:      1, // Online
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao criar usuário",
			"details": err.Error(),
		})
		return
	}

	log.Printf("[Onboarding] User created with ID: %d, UUID: %s", user.ID, user.UUID)

	// 4. Criar usuário no Supabase Auth (se configurado)
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL != "" && supabaseServiceKey != "" {
		if err := createSupabaseUser(userUUID, req.Email, req.Password); err != nil {
			log.Printf("[Onboarding] Warning: Failed to create Supabase user: %v", err)
			// Não falhamos a operação, apenas logamos o aviso
		}
	}

	// Commit da transação
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao finalizar cadastro",
			"details": err.Error(),
		})
		return
	}

	// 5. Gerar token JWT local (compatível com Supabase)
	token, err := generateJWTToken(user.UUID)
	if err != nil {
		log.Printf("[Onboarding] Warning: Failed to generate JWT: %v", err)
	}

	// Resposta de sucesso
	response := OnboardingResponse{
		Success: true,
		Message: "Conta criada com sucesso! Bem-vindo ao Nakawoot.",
		Token:   token,
		User: &User{
			ID:          user.ID,
			UUID:        user.UUID,
			Email:       user.Email,
			Name:        user.Name,
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
			Role:        user.Role,
			AccountID:   user.AccountID,
		},
		Account: &struct {
			ID   uint   `json:"id"`
			Name string `json:"name"`
		}{
			ID:   account.ID,
			Name: account.Name,
		},
	}

	c.JSON(http.StatusCreated, response)
}

// createSupabaseUser cria usuário no Supabase Auth via Admin API
func createSupabaseUser(userUUID, email, password string) error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL == "" || supabaseServiceKey == "" {
		return fmt.Errorf("Supabase credentials not configured")
	}

	// Construir payload para criar usuário
	payload := fmt.Sprintf(`{
		"email": "%s",
		"password": "%s",
		"email_confirm": true,
		"user_metadata": {
			"uuid": "%s"
		}
	}`, email, password, userUUID)

	// Fazer requisição HTTP para a Admin API
	url := supabaseURL + "/auth/v1/admin/users"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer([]byte(payload)))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
	req.Header.Set("apikey", supabaseServiceKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[Onboarding] Supabase error response: %s", string(body))
		return fmt.Errorf("supabase returned error %d: %s", resp.StatusCode, string(body))
	}

	log.Printf("[Onboarding] Successfully created Supabase user for email: %s", email)
	return nil
}

// generateJWTToken gera token JWT compatível com Supabase
func generateJWTToken(userUUID string) (string, error) {
	jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")
	if jwtSecret == "" {
		return "", fmt.Errorf("JWT secret not configured")
	}

	// Claims compatíveis com Supabase
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":  userUUID,                           // Subject = user UUID
		"role": "authenticated",                    // Supabase role
		"iss":  "supabase",                         // Issuer
		"iat":  now.Unix(),                         // Issued at
		"exp":  now.Add(time.Hour * 24 * 7).Unix(), // Expires in 7 days
		"aud":  "authenticated",                    // Audience
	}

	// Criar token com método HS256
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Assinar com a chave secreta
	signedToken, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	log.Printf("[JWT] Generated token for user: %s", userUUID)
	return signedToken, nil
}

// Login autentica usuário e retorna token
func Login(c *gin.Context) {
	type LoginRequest struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Dados inválidos",
			"details": err.Error(),
		})
		return
	}

	// Buscar usuário por email
	var user models.User
	if err := db.Instance.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Email ou senha inválidos",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao buscar usuário",
		})
		return
	}

	// Verificar senha
	if err := bcrypt.CompareHashAndPassword([]byte(user.EncryptedPassword), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Email ou senha inválidos",
		})
		return
	}

	// Gerar token JWT
	token, err := generateJWTToken(user.UUID)
	if err != nil {
		log.Printf("[Login] Warning: Failed to generate JWT: %v", err)
	}

	// Buscar account
	var account models.Account
	if err := db.Instance.First(&account, user.AccountID).Error; err != nil {
		log.Printf("[Login] Warning: Failed to fetch account: %v", err)
	}

	// Retornar dados do usuário
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   token,
		"user": User{
			ID:          user.ID,
			UUID:        user.UUID,
			Email:       user.Email,
			Name:        user.Name,
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
			Role:        user.Role,
			AccountID:   user.AccountID,
		},
		"account": gin.H{
			"id":   account.ID,
			"name": account.Name,
		},
	})
}

// Logout (placeholder - JWT é stateless)
func Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logout realizado com sucesso",
	})
}
