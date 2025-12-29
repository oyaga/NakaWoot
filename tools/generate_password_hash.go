package main

import (
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run generate_password_hash.go <password>")
		os.Exit(1)
	}

	password := os.Args[1]
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Println("Error:", err)
		os.Exit(1)
	}

	fmt.Println("Password hash:")
	fmt.Println(string(hash))
	fmt.Println("\nSQL to update user password:")
	fmt.Printf("UPDATE users SET encrypted_password = '%s' WHERE email = 'admin@mensager.local';\n", string(hash))
}
