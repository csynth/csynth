"use strict";
//NB >> now using relatively simple setInterval implementation
// I could benchmark preempt vs simple setInterval... but this seems ok, particularly in a worker.
//EDIT: No!  Does not seem ok now, seems ++ungood, in a very random way: 140bpm ok, 120 AWFUL.
let interval, preemptTime = 30, skipCount = 0, running = false;
let startTime, targetStepTime, stepTime; //no lastStepTime

const useSimpleTick = false; //should be change-able at runtime, but needs some fixing.

self.addEventListener('message', function(e){
    var data = e.data;
    if (data === null) return;      // added for Edge
    switch (data) {
        case 'start': start(); break;
        case 'pause': pause();  break;
    }
    if (data.preemptTime) preemptTime = data.preemptTime;
    if (data.stepTime) {
        const oldDT = stepTime;
        stepTime = data.stepTime;
        if (interval) {
            clearInterval(interval);
            interval = undefined;
            const t = getTime();
            if (targetStepTime - stepTime <= t) {
                //at the new stepTime rate, we should already be on the next step... start right away.
                start();
            } else {
                const lastStepStart = targetStepTime - oldDT;
                const dt = lastStepStart - t;
                setTimeout(start, dt - stepTime);
            }
        }
    }
});

function start() {
    if (useSimpleTick) {
        if (!interval) interval = setInterval(simpleTick, stepTime);
    } else  if (!interval) interval = setInterval(tick, 1);
    //TODO, check the logic etc.
    running = true;
    startTime = getTime();
    targetStepTime = startTime;// + stepTime;
    simpleTick();
    //self.postMessage({start: startTime});
}

function pause() {
    if (interval) clearInterval(interval);
    running = false;
    //self.postMessage({pause: getTime()});
}

function simpleTick() {
    if (!running) return;
    const t = getTime();
    const err = t - targetStepTime;
    self.postMessage({simpleStep: Math.abs(err)});
    targetStepTime = t + stepTime;
    //targetStepTime = t + stepTime - err;

    //setTimeout(simpleTick, stepTime-err);
}

function tick() {
    if (!running) return;
    const t = getTime();
    //referring a bit to http://stackoverflow.com/questions/13160122/
    const margin = preemptTime; //TODO: figure out what we can get away with here.
    const dif = targetStepTime - t;

    //--- not sure about this business
    if (dif < -margin) {  // we have gone way beyond beat, let beat continue from here
        //targetstepTime += m.stepTime;
        targetStepTime -= dif; //???
        skipCount++;
        self.postMessage({skipCount: skipCount});
    }

    if (dif < margin) {  // we have reached close enough to beat that we should schedule it
        self.postMessage({step: targetStepTime});
        targetStepTime += stepTime;
    }
}

function getTime() {
    // if (audioContext) return acStartTime + audioContext.currentTime * 1000;
    //return new Date().getTime();
    return Date.now();
}

function bpmToMS(bpm) { return 60000/bpm }
