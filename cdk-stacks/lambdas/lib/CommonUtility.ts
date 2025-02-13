// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const validateEmailAddress = (email: string): boolean => {
    const emailRegEx = /^[^\s@]+@[^\s@]+$/
    return emailRegEx.test(email)
}

export const makeComparator = (key: string, order: 'asc' | 'desc' = 'asc') => {
    return (a: any, b: any) => {
        if (!Object.prototype.hasOwnProperty.call(a, key) || !Object.prototype.hasOwnProperty.call(b, key)) return 0;

        const aVal = ((typeof a[key] === 'string') ? a[key].toUpperCase() : a[key]);
        const bVal = ((typeof b[key] === 'string') ? b[key].toUpperCase() : b[key]);

        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;

        return order === 'desc' ? (comparison * -1) : comparison
    };
}

export const wait = (time: number): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), time);
    });
}

export const customBackoff = (retryCount: number): number => {
    const timeToWait = 2 ** (retryCount+1) * 1000;
    const jitter = Math.floor(Math.random() * (1000 - 100 + 1) + 100)
    const waitWithJitter = timeToWait + jitter
    console.debug(`retry count: ${retryCount}, timeToWait: ${timeToWait}, jitter: ${jitter} waiting: ${waitWithJitter}ms`)
    return waitWithJitter
}