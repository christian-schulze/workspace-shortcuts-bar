// SPDX-License-Identifier: GPL-2.0-or-later

import {
    clampMaxShortcuts,
    isValidBarPosition,
} from '../../lib/settingsValidation.js';

describe('clampMaxShortcuts', function () {
    it('clamps 0 to 1', function () {
        expect(clampMaxShortcuts(0)).toBe(1);
    });

    it('clamps -5 to 1', function () {
        expect(clampMaxShortcuts(-5)).toBe(1);
    });

    it('clamps 25 to 10', function () {
        expect(clampMaxShortcuts(25)).toBe(10);
    });

    it('passes through 5', function () {
        expect(clampMaxShortcuts(5)).toBe(5);
    });

    it('passes through 1', function () {
        expect(clampMaxShortcuts(1)).toBe(1);
    });

    it('passes through 10', function () {
        expect(clampMaxShortcuts(10)).toBe(10);
    });
});

describe('isValidBarPosition', function () {
    it('accepts left', function () {
        expect(isValidBarPosition('left')).toBe(true);
    });

    it('accepts center', function () {
        expect(isValidBarPosition('center')).toBe(true);
    });

    it('accepts right', function () {
        expect(isValidBarPosition('right')).toBe(true);
    });

    it('rejects top', function () {
        expect(isValidBarPosition('top')).toBe(false);
    });

    it('rejects bottom', function () {
        expect(isValidBarPosition('bottom')).toBe(false);
    });

    it('rejects empty string', function () {
        expect(isValidBarPosition('')).toBe(false);
    });
});


