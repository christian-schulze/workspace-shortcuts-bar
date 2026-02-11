// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Check if a workspace index is within range.
 * @param {number} index - 0-based workspace index
 * @param {number} workspaceCount - Total number of workspaces
 * @returns {boolean}
 */
export function isWorkspaceIndexInRange(index, workspaceCount) {
    return workspaceCount > 0 && index >= 0 && index < workspaceCount;
}
