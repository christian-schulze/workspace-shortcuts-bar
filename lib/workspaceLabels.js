// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Format a workspace label for display.
 * Returns the workspace name if set, otherwise falls back to 1-based index.
 * @param {number} index - 0-based workspace index
 * @param {string|null} name - Workspace name (may be null or empty)
 * @returns {string} Display label
 */
export function formatWorkspaceLabel(index, name) {
    if (typeof name === 'string' && name.trim().length > 0) {
        return name.trim();
    }
    return String(index + 1);
}
