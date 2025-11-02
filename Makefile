.PHONY: help build run stop test lint format typecheck coverage clean docker-build docker-run docker-stop

# Default target
help:
	@echo "LabelGuard API - Available commands:"
	@echo "  make build          - Build TypeScript"
	@echo "  make run            - Run development server"
	@echo "  make stop           - Stop development server"
	@echo "  make test           - Run tests"
	@echo "  make coverage       - Run tests with coverage"
	@echo "  make lint           - Run ESLint"
	@echo "  make format         - Format code with Prettier"
	@echo "  make typecheck      - Type check without building"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make docker-build   - Build Docker image"
	@echo "  make docker-run     - Run Docker container"
	@echo "  make docker-stop    - Stop Docker container"

# Build TypeScript
build:
	npm run build

# Run development server
run:
	npm run dev

# Stop (placeholder - actual stop depends on how dev is run)
stop:
	@echo "Stop the dev server with Ctrl+C or kill the process"

# Run tests
test:
	npm run test

# Run tests with coverage
coverage:
	npm run coverage

# Lint code
lint:
	npm run lint

# Format code
format:
	npm run format

# Type check
typecheck:
	npm run typecheck

# Clean build artifacts
clean:
	rm -rf dist
	rm -rf coverage
	rm -rf node_modules/.cache

# Docker commands
docker-build:
	docker-compose build

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

