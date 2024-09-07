.PHONY: build-frontend

build-frontend:
	# rm -rf server/dist/* .next/*
	bun i
	bun run next build && bun run next export -o server/dist

build-go: build-frontend
	GOOS=linux GOARCH=amd64 go build -o bin/scr ./cmd/scr

deploy: build-go
	./deploy.sh

fmt:
	npm x prettier -- --write '**/*.{js,jsx,ts,tsx}' \
		--ignore-path .gitignore