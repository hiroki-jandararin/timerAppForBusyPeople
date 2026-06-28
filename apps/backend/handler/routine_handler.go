package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/hiroki-jandararin/apps/backend/domain"
	"github.com/hiroki-jandararin/apps/backend/middleware"
)

type RoutineHandler struct {
	repo domain.RoutineRepository
}

func NewRoutineHandler(repo domain.RoutineRepository) *RoutineHandler {
	return &RoutineHandler{repo: repo}
}

func (h *RoutineHandler) GetRoutines(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := middleware.UserIDFromContext(r.Context())
	routines, err := h.repo.FindAll(userID)
	if err != nil {
		slog.Error("ルーティン一覧取得失敗", "userID", userID, "error", err)
		http.Error(w, "Failed to fetch routines", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(routines)
}

func (h *RoutineHandler) GetRoutineByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	routineID := r.PathValue("id")
	routine, err := h.repo.FindByID(routineID)
	if err != nil {
		slog.Error("ルーティン取得失敗", "routineID", routineID, "error", err)
		http.Error(w, "Failed to fetch routine", http.StatusInternalServerError)
		return
	}
	if routine == nil {
		http.Error(w, "Routine not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(routine)
}

func decodeAndValidate(w http.ResponseWriter, r *http.Request, routine *domain.Routine) bool {
	if err := json.NewDecoder(r.Body).Decode(routine); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return false
	}
	if errs := routine.Validate(); len(errs) > 0 {
		http.Error(w, errs[0], http.StatusBadRequest)
		return false
	}
	return true
}

func (h *RoutineHandler) CreateRoutine(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := middleware.UserIDFromContext(r.Context())
	var routine domain.Routine
	if !decodeAndValidate(w, r, &routine) {
		return
	}
	routine.ID = uuid.New().String()

	createdRoutine, err := h.repo.Create(userID, &routine)
	if err != nil {
		slog.Error("ルーティン作成失敗", "userID", userID, "error", err)
		http.Error(w, "Failed to create routine", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(createdRoutine)
}

func (h *RoutineHandler) DeleteRoutine(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.repo.Delete(id); err != nil {
		slog.Error("ルーティン削除失敗", "routineID", id, "error", err)
		http.Error(w, "Failed to delete routine", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *RoutineHandler) UpdateRoutine(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := middleware.UserIDFromContext(r.Context())
	var routine domain.Routine
	if !decodeAndValidate(w, r, &routine) {
		return
	}
	routine.ID = r.PathValue("id")

	updatedRoutine, err := h.repo.Update(userID, &routine)
	if err != nil {
		slog.Error("ルーティン更新失敗", "userID", userID, "routineID", routine.ID, "error", err)
		http.Error(w, "Failed to update routine", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(updatedRoutine)
}
