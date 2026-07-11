package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
)

type SupabaseAuthClient struct {
	supabaseURL string
	anonKey     string
	httpClient  *http.Client
}

func NewSupabaseAuthClient(supabaseURL, anonKey string) *SupabaseAuthClient {
	return &SupabaseAuthClient{
		supabaseURL: supabaseURL,
		anonKey:     anonKey,
		httpClient:  &http.Client{},
	}
}

func (c *SupabaseAuthClient) SignIn(email, password string) (string, error) {
	body, _ := json.Marshal(map[string]string{"email": email, "password": password})
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/auth/v1/token?grant_type=password", c.supabaseURL), bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.anonKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized {
		return "", ErrInvalidCredentials
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("認証サーバーエラー: %d", resp.StatusCode)
	}

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.AccessToken, nil
}

func (c *SupabaseAuthClient) SignUp(email, password, redirectTo string) error {
	payload := map[string]any{"email": email, "password": password}
	if redirectTo != "" {
		payload["options"] = map[string]string{"email_redirect_to": redirectTo}
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/auth/v1/signup", c.supabaseURL), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.anonKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	// Supabaseはメール重複時に422を返す
	if resp.StatusCode == http.StatusUnprocessableEntity {
		return ErrEmailAlreadyExists
	}
	if resp.StatusCode == http.StatusBadRequest {
		var body struct {
			ErrorCode string `json:"error_code"`
		}
		if json.Unmarshal(respBody, &body) == nil && body.ErrorCode == "email_address_invalid" {
			return ErrInvalidEmail
		}
	}
	if resp.StatusCode == http.StatusTooManyRequests {
		return ErrRateLimitExceeded
	}
	if resp.StatusCode != http.StatusOK {
		slog.Error("Supabaseサインアップエラー", "status", resp.StatusCode, "body", string(respBody))
		return fmt.Errorf("認証サーバーエラー: %d", resp.StatusCode)
	}
	return nil
}
