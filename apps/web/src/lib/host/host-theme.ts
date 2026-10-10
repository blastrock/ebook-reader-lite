/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { combineLatest } from 'rxjs';
import { customThemes$, theme$ } from '$lib/data/store';
import { availableThemes } from '$lib/data/theme-option';
import { sendToHost } from '$lib/host/host-bridge';

function toRgba(color: string) {
  const probe = document.createElement('div');
  probe.style.color = color;
  document.body.append(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const [r = 0, g = 0, b = 0, a = 1] = (computed.match(/[\d.]+/g) ?? []).map(Number);

  return { r, g, b, a };
}

export function initHostTheme() {
  combineLatest([theme$, customThemes$]).subscribe(([theme, customThemes]) => {
    const option =
      availableThemes.get(theme) || customThemes[theme] || availableThemes.get('light-theme');

    if (!option) {
      return;
    }

    sendToHost('theme', {
      backgroundColor: toRgba(option.backgroundColor),
      fontColor: toRgba(option.fontColor)
    });
  });
}
