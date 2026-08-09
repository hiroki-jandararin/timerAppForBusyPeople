package main

// test
import (
	"database/sql"
	"log"
	"log/slog"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/hiroki-jandararin/apps/backend/handler"
	"github.com/hiroki-jandararin/apps/backend/middleware"
	"github.com/hiroki-jandararin/apps/backend/repository"
)

func corsMiddleware(next http.Handler) http.Handler {
	origin := os.Getenv("CORS_ALLOW_ORIGIN")
	if origin == "" {
		origin = "http://localhost:5173"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func buildHandler() http.Handler {
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	db.SetMaxOpenConns(1)

	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		log.Fatal("SUPABASE_URL is required")
	}
	supabaseAnonKey := os.Getenv("SUPABASE_ANON_KEY")
	if supabaseAnonKey == "" {
		log.Fatal("SUPABASE_ANON_KEY is required")
	}
	supabaseServiceRoleKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if supabaseServiceRoleKey == "" {
		log.Fatal("SUPABASE_SERVICE_ROLE_KEY is required")
	}

	repo := repository.NewPostgresRoutineRepository(db)
	h := handler.NewRoutineHandler(repo)

	historyRepo := repository.NewPostgresWorkoutHistoryRepository(db)
	historyHandler := handler.NewWorkoutHistoryHandler(historyRepo)

	aiHandler := handler.NewAIHandler()

	authClient := handler.NewSupabaseAuthClient(supabaseURL, supabaseAnonKey, supabaseServiceRoleKey)
	authHandler := handler.NewAuthHandler(authClient)

	auth := middleware.AuthMiddleware(supabaseURL)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /auth/login", authHandler.Login)
	mux.HandleFunc("POST /auth/register", authHandler.Register)
	mux.Handle("GET /auth/me", auth(http.HandlerFunc(authHandler.GetMe)))
	mux.Handle("DELETE /users/me", auth(http.HandlerFunc(authHandler.DeleteAccount)))
	mux.Handle("GET /routines", auth(http.HandlerFunc(h.GetRoutines)))
	mux.Handle("GET /routines/{id}", auth(http.HandlerFunc(h.GetRoutineByID)))
	mux.Handle("POST /routines", auth(http.HandlerFunc(h.CreateRoutine)))
	mux.Handle("PUT /routines/{id}", auth(http.HandlerFunc(h.UpdateRoutine)))
	mux.Handle("DELETE /routines/{id}", auth(http.HandlerFunc(h.DeleteRoutine)))
	mux.Handle("POST /workout-histories", auth(http.HandlerFunc(historyHandler.CreateWorkoutHistory)))
	mux.Handle("GET /workout-histories", auth(http.HandlerFunc(historyHandler.GetWorkoutHistories)))
	mux.Handle("POST /ai/generate-routine", auth(http.HandlerFunc(aiHandler.GenerateRoutine)))

	return middleware.RequestLogger(corsMiddleware(mux))
}

func main() {
	godotenv.Load()
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	if os.Getenv("AWS_LAMBDA_FUNCTION_NAME") != "" {
		lambda.Start(httpadapter.NewV2(buildHandler()).ProxyWithContext)
	} else {
		slog.Info("サーバー起動", "port", 8080)
		if err := http.ListenAndServe(":8080", buildHandler()); err != nil {
			log.Fatal("Server failed:", err)
		}
	}
}
