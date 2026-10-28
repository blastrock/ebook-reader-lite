/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { expect, test } from '@playwright/test';
import { CHAPTER_1, CHAPTER_2 } from './fixture-book';
import {
  collectPageErrors,
  ensureFixtureBook,
  installRecordingHost,
  openBook,
  setViewMode,
  tapCharacter,
  VIEW_MODES
} from './helpers';

function getContext(page: import('@playwright/test').Page, paragraphs: number) {
  return page.evaluate((count) => window.ttuHost!.getContext({ paragraphs: count }), paragraphs);
}

// `getContext` gives the app the text around a tapped sentence for its
// explanation: the paragraphs before the tapped one, then the tapped one,
// with furigana written `kanji(reading)`.
for (const viewMode of VIEW_MODES) {
  test.describe(`sentence context (${viewMode})`, () => {
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

    test('returns the tapped paragraph and the three before it, with furigana', async ({
      page
    }) => {
      await tapCharacter(page, 'ABC', 0);

      expect(await getContext(page, 3)).toEqual([
        CHAPTER_1[2],
        CHAPTER_1[3],
        CHAPTER_1[4],
        CHAPTER_1[5].replace('<ruby>漢字<rt>かんじ</rt></ruby>', '漢字(かんじ)')
      ]);
    });

    test('stops at the start of the section', async ({ page }) => {
      await tapCharacter(page, '目標の言葉', 0);

      expect(await getContext(page, 20)).toEqual([
        '第2章',
        ...CHAPTER_2.slice(0, 10),
        CHAPTER_2[10].replace('<ruby>謎<rt>なぞ</rt></ruby>', '謎(なぞ)')
      ]);
    });

    test('is empty before any tap', async ({ page }) => {
      expect(await getContext(page, 3)).toEqual([]);
    });
  });
}
