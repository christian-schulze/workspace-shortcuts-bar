// SPDX-License-Identifier: GPL-2.0-or-later

const VALID_POSITIONS = ['left', 'center', 'right'];
const VALID_STYLES = ['highlight', 'bar'];

/**
 * Clamp max-shortcuts to valid range.
 * @param {number} value
 * @returns {number} Clamped value (1-10)
 */
export function clampMaxShortcuts(value) {
    return Math.max(1, Math.min(10, value));
}

/**
 * Check if a bar position value is valid.
 * @param {string} position
 * @returns {boolean}
 */
export function isValidBarPosition(position) {
    return VALID_POSITIONS.includes(position);
}

/**
 * Check if an indicator style value is valid.
 * @param {string} style
 * @returns {boolean}
 */
export function isValidIndicatorStyle(style) {
    return VALID_STYLES.includes(style);
}
