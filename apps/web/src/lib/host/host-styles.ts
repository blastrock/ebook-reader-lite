/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

const hostStyles = `
.ttu-host rt,
.ttu-host rp {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.ttu-host ::selection {
  color: white;
  background: rgba(255, 0, 0, 0.6);
}
`;

export function installHostStyles() {
  document.documentElement.classList.add('ttu-host');

  const style = document.createElement('style');
  style.id = 'ttu-host-styles';
  style.textContent = hostStyles;
  document.head.append(style);
}
