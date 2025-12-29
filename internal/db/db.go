package db

import (
	"fmt"
	"log"
	"os"

	"mensager-go/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var Instance *gorm.DB

func Init() {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}

	// Automigrate para sincronizar models com o banco do Supabase
	err = db.AutoMigrate(
		&models.Account{},
		&models.User{},
		&models.Inbox{},
		&models.Conversation{},
		&models.CannedResponse{},
		&models.Contact{},
		&models.Message{},
	)
	if err != nil {
		log.Printf("⚠️ Migration warning: %v", err)
	}

	Instance = db
	fmt.Println("✅ GORM initialized and models synced")
}
