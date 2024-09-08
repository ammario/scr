.PHONY: build-frontend

build-frontend:
	bun i
	bun run next build

build-go: build-frontend
	GOOS=linux GOARCH=amd64 go build -o bin/scr ./cmd/scr

deploy: build-go
	./deploy.sh

fmt:
	npm x prettier -- --write '**/*.{js,jsx,ts,tsx}' \
		--ignore-path .gitignore

.PHONY: test bun-test go-test playwright-test
playwright-test:
	bun x playwright test e2e

bun-test:
	bun test 

go-test:
	go test ./...

test: bun-test go-test playwright-test