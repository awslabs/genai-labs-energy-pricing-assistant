"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.customBackoff = exports.wait = exports.makeComparator = exports.validateEmailAddress = exports.uuid = void 0;
const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
exports.uuid = uuid;
const validateEmailAddress = (email) => {
    const emailRegEx = /^[^\s@]+@[^\s@]+$/;
    return emailRegEx.test(email);
};
exports.validateEmailAddress = validateEmailAddress;
const makeComparator = (key, order = 'asc') => {
    return (a, b) => {
        if (!Object.prototype.hasOwnProperty.call(a, key) || !Object.prototype.hasOwnProperty.call(b, key))
            return 0;
        const aVal = ((typeof a[key] === 'string') ? a[key].toUpperCase() : a[key]);
        const bVal = ((typeof b[key] === 'string') ? b[key].toUpperCase() : b[key]);
        let comparison = 0;
        if (aVal > bVal)
            comparison = 1;
        if (aVal < bVal)
            comparison = -1;
        return order === 'desc' ? (comparison * -1) : comparison;
    };
};
exports.makeComparator = makeComparator;
const wait = (time) => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), time);
    });
};
exports.wait = wait;
const customBackoff = (retryCount) => {
    const timeToWait = 2 ** (retryCount + 1) * 1000;
    const jitter = Math.floor(Math.random() * (1000 - 100 + 1) + 100);
    const waitWithJitter = timeToWait + jitter;
    console.debug(`retry count: ${retryCount}, timeToWait: ${timeToWait}, jitter: ${jitter} waiting: ${waitWithJitter}ms`);
    return waitWithJitter;
};
exports.customBackoff = customBackoff;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29tbW9uVXRpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNvbW1vblV0aWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFFQUFxRTtBQUNyRSxpQ0FBaUM7OztBQUUxQixNQUFNLElBQUksR0FBRyxHQUFHLEVBQUU7SUFDckIsT0FBTyxzQ0FBc0MsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQztRQUN0RSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDcEUsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFBO0FBTFksUUFBQSxJQUFJLFFBS2hCO0FBRU0sTUFBTSxvQkFBb0IsR0FBRyxDQUFDLEtBQWEsRUFBVyxFQUFFO0lBQzNELE1BQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFBO0lBQ3RDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNqQyxDQUFDLENBQUE7QUFIWSxRQUFBLG9CQUFvQix3QkFHaEM7QUFFTSxNQUFNLGNBQWMsR0FBRyxDQUFDLEdBQVcsRUFBRSxRQUF3QixLQUFLLEVBQUUsRUFBRTtJQUN6RSxPQUFPLENBQUMsQ0FBTSxFQUFFLENBQU0sRUFBRSxFQUFFO1FBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7WUFBRSxPQUFPLENBQUMsQ0FBQztRQUU3RyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRTVFLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixJQUFJLElBQUksR0FBRyxJQUFJO1lBQUUsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNoQyxJQUFJLElBQUksR0FBRyxJQUFJO1lBQUUsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRWpDLE9BQU8sS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFBO0lBQzVELENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQTtBQWJZLFFBQUEsY0FBYyxrQkFhMUI7QUFFTSxNQUFNLElBQUksR0FBRyxDQUFDLElBQVksRUFBaUIsRUFBRTtJQUNoRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDM0IsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFBO0FBSlksUUFBQSxJQUFJLFFBSWhCO0FBRU0sTUFBTSxhQUFhLEdBQUcsQ0FBQyxVQUFrQixFQUFVLEVBQUU7SUFDeEQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDakUsTUFBTSxjQUFjLEdBQUcsVUFBVSxHQUFHLE1BQU0sQ0FBQTtJQUMxQyxPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixVQUFVLGlCQUFpQixVQUFVLGFBQWEsTUFBTSxhQUFhLGNBQWMsSUFBSSxDQUFDLENBQUE7SUFDdEgsT0FBTyxjQUFjLENBQUE7QUFDekIsQ0FBQyxDQUFBO0FBTlksUUFBQSxhQUFhLGlCQU16QiIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IE1JVC0wXG5cbmV4cG9ydCBjb25zdCB1dWlkID0gKCkgPT4ge1xuICAgIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIGxldCByID0gTWF0aC5yYW5kb20oKSAqIDE2IHwgMCwgdiA9IGMgPT09ICd4JyA/IHIgOiAociAmIDB4MyB8IDB4OCk7XG4gICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGNvbnN0IHZhbGlkYXRlRW1haWxBZGRyZXNzID0gKGVtYWlsOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICBjb25zdCBlbWFpbFJlZ0V4ID0gL15bXlxcc0BdK0BbXlxcc0BdKyQvXG4gICAgcmV0dXJuIGVtYWlsUmVnRXgudGVzdChlbWFpbClcbn1cblxuZXhwb3J0IGNvbnN0IG1ha2VDb21wYXJhdG9yID0gKGtleTogc3RyaW5nLCBvcmRlcjogJ2FzYycgfCAnZGVzYycgPSAnYXNjJykgPT4ge1xuICAgIHJldHVybiAoYTogYW55LCBiOiBhbnkpID0+IHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYSwga2V5KSB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIGtleSkpIHJldHVybiAwO1xuXG4gICAgICAgIGNvbnN0IGFWYWwgPSAoKHR5cGVvZiBhW2tleV0gPT09ICdzdHJpbmcnKSA/IGFba2V5XS50b1VwcGVyQ2FzZSgpIDogYVtrZXldKTtcbiAgICAgICAgY29uc3QgYlZhbCA9ICgodHlwZW9mIGJba2V5XSA9PT0gJ3N0cmluZycpID8gYltrZXldLnRvVXBwZXJDYXNlKCkgOiBiW2tleV0pO1xuXG4gICAgICAgIGxldCBjb21wYXJpc29uID0gMDtcbiAgICAgICAgaWYgKGFWYWwgPiBiVmFsKSBjb21wYXJpc29uID0gMTtcbiAgICAgICAgaWYgKGFWYWwgPCBiVmFsKSBjb21wYXJpc29uID0gLTE7XG5cbiAgICAgICAgcmV0dXJuIG9yZGVyID09PSAnZGVzYycgPyAoY29tcGFyaXNvbiAqIC0xKSA6IGNvbXBhcmlzb25cbiAgICB9O1xufVxuXG5leHBvcnQgY29uc3Qgd2FpdCA9ICh0aW1lOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiByZXNvbHZlKCksIHRpbWUpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgY29uc3QgY3VzdG9tQmFja29mZiA9IChyZXRyeUNvdW50OiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgIGNvbnN0IHRpbWVUb1dhaXQgPSAyICoqIChyZXRyeUNvdW50KzEpICogMTAwMDtcbiAgICBjb25zdCBqaXR0ZXIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMCAtIDEwMCArIDEpICsgMTAwKVxuICAgIGNvbnN0IHdhaXRXaXRoSml0dGVyID0gdGltZVRvV2FpdCArIGppdHRlclxuICAgIGNvbnNvbGUuZGVidWcoYHJldHJ5IGNvdW50OiAke3JldHJ5Q291bnR9LCB0aW1lVG9XYWl0OiAke3RpbWVUb1dhaXR9LCBqaXR0ZXI6ICR7aml0dGVyfSB3YWl0aW5nOiAke3dhaXRXaXRoSml0dGVyfW1zYClcbiAgICByZXR1cm4gd2FpdFdpdGhKaXR0ZXJcbn0iXX0=