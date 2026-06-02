package middleware_test

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hiroki-jandararin/apps/backend/middleware"
	"github.com/stretchr/testify/assert"
)

const testKid = "test-key-id"

func newTestKey(t *testing.T) (*ecdsa.PrivateKey, *ecdsa.PublicKey) {
	t.Helper()
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return priv, &priv.PublicKey
}

func newJWKSServer(pubKey *ecdsa.PublicKey) *httptest.Server {
	jwks := map[string]any{
		"keys": []map[string]any{
			{
				"kty": "EC",
				"kid": testKid,
				"alg": "ES256",
				"crv": "P-256",
				"x":   base64.RawURLEncoding.EncodeToString(pubKey.X.Bytes()),
				"y":   base64.RawURLEncoding.EncodeToString(pubKey.Y.Bytes()),
			},
		},
	}
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(jwks)
	}))
}

func makeValidToken(privKey *ecdsa.PrivateKey, userID string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodES256, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	token.Header["kid"] = testKid
	signed, _ := token.SignedString(privKey)
	return signed
}

func dummyHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func TestAuthMiddleware_NoAuthorizationHeader_Returns401(t *testing.T) {
	_, pubKey := newTestKey(t)
	server := newJWKSServer(pubKey)
	defer server.Close()

	handler := middleware.AuthMiddleware(server.URL)(http.HandlerFunc(dummyHandler))

	req := httptest.NewRequest(http.MethodGet, "/routines", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestAuthMiddleware_InvalidToken_Returns401(t *testing.T) {
	_, pubKey := newTestKey(t)
	server := newJWKSServer(pubKey)
	defer server.Close()

	handler := middleware.AuthMiddleware(server.URL)(http.HandlerFunc(dummyHandler))

	req := httptest.NewRequest(http.MethodGet, "/routines", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.here")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestAuthMiddleware_ValidToken_SetsUserIDInContext(t *testing.T) {
	privKey, pubKey := newTestKey(t)
	server := newJWKSServer(pubKey)
	defer server.Close()

	const userID = "user-abc-123"
	var capturedCtx context.Context

	captureHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.AuthMiddleware(server.URL)(captureHandler)

	req := httptest.NewRequest(http.MethodGet, "/routines", nil)
	req.Header.Set("Authorization", "Bearer "+makeValidToken(privKey, userID))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, userID, middleware.UserIDFromContext(capturedCtx))
}
