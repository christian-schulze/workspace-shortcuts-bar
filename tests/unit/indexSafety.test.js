// SPDX-License-Identifier: GPL-2.0-or-later

import { isWorkspaceIndexInRange } from '../../lib/indexSafety.js';

describe('isWorkspaceIndexInRange', function () {
    it('returns true for index 0 with 4 workspaces', function () {
        expect(isWorkspaceIndexInRange(0, 4)).toBe(true);
    });

    it('returns true for last valid index', function () {
        expect(isWorkspaceIndexInRange(3, 4)).toBe(true);
    });

    it('returns false for index equal to count', function () {
        expect(isWorkspaceIndexInRange(4, 4)).toBe(false);
    });

    it('returns false for index beyond count', function () {
        expect(isWorkspaceIndexInRange(9, 4)).toBe(false);
    });

    it('returns false for negative index', function () {
        expect(isWorkspaceIndexInRange(-1, 4)).toBe(false);
    });

    it('returns false for zero workspaces', function () {
        expect(isWorkspaceIndexInRange(0, 0)).toBe(false);
    });
});
