
var inputsanimsave = false;  // until cleaner structure made
// var D; // uncomment for sensible netbeans errors
var Director = new function() {
    'use strict';
    var D = this;
    var frames = [];
    var framepos = 1;       // previous frame number, optimization to reduce hunting
    var frameposForSlot = [];  // keep track of framepos for each slot, needed if some zero-gradient duplicates etc
    var curtime = 0;    // current time, units 0..1, in total amount (not extract)
    var curframeWIP = 0;   // current time in frames
    var oldrate;        // to compensate when rate changes
    var lastframetime;  // last frametime in msecs, for deltas
    D.running = false;
    D.rules = [];     // extra rules to control director, one entry per keyframe
    D.slot = -999;      // no director, no slot
    D.useoffset = false;    // use offset in time display

    D.setup = function() {
        D.active = true;
        if (vps[0] < 8) setInput(WA.vp88, true);
        setInput(WA.layoutbox, 2);
        setInput('dragmode', true);
        W.animset.style.display = "";
        W.UI_nonanim.style.display = "none";
        setInput(WA.showuiover, true);
        W.UI_overlay.style.bottom='40px';
        setInput(WA.previewAr, true);
        setInput(WA.imageasp, '1920/1080');
        setInput(WA.showrules, false);
        D.slotsUsed = vps[0];
        curtime = curframeWIP = 0;

        reserveSlots = D.slotsUsed;
        setInput(W.doAutorot, false);
        D.splinetype = 1;   // 0 LINEAR, 1 old, 2 new (simple)
        D.Q = 0.125;        // ?? tailor slope on old, timings confused between frames or keyframes or ???

        onframe(() => {
            const nosel = [];   // fill empty slots
            for (const s of slots) {
                if (s && !s.dispobj.genes) nosel.push(s);
            }
            mutate({nosel});
            D.gotoSlot(0);
        })
        D.fps = 60;  // <<<<>>>> todo, make sure this gets through to runffmpeg etc
        renderObjHorn.centreOnDisplay = false;
        // make scaling almost manual, mutate calls centrescale explicitly
        // do this before framesFromSlots, so _rot4_ele is ready set up with non-GPU pan etc

        if (D.inbetween === D.keyframesInbetween) {
            if (slots.length === 1) { msgfixlog("Cannot animate with only one object", "try alt-1 and mutate to open some viewports"); return; }
            renderObjHorn.centreOnDisplay = false;
            forceCPUScale();  // probably not needed even for keyframe Director?
            D.framesFromSlots();
            frames.sort( function(a,b) { return a.time < b.time ? -1 : 1; } );
        } else {
            D.slotsUsed = vps[0];
        }
        D.setAnimlen();
        D.setTime();
        slowMutate = 1;     // don't waste time, slowMutate is just for show
        interfaceSounds = false;
    }

    /** prepare frames for display and start (alt, A) */
    D.start = function() {
        D.setup();
        framepos = 1;
        // >>> asdfasfasdf process etc here
        if (frameSaver.quickout) Director.setframe(1);
        D.run();

    };

    /** start running */
    D.run = function() {
        lastframetime = 0; // performance.now(); // frametime was inappropriate if no continous rotation/animation
        Maestro.on('preframe', D.setframeauto);
        D.running = true;
        D.setAnimlen();
    };


    D.setAnimlen = function() {
		// make sure all gui values XXX captured as inputs.XXX
        if (+W.animlen.value === 0.23) setInput(W.animlen, 0.23333333333); // for keyframes and every 1/2 way frame
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
            curframeWIP = curtime*D.fps*D.renderLen;    // curframeWIP not yet kept up to date where it should be
            if (curframeWIP >= D.renderEnd * D.fps || curframeWIP <= D.renderStart * D.fps) {
                curtime = D.renderStart / inputs.animlen;
                curframeWIP = curtime*D.fps*D.renderLen;
            }
            D.run();
            if (forceviewports) {
                D.saveviewports = vps;
                setViewports([0,0]);
            }
        }
    };

    var recording = false;
    /** recording is only really necessary for audio, otherwise we can skip straight to render */
    D.record = function() {
        if (V.gui) V.gui.visible = false;
        if (D.running) D.stop();
        if (inputsanimsave) {
            msgfixlog("director", "stopping old recording, then will start Director record");
            setTimeout(Director.record, 1500);
            return;
        }

        D.setframe(0);
        msgfixlog("director", "director recording fixed start frames");
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

    /** set animation time in minutes, seconds, frames
     * NOTE refer back to inputs for default values, input.animmins etc may not be quite up to date yet
     */
    D.setTime = function(m = +W.animmins.value, s = +W.animsecs.value, f = +W.animframes.value) {
        if (D.useoffset) s += inputs.animsstart;
        s -= inputs.animsstart;                      // setframnumber is relative to start
        const frames = (+m*60 + +s) * D.fps + +f;
        D.setframenum(frames);
    }

    /** toggle between time and offset time */
    D.timeoff = function(v = !D.useoffset) {
        const f = D.getframenum();
        D.useoffset = v;
        WA.timeoff.innerHTML = v ? 'off' : 'time';
        D.setframenum(f);
    }

    /** set animation time in keyframe and fraction  */
    D.setKey = function(k = inputs.animkey, f = inputs.animkeyoff) {
        D.gotoSlot(+k, +f);
    }


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
        if (D.slotsToUse === 0) return;
        if (!slots[1] || !slots[1].dispobj.genes || slots.length < D.slotsToUse) {
            log("framesFromSlots called with insufficient or incorrect slots.");
            return;
        }
        for (let i = 1; i <= D.slotsToUse; i++) {
            if (!slots[i]) return log("framesFromSlots called with no slot.", i);
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
                rot4toGenes(lastgenes);

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

        const framesperkey = (inputs.animlen * D.fps) / (D.slotsToUse - 1);
        W.animkeyoff.step = '' + 1/framesperkey;
    };

    D.updateRules = D.framesFromSlots;  // both must update the complete set


    /** go to a position defined by slot and delta p2 towards next slot (p2 may be -ve) */
    D.gotoSlot = function D_gotoSlot(slot, p2=0) {
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
            curframeWIP = curtime * D.renderLen * D.fps;
            console.error(msgfixerror('code here needs checking'));
        }
        D.gotoInbetween(pp);
    };

    /** go to a position in director keyframe animation based on offset p2 from framepos */
    D.keyframesInbetween = function D_keyframesInbetween(p2, genelist, genes = currentGenes) {
        var fp2 = Math.floor(p2);
        framepos += fp2;
        p2 = p2 - fp2;
        if (framepos+3 > frames.length) { framepos = frames.length-3; p2 = 1; } // so spline gets values it can use
        if (framepos < 1) { framepos = 1; p2 = 0; }

        // var f = [frames[framepos-1], frames[framepos], frames[framepos+1], frames[framepos+2]];
        var f = frames.slice(framepos-1, framepos+3);
        curtime = f[1].time + p2 * (f[2].time-f[1].time);  // in case set from manual drag
        D.slot = (p2 > 0.5) ? f[2].slot : f[1].slot;

        var animtime = curtime * inputs.animlen;        // in seconds
        var framenum = D.getframenum();

        var p1 = 1-p2;
        //log("time", ft, "framepos", framepos, "p1", p1);
        // const s = msgfix("director", "keyframe", framepos, Math.floor(p2*1000)/1000, "frame", framenum, "time", mins + ":" + secs + ":" + sframe, 'fps', D.fps);
        const s = msgfix("director", "frame", framenum, 'fps', D.fps);
        W.animinfo.innerHTML = s;

        {
            let secs:any = Math.floor(animtime - (D.useoffset ? inputs.animsstart : 0));
            const mins = Math.floor(secs/60);
            secs = secs%60;
            const sframe = framenum % D.fps;
            // const mins = ("00" + Math.floor(secs/60)).slice(-2);
            // secs = ("00" + secs%60).slice(-2);
            // const sframe = ("00" + (framenum % D.fps)).slice(-2);
            setInput(W.animmins, mins);
            setInput(W.animsecs, secs);
            setInput(W.animframes, sframe);
        }

        setInput(W.animkey, framepos);
        setInput(W.animkeyoff, p2.toFixed(6));
        //log("frame ", framepos, Math.floor(p2*1000)/1000);


        // for cubic
        var t = p2;
        var t0 = f[0].time, t1 = f[1].time, t2 = f[2].time, t3 = f[3].time;
        var t01 = t1-t0, t12 = t2-t1, t23 = t3-t2;

        var t_2 = t * t, t_3 = t_2 * t;
        var tBlend1 = 1 - (3 * t_2) + (2 * t_3);
        var tBlend2 = (3 * t_2) - (2 * t_3);
        var tBlend3 = (t - (2 * t_2) + t_3) * D.Q;
        var tBlend4 = (-t_2 + t_3) * D.Q;

        // 8 Feb 19, use values from current occupant of slot, not original occupant
        // 10 Feb 19, use values from current slot, but if slots are gone used last seen dispobj in that slot
        const fgenes = f.map(frame => {
            if (slots[frame.slot])
                frame.dispobj = slots[frame.slot].dispobj;
            return frame.dispobj.genes;
        });
        for (const fg of fgenes) {
            if (!fg._gcentre) fg._gcentre = new THREE.Vector4();
            const c = fg._gcentre; fg.__cx = c.x; fg.__cy = c.y; fg.__cz = c.z;
        } // handle gcentre

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

// https://www.paulinternet.nl/?page=bicubic
// for reference and debug till we get the splining times correct
if (D.splinetype === 2)
gv = (-g0/2+3/2*g1-3/2*g2+1/2*g3)*t_3 + (g0-5/2*g1+2*g2-1/2*g3)*t_2 + (-1/2*g0+1/2*g2)*t + g1;


                if (D.splinetype === 0) gv = p2 * fgenes[2][gn] + p1 * fgenes[1][gn]; // linear
                if (genes === currentGenes)
                    setvalr(gn, gv);
                else
                    genes[gn] = gv;
            }
        }
        {
            if (!genes._gcentre) genes._gcentre = new THREE.Vector4();
            const c = genes._gcentre; c.x = genes.__cx; c.y = genes.__cy; c.z = genes.__cz;
        } // handle gcentre

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
        genestoRot4(currentGenes);
        newmain();
        lastTraninteracttime = frametime;   // make sure we do not start automatic tran interact during Director
    };

    /** set genes according to frametime, using delta of frametime */
    D.setframeauto = function D_setframeauto() {
        if (curtime >= D.renderEnd / inputs.animlen) curtime = D.renderEnd / inputs.animlen;
        if (curtime <= D.renderStart / inputs.animlen) curtime = D.renderStart / inputs.animlen;

        var delta = (frametime - lastframetime) * 0.001;    // delta time in secs
        if (lastframetime <= 0) delta = 0;                  // for just starting up, establish initial lastframetime but don't move
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
        //inputs.animSpeed = W.animSpeed. value;
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
        if (frames.length === 0) { if (V.gui) V.gui.visible = true; return false; }
        if (vtime > 1 && vtime-1 < 1e-8) vtime = 1;
        curtime = vtime;
        if (vtime > 1 || vtime > D.renderEnd / inputs.animlen)  { if (V.gui) V.gui.visible = true; return false; }
        let p2;
        if (D.inbetween === D.keyframesInbetween) {  // for keyframe director
            if (isNaN(framepos)) framepos = 0;
            if (framepos+1 >= frames.length || curtime > frames[framepos+1].time) framepos = 0;
            while (frames[framepos+1].time <= curtime + 1e-10) framepos++;  // 4 to use are fp-1, fp, fp+1, fp+2

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

    D.splinetype = 1;  // 0 linear, 1 old, 2 using D.Q
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
        for (let i = 0; i < frames.length; i++) frames[i].genes = frames[i].zzgenes; // slots[i].dispobj.genes;
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
        canvas.id = 'directorplot';
        canvas.style.zIndex = 9999;
        canvas.style.position = 'fixed';
        canvas.style.bottom = canvas.style.right = '0';
        canvas.width = k;
        canvas.height = k;
        canvas.style.backgroundColor = "#000";
        canvas.style.backgroundColor = "rgba(0,0,0,0.2)";
        var ctx = canvas.getContext("2d");

        ctx.lineWidth = 4/k;
        ctx.lineWidth = 1;
        //ctx.lineWidth = 20*mrange/k;
        if (genedefs[gn]) {
            var mmin = genedefs[gn].min, mmax = genedefs[gn].max, mavg = (mmin+mmax)/2, mrange = (mmax-mmin) * 1.25;
        } else {
            mmin = -3; mmax = 3; mavg = 0; mrange = 4;
        }
        log("minmax avg range", mmin, mmax, mavg, mrange);

        // ctx.setTransform(1,0,  0,2,  0,0);
        ctx.setTransform(1,0,  0,1,  0,k/2 );
        // var xsc = k, ysc = -k/mrange, yoff = k*0.5 - k*mavg/mrange;
        var xsc = k, ysc = -k/mrange, yoff = mavg;
        function moveTo(x,y) { ctx.moveTo(x*xsc, (y-yoff)*ysc); }
        function lineTo(x,y) { ctx.lineTo(x*xsc, (y-yoff)*ysc); }

        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        moveTo(1000*xsc, mavg);
        lineTo(0, mavg);
        ctx.stroke();
        ctx.strokeStyle = "#ff0";   // for nonlinear
        var genelist = {}; genelist[gn] = currentGenes[gn];
        for (D.splinetype=0; D.splinetype<3; D.splinetype++) {
            ctx.strokeStyle = ["#f00", "#0f0", "#ff0"][D.splinetype];
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
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        for (i = 1; i<frames.length-1; i++) {
            moveTo(frames[i].time, frames[i].genes[gn]);
            //log("line", frames[i].time, frames[i].genes[gn]);
            lineTo(frames[i].time, frames[i].genes[gn]+0.1*mrange);
        }
        ctx.stroke();
        inputs.showhtmlrules = saveshow;
        currentGenes[gn] = savegene;

    };

    /** set values for key frames
     * pattern is a pattern to identify 0 or many genes
     * values is a single value, or array.
     * single value function is applied to slotsToUse elements
     * single value function is applied to slotsToUse elements (function is slotNumber => value)
     */
    D.keyGenes = function keyGenes(pattern, ...values:(number | ((i:N)=>N))[]) {
        const filt = resolveFilter(pattern);
        if (typeof values[0]  === 'function') values = new Array(Director.slotsToUse).map( (v,i) => (values[0] as (i:N)=>N)(i))
        if (values.length === 1) values = new Array(Director.slotsToUse).fill(values[0]);
        for (let s = 0; s < values.length; s++) {
            const genes = xxxgenes(s+1);
            if (!genes) continue;
            for (const gn in filt) {
                genes[gn] = values[s];
            }
            slots[s+1].dispobj.needsRender = 10;
        }
    }
    WA.keyGenes = D.keyGenes;
}();
