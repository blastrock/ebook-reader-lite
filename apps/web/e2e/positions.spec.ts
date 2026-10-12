/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { expect, test } from '@playwright/test';
import { CHAPTER_1 } from './fixture-book';
import {
  collectPageErrors,
  ensureFixtureBook,
  installRecordingHost,
  openBook,
  setViewMode,
  tapCharacter,
  ttuCount,
  VIEW_MODES
} from './helpers';

/** ttu's character count of chapter 1: furigana (`<rt>`) is not counted. */
const chapter1Count =
  ttuCount('第1章') +
  CHAPTER_1.reduce((sum, p) => sum + ttuCount(p.replace(/<rt>.*?<\/rt>/g, '')), 0);

// A tap's `position` is ttu's character count before the tapped character,
// so it does not depend on the viewport or the view mode.
for (const viewMode of VIEW_MODES) {
  test.describe(`tap positions (${viewMode})`, () => {
    let errors: string[];

    test.beforeEach(async ({ page }) => {
      errors = collectPageErrors(page);
      await installRecordingHost(page);
      await setViewMode(page, viewMode);
      await openBook(page, await ensureFixtureBook(page));
    });

    test.afterEach(() => {
      expect(errors).toEqual([]);
    });

    test('the first character comes after the heading', async ({ page }) => {
      const first = await tapCharacter(page, 'これは試験', 0);
      expect(first.position).toBe(ttuCount('第1章'));
      expect(first.position).toBe(3);

      const fifth = await tapCharacter(page, 'これは試験', 4);
      expect(fifth.position).toBe(first.position + 4);
      expect(fifth.position).toBe(7);
    });

    test('furigana is not counted', async ({ page }) => {
      const kanji = await tapCharacter(page, '漢字', 0);
      const after = await tapCharacter(page, 'を書いた', 0);
      expect(after.position - kanji.position).toBe(ttuCount('漢字'));
      expect(kanji.position).toBe(425);
      expect(after.position).toBe(427);
    });

    test('punctuation is not counted, Latin letters are', async ({ page }) => {
      const wo = await tapCharacter(page, 'を書いた。ABCと', 0);
      const to = await tapCharacter(page, 'を書いた。ABCと', 8);
      expect(to.position - wo.position).toBe(ttuCount('を書いた。ABC'));
      expect(to.position - wo.position).toBe(7);
      expect(to.position).toBe(434);
    });

    test('chapter 2 continues the count of chapter 1', async ({ page }) => {
      const target = await tapCharacter(page, '目標の言葉', 0);
      expect(target.position).toBeGreaterThanOrEqual(chapter1Count);
      expect(target.position).toBe(4167);

      const next = await tapCharacter(page, '探偵が', 0);
      expect(next.position - target.position).toBe(ttuCount('目標の言葉はここにある。'));
      expect(next.position).toBe(4178);
    });
  });
}
