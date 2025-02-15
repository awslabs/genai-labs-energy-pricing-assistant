// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
export default function fakeDelay(delay: number) {
  return new Promise(resolve => setTimeout(resolve, delay));
}
