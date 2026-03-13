/**
 * Test: does deferring make require('electron') work?
 */
'use strict';
process.stdout.write('immediate: ' + typeof require('electron') + '\n');

setImmediate(() => {
    const e = require('electron');
    process.stdout.write('setImmediate: type=' + typeof e + '\n');
    if (typeof e === 'object' && e !== null) {
        process.stdout.write('has app: ' + ('app' in e) + '\n');
    } else {
        process.stdout.write('value: ' + String(e).slice(0, 50) + '\n');
    }

    setTimeout(() => {
        const e2 = require('electron');
        process.stdout.write('setTimeout(100): type=' + typeof e2 + '\n');
        if (typeof e2 === 'object') {
            process.stdout.write('has app: ' + ('app' in e2) + '\n');
        } else {
            process.stdout.write('value: ' + String(e2).slice(0, 50) + '\n');
        }
        process.exit(0);
    }, 100);
});
