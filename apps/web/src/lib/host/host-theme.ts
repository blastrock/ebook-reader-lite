/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { BehaviorSubject, combineLatest, map, type Observable } from 'rxjs';
import type { ThemeOption } from '$lib/data/theme-option';
import { isHost, registerHostCommand } from '$lib/host/host-bridge';

const STORAGE_KEY = 'ttuHostTheme';

const THEME_KEYS: (keyof ThemeOption)[] = [
  'fontColor',
  'backgroundColor',
  'selectionFontColor',
  'selectionBackgroundColor',
  'hintFuriganaShadowColor',
  'hintFuriganaFontColor',
  'tooltipTextFontColor'
];

const hostTheme$ = new BehaviorSubject<ThemeOption | undefined>(undefined);

function toThemeOption(value: Record<string, unknown>) {
  const option = {} as ThemeOption;

  for (const key of THEME_KEYS) {
    const color = value[key];

    if (typeof color !== 'string') {
      throw new Error(`setTheme: ${key} must be a string`);
    }

    option[key] = color;
  }

  return option;
}

function readStoredTheme() {
  try {
    return toThemeOption(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}'));
  } catch (_error) {
    return undefined;
  }
}

/**
 * The reader's colours: the host's when it has set some, else `own$`, the theme chosen in ttu. The
 * last colours the host set are kept so that a book opens in them before the host has spoken.
 */
export function withHostTheme(own$: Observable<ThemeOption>) {
  if (isHost() && !hostTheme$.getValue()) {
    hostTheme$.next(readStoredTheme());
  }

  return combineLatest([own$, hostTheme$]).pipe(map(([own, host]) => host ?? own));
}

export function initHostTheme() {
  registerHostCommand('setTheme', (args) => {
    const option = toThemeOption(args);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(option));
    hostTheme$.next(option);
  });
}
