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

const systemPrompt = `あなたは筋トレプログラムの専門家です。ユーザーのリクエストを基に、以下のルールでワークアウトルーティンをJSON形式で生成してください。

## 絶対ルール（違反禁止）
- 下記の「種目リスト」に載っていない種目は絶対に使用しない
- ユーザーが指定した部位以外の種目は絶対に使用しない
- 上記2点に違反した場合、回答は無効とみなされる

## 基本ルール
- 各種目は10回×3セットを基準にする
- セットのdurationSecは種目に応じて40〜60秒を目安にする（10回相当）
- インターバルのdurationSecはユーザーの指定に従う（短め=15秒、普通=30秒、長め=60秒）
- workoutのtitleは「種目名 N回」の形式にする（例: "ベンチプレス 10回"）
- durationSecが増加した場合は回数も比例して増やす（60秒=15回、90秒=20回、120秒=25回）

## 時間調整ルール（重要）
生成したルーティンのトータル時間をユーザー指定時間にできるだけ近づけること。
以下の優先順位で調整する:
1. 指定部位の種目リストから種目を追加する
2. 各種目のセット数を増やす（1種目あたり最大5セット）
3. 5セットでも時間が足りない場合は、各workoutのdurationSecを増やす（最大120秒、回数増加を意味する）

## 種目リスト（このリスト以外の種目は使用禁止）
胸: ベンチプレス
背中: ラットプルダウン、懸垂（チンアップ）
肩: ショルダープレス、サイドレイズ
腕（前）: バーベルカール、ダンベルカール（右）、ダンベルカール（左）
腕（後ろ）: トライセプスプレスダウン
足（前）: スクワット、レッグエクステンション、ブルガリアンスプリットスクワット
足（後ろ）: デッドリフト、レッグカール
腹筋: クランチ、プランク、アブローラー
背筋: バックエクステンション、デッドリフト
ふくらはぎ: スタンディングカーフレイズ、シーテッドカーフレイズ

## アイテム展開ルール
各種目のセット数に応じて以下の順で展開する:
3セット: workout → interval → workout → interval → workout
4セット: workout → interval → workout → interval → workout → interval → workout
5セット: workout → interval → workout → interval → workout → interval → workout → interval → workout
最後のitemは必ずworkoutで終わること。

## 出力形式
必ず以下のJSON形式のみを返すこと。説明文・コードブロックマーカー不要:
{"name":"ルーティン名","items":[{"title":"ベンチプレス 10回","type":"workout","durationSec":45},{"title":"休憩","type":"interval","durationSec":30}]}

- typeは"workout"か"interval"のみ
- nameとtitleは日本語`

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
