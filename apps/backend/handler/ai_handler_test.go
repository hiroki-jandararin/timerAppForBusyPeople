package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/hiroki-jandararin/apps/backend/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- モック ---

type mockGenerator struct {
	result *handler.GeneratedRoutine
	err    error
}

func (m *mockGenerator) Generate(prompt string) (*handler.GeneratedRoutine, error) {
	return m.result, m.err
}

// --- AIHandler のテスト（プロバイダー非依存）---

// ケース1: prompt が空なら 400
func TestGenerateRoutine_EmptyPrompt(t *testing.T) {
	h := handler.NewAIHandlerWithGenerator(&mockGenerator{})
	req := httptest.NewRequest(http.MethodPost, "/ai/generate-routine", bytes.NewBufferString(`{"prompt":""}`))
	req = req.WithContext(middleware.WithUserID(context.Background(), "user-1"))
	rr := httptest.NewRecorder()

	h.GenerateRoutine(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// ケース2: ジェネレーターがエラーを返したら 500
func TestGenerateRoutine_GeneratorError(t *testing.T) {
	h := handler.NewAIHandlerWithGenerator(&mockGenerator{err: errors.New("API error")})
	req := httptest.NewRequest(http.MethodPost, "/ai/generate-routine", bytes.NewBufferString(`{"prompt":"脚トレ"}`))
	req = req.WithContext(middleware.WithUserID(context.Background(), "user-1"))
	rr := httptest.NewRecorder()

	h.GenerateRoutine(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ケース3: 正常系 - モックジェネレーターからルーティンを返して 200
func TestGenerateRoutine_Success(t *testing.T) {
	mock := &mockGenerator{
		result: &handler.GeneratedRoutine{
			Name: "上半身マシンルーティン",
			Items: []handler.GeneratedRoutineItem{
				{Title: "ベンチプレス", Type: "workout", DurationSec: 45},
				{Title: "休憩", Type: "interval", DurationSec: 20},
				{Title: "ラットプルダウン", Type: "workout", DurationSec: 45},
				{Title: "休憩", Type: "interval", DurationSec: 20},
				{Title: "ケーブルフライ", Type: "workout", DurationSec: 45},
				{Title: "休憩", Type: "interval", DurationSec: 20},
				{Title: "シーテッドロウ", Type: "workout", DurationSec: 45},
			},
		},
	}
	h := handler.NewAIHandlerWithGenerator(mock)
	req := httptest.NewRequest(http.MethodPost, "/ai/generate-routine", bytes.NewBufferString(`{"prompt":"上半身を15分で鍛えたい"}`))
	req = req.WithContext(middleware.WithUserID(context.Background(), "user-1"))
	rr := httptest.NewRecorder()

	h.GenerateRoutine(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	var result map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &result))
	assert.Equal(t, "上半身マシンルーティン", result["name"])
	assert.GreaterOrEqual(t, len(result["items"].([]any)), 6)
}

// --- ClaudeGenerator のテスト ---

// ケース4: ANTHROPIC_API_KEY が未設定なら Generate がエラーを返す
func TestClaudeGenerator_NoAPIKey(t *testing.T) {
	t.Setenv("ANTHROPIC_API_KEY", "")

	gen := handler.NewClaudeGenerator(http.DefaultClient, "")
	_, err := gen.Generate("脚トレ")

	assert.Error(t, err)
}

// ケース5: Claude API を正しく呼び出してルーティンを返す
func TestClaudeGenerator_CallsAPI(t *testing.T) {
	t.Setenv("ANTHROPIC_API_KEY", "test-key")

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "test-key", r.Header.Get("x-api-key"))
		assert.Equal(t, "2023-06-01", r.Header.Get("anthropic-version"))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"content": []map[string]any{{
				"type": "text",
				"text": `{"name":"上半身マシンルーティン","items":[{"title":"ベンチプレス","type":"workout","durationSec":45},{"title":"休憩","type":"interval","durationSec":20},{"title":"ラットプルダウン","type":"workout","durationSec":45},{"title":"休憩","type":"interval","durationSec":20},{"title":"ケーブルフライ","type":"workout","durationSec":45},{"title":"休憩","type":"interval","durationSec":20},{"title":"シーテッドロウ","type":"workout","durationSec":45}]}`,
			}},
		})
	}))
	defer mockServer.Close()

	gen := handler.NewClaudeGenerator(mockServer.Client(), mockServer.URL)
	routine, err := gen.Generate("上半身を15分で鍛えたい")

	require.NoError(t, err)
	assert.Equal(t, "上半身マシンルーティン", routine.Name)
	assert.GreaterOrEqual(t, len(routine.Items), 6)
}
