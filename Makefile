.PHONY: build-frontend

build-frontend:
	# rm -rf server/dist/* .next/*
	yarn build && yarn next export -o server/dist

build-go: build-frontend
	GOOS=linux GOARCH=amd64 go build -o bin/scr ./cmd/scr

deploy: build-go
	./deploy.sh