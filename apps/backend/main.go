package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/hiroki-jandararin/apps/backend/repository"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-User-ID")

		// プリフライトリクエストはここで終了
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	godotenv.Load()
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	repo := repository.NewPostgresRoutineRepository(db)
	h := handler.NewRoutineHandler(repo)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /routines", h.GetRoutines)
	mux.HandleFunc("GET /routines/{id}", h.GetRoutineByID)
	mux.HandleFunc("POST /routines", h.CreateRoutine)
	mux.HandleFunc("PUT /routines/{id}", h.UpdateRoutine)
	mux.HandleFunc("DELETE /routines/{id}", h.DeleteRoutine)

	log.Println("Server started on :8080")
	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatal("Server failed:", err)
	}
}
