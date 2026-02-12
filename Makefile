UUID = workspace-shortcuts-bar@christian-schulze.github.io
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
REPO_DIR = $(CURDIR)

.PHONY: help install uninstall enable disable restart nested lint test schemas validate-schemas pack check

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: schemas ## Symlink repo into GNOME Shell extensions directory
	@if [ -L "$(INSTALL_DIR)" ]; then \
		echo "Symlink already exists: $(INSTALL_DIR)"; \
	elif [ -e "$(INSTALL_DIR)" ]; then \
		echo "Error: $(INSTALL_DIR) exists and is not a symlink"; exit 1; \
	else \
		ln -s "$(REPO_DIR)" "$(INSTALL_DIR)"; \
		echo "Installed: $(INSTALL_DIR) -> $(REPO_DIR)"; \
	fi

uninstall: ## Remove symlink from GNOME Shell extensions directory
	@if [ -L "$(INSTALL_DIR)" ]; then \
		rm "$(INSTALL_DIR)"; \
		echo "Removed symlink: $(INSTALL_DIR)"; \
	elif [ -e "$(INSTALL_DIR)" ]; then \
		echo "Error: $(INSTALL_DIR) is not a symlink, refusing to remove"; exit 1; \
	else \
		echo "Nothing to remove: $(INSTALL_DIR) does not exist"; \
	fi

enable: ## Enable the extension
	gnome-extensions enable $(UUID)

disable: ## Disable the extension
	gnome-extensions disable $(UUID)

restart: ## Disable and re-enable the extension
	gnome-extensions disable $(UUID) && gnome-extensions enable $(UUID)

nested: ## Launch a nested GNOME Shell session (GNOME 49+ requires mutter-devkit)
	dbus-run-session gnome-shell --devkit --wayland

lint: ## Run ESLint on all source files
	npx eslint extension.js prefs.js lib/

test: ## Run unit tests
	npx jasmine --config=tests/jasmine.json

schemas: ## Compile GSettings schemas
	glib-compile-schemas schemas/

validate-schemas: ## Validate GSettings schemas (strict mode)
	glib-compile-schemas --strict schemas/

pack: schemas ## Build extension ZIP for distribution
	gnome-extensions pack \
		--schema=schemas/org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml \
		--extra-source=stylesheet.css \
		--extra-source=lib/ \
		.
	zip $(UUID).shell-extension.zip schemas/gschemas.compiled
	@echo "Built: $(UUID).shell-extension.zip"

check: lint validate-schemas test ## Run all checks (lint, schema validation, tests)
	@echo "All checks passed"
