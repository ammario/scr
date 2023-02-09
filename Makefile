.PHONY: build-frontend

build-frontend:
	yarn build && yarn next export -o server/dist