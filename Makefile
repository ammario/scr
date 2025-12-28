.PHONY: build deploy fmt test

install:
	bun i

build: install
	bun run build

deploy: build
	./deploy.sh

fmt:
	npm x prettier -- --write '**/*.{js,jsx,ts,tsx}' \
		--ignore-path .gitignore

# Run all tests
test: unit-test integration-test

# Unit tests (no GCS required)
unit-test:
	bun run test util/

# Integration tests (requires GCS credentials)
integration-test:
	bun run test

# E2E tests with Playwright (requires running server)
e2e-test:
	bun x playwright test e2e

# Dev server
dev:
	bun run dev