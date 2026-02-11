# Workspace Shortcuts Bar — Testing Plan

**Date:** 2026-02-11
**Applies to:** Workspace Shortcuts Bar extension (GNOME 45+)

---

## 1. Testing Landscape for GNOME Shell Extensions

GNOME Shell extensions operate in a uniquely constrained testing environment. The core extension APIs (`St`, `Clutter`, `Meta`, `Shell`, `Main`) only exist inside the `gnome-shell` compositor process and cannot be imported or exercised outside of it. This means:

- Standard JS test runners (Jest, Vitest, Mocha) **cannot run extension code** — GJS uses SpiderMonkey (not V8/Node), and shell-only APIs are compiled into the gnome-shell binary.
- No popular GNOME Shell extension has automated UI or integration tests — not even Dash to Dock (4.2k stars), Blur My Shell, or Space Bar.
- The only extension with real test infrastructure is **GSConnect**, which tests its protocol/service layer (pure GLib/Gio code), not its UI.

Our testing strategy is designed around these constraints, focusing investment where automated testing is possible and defining a rigorous manual process for what isn't.

---

## 2. Testing Tiers

### Tier 1 — Automated Static Analysis (CI)

These run on every push and PR via GitHub Actions. They catch the majority of real bugs in GNOME Shell extensions.

| Check | Tool | What It Catches |
|-------|------|----------------|
| Lint | ESLint with GNOME Shell rules | Syntax errors, deprecated API usage, style violations, unused variables |
| Forbidden imports | `grep` in CI | GTK/Adw in `extension.js`, Clutter/Meta/St/Shell in `prefs.js` |
| Schema validation | `glib-compile-schemas --strict` | Malformed XML, invalid types, duplicate keys, missing defaults |
| Pack verification | `gnome-extensions pack` | Missing required files, malformed `metadata.json` |

### Tier 2 — Automated Unit Tests (CI)

Unit tests for pure logic extracted from the extension, run with `jasmine-gjs` under the GJS runtime.

**What is testable:**

| Module | Testable Functions |
|--------|--------------------|
| Shortcut key handling | Accelerator string parsing/validation, default keybinding generation |
| Workspace label formatting | Name-with-fallback logic (workspace name → numeric index) |
| Settings validation | `max-shortcuts` bounds clamping, `bar-position` enum validation |
| Index safety | Out-of-range workspace index guard logic |

**What is NOT testable in unit tests:**

| Area | Why |
|------|-----|
| Bar rendering (`St.BoxLayout`, `St.Button`) | Requires running Clutter stage / compositor |
| Keybinding registration (`Main.wm.addKeybinding`) | Only exists inside `gnome-shell` process |
| Workspace switching (`global.workspace_manager`) | Only exists inside `gnome-shell` process |
| Panel insertion (`Main.panel`) | Only exists inside `gnome-shell` process |
| Signal connection/cleanup on real GObjects | Shell GObjects can't be instantiated outside the shell |

### Tier 3 — Manual Testing (Developer)

Interactive testing in a nested GNOME Shell session. This is the only way to verify UI rendering, keybindings, and workspace switching.

### Tier 4 — Manual Pre-Submission Review

Line-by-line code review before EGO upload, focused on lifecycle correctness and API validity.

---

## 3. Tier 1: Static Analysis Setup

### ESLint Configuration

Use GNOME Shell's own ESLint rules from [gitlab.gnome.org/GNOME/gnome-shell-extensions/.../lint](https://gitlab.gnome.org/GNOME/gnome-shell-extensions/tree/main/lint).

```yaml
# .eslintrc.yml
env:
  es2022: true

parserOptions:
  ecmaVersion: 2022
  sourceType: module

globals:
  global: readonly
  log: readonly
  logError: readonly
  console: readonly
  ARGV: readonly
  imports: readonly

rules:
  # Core rules
  no-unused-vars: [error, { argsIgnorePattern: "^_" }]
  no-undef: error
  semi: [error, always]
  indent: [error, 4]
  no-trailing-spaces: error
  eol-last: error

  # GNOME Shell specific
  no-restricted-imports:
    - error
    - paths: []
      patterns:
        - group: ["gi://Gtk*", "gi://Gdk*", "gi://Adw*"]
          message: "GTK/Adw imports are forbidden in extension.js (shell process)"
```

A separate `.eslintrc.prefs.yml` for `prefs.js` would invert the forbidden imports (block `gi://Clutter`, `gi://Meta`, `gi://St`, `gi://Shell`).

### Schema Validation

```bash
glib-compile-schemas --strict schemas/
```

The `--strict` flag causes warnings to be treated as errors, catching issues like missing summary/description elements.

### CI Workflow

The full CI workflow is defined in `docs/plans/2026-02-11-ego-submission-guide.md` §11. The lint and validation steps run on every push/PR.

---

## 4. Tier 2: Unit Tests with jasmine-gjs

### Framework

[jasmine-gjs](https://github.com/ptomato/jasmine-gjs) — the Jasmine BDD framework ported to GJS. Used by GNOME Shell itself for its own unit tests.

- Install: available as a system package (`jasmine-gjs`) or as a Meson subproject
- Run: `jasmine --tap tests/`
- Output: TAP format for CI integration

### Project Structure

```
workspace-shortcuts-bar/
├── tests/
│   ├── unit/
│   │   ├── shortcutKeys.test.js
│   │   ├── workspaceLabels.test.js
│   │   ├── settingsValidation.test.js
│   │   └── indexSafety.test.js
│   └── jasmine.json              # Jasmine config
├── lib/
│   ├── shortcutKeys.js           # Pure logic extracted from extension.js
│   ├── workspaceLabels.js
│   └── settingsValidation.js
...
```

The key principle: **extract pure logic into separate modules** under `lib/` that have no shell-only imports. These modules are imported by both `extension.js` and the test suite.

### Example Test Specs

#### `tests/unit/shortcutKeys.test.js`

```js
import { buildDefaultShortcuts, isValidAccelerator } from '../../lib/shortcutKeys.js';

describe('shortcutKeys', () => {
    describe('buildDefaultShortcuts', () => {
        it('generates Super+1 through Super+9, Super+0', () => {
            const shortcuts = buildDefaultShortcuts(10);
            expect(shortcuts[0]).toBe('<Super>1');
            expect(shortcuts[8]).toBe('<Super>9');
            expect(shortcuts[9]).toBe('<Super>0');
        });

        it('respects max count', () => {
            const shortcuts = buildDefaultShortcuts(4);
            expect(shortcuts.length).toBe(4);
        });
    });

    describe('isValidAccelerator', () => {
        it('accepts valid accelerators', () => {
            expect(isValidAccelerator('<Super>1')).toBe(true);
            expect(isValidAccelerator('<Control><Alt>t')).toBe(true);
        });

        it('rejects empty strings', () => {
            expect(isValidAccelerator('')).toBe(false);
        });
    });
});
```

#### `tests/unit/workspaceLabels.test.js`

```js
import { formatWorkspaceLabel } from '../../lib/workspaceLabels.js';

describe('formatWorkspaceLabel', () => {
    it('returns workspace name when set', () => {
        expect(formatWorkspaceLabel(0, 'Browser')).toBe('Browser');
    });

    it('falls back to 1-based index when name is empty', () => {
        expect(formatWorkspaceLabel(0, '')).toBe('1');
        expect(formatWorkspaceLabel(3, '')).toBe('4');
    });

    it('falls back to index when name is null', () => {
        expect(formatWorkspaceLabel(0, null)).toBe('1');
    });
});
```

#### `tests/unit/settingsValidation.test.js`

```js
import { clampMaxShortcuts, isValidBarPosition } from '../../lib/settingsValidation.js';

describe('settingsValidation', () => {
    describe('clampMaxShortcuts', () => {
        it('clamps below minimum to 1', () => {
            expect(clampMaxShortcuts(0)).toBe(1);
            expect(clampMaxShortcuts(-5)).toBe(1);
        });

        it('clamps above maximum to 10', () => {
            expect(clampMaxShortcuts(25)).toBe(10);
        });

        it('passes through valid values', () => {
            expect(clampMaxShortcuts(5)).toBe(5);
        });
    });

    describe('isValidBarPosition', () => {
        it('accepts valid positions', () => {
            expect(isValidBarPosition('left')).toBe(true);
            expect(isValidBarPosition('center')).toBe(true);
            expect(isValidBarPosition('right')).toBe(true);
        });

        it('rejects invalid positions', () => {
            expect(isValidBarPosition('top')).toBe(false);
            expect(isValidBarPosition('')).toBe(false);
        });
    });
});
```

#### `tests/unit/indexSafety.test.js`

```js
import { isWorkspaceIndexInRange } from '../../lib/indexSafety.js';

describe('isWorkspaceIndexInRange', () => {
    it('returns true for valid indices', () => {
        expect(isWorkspaceIndexInRange(0, 4)).toBe(true);
        expect(isWorkspaceIndexInRange(3, 4)).toBe(true);
    });

    it('returns false for out-of-range indices', () => {
        expect(isWorkspaceIndexInRange(4, 4)).toBe(false);
        expect(isWorkspaceIndexInRange(9, 4)).toBe(false);
    });

    it('returns false for negative indices', () => {
        expect(isWorkspaceIndexInRange(-1, 4)).toBe(false);
    });

    it('returns false when workspace count is zero', () => {
        expect(isWorkspaceIndexInRange(0, 0)).toBe(false);
    });
});
```

### Running Tests

```bash
# Run all unit tests
jasmine --tap tests/unit/

# In CI (GitHub Actions)
- name: Run unit tests
  run: jasmine --tap tests/unit/
```

### CI Integration

Add to the existing GitHub Actions workflow:

```yaml
- name: Install jasmine-gjs
  run: sudo apt-get install -y jasmine-gjs

- name: Run unit tests
  run: jasmine --tap tests/unit/
```

---

## 5. Tier 3: Manual Testing

Manual testing is the only way to verify UI rendering, keybindings, and workspace switching. Use a nested GNOME Shell session for safe, repeatable testing without disrupting the host desktop.

### Environment Setup

```bash
# GNOME 49+
dbus-run-session gnome-shell --devkit --wayland

# GNOME 45-48
dbus-run-session gnome-shell --nested --wayland
```

This opens a GNOME Shell instance in a window. Install and enable the extension inside it.

### Manual Test Matrix

Run each scenario in both static and dynamic workspace modes.

#### Bar Rendering

| # | Test | Steps | Expected |
|---|------|-------|----------|
| M-1 | Bar appears on enable | Enable extension | Workspace buttons appear in top panel |
| M-2 | Bar removed on disable | Disable extension | Buttons disappear, no visual artifacts |
| M-3 | Correct button count (static) | Set 6 static workspaces, enable | 6 buttons shown |
| M-4 | Correct button count (dynamic) | Enable with dynamic workspaces | Buttons match current workspace count |
| M-5 | Workspace names displayed | Set workspace name via `wmctrl` or Settings | Button label shows the name |
| M-6 | Numeric fallback | Clear workspace name | Button label shows numeric index (1-based) |
| M-7 | Empty workspaces dimmed | Leave a workspace with no windows | That button appears dimmed/reduced opacity |
| M-8 | Bar position: left | Set position to left in prefs | Bar appears in left panel area |
| M-9 | Bar position: center | Set position to center | Bar appears in center panel area |
| M-10 | Bar position: right | Set position to right | Bar appears in right panel area |

#### Active Workspace Indication

| # | Test | Steps | Expected |
|---|------|-------|----------|
| M-11 | Highlight style | Switch workspace | Active button has highlight background |
| M-12 | Style follows switching | Switch workspaces rapidly | Highlight follows without delay or flicker |

#### Click Interaction

| # | Test | Steps | Expected |
|---|------|-------|----------|
| M-15 | Click to switch | Click workspace button 3 | Workspace 3 activates |
| M-16 | Click current workspace | Click the already-active workspace button | No-op (no error, no flicker) |

#### Keybindings

| # | Test | Steps | Expected |
|---|------|-------|----------|
| M-17 | Default shortcuts | Press `<Super>1` through `<Super>4` | Switches to workspace 1-4 |
| M-18 | Super+0 | Press `<Super>0` | Switches to workspace 10 (or no-op if < 10 workspaces) |
| M-19 | Out-of-range | Press `<Super>8` with only 4 workspaces | No-op, no error in log |
| M-20 | Custom shortcut | Change workspace 1 shortcut to `<Control><Alt>1` in prefs | New shortcut works, old one does not |
| M-21 | Shortcut override | Default `<Super>1` overrides GNOME's built-in | Extension shortcut takes precedence |
| M-22 | Restore on disable | Disable extension, press `<Super>1` | GNOME's default behavior restored |

#### Preferences Window

| # | Test | Steps | Expected |
|---|------|-------|----------|
| M-23 | Prefs open | Run `gnome-extensions prefs <uuid>` | Preferences window appears |
| M-24 | Shortcut labels | View prefs | Current shortcut displayed for each workspace |
| M-25 | Change shortcut | Click "Change...", press new key combo, click "Set" | Shortcut label updates, new binding active |
| M-26 | Cancel shortcut | Click "Change...", press Escape | Original shortcut preserved |
| M-27 | Max shortcuts (dynamic) | Change max-shortcuts spin button | Number of visible shortcut rows changes |
| M-28 | Position selector | Change bar position dropdown | Bar moves in panel |

#### Lifecycle & Stability

| # | Test | Steps | Expected |
|---|------|-------|----------|
| M-30 | Enable/disable cycle | Enable, use extension, disable, re-enable | Clean state, no errors in log |
| M-31 | Rapid toggle | Enable/disable 5 times quickly | No crashes, no orphaned widgets |
| M-32 | Dynamic workspace add | Add a workspace while extension is active | New button appears in bar |
| M-33 | Dynamic workspace remove | Remove a workspace while extension is active | Button removed from bar, no crash |
| M-34 | Lock screen | Lock screen, unlock | Extension resumes cleanly (disable/enable cycle) |
| M-35 | No log spam | Use extension normally for 5 minutes | `journalctl` shows no excessive output from extension |

### Checking Logs

```bash
# Monitor shell logs during testing
journalctl -f -o cat /usr/bin/gnome-shell

# Check for extension-specific errors
journalctl -o cat /usr/bin/gnome-shell | grep -i "workspace-shortcuts"
```

---

## 6. Tier 4: Pre-Submission Review

A manual code-level review before uploading to EGO. This checklist is specifically focused on the patterns that cause EGO rejection.

### Lifecycle Audit

For every object created in `enable()`, verify it is cleaned up in `disable()`:

| Created in `enable()` | Cleanup in `disable()` | Verified |
|----------------------|----------------------|----------|
| `this._settings = this.getSettings()` | `this._settings = null` | [ ] |
| `this._bar = new St.BoxLayout(...)` | `this._bar.destroy(); this._bar = null` | [ ] |
| Each `St.Button` in the bar | Destroyed when bar is destroyed (child widgets) | [ ] |
| `Main.wm.addKeybinding('switch-to-workspace-N', ...)` | `Main.wm.removeKeybinding('switch-to-workspace-N')` for each | [ ] |
| `this._settings.connect('changed::*', ...)` | `this._settings.disconnect(handlerId)` for each | [ ] |
| `global.workspace_manager.connect('workspace-added', ...)` | `global.workspace_manager.disconnect(handlerId)` | [ ] |
| `global.workspace_manager.connect('workspace-removed', ...)` | `global.workspace_manager.disconnect(handlerId)` | [ ] |
| `global.workspace_manager.connect('workspace-switched', ...)` | `global.workspace_manager.disconnect(handlerId)` | [ ] |
| Panel insertion (`Main.panel._leftBox.add_child(...)`) | `Main.panel._leftBox.remove_child(...)` or widget destroy | [ ] |

### API Verification

Cross-reference every import and API call against [gjs-docs.gnome.org](https://gjs-docs.gnome.org):

| API Call | Exists in GNOME 45? | Exists in GNOME 47? | Verified |
|----------|---------------------|---------------------|----------|
| `Main.wm.addKeybinding()` | | | [ ] |
| `Main.wm.removeKeybinding()` | | | [ ] |
| `global.workspace_manager.get_workspace_by_index()` | | | [ ] |
| `global.workspace_manager.get_n_workspaces()` | | | [ ] |
| `workspace.activate()` | | | [ ] |
| `global.get_current_time()` | | | [ ] |
| `Meta.KeyBindingFlags.NONE` | | | [ ] |
| `Shell.ActionMode.NORMAL` | | | [ ] |
| `Shell.ActionMode.OVERVIEW` | | | [ ] |

### Code Quality Checklist

- [ ] No dead code or unused imports
- [ ] No comments that read like AI prompts
- [ ] Consistent code style (indentation, semicolons, naming)
- [ ] No deprecated modules (`Lang`, `Mainloop`, `ByteArray`)
- [ ] Logging is minimal (errors and significant state only)
- [ ] Every function and variable serves a clear purpose
- [ ] No unnecessary null checks or defensive patterns
- [ ] ESLint passes with zero warnings

---

## 7. Test Infrastructure in CI

### Complete GitHub Actions Workflow (Testing)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint extension.js
        run: npx eslint extension.js
      - name: Lint prefs.js
        run: npx eslint -c .eslintrc.prefs.yml prefs.js
      - name: Lint lib/
        run: npx eslint lib/

  forbidden-imports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check extension.js for forbidden imports
        run: |
          if grep -qE "from\s+'gi://Gtk|from\s+'gi://Adw|from\s+'gi://Gdk" extension.js; then
            echo "ERROR: extension.js contains forbidden GTK/Adw/Gdk imports"
            exit 1
          fi
      - name: Check prefs.js for forbidden imports
        run: |
          if grep -qE "from\s+'gi://Clutter|from\s+'gi://Meta|from\s+'gi://St|from\s+'gi://Shell" prefs.js; then
            echo "ERROR: prefs.js contains forbidden Shell imports"
            exit 1
          fi

  schema:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install glib tools
        run: sudo apt-get update && sudo apt-get install -y libglib2.0-dev-bin
      - name: Compile schemas (strict)
        run: glib-compile-schemas --strict schemas/

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install jasmine-gjs
        run: sudo apt-get update && sudo apt-get install -y jasmine-gjs
      - name: Run unit tests
        run: jasmine --tap tests/unit/

  pack:
    runs-on: ubuntu-latest
    needs: [lint, forbidden-imports, schema, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - name: Install gnome-shell tools
        run: sudo apt-get update && sudo apt-get install -y gnome-shell-common libglib2.0-dev-bin
      - name: Compile schemas
        run: glib-compile-schemas schemas/
      - name: Pack extension
        run: |
          gnome-extensions pack \
            --schema=schemas/org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml \
            --extra-source=stylesheet.css \
            --extra-source=lib/ \
            .
      - name: Upload ZIP artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-zip
          path: "*.shell-extension.zip"
```

---

## 8. What Cannot Be Automated

For transparency, these areas require human testing and cannot be covered by CI:

| Area | Why |
|------|-----|
| Visual correctness | Requires eyes on rendered UI in a compositor |
| Keybinding behavior | Requires a running shell process with input handling |
| Workspace switching | `global.workspace_manager` only exists in the shell process |
| Panel widget rendering | `St.Widget` / `Clutter.Actor` require a Clutter stage |
| Theme compatibility | Requires visual inspection with different shell themes |
| Multi-workspace interaction | Requires a real window manager managing real windows |
| Lock screen behavior | Requires a real session with screen locking |

This is consistent with the broader GNOME Shell extension ecosystem — no popular extension has automated UI tests. The platform architecture makes it fundamentally impractical.

---

## 9. Testing Workflow Summary

```
Developer writes code
        │
        ▼
┌─────────────────────────┐
│  Push / PR to GitHub    │
│                         │
│  CI runs automatically: │
│  ├─ ESLint              │
│  ├─ Forbidden imports   │
│  ├─ Schema validation   │
│  ├─ Unit tests          │
│  └─ Extension pack      │
└───────────┬─────────────┘
            │ all pass
            ▼
┌─────────────────────────┐
│  Manual testing         │
│                         │
│  Nested GNOME Shell:    │
│  ├─ Bar rendering       │
│  ├─ Click interaction   │
│  ├─ Keybinding behavior │
│  ├─ Preferences window  │
│  └─ Enable/disable      │
└───────────┬─────────────┘
            │ all pass
            ▼
┌─────────────────────────┐
│  Pre-submission review  │
│                         │
│  ├─ Lifecycle audit     │
│  ├─ API verification    │
│  └─ Code quality check  │
└───────────┬─────────────┘
            │ all pass
            ▼
      Upload to EGO
```
