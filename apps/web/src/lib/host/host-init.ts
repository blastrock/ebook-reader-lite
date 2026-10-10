/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { exposeHostCommands, isHost, PROTOCOL_VERSION, sendToHost } from '$lib/host/host-bridge';
import { installDebugHost } from '$lib/host/host-debug';
import { initHostLibrary } from '$lib/host/host-library';
import { initHostLookup } from '$lib/host/host-lookup';
import { initHostPage } from '$lib/host/host-page';
import { installHostStyles } from '$lib/host/host-styles';
import { initHostTheme } from '$lib/host/host-theme';

let initialised = false;

export function initHost() {
  if (initialised) {
    return;
  }

  installDebugHost();

  if (!isHost()) {
    return;
  }

  initialised = true;

  exposeHostCommands();
  installHostStyles();
  initHostPage();
  initHostLookup();
  initHostTheme();
  initHostLibrary();

  sendToHost('ready', {
    protocolVersion: PROTOCOL_VERSION,
    route: window.location.pathname
  });
}
