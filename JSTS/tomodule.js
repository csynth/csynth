// helpers moving towards modules
import * as HORN from './horn.js'; // '.js' needed because of typescript rules we don't understand
function pause() {
    console.log('+=+=+= window.HornSet', WA.HornSet);
    WA.HW = HORN.HW;
}
pause();
WA.HW = HW;
var gets = {}, sets = {};
WA.HWgets = gets;
WA.HWsets = sets;
// This pollutes the global scope unnecessarily, but permits incremental modularization.
// We will gradually make this cleaner.
const done = Object.getOwnPropertyNames(window);
const wrong = [];
for (const n in HW) {
    if (done.includes(n)) {
        if (window[n] !== undefined)
            wrong.push(n);
        // else // somehow window.HornSet has been defined but not initialized
        //     console.error(`+=+=+= window.${n} semi-ready in tomodule`);
        window[n] = HW[n];
    }
    else {
        Object.defineProperty(window, n, {
            get: function () {
                gets[n] = (gets[n] || 0) + 1;
                return HW[n];
            },
            set: function (v) {
                sets[n] = (sets[n] || 0) + 1;
                HW[n] = v;
            }
        });
    }
    // WA[n] = HW[n];
}
if (wrong.length)
    console.error('unoverridable objects', wrong);
export { THREE };
// const {X} = window, {THREE} = X; console.log('>>>>threeH.js global');// this behaves best for now, 13/12/2020
const { THREE } = window;
console.log('>>>>threeH.js global'); // this behaves best for now, 13/12/2020
//# sourceMappingURL=tomodule.js.map