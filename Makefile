# -------- Config --------
NPM ?= npm
BUNDLE_DIR ?= review_bundle/frontend

.PHONY: deps
deps:
	@$(NPM) ci

.PHONY: lint
lint: deps
	@mkdir -p $(BUNDLE_DIR)
	@npx eslint "src/**/*.{ts,tsx}" -f stylish | tee $(BUNDLE_DIR)/eslint.txt || true

.PHONY: test
test: deps
	@mkdir -p $(BUNDLE_DIR)
	@CI=1 $(NPM) test -- --run --reporter=verbose --coverage || true
	@# Save vitest coverage if present
	@[ -d coverage ] && cp -R coverage $(BUNDLE_DIR)/coverage || true

.PHONY: build
build: deps
	@$(NPM) run build
	@mkdir -p $(BUNDLE_DIR)/dist
	# copy a trimmed build (no sourcemaps if huge)
	@cp -R dist $(BUNDLE_DIR)/

.PHONY: collect
collect:
	@mkdir -p $(BUNDLE_DIR)
	@cp -f package.json $(BUNDLE_DIR) 2>/dev/null || true
	@cp -f vite.config.* $(BUNDLE_DIR) 2>/dev/null || true
	@cp -f tsconfig.* $(BUNDLE_DIR) 2>/dev/null || true
	@cp -f .env.example $(BUNDLE_DIR) 2>/dev/null || true
	@echo "commit: $$(git rev-parse --short HEAD)" > $(BUNDLE_DIR)/SUMMARY.md
	@git diff --stat origin/main...HEAD >> $(BUNDLE_DIR)/SUMMARY.md || true

.PHONY: review-frontend
review-frontend: lint test build collect
	@echo "Frontend review artifacts in $(BUNDLE_DIR)"