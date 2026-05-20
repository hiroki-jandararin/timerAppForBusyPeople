package handler

import "net/http"

type RoutineHandler struct {
}

func NewRoutineHandler() *RoutineHandler{
	return &RoutineHandler{}
}

func (h *RoutineHandler) GetRoutines(rr http.ResponseWriter, req *http.Request) {
}