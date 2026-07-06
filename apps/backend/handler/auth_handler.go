package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/hiroki-jandararin/apps/backend/middleware"
)

var ErrInvalidCredentials = errors.New("認証情報が正しくありません")
var ErrEmailAlreadyExists = errors.New("メールアドレスはすでに登録されています")
var ErrInvalidEmail = errors.New("メールアドレスの形式が正しくありません")
var ErrRateLimitExceeded = errors.New("しばらく時間をおいてから再試行してください")

type AuthClient interface {
	SignIn(email, password string) (string, error)
	SignUp(email, password string) error
}

type AuthHandler struct {
	client AuthClient
}

func NewAuthHandler(client AuthClient) *AuthHandler {
	return &AuthHandler{client: client}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "リクエストの形式が正しくありません", http.StatusBadRequest)
		return
	}

	token, err := h.client.SignIn(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			http.Error(w, "メールアドレスまたはパスワードが正しくありません", http.StatusUnauthorized)
			return
		}
		http.Error(w, "サーバーエラーが発生しました", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"accessToken": token})
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"userId": userID})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "リクエストの形式が正しくありません", http.StatusBadRequest)
		return
	}

	if err := h.client.SignUp(req.Email, req.Password); err != nil {
		if errors.Is(err, ErrEmailAlreadyExists) {
			http.Error(w, "このメールアドレスはすでに登録されています", http.StatusConflict)
			return
		}
		if errors.Is(err, ErrInvalidEmail) {
			http.Error(w, "メールアドレスの形式が正しくありません", http.StatusBadRequest)
			return
		}
		if errors.Is(err, ErrRateLimitExceeded) {
			http.Error(w, "しばらく時間をおいてから再試行してください", http.StatusTooManyRequests)
			return
		}
		http.Error(w, "サーバーエラーが発生しました", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
