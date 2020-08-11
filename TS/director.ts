
var inputsanimsave = false;  // until cleaner structure made
// var D; // uncomment for sensible netbeans errors
var Director = new function() {
    'use strict';
    var D = this;
    var frames = [];
    var framepos = 1;       // previous frame number, optimization to reduce hunting
    var frameposForSlot = [];  // keep track of framepos for each slot, needed if some zero-gradient duplicates etc
    var curtime = 0;    // current time, units 0..1, in total amount (not extract)
    var oldrate;        // to compensate when rate changes
    var lastframetime;  // last frametime in msecs, for deltas
    D.running = false;
    D.rules = [];     // extra rules to control director, one entry per keyframe
    D.slot = -999;      // no director, no slot

    /** prepare frames for display and start (alt, A) */
    D.start = function() {
        if (slots.length === 1) { msgfix("Cannot animate with only one object", "try alt-1 and mutate to open some viewports"); return; }

        // make scaling almost manual, mutate calls centrescale explicitly
        // do this before framesFromSlots, so _rot4_ele is ready set up with non-GPU pan etc
        setInput(W.doAutorot, false);
        if (D.inbetween === D.keyframesInbetween) {
            renderObjHorn.centreOnDisplay = false;
            forceCPUScale();  // probably not needed even for keyframe Director?
            D.framesFromSlots();
            frames.sort( function(a,b) { return a.time < b.time ? -1 : 1; } );
        } else {
            D.slotsUsed = vps[0];
        }
        reserveSlots = D.slotsUsed;
        lastframetime = performance.now(); // frametime was inappropriate if no continous rotation/animation
        framepos = 1;
        D.linear = false;
        Maestro.on('preframe', D.setframeauto);
        D.running = true;
        W.animset.style.display = "";
        D.setAnimlen();
        D.fps = 60;  // <<<<>>>> todo, make sure this gets through to runffmpeg etc
        // >>> asdfasfasdf process etc here
        if (frameSaver.quickout) Director.setframe(1);

    };

    D.setAnimlen = function() {
		// make sure all gui values XXX captured as inputs.XXX
        setInput(W.animlen, +W.animlen.value);
        setInput(W.animsstart, +W.animsstart.value);
        setInput(W.animslen, +W.animslen.value);
		// convert to internal D. values
        D.renderStart = inputs.animsstart;
        D.renderLen = inputs.animslen || inputs.animlen - D.renderStart;
        D.renderEnd = D.renderStart + D.renderLen;

        if (Director.inbetween !== Director.keyframesInbetween) return;    // no speed/len tie except with keyframes
        var rate = 1 / inputs.animlen;
        setInput(W.animSpeed, Math.pow(rate/2, 1/3));
    };

    D.toggle = function(forceviewports) {
        if (D.running) {
            D.stop();
        } else {
            if (curtime >= D.renderEnd / inputs.animlen || curtime <= D.renderStart / inputs.animlen)
                curtime = D.renderStart / inputs.animlen;
            D.start();
            if (forceviewports) {
                D.saveviewports = vps;
                setViewports([0,0]);
            }
        }
    };

    var recording = false;
    /** recording is only really necessary for audio, otherwise we can skip straight to render */
    D.record = function() {
        if (D.running) D.stop();
        if (inputsanimsave) {
            msgfix("director", "stopping old recording, then will start Director record");
            setTimeout(Director.record, 1500);
            return;
        }

        D.setframe(0);
        msgfix("director", "director recording fixed start frames");
        onframe(function() {
            recording = true;
            frameSaver.type = "director";
            inputsanimsave = true; // setInput(W.animsave, true);
            onframe(function() {
                // start new director at beginning and record it
                msgfix("director", "director recording frames");
                D.start();
            });
        });
    };


    /** stop director, and if recording continue to rendering */
    D.stop = function() {
        Maestro.remove('preframe', D.setframeauto);
        D.running = false;
        if (recording) {  // automatic end director record
            recording = false;
            //if (inputsanimsave) {
                inputsanimsave = false; // setInput(W.animsave, false);
                FrameSaver.StopRecord();
                msgfix("director", "director recorded, will start rendering in a second");
                setTimeout( D.render, 1000);
            //} else {
                msgfix("director", "director unexpected recording interruption");
            //}
        }
        if (D.saveviewports) {
            setViewports(D.saveviewports);
            D.saveviewports = undefined;
        }
    };

    D.renderStart = 0;  // render start time in secs
    D.renderEnd = 1e10; // end resord time
    D.renderLenth;
    /** render for director, no need for preparation, but calling this direct (ctrl,alt,shift,A) will NOT create audio */
    D.render = function() {
        frameSaver.type = "director";
        D.renderEnd = Math.min(D.renderEnd, inputs.animlen);
        D.renderLength = D.renderEnd - D.renderStart;
        frameSaver.lastRecordTime = D.renderLength * 1000;
        frameSaver.framesToRender = inputs.animlen * D.fps;  // for log messages and to inform
        FrameSaver.StartRender();
        msgfix("director", "director rendering frames");
    };

    D.slotsToUse = 8;
    D.secsPerFrame = 1/(D.slotsToUse-1);
    D.slotsUsed = 0;

    /** set frames from slots at 1 second intervals */
    D.framesFromSlots = function() {
        if (!slots[1] || !slots[1].dispobj.genes || slots.length < D.slotsToUse) {
            log("framesFromSlots called with insufficient slots.");
            return;
        }

        inputs.directorrulebox = W.directorrulebox.value;
        // todo ? encapsulate this better
        eval(inputs.directorrulebox);


        frames = [];
        frameposForSlot = [];
        // var lastgenes;
        var t = 0;
        D.slotsUsed = Math.min(slots.length-1, D.slotsToUse);

        // manage cumulative controlled rotation
        var _uXrot = 0, _uYrot = 0, _uZrot = 0;
        // slots[1].dispobj.genes._dZrot = 0; // 2;       // <<< just a dem before we have UI
        for (var i = 1; i <= D.slotsUsed; i++) {
            if (slots[i] && i !== mainvp && slots[i].x !== 9999) {
                const dispobj = slots[i].dispobj;
                const lastgenes = dispobj.genes;
                if (!lastgenes) continue;
                makeGenetransform(lastgenes);

                var fgenes = clone(lastgenes);
                // // make sure _uXrot etc stored in genes are respected
                // // 8 Feb 19, it does not seem _uXrot is set elsewhere
                // // and this would not work with repeated calls to framesFromSlots and no snapshots
                // fgenes._uXrot = fgenes._uXrot % 1;
                // fgenes._uYrot = fgenes._uYrot % 1;
                // fgenes._uZrot = fgenes._uZrot % 1;
                // fgenes._uXrot += _uXrot; fgenes._uYrot += _uYrot; fgenes._uZrot += _uZrot;
                fgenes._uXrot = _uXrot; fgenes._uYrot = _uYrot; fgenes._uZrot = _uZrot;
                if (i === 1)
                    frames.push( {time: -0.001, zzgenes: fgenes, slot: 1, dispobj, _uXrot, _uYrot, _uZrot } );  // 0 is a dummy for flat start
                frameposForSlot[i] = frames.length;

				// n.b. currently (8 Feb 19) not using zzgenes, _uXrotm etc
                var frame = {time: t * D.secsPerFrame, zzgenes: fgenes, slot: i, dispobj,  _uXrot, _uYrot, _uZrot };
                frames.push( frame );
                // below puts in opints to force stationary
                // but does not work right with drag down timing/frame assumptions
                //frames.push( {time: t * D.secsPerFrame + 0.001, genes: clone(lastgenes) } );

                // update the special rotation ready to be placed into next keyframe
                var r = D.rules[i-1]; if (r) r = r.rot;
                if (r) {
                    _uXrot += r.x || 0;
                    _uYrot += r.y || 0;
                    _uZrot += r.z || 0;
                }
                t++;
            }
        }
        frames.push( {time: (t - 1) * D.secsPerFrame + 0.002, zzgenes: fgenes, slot: i-1,
            dispobj: slots[i-1].dispobj, _uXrot, _uYrot, _uZrot } );
        D.frames = frames;  // for debug
    };

    D.updateRules = D.framesFromSlots;  // both must update the complete set


    /** go to a position defined by slot and delta p2 towards next slot (p2 may be -ve) */
    D.gotoSlot = function D_gotoSlot(slot, p2) {
        var pp;
        if (D.inbetween === D.keyframesInbetween) {  // keyframe director
            framepos = frameposForSlot[slot];
            pp = p2;
        } else {
            pp = slot + p2 - 1;
            const k = vps[0]-1;
            pp = Math.max(0, Math.min(pp, k));  // now range 0 .. k, eg 0..7
            pp = inputs.animlen * pp / k;       // range 0 .. animlen, eg time in secs
            curtime = pp;
        }
        D.gotoInbetween(pp);
    };

    /** go to a position in director keyframe animation based on offset p2 from framepos */
    D.keyframesInbetween = function D_keyframesInbetween(p2, genelist, genes = currentGenes) {
        var fp2 = Math.floor(p2);
        framepos += fp2;
        p2 = p2 - fp2;
        if (framepos+3 > frames.length) { framepos = frames.length-3; p2 = 1; }
        if (framepos < 1) { framepos = 1; p2 = 0; }

        var f = [frames[framepos-1], frames[framepos], frames[framepos+1], frames[framepos+2]];
        curtime = f[1].time + p2 * (f[2].time-f[1].time);  // in case set from manual drag
        D.slot = (p2 > 0.5) ? f[2].slot : f[1].slot;

        var animtime = curtime * inputs.animlen;        // in seconds
        var framenum = D.getframenum();
        var secs:any = Math.floor(animtime);
        var mins = ("00" + Math.floor(secs/60)).slice(-2);
        secs = ("00" + secs%60).slice(-2);
        var sframe = ("00" + (framenum % D.fps)).slice(-2);

        var p1 = 1-p2;
        //log("time", ft, "framepos", framepos, "p1", p1);
        msgfix("director", "keyframe", framepos, Math.floor(p2*1000)/1000, "frame", framenum, "time", mins + ":" + secs + ":" + sframe, 'fps', D.fps);
        //log("frame ", framepos, Math.floor(p2*1000)/1000);


        // for cubic
        var t = p2;
        var t0 = f[0].time, t1 = f[1].time, t2 = f[2].time, t3 = f[3].time;
        var t01 = t1-t0, t12 = t2-t1, t23 = t3-t2;

        var tsq = t * t, tcb = tsq * t;
        var tBlend1 = 1 - (3 * tsq) + (2 * tcb);
        var tBlend2 = (3 * tsq) - (2 * tcb);
        var tBlend3 = t - (2 * tsq) + tcb;
        var tBlend4 = -tsq + tcb;

        // 8 Feb 19, use values from current occupant of slot, not original occupant
        // 10 Feb 19, use values from current slot, but if slots are gone used last seen dispobj in that slot
        const fgenes = f.map(frame => {
            if (slots[frame.slot])
                frame.dispobj = slots[frame.slot].dispobj;
            return frame.dispobj.genes;
        });

        var glist = genelist || fgenes[0];
        for (var gn in glist) {
            if ( (genedefs[gn]) || ((gn as any).startsWith('_') && typeof glist[gn] === 'number')) {
                var g0 = fgenes[0][gn], g1 = fgenes[1][gn], g2 = fgenes[2][gn], g3 = fgenes[3][gn];
                var s01 = (g1-g0)/t01, s12 = (g2-g1)/t12, s23 = (g3-g2)/t23;
                var s1 = (s01 * t12 + s12 * t01) / (t01 + t12);
                var s2 = (s12 * t23 + s23 * t12) / (t12 + t23);

                var ff1 = g1 * tBlend1;
                var ff2 = g2 * tBlend2;
                var ff3 = s1 * tBlend3;
                var ff4 = s2 * tBlend4;
                var gv = ff1 + ff2 + ff3 + ff4;

                if (D.linear) gv = p2 * fgenes[2][gn] + p1 * fgenes[1][gn]; // linear
                if (genes === currentGenes)
                    setvalr(gn, gv);
                else
                    genes[gn] = gv;
            }
        }
        currentGenes._recordTime = animtime * 1000;  // in msec, after cubic in case _recordTime in keyframes
        currentGenes.time = animtime;  // in secs, after cubic in case _recordTime in keyframes
    }
    D.inbetween = D.keyframesInbetween;


    /** goto in between value,
     * p2 is offset from framenum (used by keyframe director)
     * OR time in secs (otherwise)
     * genelist is optional set of genes to animate
     * slottime is a slot time, typically between -0.5 and 7.5, use for non keyframe director */
    D.gotoInbetween = function D_gotoInbetween(p2, genelist) {
        setInput(W.doAnim, false);
        if (framepos === undefined) return;
        //???frameSaver.framesToRender = inputs.animlen * D.fps;  // for log messages and to inform

        D.inbetween(p2, genelist);

        genesToCam();    // make sure the camera genes are registered before any damage can happen to them

        //msgfix("time", currentGenes.time);
        useGenetransform(currentGenes);
        newmain();
        lastTraninteracttime = frametime;   // make sure we do not start automatic tran interact during Director
    };

    /** set genes according to frametime, using delta of frametime */
    D.setframeauto = function D_setframeauto() {
        if (curtime >= D.renderEnd / inputs.animlen) curtime = D.renderEnd / inputs.animlen;
        if (curtime <= D.renderStart / inputs.animlen) curtime = D.renderStart / inputs.animlen;

        var delta = (frametime - lastframetime) * 0.001;    // delta time in secs
        lastframetime = frametime;

        curtime += delta / inputs.animlen;
        if (curtime > D.renderEnd / inputs.animlen) {
            D.setframe(1);
            D.stop();
            return;
        }
        D.setframe(curtime);  // currently in 70 scale
    };

    /** used to compute length when speed slider changed, only applies to keyframe Director */
    function updatelen(evt) {
        //inputs.animSpeed = W.animSpeed.value;
        var rate = 2 * Math.pow(inputs.animSpeed, 3);
        if (Director.inbetween !== Director.keyframesInbetween) {
            if (oldrate !== undefined) {
                curtime *= oldrate / rate;
            }
            oldrate = rate;
            return;
        }
        var fulllen = Math.floor(1 / rate);
        setInput(W.animlen, fulllen);
    };
    W.animSpeed.addEventListener('change', updatelen);
    W.animSpeed.addEventListener('scroll', updatelen);
    W.animSpeed.addEventListener('input', updatelen);

    D.step = function(d) {
        //curtime += d;
        //D.setframe(curtime);
        D.setframenum(D.getframenum() + d);
    };

    /** set a precise frame number (eg for recording) */
    D.setframenum = function(frame) {
        return D.setframe((frame / D.fps + D.renderStart) / inputs.animlen );
    };

    /** get a precise frame number */
    D.getframenum = function() {
        return Math.round((curtime * inputs.animlen - D.renderStart) * D.fps );
    };

    /** set frametime to absolute value in seconds, and possible just set selected genes */
    D.setframe = function D_setframe(vtime, genelist) {
        curtime = vtime;
        if (vtime > 1 || vtime > D.renderEnd / inputs.animlen) return false;
        let p2;
        if (D.inbetween === D.keyframesInbetween) {  // for keyframe director
            if (isNaN(framepos)) framepos = 0;
            if (framepos+1 >= frames.length || curtime > frames[framepos+1].time) framepos = 0;
            while (frames[framepos+1].time < curtime) framepos++;  // 4 to use are fp-1, fp, fp+1, fp+2

            //var f0 = frames[framepos-1];
            var f1 = frames[framepos];
            var f2 = frames[framepos+1];
            //var f3 = frames[framepos+2];

            // linear interp for now
            p2 = (curtime - f1.time) / (f2.time - f1.time);
        } else {
            p2 = vtime;
        }
        D.gotoInbetween(p2, genelist);
        return true;

    };

    D.linear = false;
    var canvas;
    D.unplot = function unplot(gn) {
        if (canvas) canvas.style.display = "none";
    };

    D.plot = function(gn) {
        if (frames.length === 0) {msgfix('no Director set up', '?'); return; }
        log("plotting", gn);
        var saveshow = inputs.showhtmlrules; inputs.showhtmlrules = false;
        var savegene = currentGenes[gn];
        if (D.vals) for (var ff=1; ff<frames.length; ff++) {frames[ff].genes[gn] = D.vals[ff-1]; }
        frames[0].genes[gn] = frames[1].genes[gn];
        frames[frames.length-1].genes[gn] = frames[frames.length-2].genes[gn];


        var k = 480;      // canvas size
        var n = k;        // num points
        var delta = 1 / n;
        if (!canvas) {
            canvas = document.createElement("canvas");
            document.body.appendChild(canvas);
        }
        if (canvas) canvas.style.display = "";
        D.canvas = canvas;
        canvas.style.zIndex = 9999;
        canvas.width = k;
        canvas.height = k;
        canvas.style.backgroundColor = "#000";
        canvas.style.backgroundColor = "rgba(0,0,0,0.2)";
        var ctx = canvas.getContext("2d");

        ctx.lineWidth = 4/k;
        ctx.lineWidth = 2;
        //ctx.lineWidth = 20*mrange/k;
        if (genedefs[gn]) {
            var mmin = genedefs[gn].min, mmax = genedefs[gn].max, mavg = (mmin+mmax)/2, mrange = (mmax-mmin) * 1.25;
        } else {
            mmin = -3; mmax = 3; mavg = 0; mrange = 4;
        }
        log("minmax avg range", mmin, mmax, mavg, mrange);

        ctx.setTransform(1,0,  0,1,  0,0);
        var xsc = k, ysc = k/mrange, yoff = k*0.5 - k*mavg/mrange;
        function moveTo(x,y) { ctx.moveTo(x*xsc, y*ysc+yoff); }
        function lineTo(x,y) { ctx.lineTo(x*xsc, y*ysc+yoff); }

        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        moveTo(1000*xsc, mavg);
        lineTo(0, mavg);
        ctx.stroke();
        ctx.strokeStyle = "#ff0";   // for nonlinear
        var genelist = {}; genelist[gn] = currentGenes[gn];
        for (D.linear=0; D.linear<2; D.linear++) {
            ctx.beginPath();
            moveTo(0,mavg);
            framepos = 1;
            for (var i = 0; i<1; i+= delta) {
                D.setframe(i, genelist);
                lineTo(i, currentGenes[gn]);
                //log("plot", i, currentGenes[gn]);
            }
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#f00"; // for linear
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        for (i = 1; i<frames.length-1; i++) {
            moveTo(frames[i].time, frames[i].genes[gn]);
            //log("line", frames[i].time, frames[i].genes[gn]);
            lineTo(frames[i].time, frames[i].genes[gn]+mrange*0.1);
        }
        ctx.stroke();
        inputs.showhtmlrules = saveshow;
        currentGenes[gn] = savegene;

    };

}();
