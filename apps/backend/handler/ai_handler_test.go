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

// モック（複数呼び出し対応）
type mockGeneratorSeq struct {
	results []*handler.GeneratedRoutine
	errors  []error
	calls   int
	prompts []string
}

func (m *mockGeneratorSeq) Generate(prompt string) (*handler.GeneratedRoutine, error) {
	m.prompts = append(m.prompts, prompt)
	i := m.calls
	m.calls++
	if i < len(m.results) {
		return m.results[i], m.errors[i]
	}
	return nil, errors.New("予期しない Generate 呼び出し")
}

// ケース6: targetSecより大幅にズレていたらリトライする
func TestGenerateRoutine_RetriesWhenTotalTimeIsOff(t *testing.T) {
	shortRoutine := &handler.GeneratedRoutine{
		Name: "胸トレ",
		Items: []handler.GeneratedRoutineItem{
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
		}, // 合計480秒
	}
	correctRoutine := &handler.GeneratedRoutine{
		Name: "胸トレ",
		Items: []handler.GeneratedRoutineItem{
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
		}, // 合計900秒
	}
	mock := &mockGeneratorSeq{
		results: []*handler.GeneratedRoutine{shortRoutine, correctRoutine},
		errors:  []error{nil, nil},
	}
	h := handler.NewAIHandlerWithGenerator(mock)
	body := `{"prompt":"胸を15分鍛えたい","targetSec":900}`
	req := httptest.NewRequest(http.MethodPost, "/ai/generate-routine", bytes.NewBufferString(body))
	req = req.WithContext(middleware.WithUserID(context.Background(), "user-1"))
	rr := httptest.NewRecorder()

	h.GenerateRoutine(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, 2, mock.calls)
	assert.Contains(t, mock.prompts[1], "480")
	assert.Contains(t, mock.prompts[1], "900")
	assert.Contains(t, mock.prompts[1], `"items"`) // 前回の生成結果JSONが含まれること
}

// ケース7: 差が180秒以内ならリトライしない（境界値）
func TestGenerateRoutine_NoRetryWithin180Seconds(t *testing.T) {
	// targetSec=900, 合計=720 → 差180秒 → リトライなし
	routine := &handler.GeneratedRoutine{
		Name: "胸トレ",
		Items: []handler.GeneratedRoutineItem{
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
		}, // 合計720秒（4*120 + 4*60 = 720、差180秒）
	}
	mock := &mockGeneratorSeq{
		results: []*handler.GeneratedRoutine{routine},
		errors:  []error{nil},
	}
	h := handler.NewAIHandlerWithGenerator(mock)
	body := `{"prompt":"胸を15分鍛えたい","targetSec":900}`
	req := httptest.NewRequest(http.MethodPost, "/ai/generate-routine", bytes.NewBufferString(body))
	req = req.WithContext(middleware.WithUserID(context.Background(), "user-1"))
	rr := httptest.NewRecorder()

	h.GenerateRoutine(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, 1, mock.calls)
}

// ケース8: 差が181秒ならリトライする（境界値+1）
func TestGenerateRoutine_RetriesWhen181SecondsOff(t *testing.T) {
	// targetSec=900, 合計=719 → 差181秒 → リトライ
	offRoutine := &handler.GeneratedRoutine{
		Name: "胸トレ",
		Items: []handler.GeneratedRoutineItem{
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 59},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
		}, // 合計719秒（差181秒）
	}
	retryRoutine := &handler.GeneratedRoutine{
		Name:  "胸トレ",
		Items: []handler.GeneratedRoutineItem{{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 900}},
	}
	mock := &mockGeneratorSeq{
		results: []*handler.GeneratedRoutine{offRoutine, retryRoutine},
		errors:  []error{nil, nil},
	}
	h := handler.NewAIHandlerWithGenerator(mock)
	body := `{"prompt":"胸を15分鍛えたい","targetSec":900}`
	req := httptest.NewRequest(http.MethodPost, "/ai/generate-routine", bytes.NewBufferString(body))
	req = req.WithContext(middleware.WithUserID(context.Background(), "user-1"))
	rr := httptest.NewRecorder()

	h.GenerateRoutine(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, 2, mock.calls)
}

// ケース9: targetSecに完全一致でもリトライしない
func TestGenerateRoutine_NoRetryWhenTotalTimeIsClose(t *testing.T) {
	routine := &handler.GeneratedRoutine{
		Name: "胸トレ",
		Items: []handler.GeneratedRoutineItem{
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
			{Title: "休憩", Type: "interval", DurationSec: 60},
			{Title: "ベンチプレス 25回", Type: "workout", DurationSec: 120},
		}, // 合計900秒
	}
	mock := &mockGeneratorSeq{
		results: []*handler.GeneratedRoutine{routine},
		errors:  []error{nil},
	}
	h := handler.NewAIHandlerWithGenerator(mock)
	body := `{"prompt":"胸を15分鍛えたい","targetSec":900}`
	req := httptest.NewRequest(http.MethodPost, "/ai/generate-routine", bytes.NewBufferString(body))
	req = req.WithContext(middleware.WithUserID(context.Background(), "user-1"))
	rr := httptest.NewRecorder()

	h.GenerateRoutine(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, 1, mock.calls)
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
