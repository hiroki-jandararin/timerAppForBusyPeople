package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/hiroki-jandararin/apps/backend/domain"
	"github.com/hiroki-jandararin/apps/backend/middleware"
)

type WorkoutHistoryHandler struct {
	repo domain.WorkoutHistoryRepository
}

func NewWorkoutHistoryHandler(repo domain.WorkoutHistoryRepository) *WorkoutHistoryHandler {
	return &WorkoutHistoryHandler{repo: repo}
}

func (h *WorkoutHistoryHandler) CreateWorkoutHistory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := middleware.UserIDFromContext(r.Context())

	var history domain.WorkoutHistory
	if err := json.NewDecoder(r.Body).Decode(&history); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	history.UserID = userID

	created, err := h.repo.Create(&history)
	if err != nil {
		slog.Error("ワークアウト履歴の記録失敗", "userID", userID, "error", err)
		http.Error(w, "Failed to create workout history", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

func (h *WorkoutHistoryHandler) GetWorkoutHistories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := middleware.UserIDFromContext(r.Context())

	histories, err := h.repo.FindByUserID(userID)
	if err != nil {
		slog.Error("ワークアウト履歴の取得失敗", "userID", userID, "error", err)
		http.Error(w, "Failed to fetch workout histories", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(histories)
}
