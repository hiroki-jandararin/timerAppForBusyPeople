ifneq (,$(wildcard .env))
  include .env
  export
endif

build:
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bootstrap .

clean:
	rm -f bootstrap

zip: build
	zip function.zip bootstrap

migrate-up:
	goose -dir migrations postgres "$(DATABASE_URL)" up

migrate-down:
	goose -dir migrations postgres "$(DATABASE_URL)" down

migrate-status:
	goose -dir migrations postgres "$(DATABASE_URL)" status
