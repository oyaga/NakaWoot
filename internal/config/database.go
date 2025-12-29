package config

import (
"fmt"
"log"
"os"

"mensager-go/internal/models"
"gorm.io/driver/postgres"
"gorm.io/gorm"
"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() {
dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
os.Getenv("DB_HOST"),
os.Getenv("DB_USER"),
os.Getenv("DB_PASSWORD"),
os.Getenv("DB_NAME"),
os.Getenv("DB_PORT"),
)

var err error
DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
Logger: logger.Default.LogMode(logger.Info),
})

if err != nil {
log.Fatal("Failed to connect to database:", err)
}

// Registro de Models para migração/verificação
err = DB.AutoMigrate(&models.Account{})
if err != nil {
log.Printf("Migration warning: %v", err)
}

fmt.Println("✅ Database connection established and models synced")
}