package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/hiroki-jandararin/apps/backend/domain"
	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/hiroki-jandararin/apps/backend/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockWorkoutHistoryRepository struct {
	created   *domain.WorkoutHistory
	histories []domain.WorkoutHistory
}

func (m *mockWorkoutHistoryRepository) Create(h *domain.WorkoutHistory) (*domain.WorkoutHistory, error) {
	m.created = h
	return h, nil
}

func (m *mockWorkoutHistoryRepository) FindByUserID(userID string) ([]domain.WorkoutHistory, error) {
	return m.histories, nil
}

func TestCreateWorkoutHistory(t *testing.T) {
	routineID := "routine-1"
	body := map[string]any{
		"id":             "hist-1",
		"routineId":      routineID,
		"routineName":    "朝トレ",
		"startedAt":      time.Now().Add(-10 * time.Minute).Format(time.RFC3339),
		"finishedAt":     time.Now().Format(time.RFC3339),
		"completed":      true,
		"itemsCount":     5,
		"itemsCompleted": 5,
	}
	b, _ := json.Marshal(body)

	mock := &mockWorkoutHistoryRepository{}
	h := handler.NewWorkoutHistoryHandler(mock)

	ctx := middleware.WithUserID(context.Background(), "user-123")
	req := httptest.NewRequest(http.MethodPost, "/workout-histories", bytes.NewReader(b)).WithContext(ctx)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateWorkoutHistory(rr, req)

	require.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "user-123", mock.created.UserID)
	assert.Equal(t, "朝トレ", mock.created.RoutineName)
}

func TestGetWorkoutHistories(t *testing.T) {
	routineID := "routine-1"
	mock := &mockWorkoutHistoryRepository{
		histories: []domain.WorkoutHistory{
			{
				ID:          "hist-1",
				UserID:      "user-123",
				RoutineID:   &routineID,
				RoutineName: "朝トレ",
				StartedAt:   time.Now().Add(-10 * time.Minute),
				FinishedAt:  time.Now(),
				Completed:   true,
				ItemsCount:  5, ItemsCompleted: 5,
			},
		},
	}
	h := handler.NewWorkoutHistoryHandler(mock)

	ctx := middleware.WithUserID(context.Background(), "user-123")
	req := httptest.NewRequest(http.MethodGet, "/workout-histories", nil).WithContext(ctx)
	rr := httptest.NewRecorder()

	h.GetWorkoutHistories(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	var result []domain.WorkoutHistory
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &result))
	assert.Len(t, result, 1)
}
