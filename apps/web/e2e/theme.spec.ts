/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { expect, test, type Page } from '@playwright/test';
import {
  collectPageErrors,
  ensureFixtureBook,
  installRecordingHost,
  openBook,
  setViewMode,
  VIEW_MODES
} from './helpers';

const EINK = {
  fontColor: 'rgba(0, 0, 0, 1.000)',
  backgroundColor: 'rgba(255, 255, 255, 1.000)',
  selectionFontColor: 'rgba(255, 255, 255, 1.000)',
  selectionBackgroundColor: 'rgba(0, 0, 0, 1.000)',
  hintFuriganaShadowColor: 'rgba(0, 0, 0, 0.302)',
  hintFuriganaFontColor: 'rgba(0, 0, 0, 0.380)',
  tooltipTextFontColor: 'rgba(0, 0, 0, 1.000)'
};

function bodyBackground(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

function bookColour(page: Page) {
  return page.evaluate(() => getComputedStyle(document.querySelector('.book-content')!).color);
}

function setTheme(page: Page) {
  return page.evaluate((theme) => window.ttuHost!.setTheme(theme), EINK);
}

// The app sets the reader's colours with `setTheme`, whatever is chosen in
// ttu's own settings: `black-theme` here, to disagree with the host.
for (const viewMode of VIEW_MODES) {
  test.describe(`host theme (${viewMode})`, () => {
    let errors: string[];
    let id: number;

    test.beforeEach(async ({ page }) => {
      errors = collectPageErrors(page);
      await installRecordingHost(page);
      await page.addInitScript(() => window.localStorage.setItem('theme', 'black-theme'));
      await setViewMode(page, viewMode);
      id = await ensureFixtureBook(page);
      await openBook(page, id);
    });

    test.afterEach(() => {
      expect(errors).toEqual([]);
    });

    test('setTheme overrides the theme chosen in ttu', async ({ page }) => {
      expect(await bodyBackground(page)).toBe('rgb(0, 0, 0)');

      await setTheme(page);

      await expect.poll(() => bodyBackground(page)).toBe('rgb(255, 255, 255)');
      expect(await bookColour(page)).toBe('rgb(0, 0, 0)');
    });

    test('the last theme applies on the next load, before any command', async ({ page }) => {
      await setTheme(page);

      await openBook(page, id);

      expect(await bodyBackground(page)).toBe('rgb(255, 255, 255)');
      expect(await bookColour(page)).toBe('rgb(0, 0, 0)');
    });

    test('an incomplete theme is refused and changes nothing', async ({ page }) => {
      await expect(
        page.evaluate(() => window.ttuHost!.setTheme({ fontColor: 'red' }))
      ).rejects.toThrow(/backgroundColor must be a string/);

      expect(await bodyBackground(page)).toBe('rgb(0, 0, 0)');
    });

    test('no theme event is sent', async ({ page }) => {
      const events = await page.evaluate(() => window.__hostEvents);

      expect(events.some((event) => event.type === 'theme')).toBe(false);
    });
  });
}
