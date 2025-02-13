// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
export function adjustBodyPadding() {
  const { height: headerHeight } = document.querySelector('#h').getBoundingClientRect();
  document.documentElement.style.scrollPaddingTop = `${headerHeight}px`;
}

window.addEventListener('DOMContentLoaded', adjustBodyPadding);
window.addEventListener('resize', adjustBodyPadding);
