.PHONY: build-frontend

build-frontend:
	rm -rf .next && yarn build && yarn next export -o dist