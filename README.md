# Workspace Shortcuts Bar

A GNOME Shell extension that adds workspace buttons to the top bar and provides configurable keyboard shortcuts (`<Super>1` through `<Super>0`) for switching between up to 10 workspaces.

Targets GNOME Shell 45–49.

## Features

- Clickable workspace buttons in the top panel with active workspace indication
- Configurable keyboard shortcuts for workspaces 1-10
- Supports both static and dynamic workspace modes
- Empty workspaces shown dimmed for spatial awareness
- Workspace names displayed when set in GNOME settings
- Configurable bar position (left, center, right)
- GTK4/libadwaita preferences UI with interactive key capture

## Installation

### From extensions.gnome.org

Visit the [extension page](https://extensions.gnome.org/) and toggle it on.

### Manual

```bash
git clone https://github.com/christian-schulze/workspace-shortcuts-bar.git
cd workspace-shortcuts-bar
make install   # symlinks repo into ~/.local/share/gnome-shell/extensions/
make enable
```

On **Wayland** you may need to log out and back in for the extension to appear. On **X11** press `Alt+F2` and type `r` to restart the shell.

## Configuration

Open the preferences window:

```bash
gnome-extensions prefs workspace-shortcuts-bar@christian-schulze.github.io
```

### Keyboard Shortcuts

Default bindings are `<Super>1` through `<Super>9` and `<Super>0` for workspace 10. Each shortcut can be remapped via the preferences UI.

### Appearance

- **Bar Position** -- Left, Center, or Right in the top panel
- **Max Shortcuts** -- Number of shortcut slots (dynamic workspace mode only)

## Development

### Prerequisites

- GNOME Shell 45+
- `glib-compile-schemas` (from `libglib2.0-dev-bin`)
- Node.js (for ESLint and tests)

### Makefile Targets

Run `make help` to see all available targets:

| Target | Description |
|--------|-------------|
| `make install` | Symlink repo into GNOME Shell extensions directory |
| `make uninstall` | Remove the symlink |
| `make enable` | Enable the extension |
| `make disable` | Disable the extension |
| `make restart` | Disable and re-enable the extension |
| `make nested` | Launch a nested GNOME Shell session |
| `make lint` | Run ESLint on source files |
| `make test` | Run unit tests |
| `make schemas` | Compile GSettings schemas |
| `make validate-schemas` | Validate schemas (strict mode) |
| `make pack` | Build extension ZIP for distribution |
| `make check` | Run all checks (lint, schema validation, tests) |

### Testing in a Nested Session

A nested GNOME Shell session runs a complete shell instance inside a window on your desktop, allowing you to test extension changes without logging out.

**Prerequisites (GNOME 49+):**

```bash
# Arch/EndeavourOS
sudo pacman -S mutter-devkit
```

**Launch:**

```bash
make nested
```

A new window opens with a full GNOME desktop. Enable the extension inside it:

```bash
make enable
```

To pick up code changes, close the nested shell window (or `Ctrl+C` in the terminal) and relaunch. Extension logs appear directly in the terminal that launched the nested session.

**Note:** On Wayland there is no way to restart just the main shell or an extension in-place. For quick iteration without the nested session, you can try `make restart`, though this may not pick up all changes (GJS caches imported modules).

### Building the ZIP

```bash
make pack
```

## Project Structure

```
workspace-shortcuts-bar/
├── Makefile               # Development targets (make help)
├── metadata.json          # Extension metadata
├── extension.js           # Main extension (workspace bar + keybindings)
├── prefs.js               # Preferences UI (GTK4/libadwaita)
├── stylesheet.css         # Shell styling
├── schemas/               # GSettings schema
├── lib/                   # Pure logic modules (testable outside shell)
│   ├── shortcutKeys.js
│   ├── workspaceLabels.js
│   ├── settingsValidation.js
│   └── indexSafety.js
└── tests/unit/            # Unit tests (jasmine-gjs)
```

## License

GPL-2.0-or-later
