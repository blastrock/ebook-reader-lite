/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { exposeHostCommands, isHost, PROTOCOL_VERSION, sendToHost } from '$lib/host/host-bridge';
import { installDebugHost } from '$lib/host/host-debug';
import { installHostStyles } from '$lib/host/host-styles';

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

  sendToHost('ready', {
    protocolVersion: PROTOCOL_VERSION,
    route: window.location.pathname
  });
}
