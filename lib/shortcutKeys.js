// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Build the default shortcut accelerator strings.
 * @param {number} count - Number of shortcuts to generate (1-10)
 * @returns {string[]} Array of accelerator strings like ['<Super>1', ..., '<Super>0']
 */
export function buildDefaultShortcuts(count) {
    const clamped = Math.max(1, Math.min(10, count));
    const result = [];
    for (let i = 0; i < clamped; i++) {
        const key = i === 9 ? 0 : i + 1;
        result.push(`<Super>${key}`);
    }
    return result;
}

/**
 * Check if a string looks like a valid GTK accelerator.
 * Basic validation — checks for modifier+key pattern.
 * @param {string} accelerator
 * @returns {boolean}
 */
export function isValidAccelerator(accelerator) {
    if (typeof accelerator !== 'string' || accelerator.length === 0) {
        return false;
    }
    return /^(<[A-Za-z0-9_]+>)+[A-Za-z0-9_]+$/.test(accelerator);
}
