// SPDX-License-Identifier: GPL-2.0-or-later

import { formatWorkspaceLabel } from '../../lib/workspaceLabels.js';

describe('formatWorkspaceLabel', function () {
    it('returns workspace name when set', function () {
        expect(formatWorkspaceLabel(0, 'Browser')).toBe('Browser');
    });

    it('falls back to 1-based index for empty string', function () {
        expect(formatWorkspaceLabel(0, '')).toBe('1');
    });

    it('falls back to 1-based index for null', function () {
        expect(formatWorkspaceLabel(0, null)).toBe('1');
    });

    it('falls back to 1-based index for undefined', function () {
        expect(formatWorkspaceLabel(2, undefined)).toBe('3');
    });

    it('trims whitespace from name', function () {
        expect(formatWorkspaceLabel(0, '  Dev  ')).toBe('Dev');
    });

    it('rejects whitespace-only as empty', function () {
        expect(formatWorkspaceLabel(0, '   ')).toBe('1');
    });
});
