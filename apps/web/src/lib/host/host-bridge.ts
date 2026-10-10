/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { browser } from '$app/environment';
import { logger } from '$lib/data/logger';

/** Bumped whenever an event or command changes shape. Mirrored in the app. */
export const PROTOCOL_VERSION = 2;

export type HostCommand = (args: Record<string, unknown>) => unknown;

interface FlutterInAppWebView {
  _platformReady?: boolean;
  callHandler(name: string, ...args: unknown[]): Promise<unknown>;
}

declare global {
  interface Window {
    flutter_inappwebview?: FlutterInAppWebView;
    ttuHost?: Record<string, HostCommand>;
  }
}

const commands: Record<string, HostCommand> = {};

let platformReady: Promise<void> | undefined;

export function isHost() {
  return browser && !!window.flutter_inappwebview;
}

function whenPlatformReady() {
  platformReady ??= new Promise<void>((resolve) => {
    if (window.flutter_inappwebview?._platformReady) {
      resolve();
      return;
    }
    window.addEventListener('flutterInAppWebViewPlatformReady', () => resolve(), {
      once: true
    });
  });

  return platformReady;
}

export async function sendToHost(type: string, payload: Record<string, unknown> = {}) {
  if (!isHost()) {
    return;
  }

  await whenPlatformReady();

  try {
    await window.flutter_inappwebview?.callHandler('ttuHost', { type, ...payload });
  } catch (error) {
    logger.error(`ttuHost: failed to send ${type}`, error);
  }
}

export function registerHostCommand(name: string, command: HostCommand) {
  commands[name] = command;
}

export function exposeHostCommands() {
  window.ttuHost = commands;
}
