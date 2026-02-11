// SPDX-License-Identifier: GPL-2.0-or-later

import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {formatWorkspaceLabel} from './lib/workspaceLabels.js';
import {isWorkspaceIndexInRange} from './lib/indexSafety.js';
import {clampMaxShortcuts, isValidBarPosition} from './lib/settingsValidation.js';

export default class WorkspaceShortcutsBar extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._wmSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.wm.preferences'});
        this._signalIds = [];
        this._settingsSignalIds = [];
        this._wmSettingsSignalIds = [];
        this._registeredKeybindings = [];

        this._buildBar();
        this._insertBarIntoPanel();
        this._registerKeybindings();
        this._connectSignals();
    }

    disable() {
        this._disconnectSignals();
        this._removeKeybindings();
        this._removeBarFromPanel();

        if (this._bar) {
            this._bar.destroy();
            this._bar = null;
        }

        this._settings = null;
        this._wmSettings = null;
        this._signalIds = null;
        this._settingsSignalIds = null;
        this._wmSettingsSignalIds = null;
        this._registeredKeybindings = null;
    }

    _buildBar() {
        this._bar = new St.BoxLayout({
            style_class: 'workspace-shortcuts-bar',
        });

        this._populateBar();
    }

    _populateBar() {
        this._bar.destroy_all_children();

        const workspaceManager = global.workspace_manager;
        const nWorkspaces = workspaceManager.get_n_workspaces();
        const activeIndex = workspaceManager.get_active_workspace_index();
        const indicatorStyle = this._settings.get_string('indicator-style');
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
                const activeClass = indicatorStyle === 'bar'
                    ? 'workspace-button-active-bar'
                    : 'workspace-button-active-highlight';
                button.add_style_class_name(activeClass);
            }

            const isEmpty = workspace.list_windows()
                .filter(w => !w.is_on_all_workspaces()).length === 0;
            if (isEmpty) {
                button.add_style_class_name('workspace-button-empty');
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
        const indicatorStyle = this._settings.get_string('indicator-style');
        const children = this._bar.get_children();

        for (let i = 0; i < children.length; i++) {
            const button = children[i];
            button.remove_style_class_name('workspace-button-active-highlight');
            button.remove_style_class_name('workspace-button-active-bar');

            if (i === activeIndex) {
                const activeClass = indicatorStyle === 'bar'
                    ? 'workspace-button-active-bar'
                    : 'workspace-button-active-highlight';
                button.add_style_class_name(activeClass);
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

    _registerKeybindings() {
        this._removeKeybindings();

        const maxShortcuts = clampMaxShortcuts(this._settings.get_int('max-shortcuts'));
        const workspaceManager = global.workspace_manager;

        for (let i = 1; i <= maxShortcuts; i++) {
            const keybindingName = `switch-to-workspace-${i}`;

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

        // Extension settings signals
        this._settingsSignalIds.push(
            this._settings.connect('changed::bar-position', () => {
                const position = this._settings.get_string('bar-position');
                this._moveBarToPosition(position);
            })
        );
        this._settingsSignalIds.push(
            this._settings.connect('changed::indicator-style', () => {
                this._updateActiveButton();
            })
        );
        this._settingsSignalIds.push(
            this._settings.connect('changed::max-shortcuts', () => {
                this._registerKeybindings();
            })
        );

        // Per-shortcut settings signals
        for (let i = 1; i <= 10; i++) {
            this._settingsSignalIds.push(
                this._settings.connect(`changed::switch-to-workspace-${i}`, () => {
                    this._registerKeybindings();
                })
            );
        }

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
