/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

/**
 * Lets the host bridge be exercised in a desktop browser: with
 * `localStorage.ttuHostDebug = '1'`, a fake `flutter_inappwebview` logs every
 * event, and commands can be called from the console via `window.ttuHost`.
 */
export function installDebugHost() {
  if (window.flutter_inappwebview) {
    return;
  }

  let enabled = false;

  try {
    enabled = window.localStorage.getItem('ttuHostDebug') === '1';
  } catch (_error) {
    enabled = false;
  }

  if (!enabled) {
    return;
  }

  window.flutter_inappwebview = {
    _platformReady: true,
    callHandler(name: string, ...args: unknown[]) {
      console.info('[ttuHost]', name, ...args);
      return Promise.resolve(null);
    }
  };
}
