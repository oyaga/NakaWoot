package database

import (
"log"
"os"

"gorm.io/driver/postgres"
"gorm.io/gorm"
)

var DB *gorm.DB

func Init() {
dsn := os.Getenv("DATABASE_URL")
if dsn == "" {
// Fallback para o nome do serviço no docker-compose
dsn = "postgres://postgres:postgres@db:5432/postgres?sslmode=disable"
}

var err error
DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
if err != nil {
log.Fatalf("Falha crítica ao conectar no banco de dados: %v", err)
}

log.Println("✅ GORM: Conexão com o banco de dados estabelecida.")
}