package handler

import (
	"encoding/json"
	"net/http"

	"github.com/hiroki-jandararin/apps/backend/domain"
)

type RoutineHandler struct {
	repo domain.RoutineRepository
}

func NewRoutineHandler(repo domain.RoutineRepository) *RoutineHandler{
	return &RoutineHandler{repo: repo}
}

func (h *RoutineHandler) GetRoutines(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	routines, err := h.repo.FindAll()
	if err != nil {
		http.Error(w, "Failed to fetch routines", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(routines)
}