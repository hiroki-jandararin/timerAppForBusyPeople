package handler

import (
	"encoding/json"
	"net/http"

	"github.com/hiroki-jandararin/apps/backend/domain"
)

type RoutineHandler struct {
	repo domain.RoutineRepository
}

func NewRoutineHandler(repo domain.RoutineRepository) *RoutineHandler {
	return &RoutineHandler{repo: repo}
}

func (h *RoutineHandler) GetRoutines(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// TODO: 認証実装後は JWT トークンから user_id を取り出す
	userID := r.URL.Query().Get("user_id")
	routines, err := h.repo.FindAll(userID)
	if err != nil {
		http.Error(w, "Failed to fetch routines", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(routines)
}

func (h *RoutineHandler) GetRoutineByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// TODO: ルーティンIDをURLパラメータから取得　認証実装後修正
	routineID := r.URL.Query().Get("id")
	routine, err := h.repo.FindByID(routineID)
	if err != nil {
		http.Error(w, "Failed to fetch routine", http.StatusInternalServerError)
		return
	}
	if routine == nil {
		http.Error(w, "Routine not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(routine)
}

func (h *RoutineHandler) CreateRoutine(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var routine domain.Routine
	if err := json.NewDecoder(r.Body).Decode(&routine); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	createdRoutine, err := h.repo.Create(&routine)
	if err != nil {
		http.Error(w, "Failed to create routine", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(createdRoutine)
}

func (h *RoutineHandler) UpdateRoutine(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var routine domain.Routine
	if err := json.NewDecoder(r.Body).Decode(&routine); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	updatedRoutine, err := h.repo.Update(&routine)
	if err != nil {
		http.Error(w, "Failed to update routine", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(updatedRoutine)
}
