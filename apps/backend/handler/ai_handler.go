package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
)

const defaultAnthropicAPI = "https://api.anthropic.com/v1/messages"

const systemPrompt = `あなたは筋トレの専門家です。ユーザーのリクエストを基にワークアウトルーティンをJSON形式で生成してください。

必ず以下のJSON形式のみを返してください。説明文やコードブロックマーカーは不要です:
{"name":"ルーティン名","items":[{"title":"種目名","type":"workout","durationSec":40},{"title":"休憩","type":"interval","durationSec":20}]}

ルール:
- typeは"workout"（運動）か"interval"（休憩）のみ
- 運動は30〜90秒、休憩は10〜30秒
- 運動と休憩を交互に配置する
- 最後のitemはworkoutで終わる
- nameとtitleは日本語
- itemsは最低6個`

// GeneratedRoutineItem はAIが生成したルーティン種目
type GeneratedRoutineItem struct {
	Title       string `json:"title"`
	Type        string `json:"type"`
	DurationSec int    `json:"durationSec"`
}

// GeneratedRoutine はAIが生成したルーティン
type GeneratedRoutine struct {
	Name  string                 `json:"name"`
	Items []GeneratedRoutineItem `json:"items"`
}

// RoutineGenerator はワークアウトルーティンを生成するインターフェース
type RoutineGenerator interface {
	Generate(prompt string) (*GeneratedRoutine, error)
}

// --- AIHandler ---

type AIHandler struct {
	generator RoutineGenerator
}

func NewAIHandler() *AIHandler {
	return &AIHandler{generator: NewClaudeGenerator(http.DefaultClient, "")}
}

func NewAIHandlerWithGenerator(generator RoutineGenerator) *AIHandler {
	return &AIHandler{generator: generator}
}

func (h *AIHandler) GenerateRoutine(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Prompt string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Prompt) == "" {
		http.Error(w, "プロンプトが必要です", http.StatusBadRequest)
		return
	}

	generated, err := h.generator.Generate(req.Prompt)
	if err != nil {
		slog.Error("ルーティン生成失敗", "error", err)
		http.Error(w, "ルーティンの生成に失敗しました", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(generated)
}

// --- ClaudeGenerator ---

type ClaudeGenerator struct {
	httpClient   *http.Client
	anthropicURL string
}

func NewClaudeGenerator(client *http.Client, anthropicURL string) *ClaudeGenerator {
	url := anthropicURL
	if url == "" {
		url = defaultAnthropicAPI
	}
	return &ClaudeGenerator{httpClient: client, anthropicURL: url}
}

func (g *ClaudeGenerator) Generate(prompt string) (*GeneratedRoutine, error) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return nil, errors.New("ANTHROPIC_API_KEY が設定されていません")
	}

	type message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	type requestBody struct {
		Model     string    `json:"model"`
		MaxTokens int       `json:"max_tokens"`
		System    string    `json:"system"`
		Messages  []message `json:"messages"`
	}
	body, err := json.Marshal(requestBody{
		Model:     "claude-haiku-4-5-20251001",
		MaxTokens: 1024,
		System:    systemPrompt,
		Messages:  []message{{Role: "user", Content: prompt}},
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, g.anthropicURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var anthropicResp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &anthropicResp); err != nil {
		return nil, err
	}
	if len(anthropicResp.Content) == 0 {
		return nil, io.ErrUnexpectedEOF
	}

	text := strings.TrimSpace(anthropicResp.Content[0].Text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var routine GeneratedRoutine
	if err := json.Unmarshal([]byte(text), &routine); err != nil {
		return nil, err
	}
	return &routine, nil
}
