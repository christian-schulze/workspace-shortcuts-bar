# Workspace Shortcuts Bar

A GNOME Shell extension that adds workspace buttons to the top bar and provides configurable keyboard shortcuts (`<Super>1` through `<Super>0`) for switching between up to 10 workspaces.

Targets GNOME Shell 45, 46, and 47.

## Features

- Clickable workspace buttons in the top panel with active workspace indication
- Configurable keyboard shortcuts for workspaces 1-10
- Supports both static and dynamic workspace modes
- Empty workspaces shown dimmed for spatial awareness
- Workspace names displayed when set in GNOME settings
- Configurable bar position (left, center, right)
- Two indicator styles: highlight background or underline bar
- GTK4/libadwaita preferences UI with interactive key capture

## Installation

### From extensions.gnome.org

Visit the [extension page](https://extensions.gnome.org/) and toggle it on.

### Manual

```bash
git clone https://github.com/christian-schulze/workspace-shortcuts-bar.git \
  ~/.local/share/gnome-shell/extensions/workspace-shortcuts-bar@christian-schulze.github.io

cd ~/.local/share/gnome-shell/extensions/workspace-shortcuts-bar@christian-schulze.github.io
glib-compile-schemas schemas/
```

Then restart GNOME Shell:

- **Wayland:** Log out and back in
- **X11:** `Alt+F2` then type `r`

Enable the extension:

```bash
gnome-extensions enable workspace-shortcuts-bar@christian-schulze.github.io
```

## Configuration

Open the preferences window:

```bash
gnome-extensions prefs workspace-shortcuts-bar@christian-schulze.github.io
```

### Keyboard Shortcuts

Default bindings are `<Super>1` through `<Super>9` and `<Super>0` for workspace 10. Each shortcut can be remapped via the preferences UI.

### Appearance

- **Bar Position** -- Left, Center, or Right in the top panel
- **Indicator Style** -- Highlight (background) or Indicator Bar (underline)
- **Max Shortcuts** -- Number of shortcut slots (dynamic workspace mode only)

## Development

### Prerequisites

- GNOME Shell 45+
- `glib-compile-schemas` (from `libglib2.0-dev-bin`)
- Node.js (for ESLint)

### Lint

```bash
npx eslint extension.js prefs.js lib/
```

### Schema Validation

```bash
glib-compile-schemas --strict schemas/
```

### Testing in a Nested Session

```bash
# GNOME 45-48
dbus-run-session gnome-shell --nested --wayland

# GNOME 49+
dbus-run-session gnome-shell --devkit --wayland
```

### Building the ZIP

```bash
glib-compile-schemas schemas/
gnome-extensions pack \
  --schema=schemas/org.gnome.shell.extensions.workspace-shortcuts-bar.gschema.xml \
  --extra-source=stylesheet.css \
  --extra-source=lib/ \
  .
```

## Project Structure

```
workspace-shortcuts-bar/
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
