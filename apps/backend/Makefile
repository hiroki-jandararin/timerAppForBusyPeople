build:
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bootstrap .

clean:
	rm -f bootstrap

zip: build
	zip function.zip bootstrap
