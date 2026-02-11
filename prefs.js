// SPDX-License-Identifier: GPL-2.0-or-later

import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {isValidAccelerator} from './lib/shortcutKeys.js';

const BAR_POSITIONS = ['left', 'center', 'right'];
const BAR_POSITION_LABELS = ['Left', 'Center', 'Right'];
const INDICATOR_STYLES = ['highlight', 'bar'];
const INDICATOR_STYLE_LABELS = ['Highlight', 'Indicator Bar'];
const MAX_WORKSPACES = 10;

export default class WorkspaceShortcutsBarPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const mutterSettings = new Gio.Settings({schema_id: 'org.gnome.mutter'});
        const isDynamic = mutterSettings.get_boolean('dynamic-workspaces');

        const page = new Adw.PreferencesPage();
        window.add(page);

        this._addShortcutsGroup(page, settings, isDynamic);
        this._addAppearanceGroup(page, settings, isDynamic);
    }

    _addShortcutsGroup(page, settings, isDynamic) {
        const group = new Adw.PreferencesGroup({
            title: 'Keyboard Shortcuts',
        });
        page.add(group);

        const rowCount = this._getShortcutRowCount(settings, isDynamic);

        for (let i = 1; i <= rowCount; i++) {
            this._addShortcutRow(group, settings, i);
        }
    }

    _getShortcutRowCount(settings, isDynamic) {
        if (isDynamic) {
            return settings.get_int('max-shortcuts');
        }

        const wmPrefs = new Gio.Settings({schema_id: 'org.gnome.desktop.wm.preferences'});
        const numWorkspaces = wmPrefs.get_int('num-workspaces');
        return Math.min(numWorkspaces, MAX_WORKSPACES);
    }

    _addShortcutRow(group, settings, workspaceNum) {
        const keyName = `wsb-switch-to-workspace-${workspaceNum}`;
        const bindings = settings.get_strv(keyName);
        const current = bindings.length > 0 ? bindings[0] : '';

        const row = new Adw.ActionRow({
            title: `Workspace ${workspaceNum}`,
        });

        const shortcutLabel = new Gtk.ShortcutLabel({
            accelerator: current,
            disabled_text: 'Disabled',
            valign: Gtk.Align.CENTER,
        });

        const changeButton = new Gtk.Button({
            label: 'Change\u2026',
            valign: Gtk.Align.CENTER,
        });

        changeButton.connect('clicked', () => {
            this._openKeyCaptureDialog(
                row.get_root(),
                settings,
                keyName,
                workspaceNum,
                shortcutLabel
            );
        });

        row.add_suffix(shortcutLabel);
        row.add_suffix(changeButton);
        group.add(row);
    }

    _openKeyCaptureDialog(parentWindow, settings, keyName, workspaceNum, shortcutLabel) {
        const dialog = new Adw.Window({
            modal: true,
            transient_for: parentWindow,
            title: 'Set Shortcut',
            default_width: 300,
            default_height: 150,
            resizable: false,
        });

        const mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
        });

        const promptLabel = new Gtk.Label({
            label: 'Press a key combination\u2026',
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            vexpand: true,
        });
        mainBox.append(promptLabel);

        const capturedLabel = new Gtk.ShortcutLabel({
            accelerator: '',
            disabled_text: '',
            halign: Gtk.Align.CENTER,
            visible: false,
        });
        mainBox.append(capturedLabel);

        const buttonBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            halign: Gtk.Align.END,
            visible: false,
        });

        const cancelButton = new Gtk.Button({label: 'Cancel'});
        const setButton = new Gtk.Button({
            label: 'Set',
            css_classes: ['suggested-action'],
        });

        buttonBox.append(cancelButton);
        buttonBox.append(setButton);
        mainBox.append(buttonBox);

        const toolbarView = new Adw.ToolbarView();
        toolbarView.add_top_bar(new Adw.HeaderBar());
        toolbarView.set_content(mainBox);
        dialog.set_content(toolbarView);

        let capturedAccelerator = '';

        const keyController = new Gtk.EventControllerKey();
        keyController.connect('key-pressed', (_controller, keyval, _keycode, state) => {
            const mask = state & Gtk.accelerator_get_default_mod_mask();

            if (_isModifierOnly(keyval))
                return true;

            const accelerator = Gtk.accelerator_name(keyval, mask);
            if (!accelerator)
                return true;

            if (!isValidAccelerator(accelerator))
                return true;

            capturedAccelerator = accelerator;
            promptLabel.visible = false;
            capturedLabel.accelerator = accelerator;
            capturedLabel.visible = true;
            buttonBox.visible = true;

            return true;
        });
        dialog.add_controller(keyController);

        setButton.connect('clicked', () => {
            settings.set_strv(keyName, [capturedAccelerator]);
            shortcutLabel.accelerator = capturedAccelerator;
            dialog.close();
        });

        cancelButton.connect('clicked', () => {
            dialog.close();
        });

        const escController = new Gtk.EventControllerKey();
        escController.connect('key-pressed', (_controller, keyval) => {
            if (keyval === Gdk.KEY_Escape && !buttonBox.visible) {
                dialog.close();
                return true;
            }
            return false;
        });
        dialog.add_controller(escController);

        dialog.present();
    }

    _addAppearanceGroup(page, settings, isDynamic) {
        const group = new Adw.PreferencesGroup({
            title: 'Appearance',
        });
        page.add(group);

        // Bar Position
        const positionRow = new Adw.ComboRow({
            title: 'Bar Position',
            subtitle: 'Where the workspace bar appears in the top panel',
            model: Gtk.StringList.new(BAR_POSITION_LABELS),
        });

        const currentPosition = settings.get_string('bar-position');
        const positionIndex = BAR_POSITIONS.indexOf(currentPosition);
        if (positionIndex >= 0)
            positionRow.selected = positionIndex;

        positionRow.connect('notify::selected', () => {
            const selected = BAR_POSITIONS[positionRow.selected];
            if (selected)
                settings.set_string('bar-position', selected);
        });
        group.add(positionRow);

        // Indicator Style
        const styleRow = new Adw.ComboRow({
            title: 'Active Indicator Style',
            subtitle: 'How the active workspace is visually highlighted',
            model: Gtk.StringList.new(INDICATOR_STYLE_LABELS),
        });

        const currentStyle = settings.get_string('indicator-style');
        const styleIndex = INDICATOR_STYLES.indexOf(currentStyle);
        if (styleIndex >= 0)
            styleRow.selected = styleIndex;

        styleRow.connect('notify::selected', () => {
            const selected = INDICATOR_STYLES[styleRow.selected];
            if (selected)
                settings.set_string('indicator-style', selected);
        });
        group.add(styleRow);

        // Max Shortcuts (dynamic mode only)
        if (isDynamic) {
            const maxAdjustment = new Gtk.Adjustment({
                lower: 1,
                upper: 10,
                step_increment: 1,
                value: settings.get_int('max-shortcuts'),
            });

            const maxRow = new Adw.SpinRow({
                title: 'Maximum Shortcuts',
                subtitle: 'Number of workspace shortcuts to register',
                adjustment: maxAdjustment,
            });

            settings.bind(
                'max-shortcuts',
                maxAdjustment,
                'value',
                Gio.SettingsBindFlags.DEFAULT
            );

            group.add(maxRow);
        }
    }
}

/**
 * Check whether a keyval corresponds to a lone modifier key.
 * @param {number} keyval
 * @returns {boolean}
 */
function _isModifierOnly(keyval) {
    return keyval === Gdk.KEY_Shift_L ||
           keyval === Gdk.KEY_Shift_R ||
           keyval === Gdk.KEY_Control_L ||
           keyval === Gdk.KEY_Control_R ||
           keyval === Gdk.KEY_Alt_L ||
           keyval === Gdk.KEY_Alt_R ||
           keyval === Gdk.KEY_Super_L ||
           keyval === Gdk.KEY_Super_R ||
           keyval === Gdk.KEY_Meta_L ||
           keyval === Gdk.KEY_Meta_R ||
           keyval === Gdk.KEY_Hyper_L ||
           keyval === Gdk.KEY_Hyper_R ||
           keyval === Gdk.KEY_ISO_Level3_Shift ||
           keyval === Gdk.KEY_Caps_Lock ||
           keyval === Gdk.KEY_Num_Lock;
}
