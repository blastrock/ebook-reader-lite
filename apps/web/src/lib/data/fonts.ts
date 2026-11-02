/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

export enum LocalFont {
  SERIF = 'Serif',
  SANSSERIF = 'Sans-Serif'
}

export interface UserFont {
  name: string;
  path: string;
  fileName: string;
}

export const userFontsCacheName = 'ttu-userfonts';

export const reservedFontNames = new Set(['Serif', 'Sans-Serif']);

export function isStoredFont(fontName: string, userFonts: UserFont[]) {
  return (
    reservedFontNames.has(fontName) || !!userFonts.find((userFont) => userFont.name === fontName)
  );
}
