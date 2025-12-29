package middleware

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"mensager-go/internal/db"
	"mensager-go/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			tokenString = c.GetHeader("api_access_token")
		}

		// Fallback para query string (necessário para EventSource/SSE)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Cabeçalho de autorização ausente ou token não fornecido"})
			c.Abort()
			return
		}

		// Validar com o Secret do Supabase
		jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")
		log.Printf("[AuthMiddleware] Validating token with secret length: %d", len(jwtSecret))

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			log.Printf("[AuthMiddleware] JWT validation failed - Error: %v, Valid: %v", err, token != nil && token.Valid)
			c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("Token JWT inválido: %v", err)})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Falha ao ler claims"})
			c.Abort()
			return
		}

		userUUID, ok := claims["sub"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Claim 'sub' ausente ou inválido"})
			c.Abort()
			return
		}

		// Resolver Ponte UUID (Auth) -> AccountID (Chatwoot Legacy)
		var user models.User
		if err := db.Instance.Where("uuid = ?", userUUID).First(&user).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Usuário não sincronizado no banco local"})
			c.Abort()
			return
		}

		// Injeção de Contexto Seguro
		c.Set("user_id", user.ID)
		c.Set("account_id", user.AccountID)
		// c.Set("user_role", user.Role) // Role não existe no struct User restaurado (eu tirei sem querer?)
		// Ah, eu restaurei e adicionei Role.
		c.Set("user_role", user.Role)
		c.Set("user", user)

		c.Next()
	}
}
