# Publishing to extensions.gnome.org (EGO) — Submission Guide

**Date:** 2026-02-11
**Applies to:** Workspace Shortcuts Bar extension (GNOME 45+)

---

## 1. Account Setup

1. Register an account at [extensions.gnome.org/accounts/register/](https://extensions.gnome.org/accounts/register/).
2. Confirm your email address.
3. You can then upload extensions at [extensions.gnome.org/upload/](https://extensions.gnome.org/upload/).

---

## 2. What You Upload

You upload a **single ZIP file** containing your extension. The ZIP is the entire deliverable — there is no build pipeline on EGO's side.

### 2.1 Required Files

| File | Purpose |
|------|---------|
| `metadata.json` | Extension identity, shell versions, UUID, description |
| `extension.js` | Main extension code (ESM for GNOME 45+) |

### 2.2 Optional Files

| File | Purpose |
|------|---------|
| `prefs.js` | Preferences window (GTK4/Adw). Without this, no prefs button appears. |
| `stylesheet.css` | Custom CSS for shell widgets |
| `schemas/*.gschema.xml` | GSettings schema XML |
| `schemas/gschemas.compiled` | Pre-compiled schemas (recommended to include) |
| `locale/<lang>/LC_MESSAGES/*.mo` | Compiled Gettext translations |

### 2.3 Files to Exclude

Do **not** include in the ZIP:

- Build scripts, Makefiles, `package.json`
- `.po` and `.pot` source translation files (only compiled `.mo` files)
- `.git/` directory or `.gitignore`
- `node_modules/`, test files, documentation
- Unused icons, images, or media
- Any binary executables or libraries

A reviewer may reject an extension with excessive unnecessary files.

---

## 3. metadata.json Requirements

This is the most scrutinized file. Every field must comply with EGO rules.

```json
{
    "uuid": "workspace-shortcuts-bar@<username>.github.io",
    "name": "Workspace Shortcuts Bar",
    "description": "Adds workspace buttons to the top bar with configurable keyboard shortcuts for switching between up to 10 workspaces.",
    "shell-version": ["45", "46", "47"],
    "url": "https://github.com/<username>/workspace-shortcuts-bar",
    "settings-schema": "org.gnome.shell.extensions.workspace-shortcuts-bar",
    "gettext-domain": "workspace-shortcuts-bar"
}
```

### Field Rules

| Field | Rule |
|-------|------|
| `uuid` | Format: `extension-id@namespace`. Only letters, numbers, `.`, `_`, `-`. **Must not** use `gnome.org` as namespace. Use something like `username.github.io`. |
| `name` | Must be unique — if forking another extension, must have a distinct name. |
| `description` | Reasonable length. Use `\n` for line breaks. No copyrighted/trademarked content. |
| `shell-version` | Only stable releases + at most one dev release. Must not claim future versions. Major version only for GNOME 40+ (e.g., `"45"` not `"45.0"`). |
| `url` | Must be a valid link to a git repository (GitHub/GitLab). Required for EGO. |
| `version` | **Do not set this.** EGO manages it automatically. Setting it can cause auto-upgrade/downgrade issues. |
| `version-name` | Optional, 1-16 chars, only letters/numbers/spaces/periods. Shown to users instead of the auto-incremented `version`. |
| `session-modes` | **Drop entirely** if only using `user` mode (which is our case). |
| `donations` | Optional object with keys like `github`, `kofi`, `paypal`, etc. Drop if unused. |
| `settings-schema` | Must use `org.gnome.shell.extensions` as base ID. |
| `gettext-domain` | Used for translations. Convention is to use the UUID or extension name. |

---

## 4. GSettings Schema Requirements

If your extension uses GSettings (ours does), strict rules apply:

| Requirement | Detail |
|-------------|--------|
| Schema ID prefix | Must be `org.gnome.shell.extensions.*` |
| Schema path prefix | Must be `/org/gnome/shell/extensions/*` |
| XML file included | The `.gschema.xml` source file must be in the ZIP |
| XML filename | Must match pattern `<schema-id>.gschema.xml` |
| Compiled schemas | Include `gschemas.compiled` (auto-compiled since GNOME 44, but safest to include) |

For our extension:
- Schema ID: `org.gnome.shell.extensions.workspace-shortcuts-bar`
- Schema path: `/org/gnome/shell/extensions/workspace-shortcuts-bar/`
- Filename: `schemas/org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml`

Compile with:
```bash
glib-compile-schemas schemas/
```

---

## 5. Code Review Rules

All extensions are reviewed by a human before being published. Here are the rules your code must follow:

### 5.1 Lifecycle (Critical)

These are the #1 reason extensions get rejected:

1. **Nothing before `enable()`** — Do not create objects, connect signals, or modify the shell in `constructor()` or at module scope (except static JS data structures like `Map`, `RegExp`).
2. **Everything in `enable()`** — Create widgets, connect signals, register keybindings, add main loop sources here.
3. **Full cleanup in `disable()`** — Destroy every widget, disconnect every signal, remove every keybinding, clear every main loop source, null out references.

```js
// GNOME 45+ pattern
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class MyExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        // ONLY static data here. No GObject instances, no signals.
    }

    enable() {
        // Create everything here
    }

    disable() {
        // Destroy everything here — widgets, signals, keybindings, timers
    }
}
```

### 5.2 Import Restrictions

| Process | Allowed | Forbidden |
|---------|---------|-----------|
| `extension.js` (shell) | `Clutter`, `Meta`, `St`, `Shell`, `GLib`, `Gio`, `GObject` | `Gdk`, `Gtk`, `Adw` |
| `prefs.js` (GTK) | `Gtk`, `Adw`, `GLib`, `Gio`, `GObject` | `Clutter`, `Meta`, `St`, `Shell` |

Importing GTK in the shell process or shell libraries in the prefs process will cause a **rejection**.

### 5.3 Code Quality

- Code must be **readable** — no minification, no obfuscation.
- If using TypeScript, transpiled output must be **well-formatted** (not minified).
- No deprecated modules: `ByteArray`, `Lang`, `Mainloop` are all banned.
- No excessive logging — only important messages and errors.
- Use modern JS: ES6 classes, `async`/`await`, ESM imports.
- Using a linter (ESLint) is recommended. GNOME Shell's own ESLint config is at [gitlab.gnome.org/GNOME/gnome-shell-extensions/.../lint](https://gitlab.gnome.org/GNOME/gnome-shell-extensions/tree/main/lint).

### 5.4 AI-Generated Code Policy

Extensions must **not** be AI-generated wholesale. While AI tools can be used for learning and code completions, developers must be able to explain and justify their code. Red flags that trigger rejection:

- Large amounts of unnecessary code
- Inconsistent code style
- Imaginary API usage
- Comments that look like LLM prompts

### 5.5 No External Dependencies

- No binary executables or libraries.
- No network requests (unless core to the extension's purpose).
- No telemetry or user tracking.
- Scripts must be in GJS unless absolutely necessary.
- If external modules (pip, npm) are needed, installation must require **explicit user action**.

### 5.6 Other Rules

- No `GObject.Object.run_dispose()` unless absolutely necessary (with comment explaining why).
- Clipboard access must be declared in the description.
- No privileged subprocesses unless via `pkexec` with non-user-writable executables.
- Extension must be functional — non-functional or purposeless extensions are rejected.

---

## 6. Licensing

GNOME Shell is `GPL-2.0-or-later`. Extensions are derived works and **must** be distributed under compatible terms:

- `GPL-2.0-or-later` (recommended)
- `GPL-3.0-or-later`
- Permissive licenses (MIT, BSD) are allowed but GNOME distributes under GPL-compatible terms

If your extension includes code from another extension, you **must** include attribution in the distributed files. License violations result in rejection.

### Repository Setup

- Include a `LICENSE` file with the full GPL-2.0-or-later text in the repo root. GitHub auto-detects and displays it prominently. The `LICENSE` file does not go in the EGO ZIP — it covers the source repository.
- Add `SPDX-License-Identifier: GPL-2.0-or-later` headers to all source files (`extension.js`, `prefs.js`).

### GitHub and GPL Compatibility

GitHub's Terms of Service are fully compatible with GPL-2.0-or-later:

- **No ownership claim** — GitHub does not claim ownership of repository content (ToS §D.3).
- **Fork/PR model** — Forks inherit the repository license. Contributions via PRs are licensed under the repo's license (ToS §D.6, inbound=outbound).
- **No AI training** — GitHub does not use public repo code for Copilot model training. This is the default and cannot be overridden.
- **GPL Cooperation Commitment** — GitHub has a formal commitment extending GPLv3-style cure-and-reinstatement provisions to GPLv2 violations.

---

## 7. Content Policy

- Subject to GNOME Code of Conduct.
- No copyrighted or trademarked content (brand names, logos, artwork) without express permission.
- No political statements.
- Applies to: extension name, description, text content, icons, screenshots.

---

## 8. Building the ZIP

Use the `gnome-extensions` tool to pack a clean ZIP:

```bash
cd ~/.local/share/gnome-shell/extensions/workspace-shortcuts-bar@username.github.io

# Basic pack
gnome-extensions pack .

# With translations and schemas
gnome-extensions pack \
    --podir=po \
    --schema=schemas/org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml \
    .

# With extra source files
gnome-extensions pack \
    --podir=po \
    --schema=schemas/org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml \
    --extra-source=stylesheet.css \
    .
```

This produces a file like `workspace-shortcuts-bar@username.github.io.shell-extension.zip`.

### Manual ZIP (alternative)

```bash
cd /path/to/extension/source
zip -r ../workspace-shortcuts-bar.zip \
    metadata.json \
    extension.js \
    prefs.js \
    stylesheet.css \
    schemas/
```

---

## 9. Upload Process

1. Go to [extensions.gnome.org/upload/](https://extensions.gnome.org/upload/) (must be logged in).
2. Select your ZIP file and upload.
3. The system validates `metadata.json` and basic structure immediately.
4. Your extension enters a **review queue**.
5. A human reviewer examines the code for:
   - Malicious behavior
   - Compliance with all rules above
   - Clean enable/disable lifecycle
   - Proper imports
   - Code readability
6. If approved, the extension becomes publicly available.
7. If rejected, you receive feedback and can resubmit.

### Review Timeline

Review times vary. Extensions may sit in the queue for days to weeks depending on reviewer availability. There is no SLA.

### Updating an Existing Extension

To publish an update, simply upload a new ZIP to the same upload page. EGO matches by UUID and increments the `version` field automatically. The update goes through the same review process.

---

## 10. Pre-Submission Checklist

Use this checklist before uploading:

### metadata.json
- [ ] UUID follows `id@namespace` format, no `gnome.org`
- [ ] `name` is unique and descriptive
- [ ] `description` is reasonable length, accurate
- [ ] `shell-version` lists only supported stable versions (`["45", "46", "47"]`)
- [ ] `url` points to a valid git repository
- [ ] `version` field is **not set** (let EGO manage it)
- [ ] `session-modes` is omitted (we only use `user` mode)
- [ ] `settings-schema` matches the schema ID

### Code
- [ ] `extension.js` exports ESM `Extension` subclass
- [ ] Nothing created/connected before `enable()`
- [ ] Everything cleaned up in `disable()` — widgets destroyed, signals disconnected, keybindings removed, timers cleared
- [ ] No GTK/Adw imports in `extension.js`
- [ ] No Clutter/Meta/St/Shell imports in `prefs.js`
- [ ] No deprecated modules (`Lang`, `Mainloop`, `ByteArray`)
- [ ] No excessive logging
- [ ] Code is readable, not minified/obfuscated
- [ ] No external binaries or network requests

### Schema
- [ ] Schema ID starts with `org.gnome.shell.extensions.`
- [ ] Schema path starts with `/org/gnome/shell/extensions/`
- [ ] XML file named `<schema-id>.gschema.xml`
- [ ] `gschemas.compiled` included in ZIP
- [ ] XML source file included in ZIP

### Translations (if applicable)
- [ ] Only compiled `.mo` files in `locale/` directory (not `.po`/`.pot`)
- [ ] `gettext-domain` set in `metadata.json`

### ZIP Contents
- [ ] No build scripts, `Makefile`, `package.json`
- [ ] No `.git/`, `node_modules/`, test files
- [ ] No unused images or media
- [ ] No `.po`/`.pot` files (only compiled `.mo`)
- [ ] No documentation files

### Legal
- [ ] `LICENSE` file with GPL-2.0-or-later text exists in the repo root
- [ ] `SPDX-License-Identifier: GPL-2.0-or-later` header in all source files
- [ ] License is GPL-2.0-or-later compatible
- [ ] No copyrighted/trademarked content without permission
- [ ] Attribution included for any borrowed code
- [ ] Complies with GNOME Code of Conduct

---

## 11. GitHub Actions CI

Automate pre-submission checks on every push and PR using GitHub Actions (free for public repos):

### Recommended Workflow

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint-and-pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y gnome-shell-common libglib2.0-dev-bin

      - name: Lint with ESLint
        run: npx eslint extension.js prefs.js

      - name: Check forbidden imports
        run: |
          # extension.js must not import GTK/Adw
          if grep -qE "from\s+'gi://Gtk|from\s+'gi://Adw|from\s+'gi://Gdk" extension.js; then
            echo "ERROR: extension.js contains forbidden GTK/Adw imports"
            exit 1
          fi
          # prefs.js must not import shell libraries
          if grep -qE "from\s+'gi://Clutter|from\s+'gi://Meta|from\s+'gi://St|from\s+'gi://Shell" prefs.js; then
            echo "ERROR: prefs.js contains forbidden Shell imports"
            exit 1
          fi

      - name: Compile schemas
        run: glib-compile-schemas schemas/

      - name: Pack extension
        run: |
          gnome-extensions pack \
            --schema=schemas/org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml \
            --extra-source=stylesheet.css \
            .

      - name: Upload ZIP artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-zip
          path: "*.shell-extension.zip"
```

### What This Catches

| Check | Catches |
|-------|---------|
| ESLint | Syntax errors, deprecated API usage, style violations |
| Forbidden imports | GTK in shell process, Shell libs in prefs process |
| Schema compilation | Malformed XML, invalid types, missing keys |
| Extension pack | Missing required files, metadata errors |

### GitHub Releases

Use GitHub Releases to distribute `.zip` files for manual installation alongside EGO:

1. Tag the commit (e.g., `v1.0`).
2. CI produces the ZIP as a build artifact.
3. Attach the ZIP to the GitHub Release.
4. Upload the same ZIP to EGO.

This ensures the EGO submission and the GitHub release are built from the exact same source.

---

## 12. Getting Help

If you need assistance with submission or review:

- **Matrix:** [#extensions:gnome.org](https://matrix.to/#/#extensions:gnome.org)
- **Discourse:** [discourse.gnome.org](https://discourse.gnome.org/) with the `extensions` tag
- **StackOverflow:** Tags `gnome-shell-extensions` and/or `gjs`

---

## Appendix: ZIP Structure Reference

Final ZIP should look like this:

```
workspace-shortcuts-bar@username.github.io.shell-extension.zip
├── metadata.json
├── extension.js
├── prefs.js
├── stylesheet.css
└── schemas/
    ├── org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml
    └── gschemas.compiled
```

With translations (future):

```
workspace-shortcuts-bar@username.github.io.shell-extension.zip
├── metadata.json
├── extension.js
├── prefs.js
├── stylesheet.css
├── schemas/
│   ├── org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml
│   └── gschemas.compiled
└── locale/
    ├── de/
    │   └── LC_MESSAGES/
    │       └── workspace-shortcuts-bar.mo
    └── fr/
        └── LC_MESSAGES/
            └── workspace-shortcuts-bar.mo
```
