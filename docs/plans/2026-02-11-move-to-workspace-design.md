# Move Window to Workspace Shortcuts — Design

**Date:** 2026-02-11
**Status:** Draft
**Parent:** PRD v1 §9 Future Work — "Move-to-workspace shortcuts"

---

## 1. Overview

Add keyboard shortcuts (`<Super><Shift>1` through `<Super><Shift>0` by default) that move the currently focused window to the target workspace. A `move-follows-window` setting controls whether the user's view switches to the target workspace after the move. If no window is focused, an OSD notification informs the user.

This feature mirrors the existing switch-to-workspace shortcut system and reuses the same architectural patterns throughout.

---

## 2. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-M1 | Power user | Press `<Super><Shift>3` to move my focused window to workspace 3 | I can organize windows across workspaces without the overview |
| US-M2 | User | Choose whether my view follows the moved window | I can either "send away" or "go with" the window |
| US-M3 | User | Customize the move-to-workspace key combinations | I can adapt them to my workflow |
| US-M4 | User | See a notification when I try to move with no window focused | I understand why nothing happened |

---

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|------------|----------|
| FR-M1 | Register up to 10 keybindings (`move-to-workspace-1` through `move-to-workspace-10`). | P0 |
| FR-M2 | Default bindings: `<Super><Shift>1` through `<Super><Shift>9`, `<Super><Shift>0` for workspace 10. | P0 |
| FR-M3 | Bindings are stored in GSettings and configurable via the preferences UI. | P0 |
| FR-M4 | The `max-shortcuts` setting controls how many move bindings are registered (same as switch bindings). | P0 |
| FR-M5 | Out-of-range workspace indices are silently ignored (no-op). | P0 |
| FR-M6 | If no window is focused, show an OSD notification ("No window to move"). | P1 |
| FR-M7 | A `move-follows-window` boolean setting (default `true`) controls whether the view switches to the target workspace after moving a window. | P1 |
| FR-M8 | Move bindings silently override any conflicting GNOME defaults; originals are restored on disable. | P0 |
| FR-M9 | All move bindings are registered on `enable()` and cleanly removed on `disable()`. | P0 |

---

## 4. Technical Design

### 4.1 Schema Additions

Add to `org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml`:

**10 move-to-workspace keys** (type `as`, matching the existing switch key pattern):

```xml
<key name="wsb-move-to-workspace-1" type="as">
  <default>['&lt;Super&gt;&lt;Shift&gt;1']</default>
  <summary>Move window to workspace 1</summary>
</key>
<!-- ... through wsb-move-to-workspace-10 with default <Super><Shift>0 -->
```

**1 behavior key:**

```xml
<key name="move-follows-window" type="b">
  <default>true</default>
  <summary>Switch to workspace after moving a window to it</summary>
</key>
```

### 4.2 Extension Logic (`extension.js`)

#### New Methods

**`_registerMoveKeybindings()`** — Parallel to `_registerKeybindings()`:

1. Override GNOME's built-in `move-to-workspace-N` keys from `org.gnome.desktop.wm.keybindings` (save originals for restoration).
2. Iterate from 1 to `max-shortcuts` (clamped to 1–10).
3. For each, call `Main.wm.addKeybinding()` with key name `wsb-move-to-workspace-N`.
4. Handler flow:
   - Get focused window via `global.display.get_focus_window()`.
   - If null: show notification via `Main.notify()`, return.
   - Validate target index with `isWorkspaceIndexInRange()`.
   - If out of range: silent no-op, return.
   - Move window via `window.change_workspace_by_index(targetIndex, false)`.
   - If `move-follows-window` is true: activate target workspace.

**`_removeMoveKeybindings()`** — Parallel to `_removeKeybindings()`:

1. Remove all registered move keybindings via `Main.wm.removeKeybinding()`.
2. Restore GNOME's original `move-to-workspace-N` keys.

#### Lifecycle Integration

- `enable()` calls `_registerMoveKeybindings()` after `_registerKeybindings()`.
- `disable()` calls `_removeMoveKeybindings()` after `_removeKeybindings()`.
- `_onSettingsChanged()` re-registers move keybindings when `max-shortcuts` changes.

### 4.3 Signal Flow

```
User presses <Super><Shift>3
  → GNOME Shell dispatches to registered keybinding handler
  → Handler: window = global.display.get_focus_window()
  → If window is null → Main.notify("No window to move") → return
  → Guard: isWorkspaceIndexInRange(2) → false if only 2 workspaces → return
  → window.change_workspace_by_index(2, false)
  → If move-follows-window:
      → workspace_manager.get_workspace_by_index(2).activate()
  → workspace-switched signal fires (if followed)
  → Bar updates active state
```

### 4.4 Lib Additions (`shortcutKeys.js`)

New exported function:

```js
export function buildDefaultMoveShortcuts(count) {
    // Returns ['<Super><Shift>1', ..., '<Super><Shift>9', '<Super><Shift>0']
    // Same logic as buildDefaultShortcuts() but with <Shift> modifier added
}
```

Unit tests added in `tests/unit/shortcutKeys.test.js`.

### 4.5 Preferences UI Reorganization (`prefs.js`)

The preferences window is reorganized from a single page into multiple `Adw.PreferencesPage` tabs to avoid a long scrolling list now that there are 20+ shortcut rows.

**Page 1: Appearance**
- Bar position (combo row)
- Indicator style (combo row)
- Max shortcuts spinner (dynamic workspace mode only)

**Page 2: Switch Shortcuts**
- 10 switch-to-workspace shortcut rows (existing UI, relocated)

**Page 3: Move Shortcuts**
- 10 move-to-workspace shortcut rows (same key-capture pattern as switch shortcuts)

**Page 4: Behavior**
- "Follow window after move" toggle (`Adw.SwitchRow` bound to `move-follows-window`)

Each page is an `Adw.PreferencesPage` with an appropriate title and icon. libadwaita renders these as sidebar tabs automatically.

---

## 5. Edge Cases

| Scenario | Behavior |
|----------|----------|
| No window focused | Show OSD notification "No window to move" |
| Target workspace out of range | Silent no-op |
| Window already on target workspace | No-op (move is idempotent) |
| Window is on all workspaces | `change_workspace_by_index()` should be a no-op; verify behavior |
| Extension disabled mid-use | All keybindings removed, originals restored in `disable()` |
| `max-shortcuts` changed at runtime | Move bindings re-registered to match new count |

---

## 6. Testing

### 6.1 Unit Tests

| Test | File |
|------|------|
| `buildDefaultMoveShortcuts(10)` returns correct accelerators | `shortcutKeys.test.js` |
| `buildDefaultMoveShortcuts(5)` returns subset | `shortcutKeys.test.js` |
| Shift-modified accelerators pass `isValidAccelerator()` | `shortcutKeys.test.js` |

### 6.2 Manual Test Matrix

| Scenario | Static Mode | Dynamic Mode |
|----------|-------------|--------------|
| Move window to workspace via shortcut | ✓ | ✓ |
| Move follows window (setting on) | ✓ | ✓ |
| Move stays on current workspace (setting off) | ✓ | ✓ |
| No window focused → notification shown | ✓ | ✓ |
| Out-of-range workspace → no-op | ✓ | ✓ |
| Custom move keybinding set via prefs works | ✓ | ✓ |
| Enable/disable cycle cleans up move bindings | ✓ | ✓ |
| GNOME defaults restored after disable | ✓ | ✓ |
| Prefs tabs render correctly with 4 pages | ✓ | ✓ |

---

## 7. Files Modified

| File | Change |
|------|--------|
| `schemas/*.gschema.xml` | Add 10 move keys + `move-follows-window` boolean |
| `extension.js` | Add `_registerMoveKeybindings()`, `_removeMoveKeybindings()`, lifecycle hooks |
| `prefs.js` | Reorganize into 4 tabbed pages, add move shortcut rows and behavior toggle |
| `lib/shortcutKeys.js` | Add `buildDefaultMoveShortcuts()` |
| `tests/unit/shortcutKeys.test.js` | Add tests for `buildDefaultMoveShortcuts()` |
| `schemas/gschemas.compiled` | Regenerated |
