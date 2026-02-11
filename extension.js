// SPDX-License-Identifier: GPL-2.0-or-later

import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {formatWorkspaceLabel} from './lib/workspaceLabels.js';
import {isWorkspaceIndexInRange} from './lib/indexSafety.js';
import {clampMaxShortcuts, isValidBarPosition} from './lib/settingsValidation.js';

export default class WorkspaceShortcutsBar extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._wmSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.wm.preferences'});
        this._wmKeybindingSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.wm.keybindings'});
        this._shellKeybindingSettings = new Gio.Settings({schema_id: 'org.gnome.shell.keybindings'});
        this._signalIds = [];
        this._displaySignalIds = [];
        this._settingsSignalIds = [];
        this._wmSettingsSignalIds = [];
        this._registeredKeybindings = [];
        this._registeredMoveKeybindings = [];
        this._savedBuiltinBindings = {};
        this._savedAppBindings = {};
        this._savedBuiltinMoveBindings = {};

        this._buildBar();
        this._insertBarIntoPanel();
        this._disableBuiltinKeybindings();
        this._disableBuiltinMoveKeybindings();
        this._registerKeybindings();
        this._registerMoveKeybindings();
        this._connectSignals();
    }

    disable() {
        this._disconnectSignals();
        this._removeMoveKeybindings();
        this._removeKeybindings();
        this._restoreBuiltinMoveKeybindings();
        this._restoreBuiltinKeybindings();
        this._removeBarFromPanel();

        if (this._menu) {
            this._menu.destroy();
            this._menu = null;
        }
        this._menuManager = null;

        if (this._bar) {
            this._bar.destroy();
            this._bar = null;
        }

        this._settings = null;
        this._wmSettings = null;
        this._wmKeybindingSettings = null;
        this._shellKeybindingSettings = null;
        this._signalIds = null;
        this._displaySignalIds = null;
        this._settingsSignalIds = null;
        this._wmSettingsSignalIds = null;
        this._registeredKeybindings = null;
        this._registeredMoveKeybindings = null;
        this._savedBuiltinBindings = null;
        this._savedAppBindings = null;
        this._savedBuiltinMoveBindings = null;
    }

    _buildBar() {
        this._bar = new St.BoxLayout({
            style_class: 'workspace-shortcuts-bar',
            reactive: true,
        });

        this._createContextMenu();
        this._populateBar();
    }

    _createContextMenu() {
        this._menu = new PopupMenu.PopupMenu(this._bar, 0.5, St.Side.TOP);
        Main.uiGroup.add_child(this._menu.actor);
        this._menu.actor.hide();

        this._menuManager = new PopupMenu.PopupMenuManager(this._bar);
        this._menuManager.addMenu(this._menu);

        const prefsItem = new PopupMenu.PopupMenuItem('Preferences');
        prefsItem.connect('activate', () => {
            this.openPreferences();
        });
        this._menu.addMenuItem(prefsItem);

        this._contextMenuGesture = new Clutter.ClickGesture({
            required_button: Clutter.BUTTON_SECONDARY,
            recognize_on_press: true,
        });
        this._contextMenuGesture.connect('recognize', () => {
            this._menu.toggle();
        });
        this._bar.add_action(this._contextMenuGesture);
    }

    _populateBar() {
        this._bar.destroy_all_children();

        const workspaceManager = global.workspace_manager;
        const nWorkspaces = workspaceManager.get_n_workspaces();
        const activeIndex = workspaceManager.get_active_workspace_index();
        const names = this._wmSettings.get_strv('workspace-names');

        for (let i = 0; i < nWorkspaces; i++) {
            const workspace = workspaceManager.get_workspace_by_index(i);
            const name = names[i] || '';
            const label = formatWorkspaceLabel(i, name);

            const button = new St.Button({
                style_class: 'workspace-button panel-button',
                label,
                can_focus: true,
            });

            if (i === activeIndex) {
                button.add_style_class_name('workspace-button-active-highlight');
            }

            const isEmpty = workspace.list_windows()
                .filter(w => !w.is_on_all_workspaces()).length === 0;
            if (isEmpty) {
                button.add_style_class_name('workspace-button-empty');
            } else if (i !== activeIndex) {
                button.add_style_class_name('workspace-button-occupied');
            }

            button.connect('clicked', () => {
                workspace.activate(global.get_current_time());
            });

            this._bar.add_child(button);
        }
    }

    _updateActiveButton() {
        if (!this._bar)
            return;

        const workspaceManager = global.workspace_manager;
        const activeIndex = workspaceManager.get_active_workspace_index();
        const children = this._bar.get_children();

        for (let i = 0; i < children.length; i++) {
            const button = children[i];
            button.remove_style_class_name('workspace-button-active-highlight');
            button.remove_style_class_name('workspace-button-occupied');

            if (i === activeIndex) {
                button.add_style_class_name('workspace-button-active-highlight');
            } else if (!button.has_style_class_name('workspace-button-empty')) {
                button.add_style_class_name('workspace-button-occupied');
            }
        }
    }

    _updateOccupiedState() {
        if (!this._bar)
            return;

        const workspaceManager = global.workspace_manager;
        const activeIndex = workspaceManager.get_active_workspace_index();
        const children = this._bar.get_children();

        for (let i = 0; i < children.length; i++) {
            const button = children[i];
            const workspace = workspaceManager.get_workspace_by_index(i);
            if (!workspace)
                continue;

            const isEmpty = workspace.list_windows()
                .filter(w => !w.is_on_all_workspaces()).length === 0;

            button.remove_style_class_name('workspace-button-empty');
            button.remove_style_class_name('workspace-button-occupied');

            if (isEmpty) {
                button.add_style_class_name('workspace-button-empty');
            } else if (i !== activeIndex) {
                button.add_style_class_name('workspace-button-occupied');
            }
        }
    }

    _insertBarIntoPanel() {
        const position = this._settings.get_string('bar-position');
        this._currentPosition = isValidBarPosition(position) ? position : 'left';
        this._addBarToBox(this._currentPosition);
    }

    _addBarToBox(position) {
        switch (position) {
        case 'left':
            Main.panel._leftBox.insert_child_at_index(this._bar, 1);
            break;
        case 'center':
            Main.panel._centerBox.add_child(this._bar);
            break;
        case 'right':
            Main.panel._rightBox.insert_child_at_index(this._bar, 0);
            break;
        }
    }

    _removeBarFromPanel() {
        if (!this._bar)
            return;

        const parent = this._bar.get_parent();
        if (parent)
            parent.remove_child(this._bar);
    }

    _moveBarToPosition(newPosition) {
        if (!isValidBarPosition(newPosition))
            return;

        if (newPosition === this._currentPosition)
            return;

        this._removeBarFromPanel();
        this._addBarToBox(newPosition);
        this._currentPosition = newPosition;
    }

    /**
     * Save and disable GNOME's built-in switch-to-workspace-N keybindings
     * and switch-to-application-N keybindings so our extension's shortcuts
     * take effect without conflict.
     */
    _disableBuiltinKeybindings() {
        // Disable workspace-switching keybindings (org.gnome.desktop.wm.keybindings)
        for (let i = 1; i <= 10; i++) {
            const builtinKey = `switch-to-workspace-${i}`;
            try {
                const original = this._wmKeybindingSettings.get_strv(builtinKey);
                this._savedBuiltinBindings[builtinKey] = original;
                this._wmKeybindingSettings.set_strv(builtinKey, []);
            } catch (_e) {
                // Key may not exist for higher workspace numbers; ignore
            }
        }

        // Disable app-launching keybindings (org.gnome.shell.keybindings)
        for (let i = 1; i <= 9; i++) {
            const appKey = `switch-to-application-${i}`;
            try {
                const original = this._shellKeybindingSettings.get_strv(appKey);
                this._savedAppBindings[appKey] = original;
                this._shellKeybindingSettings.set_strv(appKey, []);
            } catch (_e) {
                // Best effort
            }
        }
    }

    /**
     * Restore GNOME's built-in switch-to-workspace-N and
     * switch-to-application-N keybindings to their original values
     * when the extension is disabled.
     */
    _restoreBuiltinKeybindings() {
        if (this._wmKeybindingSettings && this._savedBuiltinBindings) {
            for (const [key, value] of Object.entries(this._savedBuiltinBindings)) {
                try {
                    this._wmKeybindingSettings.set_strv(key, value);
                } catch (_e) {
                    // Best effort restore
                }
            }
            this._savedBuiltinBindings = {};
        }

        if (this._shellKeybindingSettings && this._savedAppBindings) {
            for (const [key, value] of Object.entries(this._savedAppBindings)) {
                try {
                    this._shellKeybindingSettings.set_strv(key, value);
                } catch (_e) {
                    // Best effort restore
                }
            }
            this._savedAppBindings = {};
        }
    }

    /**
     * Save and disable GNOME's built-in move-to-workspace-N keybindings
     * so our extension's move shortcuts take effect without conflict.
     */
    _disableBuiltinMoveKeybindings() {
        for (let i = 1; i <= 10; i++) {
            const builtinKey = `move-to-workspace-${i}`;
            try {
                const original = this._wmKeybindingSettings.get_strv(builtinKey);
                this._savedBuiltinMoveBindings[builtinKey] = original;
                this._wmKeybindingSettings.set_strv(builtinKey, []);
            } catch (_e) {
                // Key may not exist for higher workspace numbers; ignore
            }
        }
    }

    /**
     * Restore GNOME's built-in move-to-workspace-N keybindings
     * to their original values when the extension is disabled.
     */
    _restoreBuiltinMoveKeybindings() {
        if (this._wmKeybindingSettings && this._savedBuiltinMoveBindings) {
            for (const [key, value] of Object.entries(this._savedBuiltinMoveBindings)) {
                try {
                    this._wmKeybindingSettings.set_strv(key, value);
                } catch (_e) {
                    // Best effort restore
                }
            }
            this._savedBuiltinMoveBindings = {};
        }
    }

    _registerKeybindings() {
        this._removeKeybindings();

        const maxShortcuts = clampMaxShortcuts(this._settings.get_int('max-shortcuts'));
        const workspaceManager = global.workspace_manager;

        for (let i = 1; i <= maxShortcuts; i++) {
            const keybindingName = `wsb-switch-to-workspace-${i}`;

            Main.wm.addKeybinding(
                keybindingName,
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                () => {
                    const index = i - 1;
                    if (isWorkspaceIndexInRange(index, workspaceManager.get_n_workspaces())) {
                        workspaceManager.get_workspace_by_index(index)
                            .activate(global.get_current_time());
                    }
                }
            );

            this._registeredKeybindings.push(keybindingName);
        }
    }

    _removeKeybindings() {
        if (!this._registeredKeybindings)
            return;

        for (const name of this._registeredKeybindings) {
            Main.wm.removeKeybinding(name);
        }
        this._registeredKeybindings = [];
    }

    _registerMoveKeybindings() {
        this._removeMoveKeybindings();

        const maxShortcuts = clampMaxShortcuts(this._settings.get_int('max-shortcuts'));
        const workspaceManager = global.workspace_manager;
        const followWindow = this._settings.get_boolean('move-follows-window');

        for (let i = 1; i <= maxShortcuts; i++) {
            const keybindingName = `wsb-move-to-workspace-${i}`;

            Main.wm.addKeybinding(
                keybindingName,
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                () => {
                    const window = global.display.get_focus_window();
                    if (!window) {
                        Main.notify(
                            'Workspace Shortcuts Bar',
                            'No window to move'
                        );
                        return;
                    }

                    const index = i - 1;
                    if (!isWorkspaceIndexInRange(index, workspaceManager.get_n_workspaces()))
                        return;

                    window.change_workspace_by_index(index, false);

                    if (followWindow) {
                        workspaceManager.get_workspace_by_index(index)
                            .activate(global.get_current_time());
                    }
                }
            );

            this._registeredMoveKeybindings.push(keybindingName);
        }
    }

    _removeMoveKeybindings() {
        if (!this._registeredMoveKeybindings)
            return;

        for (const name of this._registeredMoveKeybindings) {
            Main.wm.removeKeybinding(name);
        }
        this._registeredMoveKeybindings = [];
    }

    _connectSignals() {
        const workspaceManager = global.workspace_manager;

        // Workspace manager signals
        this._signalIds.push(
            workspaceManager.connect('workspace-added', () => this._populateBar())
        );
        this._signalIds.push(
            workspaceManager.connect('workspace-removed', () => this._populateBar())
        );
        this._signalIds.push(
            workspaceManager.connect('active-workspace-changed', () => this._updateActiveButton())
        );

        // Window tracking signals for occupied state
        this._displaySignalIds.push(
            global.display.connect('window-created', (_display, window) => {
                this._updateOccupiedState();
                const id = window.connect('unmanaging', () => {
                    window.disconnect(id);
                    this._updateOccupiedState();
                });
            })
        );

        // Extension settings signals
        this._settingsSignalIds.push(
            this._settings.connect('changed::bar-position', () => {
                const position = this._settings.get_string('bar-position');
                this._moveBarToPosition(position);
            })
        );
        this._settingsSignalIds.push(
            this._settings.connect('changed::max-shortcuts', () => {
                this._registerKeybindings();
                this._registerMoveKeybindings();
            })
        );

        // Per-shortcut settings signals
        for (let i = 1; i <= 10; i++) {
            this._settingsSignalIds.push(
                this._settings.connect(`changed::wsb-switch-to-workspace-${i}`, () => {
                    this._registerKeybindings();
                })
            );
            this._settingsSignalIds.push(
                this._settings.connect(`changed::wsb-move-to-workspace-${i}`, () => {
                    this._registerMoveKeybindings();
                })
            );
        }

        this._settingsSignalIds.push(
            this._settings.connect('changed::move-follows-window', () => {
                this._registerMoveKeybindings();
            })
        );

        // WM settings signals (workspace names)
        this._wmSettingsSignalIds.push(
            this._wmSettings.connect('changed::workspace-names', () => {
                this._populateBar();
            })
        );
    }

    _disconnectSignals() {
        const workspaceManager = global.workspace_manager;

        if (this._signalIds) {
            for (const id of this._signalIds) {
                workspaceManager.disconnect(id);
            }
            this._signalIds = [];
        }

        if (this._displaySignalIds) {
            for (const id of this._displaySignalIds) {
                global.display.disconnect(id);
            }
            this._displaySignalIds = [];
        }

        if (this._settingsSignalIds && this._settings) {
            for (const id of this._settingsSignalIds) {
                this._settings.disconnect(id);
            }
            this._settingsSignalIds = [];
        }

        if (this._wmSettingsSignalIds && this._wmSettings) {
            for (const id of this._wmSettingsSignalIds) {
                this._wmSettings.disconnect(id);
            }
            this._wmSettingsSignalIds = [];
        }
    }
}
