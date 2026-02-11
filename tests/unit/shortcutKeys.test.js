// SPDX-License-Identifier: GPL-2.0-or-later

import { buildDefaultShortcuts, buildDefaultMoveShortcuts, isValidAccelerator } from '../../lib/shortcutKeys.js';

describe('buildDefaultShortcuts', function () {
    it('generates <Super>1 through <Super>0 for count=10', function () {
        const result = buildDefaultShortcuts(10);
        expect(result).toEqual([
            '<Super>1', '<Super>2', '<Super>3', '<Super>4', '<Super>5',
            '<Super>6', '<Super>7', '<Super>8', '<Super>9', '<Super>0',
        ]);
    });

    it('respects count parameter', function () {
        const result = buildDefaultShortcuts(4);
        expect(result.length).toBe(4);
    });

    it('starts with <Super>1', function () {
        const result = buildDefaultShortcuts(10);
        expect(result[0]).toBe('<Super>1');
    });

    it('ends with <Super>0 for count=10', function () {
        const result = buildDefaultShortcuts(10);
        expect(result[9]).toBe('<Super>0');
    });

    it('clamps count below 1 to 1', function () {
        const result = buildDefaultShortcuts(0);
        expect(result.length).toBe(1);
    });

    it('clamps count above 10 to 10', function () {
        const result = buildDefaultShortcuts(15);
        expect(result.length).toBe(10);
    });
});

describe('buildDefaultMoveShortcuts', function () {
    it('generates <Super><Shift>1 through <Super><Shift>0 for count=10', function () {
        const result = buildDefaultMoveShortcuts(10);
        expect(result).toEqual([
            '<Super><Shift>1', '<Super><Shift>2', '<Super><Shift>3',
            '<Super><Shift>4', '<Super><Shift>5', '<Super><Shift>6',
            '<Super><Shift>7', '<Super><Shift>8', '<Super><Shift>9',
            '<Super><Shift>0',
        ]);
    });

    it('respects count parameter', function () {
        const result = buildDefaultMoveShortcuts(4);
        expect(result.length).toBe(4);
    });

    it('starts with <Super><Shift>1', function () {
        const result = buildDefaultMoveShortcuts(10);
        expect(result[0]).toBe('<Super><Shift>1');
    });

    it('ends with <Super><Shift>0 for count=10', function () {
        const result = buildDefaultMoveShortcuts(10);
        expect(result[9]).toBe('<Super><Shift>0');
    });

    it('clamps count below 1 to 1', function () {
        const result = buildDefaultMoveShortcuts(0);
        expect(result.length).toBe(1);
    });

    it('clamps count above 10 to 10', function () {
        const result = buildDefaultMoveShortcuts(15);
        expect(result.length).toBe(10);
    });
});

describe('isValidAccelerator', function () {
    it('accepts <Super>1', function () {
        expect(isValidAccelerator('<Super>1')).toBe(true);
    });

    it('accepts <Control><Alt>t', function () {
        expect(isValidAccelerator('<Control><Alt>t')).toBe(true);
    });

    it('accepts <Shift><Super>a', function () {
        expect(isValidAccelerator('<Shift><Super>a')).toBe(true);
    });

    it('rejects empty string', function () {
        expect(isValidAccelerator('')).toBe(false);
    });

    it('rejects plain key without modifier', function () {
        expect(isValidAccelerator('a')).toBe(false);
    });

    it('rejects null', function () {
        expect(isValidAccelerator(null)).toBe(false);
    });

    it('rejects undefined', function () {
        expect(isValidAccelerator(undefined)).toBe(false);
    });

    it('rejects number', function () {
        expect(isValidAccelerator(42)).toBe(false);
    });
});
