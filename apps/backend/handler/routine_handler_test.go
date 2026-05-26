package handler_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hiroki-jandararin/apps/backend/domain"
	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/stretchr/testify/assert"
)

// モック: FindAll が固定データを返す
type mockRoutineRepository struct {
	routines []domain.Routine
	routine  *domain.Routine
}

func (m *mockRoutineRepository) FindAll(userID string) ([]domain.Routine, error) {
	return m.routines, nil
}

func (m *mockRoutineRepository) FindByID(id string) (*domain.Routine, error) {
	return m.routine, nil
}

func intPtr(v int) *int       { return &v }
func strPtr(v string) *string { return &v }

func TestGetRoutines(t *testing.T) {
	tests := []struct {
		name         string
		routines     []domain.Routine
		expectedJSON string
	}{
		{
			name:         "空のとき空配列を返す",
			routines:     []domain.Routine{},
			expectedJSON: `[]`,
		},
		{
			name: "targetDurationSecなし・itemsなし",
			routines: []domain.Routine{
				{ID: "2", Name: "ストレッチ", TargetDurationSec: nil, Items: []domain.RoutineItem{}},
			},
			expectedJSON: `[{"id":"2","name":"ストレッチ","items":[],"createdAt":"","updatedAt":""}]`,
		},
		{
			name: "targetDurationSecあり・workout/interval両方・voiceTextあり/なし",
			routines: []domain.Routine{
				{
					ID:                "1",
					Name:              "朝トレ",
					TargetDurationSec: intPtr(300),
					Items: []domain.RoutineItem{
						{Id: "i1", Type: "workout", Title: "スクワット", DurationSec: 30, VoiceText: nil},
						{Id: "i2", Type: "interval", Title: "休憩", DurationSec: 10, VoiceText: strPtr("次はプランクです")},
					},
				},
			},
			expectedJSON: `[{"id":"1","name":"朝トレ","targetDurationSec":300,"items":[{"id":"i1","type":"workout","title":"スクワット","durationSec":30},{"id":"i2","type":"interval","title":"休憩","durationSec":10,"voiceText":"次はプランクです"}],"createdAt":"","updatedAt":""}]`,
		},
		{
			name: "複数のルーティンを全件返す",
			routines: []domain.Routine{
				{ID: "1", Name: "朝トレ", Items: []domain.RoutineItem{}},
				{ID: "2", Name: "ストレッチ", Items: []domain.RoutineItem{}},
			},
			expectedJSON: `[{"id":"1","name":"朝トレ","items":[],"createdAt":"","updatedAt":""},{"id":"2","name":"ストレッチ","items":[],"createdAt":"","updatedAt":""}]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/routines", nil)
			rr := httptest.NewRecorder()

			h := handler.NewRoutineHandler(&mockRoutineRepository{routines: tt.routines})
			h.GetRoutines(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
			assert.JSONEq(t, tt.expectedJSON, rr.Body.String())
		})
	}
}

func TestGetRoutineByID(t *testing.T) {
	req := httptest.NewRequest("GET", "/routines/1", nil)
	rr := httptest.NewRecorder()

	expectedRoutine := &domain.Routine{ID: "1", Name: "朝トレ", Items: []domain.RoutineItem{}}
	h := handler.NewRoutineHandler(&mockRoutineRepository{routine: expectedRoutine})
	h.GetRoutineByID(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	assert.JSONEq(t, `{"id":"1","name":"朝トレ","items":[],"createdAt":"","updatedAt":""}`, rr.Body.String())
}
