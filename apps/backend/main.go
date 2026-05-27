package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/hiroki-jandararin/apps/backend/repository"
)

func main() {
	godotenv.Load()
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// ここで実際のリポジトリを作成して渡すべき
	repo := repository.NewPostgresRoutineRepository(db)
	h := handler.NewRoutineHandler(repo) // ここは実際のリポジトリを渡すべき

	http.HandleFunc("GET /routines", h.GetRoutines)
	http.HandleFunc("GET /routines/{id}", h.GetRoutineByID)
	http.HandleFunc("POST /routines", h.CreateRoutine)
	http.HandleFunc("PUT /routines/{id}", h.UpdateRoutine)
	http.HandleFunc("DELETE /routines/{id}", h.DeleteRoutine)
	http.ListenAndServe(":8080", nil)
}
