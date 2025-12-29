package service

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// MediaStorage interface para abstração de storage
type MediaStorage interface {
	Store(ctx context.Context, data []byte, fileName string, contentType string) (string, error)
	GetURL(ctx context.Context, fileName string) (string, error)
	Download(ctx context.Context, url string) ([]byte, string, error)
}

// LocalMediaStorage implementação local de storage
type LocalMediaStorage struct {
	basePath string
	baseURL  string
}

// NewLocalMediaStorage cria uma nova instância de storage local
func NewLocalMediaStorage(basePath, baseURL string) *LocalMediaStorage {
	// Criar diretório se não existir
	os.MkdirAll(basePath, 0755)

	return &LocalMediaStorage{
		basePath: basePath,
		baseURL:  baseURL,
	}
}

// Store salva um arquivo localmente e retorna a URL de acesso
func (s *LocalMediaStorage) Store(ctx context.Context, data []byte, fileName string, contentType string) (string, error) {
	// Criar caminho completo
	filePath := filepath.Join(s.basePath, fileName)

	// Garantir que o diretório existe
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Salvar arquivo
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	// Retornar URL de acesso
	url := fmt.Sprintf("%s/%s", s.baseURL, fileName)
	return url, nil
}

// GetURL retorna a URL de acesso para um arquivo
func (s *LocalMediaStorage) GetURL(ctx context.Context, fileName string) (string, error) {
	// Verificar se arquivo existe
	filePath := filepath.Join(s.basePath, fileName)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", fmt.Errorf("file not found: %s", fileName)
	}

	url := fmt.Sprintf("%s/%s", s.baseURL, fileName)
	return url, nil
}

// Download faz download de uma URL e retorna os dados e o MIME type
func (s *LocalMediaStorage) Download(ctx context.Context, url string) ([]byte, string, error) {
	// Criar contexto com timeout de 5 minutos (mesmo timeout do Evolution GO)
	downloadCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	// Criar requisição HTTP
	req, err := http.NewRequestWithContext(downloadCtx, "GET", url, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	// Fazer requisição
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	// Ler dados
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read response: %w", err)
	}

	// Obter MIME type
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		// Detectar MIME type pelos dados
		contentType = http.DetectContentType(data)
	}

	return data, contentType, nil
}

// DetectMimeType detecta o MIME type de dados binários
func DetectMimeType(data []byte) string {
	return http.DetectContentType(data)
}

// GetExtensionFromMimeType retorna a extensão de arquivo baseada no MIME type
func GetExtensionFromMimeType(mimeType string) string {
	extensions := map[string]string{
		"image/jpeg":      ".jpg",
		"image/png":       ".png",
		"image/webp":      ".webp",
		"image/gif":       ".gif",
		"video/mp4":       ".mp4",
		"video/quicktime": ".mov",
		"audio/ogg":       ".ogg",
		"audio/mpeg":      ".mp3",
		"audio/wav":       ".wav",
		"audio/aac":       ".aac",
		"application/pdf": ".pdf",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document":   ".docx",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         ".xlsx",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
		"application/zip": ".zip",
		"text/plain":      ".txt",
	}

	if ext, ok := extensions[mimeType]; ok {
		return ext
	}

	return ".bin"
}

// SupabaseMediaStorage implementação usando Supabase Storage
type SupabaseMediaStorage struct {
	supabaseURL    string
	supabaseKey    string
	bucketName     string
	httpClient     *http.Client
}

// NewSupabaseMediaStorage cria uma nova instância de storage do Supabase
func NewSupabaseMediaStorage(supabaseURL, supabaseKey, bucketName string) *SupabaseMediaStorage {
	return &SupabaseMediaStorage{
		supabaseURL: supabaseURL,
		supabaseKey: supabaseKey,
		bucketName:  bucketName,
		httpClient: &http.Client{
			Timeout: 5 * time.Minute,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: false},
			},
		},
	}
}

// Store salva um arquivo no Supabase Storage e retorna a URL pública
func (s *SupabaseMediaStorage) Store(ctx context.Context, data []byte, fileName string, contentType string) (string, error) {
	// URL da API do Supabase Storage
	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.supabaseURL, s.bucketName, fileName)

	// Criar requisição
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.supabaseKey))
	req.Header.Set("Content-Type", contentType)

	// Fazer upload
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to upload to supabase: %w", err)
	}
	defer resp.Body.Close()

	// Verificar resposta
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("supabase upload failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Retornar URL pública
	publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.supabaseURL, s.bucketName, fileName)
	return publicURL, nil
}

// GetURL retorna a URL pública de um arquivo no Supabase Storage
func (s *SupabaseMediaStorage) GetURL(ctx context.Context, fileName string) (string, error) {
	// Supabase Storage sempre retorna URL pública do bucket
	url := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.supabaseURL, s.bucketName, fileName)
	return url, nil
}

// Download faz download de uma URL e retorna os dados e o MIME type
func (s *SupabaseMediaStorage) Download(ctx context.Context, url string) ([]byte, string, error) {
	// Criar contexto com timeout
	downloadCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	// Criar requisição HTTP
	req, err := http.NewRequestWithContext(downloadCtx, "GET", url, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	// Fazer requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	// Ler dados
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read response: %w", err)
	}

	// Obter MIME type
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}

	return data, contentType, nil
}

// DeleteFile remove um arquivo do Supabase Storage
func (s *SupabaseMediaStorage) DeleteFile(ctx context.Context, fileName string) error {
	// URL da API do Supabase Storage
	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.supabaseURL, s.bucketName, fileName)

	// Criar requisição DELETE
	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create delete request: %w", err)
	}

	// Headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.supabaseKey))

	// Fazer requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete from supabase: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase delete failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// ListFiles lista arquivos no bucket
func (s *SupabaseMediaStorage) ListFiles(ctx context.Context, prefix string) ([]string, error) {
	// URL da API do Supabase Storage
	url := fmt.Sprintf("%s/storage/v1/object/list/%s", s.supabaseURL, s.bucketName)

	// Criar payload
	payload := map[string]interface{}{
		"prefix": prefix,
		"limit":  1000,
	}
	jsonData, _ := json.Marshal(payload)

	// Criar requisição
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.supabaseKey))
	req.Header.Set("Content-Type", "application/json")

	// Fazer requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("supabase list failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse resposta
	var files []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&files); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Extrair nomes dos arquivos
	var fileNames []string
	for _, file := range files {
		if name, ok := file["name"].(string); ok {
			fileNames = append(fileNames, name)
		}
	}

	return fileNames, nil
}
