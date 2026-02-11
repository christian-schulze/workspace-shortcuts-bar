# Workspace Shortcuts Bar — Product Requirements Document

**Date:** 2026-02-11
**Status:** Draft
**Version:** 1.0

---

## 1. Overview

Workspace Shortcuts Bar is a GNOME Shell extension that adds a row of workspace buttons to the top bar and provides configurable global keyboard shortcuts (`<Super>1` through `<Super>0` by default) for switching between up to 10 workspaces. It targets GNOME 45+ (ESM module format) and ships with a GTK4/libadwaita preferences UI for full shortcut customization.

### 1.1 Problem Statement

GNOME Shell's built-in workspace shortcuts only cover the first 4 workspaces and offer no visual workspace indicator in the top bar by default. Users who work with 5+ workspaces must rely on the overview or third-party tools, and there is no native way to rebind per-workspace shortcuts beyond the first four.

### 1.2 Goals

- Provide a clickable workspace bar in the top panel with clear active-workspace indication.
- Register configurable keybindings for switching to workspaces 1–10.
- Support both static and dynamic GNOME workspace modes seamlessly.
- Deliver a polished GTK4/libadwaita preferences UI for shortcut editing and bar configuration.
- Keep the codebase minimal, maintainable, and free of legacy compatibility shims (GNOME 45+ only).
- Ensure all code passes EGO human review — verified API usage, consistent style, no artifacts of AI-assisted development.

### 1.3 Non-Goals (v1)

- Move-window-to-workspace keybindings (planned for v2).
- Scroll-to-cycle-workspaces on the bar.
- Drag-and-drop workspace reordering.
- Multi-monitor workspace indicators (one bar, follows primary panel).

---

## 2. User Stories

### 2.1 Core

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-1 | Power user | See labeled workspace buttons in the top bar | I know which workspace I'm on at a glance |
| US-2 | Power user | Press `<Super>1`–`<Super>0` to jump to a workspace | I can switch workspaces without the overview |
| US-3 | User | Click a workspace button to switch to it | I can switch with the mouse when preferred |
| US-4 | User | Customize which key combinations map to which workspace | I can adapt shortcuts to my workflow |
| US-5 | User | Choose where the bar appears in the top panel | It fits my panel layout preferences |

### 2.2 Context Menu

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-13 | User | Right-click the workspace bar to access a context menu | I can quickly reach settings without navigating GNOME's extension manager |

### 2.3 Preferences

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-6 | User | Open a capture dialog to set a new shortcut | I don't have to type accelerator strings manually |
| US-7 | User | See the current shortcut for each workspace at a glance | I can verify my configuration |
| US-8 | Dynamic-workspace user | Set the max number of shortcut slots | I control how many bindings are registered |
### 2.3 Edge Cases

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-10 | User | Have the extension gracefully no-op for out-of-range workspaces | Nothing breaks if I press `<Super>8` with only 4 workspaces |
| US-11 | User | See empty workspaces dimmed but still visible | I maintain spatial awareness in dynamic mode |
| US-12 | User | Have my GNOME defaults restored when disabling | No lingering keybinding side-effects |

---

## 3. Functional Requirements

### 3.1 Workspace Bar

| ID | Requirement | Priority |
|----|------------|----------|
| FR-1 | Render a button for each workspace in the top bar. | P0 |
| FR-2 | Button labels display GNOME workspace names when set, falling back to numeric index (1-based). | P0 |
| FR-3 | Active workspace button is visually distinct (see §6 Visual Design). | P0 |
| FR-4 | Empty workspaces (no windows) are dimmed but still displayed. | P1 |
| FR-5 | Clicking a button activates that workspace. | P0 |
| FR-6 | Bar position in the panel is user-configurable (left, center, right). | P1 |
| FR-7 | Bar updates in real time when workspaces are added, removed, renamed, or reordered. | P0 |
| FR-23 | Right-clicking the bar opens a context menu with a "Preferences" item that opens the extension's settings window. | P1 |

### 3.2 Keybindings

| ID | Requirement | Priority |
|----|------------|----------|
| FR-8 | Register up to 10 keybindings (`switch-to-workspace-1` through `switch-to-workspace-10`). | P0 |
| FR-9 | Default bindings: `<Super>1` through `<Super>9`, `<Super>0` for workspace 10. | P0 |
| FR-10 | Bindings are stored in GSettings and configurable via the preferences UI. | P0 |
| FR-11 | A `max-shortcuts` setting (integer, default 10) controls how many bindings are registered. | P1 |
| FR-12 | Out-of-range workspace indices are silently ignored (no error, no-op). | P0 |
| FR-13 | Keybindings silently override any conflicting GNOME defaults; originals are restored on disable. | P0 |
| FR-14 | All bindings are registered on `enable()` and cleanly removed on `disable()`. | P0 |

### 3.3 Preferences UI

| ID | Requirement | Priority |
|----|------------|----------|
| FR-15 | Preferences window uses GTK4 and libadwaita widgets. | P0 |
| FR-16 | Show one row per workspace with a `Gtk.ShortcutLabel` displaying the current binding. | P0 |
| FR-17 | Each row has a "Change..." button that opens a key-capture dialog. | P0 |
| FR-18 | Key-capture dialog: modal, shows hint text, previews captured accelerator, allows cancel or set. | P0 |
| FR-19 | Detect dynamic vs static workspace mode and adapt row count accordingly. | P1 |
| FR-20 | In dynamic mode, show a `max-shortcuts` spin button (range 1–20). | P1 |
| FR-21 | Bar position selector (left / center / right). | P1 |


---

## 4. Technical Architecture

### 4.1 Project Structure

```
workspace-shortcuts-bar/
├── metadata.json              # Extension metadata (uuid, shell-version, etc.)
├── extension.js               # Main extension entry point (ESM)
├── prefs.js                   # Preferences entry point (ESM)
├── stylesheet.css             # Extension styling
├── LICENSE                    # GPL-2.0-or-later full text
├── .eslintrc.yml              # GNOME Shell lint rules
├── .github/
│   └── workflows/
│       └── ci.yml             # Lint + pack validation
├── schemas/
│   ├── org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml
│   └── gschemas.compiled      # Compiled schema (generated)
└── docs/
    └── plans/
        └── *.md
```

### 4.2 Extension Identity

| Field | Value |
|-------|-------|
| UUID | `workspace-shortcuts-bar@<tbd-username>.github.io` |
| Schema ID | `org.gnome.shell.extensions.workspace-shortcuts-bar` |
| Shell versions | `["45", "46", "47"]` |
| GJS format | ESM (`"imports"` field in metadata.json not needed for 45+) |

### 4.3 GSettings Schema

```xml
<schemalist>
  <schema id="org.gnome.shell.extensions.workspace-shortcuts-bar"
          path="/org/gnome/shell/extensions/workspace-shortcuts-bar/">

    <!-- Keybindings -->
    <key name="switch-to-workspace-1" type="s"><default>'&lt;Super&gt;1'</default></key>
    <key name="switch-to-workspace-2" type="s"><default>'&lt;Super&gt;2'</default></key>
    <key name="switch-to-workspace-3" type="s"><default>'&lt;Super&gt;3'</default></key>
    <key name="switch-to-workspace-4" type="s"><default>'&lt;Super&gt;4'</default></key>
    <key name="switch-to-workspace-5" type="s"><default>'&lt;Super&gt;5'</default></key>
    <key name="switch-to-workspace-6" type="s"><default>'&lt;Super&gt;6'</default></key>
    <key name="switch-to-workspace-7" type="s"><default>'&lt;Super&gt;7'</default></key>
    <key name="switch-to-workspace-8" type="s"><default>'&lt;Super&gt;8'</default></key>
    <key name="switch-to-workspace-9" type="s"><default>'&lt;Super&gt;9'</default></key>
    <key name="switch-to-workspace-10" type="s"><default>'&lt;Super&gt;0'</default></key>

    <!-- Configuration -->
    <key name="max-shortcuts" type="i"><default>10</default></key>
    <key name="bar-position" type="s"><default>'left'</default></key>

  </schema>
</schemalist>
```

### 4.4 Key Modules

#### `extension.js` — Main Extension

**Responsibilities:**

1. **Bar Rendering** — Create a `St.BoxLayout` container with `St.Button` children, one per workspace. Insert into the top panel at the user-configured position. Listen on `workspace-added`, `workspace-removed`, `workspace-switched`, and `active-workspace-changed` signals to rebuild/update buttons.

2. **Keybinding Registration** — On `enable()`, iterate `switch-to-workspace-1..N` keys (where N = `max-shortcuts`), call `Main.wm.addKeybinding()` for each. The handler calls `global.workspace_manager.get_workspace_by_index(i).activate(global.get_current_time())`, guarding against out-of-range indices.

3. **Cleanup** — On `disable()`, remove all keybindings via `Main.wm.removeKeybinding()`, destroy the bar widget, disconnect all signals.

4. **Settings Monitoring** — Connect to GSettings `changed` signals to react to preference changes at runtime (bar position, max-shortcuts, individual shortcut changes).

#### `prefs.js` — Preferences Window

**Responsibilities:**

1. **Workspace Detection** — Read `org.gnome.mutter` → `dynamic-workspaces` and `org.gnome.desktop.wm.preferences` → `num-workspaces` to determine row count (since prefs cannot access `global.workspace_manager`).

2. **Shortcut Rows** — Render an `Adw.PreferencesGroup` with one `Adw.ActionRow` per workspace, each containing a `Gtk.ShortcutLabel` and a "Change..." button.

3. **Key Capture Dialog** — Modal `Adw.Window` with a `Gtk.EventControllerKey` that captures the next keypress, previews the accelerator, and writes to GSettings on confirm.

4. **Configuration Controls** — Bar position selector, max-shortcuts spin button (dynamic mode only).

### 4.5 Signal Flow

```
User presses <Super>3
  → GNOME Shell dispatches to registered keybinding handler
  → Handler: workspace_manager.get_workspace_by_index(2).activate()
  → workspace-switched signal fires
  → Bar updates: old button loses active class, new button gains it

User clicks workspace button 5
  → Button click handler: workspace_manager.get_workspace_by_index(4).activate()
  → Same signal flow as above

Workspace added/removed (dynamic mode)
  → workspace-added / workspace-removed signal
  → Bar rebuilds button list
  → Empty workspaces get dimmed CSS class
```

---

## 5. Keybinding System

### 5.1 Registration

Keybindings are registered using `Main.wm.addKeybinding()`:

```js
Main.wm.addKeybinding(
  'switch-to-workspace-N',    // GSettings key name
  this._settings,              // Gio.Settings instance
  Meta.KeyBindingFlags.NONE,
  Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
  handler
);
```

### 5.2 Conflict Resolution

The extension silently overrides any existing GNOME shortcuts on the same key combination. When the extension is disabled, `removeKeybinding()` releases the binding, and GNOME's defaults take effect again. No explicit save/restore of prior bindings is needed — GNOME's keybinding system handles precedence natively.

### 5.3 Handler Safety

```
function switchToWorkspace(index):
  workspaceCount = global.workspace_manager.get_n_workspaces()
  if index >= workspaceCount:
    return  // no-op, no error
  workspace = global.workspace_manager.get_workspace_by_index(index)
  workspace.activate(global.get_current_time())
```

---

## 6. Visual Design & Styling

### 6.1 Button States

| State | Visual Treatment |
|-------|-----------------|
| Active (current workspace) | Brighter highlight background (CSS class `.workspace-button-active-highlight`) |
| Occupied (has windows, not active) | Subtle highlight background (CSS class `.workspace-button-occupied`) |
| Empty (no windows) | Reduced opacity (e.g., `opacity: 0.5`) |
| Hover | Standard GNOME panel button hover effect |

### 6.2 Active Workspace Style

Three-tier visual hierarchy for workspace buttons:

1. **Active** — Brighter semi-transparent white background (`rgba(255, 255, 255, 0.20)`)
2. **Occupied** — Subtle semi-transparent white background (`rgba(255, 255, 255, 0.08)`)
3. **Empty** — Dimmed text via reduced opacity (`opacity: 0.5`)

### 6.3 CSS Classes

```css
.workspace-shortcuts-bar { }              /* Container */
.workspace-button { }                     /* All buttons (with border-radius) */
.workspace-button-active-highlight { }    /* Active workspace (brighter highlight) */
.workspace-button-occupied { }            /* Occupied workspace (subtle highlight) */
.workspace-button-empty { }              /* Empty workspace (dimmed) */
```

### 6.4 Theme Compatibility

All colors should use GNOME Shell CSS variables or relative opacity adjustments rather than hardcoded colors, ensuring compatibility with light/dark themes and third-party shell themes.

---

## 7. Distribution & Compatibility

### 7.1 Target Platform

| Attribute | Value |
|-----------|-------|
| GNOME Shell | 45, 46, 47 |
| GJS Module Format | ESM |
| GTK Version (prefs) | GTK4 |
| UI Library (prefs) | libadwaita (Adw) |

### 7.2 Source Repository

The extension source is hosted on GitHub. GitHub's Terms of Service are compatible with GPL-2.0-or-later:

- GitHub does not claim ownership of repository content (ToS §D.3).
- The fork/PR model is compatible with GPL — forks inherit the license, and contributions are licensed inbound=outbound under the repo's license (ToS §D.6).
- GitHub does not use public repository code for Copilot model training (opt-out is the default and cannot be overridden).
- GitHub has a formal GPL Cooperation Commitment extending GPLv3-style cure provisions to GPLv2.

### 7.3 Distribution Channels

1. **Primary:** [extensions.gnome.org](https://extensions.gnome.org) (EGO) — requires passing EGO review.
2. **Source & Releases:** GitHub repository — includes installation instructions for manual install. GitHub Releases used to host `.zip` artifacts for each version.

### 7.4 EGO Compliance

The extension must pass human code review on extensions.gnome.org. The full review guidelines are documented in `docs/plans/2026-02-11-ego-submission-guide.md`. Key requirements that directly affect how we write code:

#### Lifecycle Rules (most common rejection reason)

- **Nothing before `enable()`** — The `Extension` constructor and module scope must not create GObject instances, connect signals, or modify the shell. Only static JS data structures (`Map`, `RegExp`, plain objects) are permitted.
- **Full cleanup in `disable()`** — Every widget must be destroyed, every signal disconnected, every keybinding removed, every main loop source cleared, and every reference nulled.
- GSettings objects created in `enable()` must be nulled in `disable()`.

#### Import Isolation

- `extension.js` must never import `Gdk`, `Gtk`, or `Adw` (these conflict with Clutter/St in the shell process).
- `prefs.js` must never import `Clutter`, `Meta`, `St`, or `Shell` (these conflict with GTK in the prefs process).

#### Code Quality for Review

- All code must be readable, consistently formatted, and well-structured. No minification or obfuscation.
- No deprecated modules (`Lang`, `Mainloop`, `ByteArray`).
- Logging must be minimal — only errors and significant state changes. No debug spam.
- Use ESLint with GNOME Shell's lint rules during development.

#### AI-Assisted Development Policy

EGO reviewers explicitly reject extensions that appear AI-generated. Since this project uses AI tooling during development, we must take specific steps to ensure the submitted code passes review:

- **Verify every API call** — Cross-reference all GObject/Shell/GTK API usage against the official GJS docs ([gjs-docs.gnome.org](https://gjs-docs.gnome.org)). Do not use APIs that don't exist.
- **No dead code** — Remove any generated code that isn't used. Every function, import, and variable must serve a purpose.
- **Consistent style** — Use one code style throughout. Do not mix conventions (e.g., sometimes semicolons, sometimes not).
- **No prompt artifacts** — Comments must describe what code does, not instruct an AI. Remove any TODO/FIXME comments generated during development that aren't genuine development notes.
- **Developer must understand the code** — Every line should be explainable. If a pattern was generated and the developer doesn't understand why it works, rewrite it.
- **Manual review pass** — Before submission, do a line-by-line review to remove hallmarks of generated output: unnecessary null checks, redundant type conversions, overly defensive patterns, boilerplate that adds no value.

#### Other Requirements

- No external dependencies, binary executables, or network requests.
- No telemetry or user tracking.
- Schemas: ID must use `org.gnome.shell.extensions.*` prefix, path must use `/org/gnome/shell/extensions/*` prefix, XML source and compiled schemas must both be in the ZIP.
- `metadata.json`: do not set `version` (EGO manages it), do not use `gnome.org` as UUID namespace, do not claim unsupported shell versions.
- License must be GPL-2.0-or-later compatible. Include attribution for any borrowed code.

### 7.5 Licensing

The extension is licensed under `GPL-2.0-or-later`, which is required for GNOME Shell derived works. Repository setup:

- Include the full GPL-2.0 license text in a `LICENSE` file at the repo root. GitHub auto-detects and displays it.
- Add `SPDX-License-Identifier: GPL-2.0-or-later` headers to all source files (`extension.js`, `prefs.js`).
- If any code is borrowed from another extension, include attribution in the source files. License violations cause EGO rejection.

### 7.6 CI with GitHub Actions

Use GitHub Actions (free for public repos) to automate pre-submission validation:

- **Lint** — Run ESLint with GNOME Shell rules on every push/PR.
- **Schema validation** — Compile schemas with `glib-compile-schemas` and verify success.
- **Pack** — Run `gnome-extensions pack` to verify the ZIP builds cleanly.
- **Import checks** — Grep for forbidden imports (`Gtk`/`Adw` in `extension.js`, `Clutter`/`Meta`/`St` in `prefs.js`).

### 7.7 Build & Install

```bash
# Development install
git clone <repo-url> ~/.local/share/gnome-shell/extensions/workspace-shortcuts-bar@<uuid>
glib-compile-schemas schemas/

# Restart GNOME Shell (X11)
Alt+F2 → r

# Restart GNOME Shell (Wayland)
Log out and back in

# Enable
gnome-extensions enable workspace-shortcuts-bar@<uuid>
```

---

## 8. Testing Strategy

### 8.1 Manual Test Matrix

| Scenario | Static Mode | Dynamic Mode |
|----------|-------------|--------------|
| Bar renders correct number of buttons | ✓ | ✓ |
| Active workspace highlighted correctly | ✓ | ✓ |
| Click switches workspace | ✓ | ✓ |
| Default keybindings work (Super+1..0) | ✓ | ✓ |
| Custom keybinding set via prefs works | ✓ | ✓ |
| Adding workspace updates bar | N/A | ✓ |
| Removing workspace updates bar | N/A | ✓ |
| Empty workspaces dimmed | N/A | ✓ |
| Out-of-range shortcut is no-op | ✓ | ✓ |
| Enable/disable cycle is clean | ✓ | ✓ |
| Bar position changes take effect | ✓ | ✓ |
| Workspace names displayed when set | ✓ | ✓ |
| Right-click bar opens context menu with Preferences | ✓ | ✓ |
| Context menu Preferences item opens settings window | ✓ | ✓ |
| No GObject/signal/widget leaks after disable cycle | ✓ | ✓ |
| No GTK/Adw imports in extension.js | ✓ | ✓ |
| No Clutter/Meta/St imports in prefs.js | ✓ | ✓ |

### 8.2 Smoke Test Checklist

1. Install extension, enable, verify bar appears.
2. Press `<Super>1` through `<Super>4` — verify workspace switches.
3. Open prefs, change a shortcut, verify new shortcut works.
4. Change bar position in prefs, verify bar moves.
5. Right-click the bar, verify context menu appears with "Preferences" item.
6. Click "Preferences" in the context menu, verify prefs window opens.
7. Disable extension, verify bar removed and shortcuts restored.
8. Re-enable, verify clean state.

### 8.3 Pre-Submission Review

Before uploading to EGO, perform a code-level review:

1. Run ESLint with GNOME Shell rules — zero warnings/errors.
2. Verify every API call exists in gjs-docs.gnome.org for the target shell versions.
3. Confirm no dead code, unused imports, or prompt-like comments.
4. Confirm consistent code style throughout (indentation, semicolons, naming).
5. Read through the full extension line-by-line as if you were an EGO reviewer.
6. Verify the ZIP contains only necessary files (see EGO submission guide).

---

## 9. Future Work (v2)

These features are explicitly out of scope for v1 but are planned:

| Feature | Description |
|---------|-------------|
| Move-to-workspace shortcuts | `<Super><Shift>1..0` to move the focused window to workspace N |
| Scroll-to-cycle | Mouse scroll on the bar area cycles workspaces |
| Drag-and-drop reorder | Drag workspace buttons to reorder workspaces |
| Window count badges | Show number of windows per workspace on each button |
| Per-workspace custom labels | User-defined labels in prefs instead of GNOME names |
| Multi-monitor awareness | Separate bar instances or per-monitor workspace tracking |

---

## 10. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Final UUID username/namespace for the extension? | Open |
| 2 | Should the bar be hideable entirely (shortcuts-only mode)? | Open |
| 3 | Should there be an "urgent" visual state for workspaces with attention-requesting windows? | Open |

---

## Appendix A: Reference Extensions

- **Simple Workspaces Bar** — Inspiration for bar UI approach (not a fork).
- **Workspace Indicator** (GNOME built-in) — Minimal workspace indicator, no keybindings.
- **Space Bar** — Popular workspace bar extension with different feature set.

## Appendix B: Key API References

- `Main.wm.addKeybinding()` / `removeKeybinding()` — Keybinding registration.
- `global.workspace_manager` — Workspace enumeration and activation.
- `Main.panel.addToStatusArea()` / `Main.panel._leftBox` / `_centerBox` / `_rightBox` — Panel insertion points.
- `Adw.PreferencesPage` / `Adw.PreferencesGroup` / `Adw.ActionRow` — Prefs UI building blocks.
- `Gtk.ShortcutLabel` — Display accelerator strings as formatted key labels.
