package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hiroki-jandararin/apps/backend/middleware"
	"github.com/stretchr/testify/assert"
)

func makeValidToken(secret, userID string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	signed, _ := token.SignedString([]byte(secret))
	return signed
}

const testSecret = "test-secret"

func dummyHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func TestAuthMiddleware_NoAuthorizationHeader_Returns401(t *testing.T) {
	handler := middleware.AuthMiddleware(testSecret)(http.HandlerFunc(dummyHandler))

	req := httptest.NewRequest(http.MethodGet, "/routines", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestAuthMiddleware_InvalidToken_Returns401(t *testing.T) {
	handler := middleware.AuthMiddleware(testSecret)(http.HandlerFunc(dummyHandler))

	req := httptest.NewRequest(http.MethodGet, "/routines", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.here")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestAuthMiddleware_ValidToken_SetsUserIDInContext(t *testing.T) {
	const userID = "user-abc-123"
	var capturedCtx context.Context

	captureHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.AuthMiddleware(testSecret)(captureHandler)

	req := httptest.NewRequest(http.MethodGet, "/routines", nil)
	req.Header.Set("Authorization", "Bearer "+makeValidToken(testSecret, userID))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, userID, middleware.UserIDFromContext(capturedCtx))
}
