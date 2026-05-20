package handler_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/stretchr/testify/assert"
)

func TestGetRoutines(t *testing.T) {
	req := httptest.NewRequest("GET", "/routines", nil)
	rr := httptest.NewRecorder()

	h := handler.NewRoutineHandler()
	h.GetRoutines(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	assert.JSONEq(t, `[]`, rr.Body.String())
}