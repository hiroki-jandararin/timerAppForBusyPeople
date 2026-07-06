package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/hiroki-jandararin/apps/backend/middleware"
	"github.com/stretchr/testify/assert"
)

type mockAuthClient struct {
	token string
	err   error
}

func (m *mockAuthClient) SignIn(email, password string) (string, error) {
	return m.token, m.err
}

func (m *mockAuthClient) SignUp(email, password string) error {
	return m.err
}

func TestLogin_Success(t *testing.T) {
	mock := &mockAuthClient{token: "test-access-token"}
	h := handler.NewAuthHandler(mock)

	body := `{"email":"test@example.com","password":"password123"}`
	req := httptest.NewRequest("POST", "/auth/login", strings.NewReader(body))
	rr := httptest.NewRecorder()

	h.Login(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.JSONEq(t, `{"accessToken":"test-access-token"}`, rr.Body.String())
}

func TestLogin_InvalidBody_Returns400(t *testing.T) {
	mock := &mockAuthClient{}
	h := handler.NewAuthHandler(mock)

	req := httptest.NewRequest("POST", "/auth/login", strings.NewReader("invalid json"))
	rr := httptest.NewRecorder()

	h.Login(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestLogin_AuthFailed_Returns401(t *testing.T) {
	mock := &mockAuthClient{err: handler.ErrInvalidCredentials}
	h := handler.NewAuthHandler(mock)

	body := `{"email":"test@example.com","password":"wrong"}`
	req := httptest.NewRequest("POST", "/auth/login", strings.NewReader(body))
	rr := httptest.NewRecorder()

	h.Login(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestRegister_Success(t *testing.T) {
	mock := &mockAuthClient{}
	h := handler.NewAuthHandler(mock)

	body := `{"email":"new@example.com","password":"password123"}`
	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()

	h.Register(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
}

func TestRegister_InvalidBody_Returns400(t *testing.T) {
	mock := &mockAuthClient{}
	h := handler.NewAuthHandler(mock)

	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader("invalid json"))
	rr := httptest.NewRecorder()

	h.Register(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRegister_EmailAlreadyExists_Returns409(t *testing.T) {
	mock := &mockAuthClient{err: handler.ErrEmailAlreadyExists}
	h := handler.NewAuthHandler(mock)

	body := `{"email":"existing@example.com","password":"password123"}`
	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()

	h.Register(rr, req)

	assert.Equal(t, http.StatusConflict, rr.Code)
}

func TestRegister_InvalidEmail_Returns400(t *testing.T) {
	mock := &mockAuthClient{err: handler.ErrInvalidEmail}
	h := handler.NewAuthHandler(mock)

	body := `{"email":"not-an-email","password":"password123"}`
	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()

	h.Register(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRegister_RateLimitExceeded_Returns429(t *testing.T) {
	mock := &mockAuthClient{err: handler.ErrRateLimitExceeded}
	h := handler.NewAuthHandler(mock)

	body := `{"email":"test@example.com","password":"password123"}`
	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()

	h.Register(rr, req)

	assert.Equal(t, http.StatusTooManyRequests, rr.Code)
}

func TestGetMe_ReturnsUserID(t *testing.T) {
	h := handler.NewAuthHandler(&mockAuthClient{})

	ctx := middleware.WithUserID(context.Background(), "user-123")
	req := httptest.NewRequest("GET", "/auth/me", nil).WithContext(ctx)
	rr := httptest.NewRecorder()

	h.GetMe(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.JSONEq(t, `{"userId":"user-123"}`, rr.Body.String())
}
