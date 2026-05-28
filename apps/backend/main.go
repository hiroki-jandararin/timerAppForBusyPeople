package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/hiroki-jandararin/apps/backend/middleware"
	"github.com/hiroki-jandararin/apps/backend/repository"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

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

	jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("SUPABASE_JWT_SECRET is required")
	}

	repo := repository.NewPostgresRoutineRepository(db)
	h := handler.NewRoutineHandler(repo)
	auth := middleware.AuthMiddleware(jwtSecret)

	mux := http.NewServeMux()
	mux.Handle("GET /routines", auth(http.HandlerFunc(h.GetRoutines)))
	mux.Handle("GET /routines/{id}", auth(http.HandlerFunc(h.GetRoutineByID)))
	mux.Handle("POST /routines", auth(http.HandlerFunc(h.CreateRoutine)))
	mux.Handle("PUT /routines/{id}", auth(http.HandlerFunc(h.UpdateRoutine)))
	mux.Handle("DELETE /routines/{id}", auth(http.HandlerFunc(h.DeleteRoutine)))

	log.Println("Server started on :8080")
	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatal("Server failed:", err)
	}
}
