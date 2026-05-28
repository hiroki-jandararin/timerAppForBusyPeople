package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hiroki-jandararin/apps/backend/domain"
	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/hiroki-jandararin/apps/backend/middleware"
	"github.com/stretchr/testify/assert"
)

// モック: FindAll が固定データを返す
type mockRoutineRepository struct {
	routines       []domain.Routine
	routine        *domain.Routine
	capturedUserID string
}

func (m *mockRoutineRepository) FindAll(userID string) ([]domain.Routine, error) {
	m.capturedUserID = userID
	return m.routines, nil
}

func (m *mockRoutineRepository) FindByID(id string) (*domain.Routine, error) {
	return m.routine, nil
}

func (m *mockRoutineRepository) Create(userID string, routine *domain.Routine) (*domain.Routine, error) {
	return m.routine, nil
}

func (m *mockRoutineRepository) Update(userID string, routine *domain.Routine) (*domain.Routine, error) {
	return m.routine, nil
}

func (m *mockRoutineRepository) Delete(id string) error {
	return nil
}

func intPtr(v int) *int       { return &v }
func strPtr(v string) *string { return &v }

func TestGetRoutines_ReadsUserIDFromContext(t *testing.T) {
	mock := &mockRoutineRepository{routines: []domain.Routine{}}
	h := handler.NewRoutineHandler(mock)

	ctx := middleware.WithUserID(context.Background(), "user-from-context")
	req := httptest.NewRequest("GET", "/routines", nil).WithContext(ctx)
	rr := httptest.NewRecorder()

	h.GetRoutines(rr, req)

	assert.Equal(t, "user-from-context", mock.capturedUserID)
}

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
			expectedJSON: `[{"id":"2","name":"ストレッチ","items":[],"createdAt":"0001-01-01T00:00:00Z","updatedAt":"0001-01-01T00:00:00Z"}]`,
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
			expectedJSON: `[{"id":"1","name":"朝トレ","targetDurationSec":300,"items":[{"id":"i1","type":"workout","title":"スクワット","durationSec":30},{"id":"i2","type":"interval","title":"休憩","durationSec":10,"voiceText":"次はプランクです"}],"createdAt":"0001-01-01T00:00:00Z","updatedAt":"0001-01-01T00:00:00Z"}]`,
		},
		{
			name: "複数のルーティンを全件返す",
			routines: []domain.Routine{
				{ID: "1", Name: "朝トレ", Items: []domain.RoutineItem{}},
				{ID: "2", Name: "ストレッチ", Items: []domain.RoutineItem{}},
			},
			expectedJSON: `[{"id":"1","name":"朝トレ","items":[],"createdAt":"0001-01-01T00:00:00Z","updatedAt":"0001-01-01T00:00:00Z"},{"id":"2","name":"ストレッチ","items":[],"createdAt":"0001-01-01T00:00:00Z","updatedAt":"0001-01-01T00:00:00Z"}]`,
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
	assert.JSONEq(t, `{"id":"1","name":"朝トレ","items":[],"createdAt":"0001-01-01T00:00:00Z","updatedAt":"0001-01-01T00:00:00Z"}`, rr.Body.String())
}

func TestDeleteRoutine(t *testing.T) {
	req := httptest.NewRequest("DELETE", "/routines/1", nil)
	rr := httptest.NewRecorder()

	h := handler.NewRoutineHandler(&mockRoutineRepository{})
	h.DeleteRoutine(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestUpdateRoutine(t *testing.T) {
	body := `{"name":"夜トレ","items":[{"type":"workout","title":"スクワット","durationSec":30}]}`
	req := httptest.NewRequest("PUT", "/routines/1", strings.NewReader(body))
	rr := httptest.NewRecorder()

	expectedRoutine := &domain.Routine{ID: "1", Name: "夜トレ", Items: []domain.RoutineItem{}}
	h := handler.NewRoutineHandler(&mockRoutineRepository{routine: expectedRoutine})
	h.UpdateRoutine(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	assert.JSONEq(t, `{"id":"1","name":"夜トレ","items":[],"createdAt":"0001-01-01T00:00:00Z","updatedAt":"0001-01-01T00:00:00Z"}`, rr.Body.String())
}

func TestCreateRoutine_InvalidBody_Returns400(t *testing.T) {
	body := `{"name":"","items":[]}`
	req := httptest.NewRequest("POST", "/routines", strings.NewReader(body))
	rr := httptest.NewRecorder()

	h := handler.NewRoutineHandler(&mockRoutineRepository{})
	h.CreateRoutine(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateRoutine(t *testing.T) {
	body := `{"name":"朝トレ","targetDurationSec":300,"items":[{"type":"workout","title":"スクワット","durationSec":30},{"type":"interval","title":"休憩","durationSec":10,"voiceText":"次はプランクです"}]}`
	req := httptest.NewRequest("POST", "/routines", strings.NewReader(body))
	rr := httptest.NewRecorder()

	expectedRoutine := &domain.Routine{ID: "1", Name: "朝トレ", Items: []domain.RoutineItem{}}
	h := handler.NewRoutineHandler(&mockRoutineRepository{routine: expectedRoutine})
	h.CreateRoutine(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	assert.JSONEq(t, `{"id":"1","name":"朝トレ","items":[],"createdAt":"0001-01-01T00:00:00Z","updatedAt":"0001-01-01T00:00:00Z"}`, rr.Body.String())
}
