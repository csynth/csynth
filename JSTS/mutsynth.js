(function augmentSynthPrototype() {
    var mutsynthIDs = {}, mutsynths = {}; //these used to be global, which I probably used for easy console access.
    function nextMutsynthID(type) {
        if (mutsynthIDs[type] === undefined)
            mutsynthIDs[type] = 0;
        return type + '#' + ++mutsynthIDs[type];
    }
    Synth.prototype.geneName = function (parmName) { return this.mutID + '.' + parmName; };
    Synth.prototype.geneHTMLGui = false; //this should be reviewed.
    Synth.prototype.addgene = function (name, def, min, max, delta, step, help, tag, free, internal) {
        if (!this.genesWillAutoUpdate)
            this.autoUpdateGenes();
        if (!tag)
            tag = this.type + " audio";
        else {
            if (!tag.matches(this.type))
                tag += " " + this.type;
            if (!tag.matches("audio"))
                tag += " audio";
        }
        if (!this.mutID) {
            this.mutID = nextMutsynthID(this.type);
            mutsynths[this.mutID] = this;
        }
        if (!this.geneparms)
            this.geneparms = [];
        var geneName = this.geneName(name);
        //at the moment, parms are just primitives, no way to add more properties to them...
        //but also geneparms is somewhat redundant: we could trivially work out the geneName etc...
        //doesn't matter too much, but it makes for a lot of noise when stringifying synths.
        this.geneparms.push({ geneName: geneName, parmName: name }); //deal with these when freeing.
        this.setParm(name, def);
        //sclog("addgene " + geneName);
        const gn = geneName;
        const conf = { name: gn, def, min, max, delta, step, help, tag, free, internal };
        conf.addGui = this.geneHTMLGui; //false for very dynamic things / in exhibition / etc.
        addGene(conf);
        //addgene(geneName, def, min, max, delta, step, help, tag, free, internal);
        return geneName;
    };
    Synth.prototype.freeGenes = function () {
        if (!this.geneparms || !this.geneparms.length)
            return;
        const geneNames = this.geneparms.map(p => p.geneName);
        cleangenesall(geneNames, true, false);
    };
    //Synth.stagger = 10;   // number of frames over which all genes are sent
    let synthStagger = 10; ///XXX: I should get rid of this - or control it differently.
    //// make it only apply to genes, not other callback functions/mappings?
    Synth.prototype.autoUpdateGenes = function () {
        if (this.genesWillAutoUpdate)
            return;
        this.genesWillAutoUpdate = true;
        var syn = this;
        if (!syn.mappedParms)
            syn.mappedParms = {};
        if (!syn.geneparms)
            syn.geneparms = [];
        //Not sure why this was changed to pre/post frame; SVN rev 6404, 1/12/18, PJT...
        Maestro.on("synthUpdate", function Synth_autoUpdateGenes_inner() {
            //This logic could be handled at the Synth.setParm level (or indeed in parm setter property)
            //It should also be revised, possibly into a single 'status' field, either something like an enum,
            //or maybe bit masks?
            if (syn.killed) {
                //sclog(`${syn.type}#${syn.id} autoUpdateGenes callback cancelled as synth killed ${syn.killed}`);
                return true; //XXX: This returns true so that the update function will not run again.
            }
            if (syn.freed || syn.reloading || !syn.confirmedStartOn)
                return; //if we're 'freed' but not 'killed' it's probably because of a badValue or synthdef update causing reload
            //if ((syn.id+framenum) % Synth.stagger !== 0) return;
            var i = syn.geneparms.length;
            while (i--) {
                var pname = syn.geneparms[i].parmName;
                //if (syn.ignoredGenes && syn.ignoredGenes.indexOf(pname) !== -1) {}
                //if this parm is mapped, don't use gene (no longer using ignoredGenes...)
                if (syn.mappedParms && !syn.mappedParms[pname]) {
                    if ((syn.id + framenum) % synthStagger !== 0)
                        return;
                    var v = currentGenes[syn.geneparms[i].geneName];
                    if (isNaN(v)) {
                        var gd = genedefs[syn.geneparms[i].geneName];
                        if (gd === undefined) {
                            //I was trying to change things (or thinking of changing things) so that changes to genedefs.json would alter current instances
                            //(unless they had been overriden).  Bumped into this part of the code when hitting an exception after resetGenes()
                            ///... anyway, I may want something like a function to (re)set synth-related genedef ranges to values defined in genedefs.json
                            ///in cases like this where genedef is missing, we should be able to make new genedef based on geneName & parmName
                            log("unexpected synth mutator parm / no genedef " + syn.geneparms[i]);
                            return;
                        }
                        v = gd.def;
                    }
                    //if it has id it might be SCBus (or SCKBus, or whatever)
                    if (!(syn.parms[pname].id))
                        syn.setParm(pname, v);
                }
            }
            if (syn.mappedParms) {
                let bad = [];
                for (let k in syn.mappedParms) {
                    let f = syn.mappedParms[k];
                    let vv = f();
                    if (!NW_SC.isValidSynthParm(vv)) {
                        sclogE(`Function "${f.toString()}" returned "${vv}". Unmapping from ${syn.mutID}.${k}...`);
                        bad.push(k);
                    }
                    if (vv !== undefined)
                        syn.setParm(k, vv);
                }
                bad.forEach(k => delete syn.mappedParms[k]); //is that enough?
            }
        }); // end   Maestro.on("synthUpdate", function Synth_autoUpdateGenes_inner() {}
    };
    Synth.prototype.removeGene = function (parmName) {
        this.geneparms = _.reject(this.geneparms, function (g) {
            return g.parmName === parmName;
        });
    };
    Synth.prototype.removeGeneLike = function (nameFilter) {
        this.geneparms = _.reject(this.geneparms, function (g) {
            return g.parmName.indexOf(nameFilter) !== -1;
        });
    };
    /* Map a gene geneName from elsewhere in the system so that it controls a parameter parmName of this synth,
    with the range normalised genedefs[geneName].min/max will set this parmName to specified min, max */
    Synth.prototype.mapGene = function (geneName, parmName, min = 0, max = 1) {
        //if (!this.genesWillAutoUpdate) this.autoUpdateGenes(); //XXX: too soon when called from tranrule preParse ???
        const synth = this;
        if (!this.mutID) {
            this.mutID = nextMutsynthID(this.type);
            mutsynths[this.mutID] = this;
        }
        //    handling this in mapParmFn now...
        //    if (!this.mappedParms) this.mappedParms = {};
        //    if (!this.ignoredGenes) this.ignoredGenes = [];
        //    this.ignoredGenes.push(parmName);
        var k = geneName;
        var gd = genedefs[k]; //genedef of the controller
        //Should I assume that the parmName is a geneparm? In which case it will have a defined genedef
        //... and indeed, the potential for the referenced genedef to change in future if user overrides
        //which seems like it could be a useful feature.
        var parmGeneName = _.findWhere(this.geneparms, { parmName: parmName });
        //The current version of the logic could be confusing in that in cases where min/max are provided
        //for a parm that does have a corresponding genedef, they will be ignored. Should I change this
        //(very soon) to accept an input arg object (easy to set in tranrule)?
        //like Sin("pitch", {gn: "nstar", omin: 40, omax: 100})
        var pgd = parmGeneName ? genedefs[parmGeneName] : { min: min || 0, max: max || 1 };
        sclog("Mapping gene " + geneName + " to " + this.mutID + " (#" + this.id + ") ." + parmName);
        var linearMap = function () {
            var v = (currentGenes[k] - gd.min) / (gd.max - gd.min);
            v = pgd.min + v * (pgd.max - pgd.min);
            if (isNaN(v)) {
                sclogE(`NaN generated in linearMap of ${synth.mutID}.mapGene(${JSON.stringify(arguments)})`);
            }
            return v;
        };
        //this.mappedParms[parmName] = linearMap;
        this.mapParmFn(parmName, linearMap);
    };
    /* Map a parameter of this synth (parmName) to poll function fn for value on "synthUpdate" event */
    Synth.prototype.mapParmFn = function (parmName, fn) {
        if (!this.genesWillAutoUpdate)
            this.autoUpdateGenes(); //XXX: too soon when called from tranrule preParse ???
        if (!this.mappedParms)
            this.mappedParms = {};
        //PJT: not sure why these are commented out
        //    if (!this.ignoredGenes) this.ignoredGenes = [];
        //    this.ignoredGenes.push(parmName);
        this.mappedParms[parmName] = fn;
        return this;
    };
    /* Map parameters of this synth to control other parts of system.
      Provided argument is an object with
      { parmName: something, ... } 'something' might be a string, a function, a RegExp...
      which in the case of 'SynthBus' syntax is added as second argument to a synth message:
      Something a bit like
      SynthBus().LFO({}, {lfoVal: fn}) would take a value lfoVal sent back from SC and call a function fn with it...
    */
    Synth.prototype.mapOutArgs = function (outArgs) {
        this.setParm("replyActive", 1); //TODO only if relevant
        for (let k in outArgs) {
            let v = outArgs[k];
            if (!k.startsWith('/'))
                k = '/' + k;
            let fn;
            // if (k === '/done') { //maybe I can already have {/n_end: fn}?
            //     this.on('/n_end', );
            // }/ else
            if (typeof v === 'string') {
                //map to gene by name
                const gd = genedefs[v];
                if (!gd) {
                    sclog(`Couldn't find gene ${v} to map to.`);
                    continue;
                }
                gd.free = 0;
                //maybe something to be said for allowing range to be adjusted after the fact...
                //also, need to remember to free these messages
                const mapFn = createLinearMapFn(0, 1, gd.min, gd.max);
                this.on(k, (msg) => {
                    currentGenes[v] = mapFn(msg.args[2]);
                });
            }
            else if (typeof v === 'function') {
                //function v will be called with first argument msg.args[2] for the common case where we respond to scalar value
                //entire message will be passed as second argument so that more complex cases can be handled.
                //--> I could change implementation of synth.on so that was more generally the case...
                this.on(k, msg => v(msg.args[2], msg));
            }
            else if (v instanceof RegExp) {
                //map to multiple genes with names matching /RegExp/ ... I should experiment with this...
                const baseName = this.mutID + k + '->';
                Object.getOwnPropertyNames(genedefs).filter(n => v.test(n)).forEach(destGene => {
                    const gd = genedefs[destGene];
                    gd.free = 0;
                    //make genes controlling strength of mapping to each destination...
                    //XXX: might want to reconsider this, or have ways of specifying alternate behaviour?
                    //addgene(geneName, def, min, max, delta, step, help, tag, free, internal);
                    const n = baseName + destGene;
                    //not changing to addGene for now (Pompidou); probably not using for tadpoles anyway.
                    addgene(n + '.min', gd.min, gd.min, gd.max, gd.delta, gd.step);
                    addgene(n + '.max', gd.max, gd.min, gd.max, gd.delta, gd.step);
                    this.on(k, msg => {
                        const min = currentGenes[n + '.min'], max = currentGenes[n + '.max'];
                        currentGenes[destGene] = min + msg.args[2] * (max - min);
                    });
                });
            }
            else {
                //TODO we could deal with arrays of strings & functions...
                //also we could introduce genes for mutating the mappings
                sclog("don't know how to deal with " + typeof v + " as output from scsynth");
            }
        }
    };
    Synth.prototype.createGUIVR = function () {
        const synth = this;
        synth.defineParmProperties(); //<-- still needs revision... and not really used here ATM (?)
        const gui = dat.GUIVR.create(synth.type);
        gui.detachable = true;
        this.guivr = gui;
        //gui.position.set(-0.5, 0, 0);
        //add a checkbox for active to folder header
        //TODO: refactor folderHeader stuff
        const run = gui.add({ run: true }, 'run').showInFolderHeader().onChange(v => synth.run(v));
        gui.remove(run); //I wish I didn't feel I want to do bad things
        // in order for parms properties to be passed in, it will be better for them to be actual properties.
        // think about the different kinds of values parms can have; not just numbers, but mappings, functions etc.
        ////for now, let's try to do something pragmatic with geneparms...
        if (!synth.geneparms) {
            //sclog(`no geneparms for ${synth.type}`);
            return gui;
        }
        try {
            synth.geneparms.forEach((p, i) => {
                //p {parmName, geneName, min, max}
                //see also guiFromGene()
                const gd = genedefs[p.geneName];
                //userData key not matching below...
                gui.userData[p.parmName] = gui.add(currentGenes, p.geneName, gd.min, gd.max).listen().name(p.parmName).step(gd.step);
            });
        }
        catch (e) {
            sclog(e);
        }
        return gui;
    };
    /* Called by the watcher of genedefs.json when that is updated, updates genedefs associated */
    Synth.prototype.updateDefaultGenedefs = function (newGeneDefs) {
        newGeneDefs.forEach(d => {
            const parmName = d[0];
            //TODO: check if this parm is controlled by something other than direct gene
            //for now, just check if it's currently in geneparms...
            //but we should allow for new genes to be added.
            const gn = this.geneName(parmName);
            const gd = genedefs[gn];
            if (!gd) {
                //if there's no gd it could mean this instance of this synth type has the parm mapped
                //or it could mean that the parm has been newly introduced
                return;
            }
            //Each element specifies name, default, min, max, delta, step, comment/tag?
            //order should be right for spreading into addgene (but I'm not using that):
            geneBaseBounds(gn, d[2], d[3]);
            //adjust GUI ranges / tooltips (TODO) etc if present...
            const gui = this.guivr;
            if (gui) {
                if (gui.userData[parmName]) {
                    //what if parmName was newly added, we should add gene & gui element...
                    gui.userData[parmName].min(gd.min).max(gd.max).step(gd.step);
                }
                else {
                    //see also guiFromGene()
                    //userData key not matching below... (???<<< I don't remember writing that???)
                    gui.userData[parmName] = gui.add(currentGenes, gn, gd.min, gd.max).listen().name(parmName).step(gd.step);
                }
            }
        });
    };
    //unused(?)
    function createLinearMapFn(inMin, inMax, outMin, outMax) {
        return function (srcVal) {
            var v = (srcVal - inMin) / (inMax - inMin);
            return outMin + v * (outMax - outMin);
        };
    }
})();
// var interfaceSounds; // now declared in vars.ts, so available when no mutsynth
var mutSynthPendingCode = '';
whenSCReady(function whenSCReadycallback() {
    sclog("~~~~~~~~ scready ~~~~~~~~~");
    msgfixlog('tad+', 'in whenSCReady callback');
    interfaceSounds = {
        bip1: loadSound("audio/bip1.wav"),
        bip2: loadSound("audio/bip2.wav"),
        bsoft1: loadSound("audio/bsoft1.wav"),
        bsoft2: loadSound("audio/bsoft2.wav"),
        error: loadSound("audio/error.wav")
    };
    setMasterVolume(); // make sure volume is set as per GUI.
    //noiseRes = new NoiseContraption();//borkled?
    //TODO: get rid of this global freeverb thing (but do use some other reverb)
    //freeverb.addgenePerm("room", 0.9, 0.5, 1, 0.1, 0.01);
    //freeverb.addgenePerm("damp", 0.1, 0.0, 1, 0.1, 0.01);
    /** tad+ sequence when ok
0/0.611+182!!!!!!: tad+ tadpole.ts loaded
utils.js:144  0/0.930+15: tad+ startSCSynth
utils.js:144  0/1.347+5: tad+ in tad-fubu tranrule2
utils.js:144  1/1.579+7: tad+ monitorSynthdef triggering newHornSynth
utils.js:144  1/1.579+0: tad+ Maestro triggerCheck called with no listener newHornSynth
utils.js:144  1/1.579+0: tad+ Maestro triggerCheck complete newHornSynth
utils.js:144  1/1.601+22: tad+ startSession
utils.js:144  1/1.602+1: tad+ startSession done
utils.js:144  10/1.726+23: tad+ in tad-fubu tranrule2
utils.js:144  27/2.006+280!!!!!!: tad+ first message from oscWorker
utils.js:144  27/2.009+3: tad+ SC_initialOSCMessages
utils.js:144  94/7.995+5560!!!!!!: tad+ requesting /d_loadDir
utils.js:144  168/9.228+1233!!!!!!: tad+ scDone /d_loadDir
utils.js:144  168/9.259+31: tad+ in whenSCReady callback
utils.js:144  168/9.284+25: tad+ mutsynth.ts setting up Maestro.on('newHornSynth')
utils.js:144  168/9.299+7: tad+ tad+tad+ mutsynth triggering newHornSynth in whenSCReady callback
utils.js:144  168/9.299+0: tad+ newHornSynth trigger seen
utils.js:144  168/9.308+9: tad+ runSynthFunction //SynthBus----------------------------------------
utils.js:144  168/9.310+2: tad+ tad-fubu SynthBus pre loadModule("fubu")
utils.js:144  168/9.311+1: tad+ tad-fubu SynthBus post loadModule("fubu")
utils.js:144  168/9.314+3: tad+ Maestro triggerCheck complete newHornSynth
utils.js:144  174/9.382+68: tad+ tad.tad() called
utils.js:144  176/12.397+0: tad+ extra details +++++++++++
utils.js:144  176/13.245+0: tad+ extra details part 1 done, deferRender turned off
utils.js:144  197/21.286+21: tad+ extra details complete +++++++++++

############ failed
0/0.745+273!!!!!!: tad+ tadpole.ts loaded
utils.js:144  0/0.892+13: tad+ startSCSynth
utils.js:144  0/1.387+4: tad+ in tad-fubu tranrule2
utils.js:144  0/1.562+24: tad+ in tad-fubu tranrule2
utils.js:144  1/1.581+6: tad+ monitorSynthdef triggering newHornSynth
utils.js:144  1/1.581+0: tad+ Maestro triggerCheck called with no listener newHornSynth
utils.js:144  1/1.581+0: tad+ Maestro triggerCheck complete newHornSynth
utils.js:144  3/1.597+3: tad+ startSession
utils.js:144  3/1.598+1: tad+ startSession done
utils.js:144  10/1.715+22: tad+ first message from oscWorker
utils.js:144  10/1.717+2: tad+ SC_initialOSCMessages
     */
    hornSynth();
    if (mutSynthPendingCode) {
        msgfixlog('tad+', 'tad+tad+ mutsynth triggering newHornSynth in whenSCReady callback'); // usual place to get things working right?
        Maestro.triggerCheck('newHornSynth');
    }
    return; //don't make these default synths. TODO: cleanup the code.
});
//TODO: encapsulation etc.
var SCBuf; //global for quick & dirty access in horn. TODO: provide proper context when evaluating code.
// var SynthBus;    // now declared in vars.ts, so available when no mutsynth
//var SCBuf;
let masterMeter;
if (searchValues.audio)
    (function _setMasterMeter() { if (osc)
        masterMeter = new VUMeter2();
    else
        setTimeout(_setMasterMeter, 1); })();
function hornSynth() {
    sclog("######## hornSynth init #########");
    const DONE_SIGNAL = "_DONE_";
    // import mpe.js & midi.js
    // TODO: more ESM style, move to separate file, rewrite mpe examples & provide better midi control.
    (function loadMidiScripts() {
        const mpe = document.createElement('script');
        mpe.src = 'JSdeps/mpe.min.js';
        mpe.async = false;
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(mpe, firstScriptTag);
        const midi = document.createElement('script');
        midi.src = 'JS/midi.js';
        midi.async = false;
        firstScriptTag.parentNode.insertBefore(midi, firstScriptTag);
    })();
    SynthBus = function Bus(name, n, busID, addOpt = naddTail(rootSynthNode)) {
        if (!name)
            name = (nextBusName++).toString();
        if (bussesByName[name])
            return bussesByName[name];
        else {
            const b = bussesByName[name] = new SCBus(name, n, busID);
            const free = b.free; //hack..
            //now using groups more heavily, ** which could alter behaviour of existing code **
            //in particular, if it was relying on
            //I could try to opt in to this via some sort of flag???
            b.group = new TSCGroup(name, addOpt);
            b.free = (msg = 'SynthBus.free()', synthsAlreadyFreed = false) => {
                if (b.zombie) {
                    sclogE(`Bus '${name}' already freed because of '${b.zombie}'...`);
                    return;
                }
                free.apply(b, [msg, synthsAlreadyFreed]);
                b.zombie = msg;
                if (synthsAlreadyFreed)
                    b.group.killed = msg;
                b.group.free(msg);
                //TODO free parent. (?)
                //delete bussesByName[name];
            };
            return b;
        }
    };
    //SynthBus, but using a different default add target...
    //exposed via window.msynthScope.EffectBus for now...
    let EffectBus = function Bus(name, n, busID, addOpt = naddTail(rootSCFXNode)) {
        return SynthBus(name, n, busID, addOpt);
    };
    // CtrlBus does not appear to be used anywhere, and uses undefined nextKBusName.
    // so ... commented out for now, sjpt 24 April 19
    // const CtrlBus = function KBus(name, n) {
    //     //also consider Groups, maybe SynthBus() should be a pgroup & a bus...
    //     if (!name) name = nextKBusName++;
    //     if (kbussesByName[name]) return kbussesByName[name];
    //     else {
    //         return kbussesByName[name] = new SCKBus(name, n);
    //     }
    // };
    //this shouldn't really go on SCBus prototype; if it were used in wrong
    //context (outside hornSynth) we might get confused with housekeeping, use of 'mutID' etc.
    SCBus.prototype.Fork = function (label = "") {
        //we should remember that this is the node we want to go from for this fork...
        const s = this.synths;
        let name = (s.length ? this.synths[this.synths.length - 1].mutID : this.name) + `_fork[${label}]`;
        let id = 0, baseName = name;
        while (bussesByName[name])
            name = baseName + '_' + ++id;
        //const newBus = SynthBus(name, this.n);
        const newBus = SynthBus(name, this.n, undefined, naddTail(this.group)); //hopefully this group hierarchy is correct...
        const forkSynthFn = newBus['__fork' + this.n]; //1, 2 & 4 are valid, could write some more, or combine them...
        if (forkSynthFn)
            return forkSynthFn.call(newBus, { inBus: this.id });
        else {
            sclog("Failed to make fork " + name + "... don't understand " + this.n + " channels");
            newBus.free('failed to fork ' + this.n);
        }
    };
    /**
     * Sums a set of busses.  Must all have same number of channels, which can for now be 1 (mono), 2 (stereo) or 4 (quad - ideally B-format if I work that out)
     * Argument: varargs SCBusses or single Array of SCBus (probably prefer latter really)
     *semantically, we don't want this on a bus; it should make a new bus. (will make a new function that makes a bus then calls this on it)
     */
    SCBus.prototype.Join = function (...busses) {
        if (Array.isArray(busses[0]))
            busses = busses[0];
        //only accept if all busses have same number of channels as us.
        const joinBusses = busses.filter(b => b.n === this.n).map(b => { b.isJoinBus = true; return b; });
        const rejectBusses = busses.filter(b => b.n !== this.n).map(b => [b.name, b.n]);
        const joinFun1 = this[`__join${this.n}_1`];
        const joinFun2 = this[`__join${this.n}_2`];
        const joinFun4 = this[`__join${this.n}_4`];
        if (rejectBusses.length)
            sclogE(`Couldn't join all on "${this.name}[${this.n}]", mismatching channel numbers on : ${JSON.stringify(rejectBusses, null, 2)}`);
        while (joinBusses.length >= 4) {
            joinFun4.call(this, { inBus: joinBusses.splice(0, 4) });
        }
        while (joinBusses.length >= 2) {
            joinFun2.call(this, { inBus: joinBusses.splice(0, 2) });
        }
        if (joinBusses.length)
            joinFun1.call(this, { inBus: joinBusses.splice(0, 1) }); //don't map out id value - we'll think the array should turn into an SCBuffer...
        sclog(`done join...`);
        return this;
    };
    function Join(nameOrBus, ...busses) {
        if (Array.isArray(busses[0]))
            busses = busses[0];
        let name;
        if (typeof nameOrBus === 'string') {
            name = nameOrBus;
        }
        else {
            busses = nameOrBus; //.unshift(nameOrBus);
            name = `Join[${busses.map(b => b.name).join('+')}]`;
        }
        if (!busses.length) {
            sclogE("No busses specified for Join " + name);
        }
        //copy Fork logic for making new Bus;
        let baseName = name, id = 0;
        while (bussesByName[name])
            name = baseName + '_' + ++id;
        const n = busses[0].n;
        const rejectBusses = busses.filter(b => b.n !== n).map(b => [b.name, b.n]);
        if (rejectBusses.length)
            sclogE(`Couldn't join all on "${name}", mismatching channel numbers : \n${JSON.stringify(rejectBusses, null, 2)}`);
        return SynthBus(name, n).Join(busses);
    }
    /** Draft spec:  probably would need ATK (for binarual decode at least), more up-to-date SC etc than current...
     * Return a bus for B-Format Ambisonics. If a bus with the given name already exists, that will be used.
     * No argument for name will use a default "AmbiMaster" bus.
     * TODO: maybe use SynthDef naming convention __ambi_* and make it so that thing returned by AmbiBus() only
     * has related methods.
     * Question: Do we prefer to say synth.ToAmbi(spaceParms) or ambi.AddMono(synth, spaceParms) ?
     * How are spaceParms specified?  For VR use case, we want to think of
     * mono(+) signals located in world space (cartesian coordinates),
     * which will be encoded to B-format & accumulated into an AmbiBus
     * -->which will have overall head-space transform & binaural encoder applied?<--
     * Before encoding signal, distance from head must be taken into account, to be used for
     * attenuation (possibly LPF as well as amplitude falloff)
     *
     * The B-format signal
     */
    function AmbiBus(name = "AmbiMaster") {
        //review... main decode is ordered before everything.
        //currently only using one decode, still quite like the idea of other fx
        //! but not important priority !
        const b = SynthBus(name, 4);
        const g = b.group;
        g.order(naddTail(rootAmbiNode.id)); //TODO: allow passing node directly rather than id.
        return b;
    }
    //TODO: ambi effect bus...
    /**
     * Make an SCBuffer, keep track & free when running new synth code. Re-use if shared between synths.
     */
    SCBuf = function HornBuf(data) {
        //using data as key means it'll automatically consolidate if, for example, the same data is used multiple times.
        //hypothetically, that could have unintended consequences if contents are later mutated.
        if (hornBuffers[data])
            return hornBuffers[data];
        //Shortly, allow allocating buffers to record into, loading sound files... maybe these things'd work anyway.
        var buf = new SCBuffer(data);
        hornBuffers[data] = buf;
        return buf;
    };
    const HornSetP = HW.HornSet.prototype;
    let hornBuffers = {}, hornSynthIDs = {}, guis = [], usedGeneNames = {}, kbussesByName = {}, mutsynthScene, bussesByName = {}, synthsByBus = {}, nextBusName = 0, 
    //updateFunctions = [], // making this use seq maestro event
    mpeFunctions = [], /// --> TODO use seq maestro event.
    seq, rootSCNode, rootSynthNode, rootSCFXNode, rootAmbiNode;
    //var lastSynth = null; //bad smell
    const mainGUI = dat.GUIVR.create("Synths");
    // V.gui.add(mainGUI); //undefined at this point
    //mainGUI.scale.set(100, 100, 100);
    mainGUI.visible = false;
    NW_SC.mainGUI = mainGUI;
    let currLoadingFile = false, preppedForNewSynth = true;
    Maestro.on('beginLoadOao', e => {
        const fn = e.eventParms;
        sclog("#####################################################################");
        sclog(`######### loadOao( ${fn} )\n`);
        currLoadingFile = fn;
        preppedForNewSynth = true;
    });
    /// at some point in between, newHornSynth will (probably) be called
    Maestro.on('doneLoadOao', e => {
        currLoadingFile = false;
        const fn = e.eventParms;
        sclog(`######### finished loadOao( ${fn} )\n`);
        sclog("#####################################################################");
    });
    let lastTime = performance.now();
    let synthUpdateDT = 0, frameNum = 0;
    Maestro.on("synthUpdate", evt => {
        if (!seq)
            return;
        let t = performance.now();
        synthUpdateDT = t - lastTime;
        lastTime = t;
        frameNum++;
        var di = slots && (slots[0] || slots[1]).dispobj;
        if (di)
            var xx = di.rtback; //hack: accessing this makes sure that slot will double buffer
        //updateFunctions.forEach(f=>f());
        //brain no make good code. (!!!!) this DONE_SIGNAL thing is ungood.
        //if this changes to pass an event f(event), will that break things?
        //indeed, if I make this & corresponding onUpdate() method just use 'seq' local maestro instance,
        // should be more regular (doesn't look like my existing code strongly expects no argument to be passed,
        // sometimes I find myself doing things like directly add a buffer 'play' function, which then gets an
        // incompatible argument.
        //updateFunctions = updateFunctions.map(f => f()===DONE_SIGNAL ? 0 : f).filter(v => v);
        seq.trigger('synthUpdate');
        processAllSynthBundles();
    });
    function processAllSynthBundles() {
        //processBundle on all synths. Add a method on SC(K)Bus for that...
        //I should take care of order; this should be the last part of (or just after) synthUpdate
        for (var k in bussesByName) {
            bussesByName[k].processBundle();
        }
        for (var b in kbussesByName) {
            kbussesByName[b].processBundle();
        }
    }
    Maestro.on('mpe', evt => {
        startOSCBundle();
        mpeFunctions.forEach(f => {
            try {
                f(evt.eventParms);
            }
            catch (e) {
                sclogE(`Exception in mpeFunction: ` + e);
            }
        });
        flushOSCBundle();
    });
    //this should now only happen when there really is new code that needs executing
    //which will be found in mutSynthPendingCode
    ///<<<< but what are the rules for multiple dispobjs? >>>>
    let lastNewSynthTime;
    msgfixlog('tad+', "mutsynth.ts setting up Maestro.on('newHornSynth')");
    Maestro.on('newHornSynth', () => {
        msgfixlog('tad+', "newHornSynth trigger seen");
        if (searchValues.rerun)
            location.href = location.href;
        //we still need another level of care, though.
        //(nb, for now, we're desparately trying to avoid running newHornSynth more than once while loading.
        //In future, there may be something more like an 'environment' per dispObj, represented by SC Groups -
        //PGroups if supernova is successful - with clear ways to start/stop processing of them, or
        //spatialise according to where the associated object is in some VR Mutation interface)
        //Much of that should be similar regardless of whether the code differs, or only parameter values.
        if (currLoadingFile) { //if we're not currently loading, we believe we'll be ok to continue
            if (!preppedForNewSynth)
                return;
            preppedForNewSynth = false;
        }
        else {
            //make sure that all gene sets know about our new code in case we want to save...
            //TODO: proper support for different objects / code / genes...
            //const t = currentGenes.tranrule = document.getElementById("tranrulebox").textContent;
            //Object.values(currentObjects).forEach(o => { if (o.genes) o.genes.tranrule = t});
            // sjpt 30 Oct 2022, we are overwriting new tranrules when pasting genes
            // presumably we expect the tranrulebox to have the correct audio synthdefs by here, but we want our old graphics tranrules
            // so we split and resynthesize, under the assumption that all audio tranrules are the same ....
            const box = document.getElementById("tranrulebox");
            const atranrule = box.textContent;
            const audiotr = HornSet.makeParts(atranrule)[1];
            box.textContent = currentGenes.tranrule = HornSet.makeParts(currentGenes.tranrule)[0] + '\n\n' + audiotr;
            Object.values(currentObjects).forEach(o => { if (o.genes)
                o.genes.tranrule = HornSet.makeParts(o.genes.tranrule)[0] + '\n\n' + audiotr; });
        }
        //"Preparing to ruin new Synth code..." Freudian typo?
        let d = new Date();
        if (lastNewSynthTime) {
            let dd = d.getTime() - lastNewSynthTime;
            sclog(`Previous code ran for ${dd / (60 * 1000)}m...`);
        }
        lastNewSynthTime = d.getTime();
        let dstr = `${d.getHours()}:${d.getMinutes()}.${d.getSeconds()}`;
        //sclog(`${dstr}: Preparing to run new Synth code ::: \n\n  ${mutSynthPendingCode.replace(/\n/g, '\n  ')}\n\n...`);
        sclog(`${dstr}: Preparing to run new Synth code ::: \n/////------------------------\n `);
        sclog(mutSynthPendingCode, LogLevel.Code);
        sclog('\n/////------------------------\n');
        sclog("TODO::: don't start new sound until we're sure parameters are up to date?");
        //In case we have an exception and want to roll back before cleaning all memory
        const previousUsedGeneNames = usedGeneNames;
        function cleanupSynthBus(reason) {
            sclog("Resetting SynthBus stuff...");
            try {
                if (rootSCNode) {
                    rootSCNode.free(reason); //this should be enough...need to make sure busses are freed.
                }
                // free busses, kbusses
                for (const i in bussesByName) {
                    bussesByName[i].free(reason, true);
                }
                for (const i in kbussesByName) {
                    kbussesByName[i].free(reason, true);
                }
                /// XXX: not really using these... but not part of node hierarchy, so best make sure we free...
                for (const i in hornBuffers) {
                    hornBuffers[i].free();
                    hornBuffers[i].zombie = true;
                }
                //TODO: clean up detatched GUIs properly. Also bug fix this...
                //(at dat.GUIVR level, graphics that are still visible while controllers removed from system)...
                guis.forEach(g => {
                    mainGUI.remove(g);
                    if (g.detachedParent)
                        g.parent.remove(g);
                });
                $('#scScopes').empty();
                mainGUI.visible = false;
                if (mutsynthScene)
                    V.rawscene.remove(mutsynthScene);
                if (NW_SC.autoRecord) { //TODO: Also *definitely* save tranrule alongside.
                    //Perhaps complete OSC as well / sample of genes... Also implement offline rendering.
                    if (!scRecorder)
                        startAudioRecording(); //<<<<--- how about providing a link to the sound file in the log as well?
                    else
                        scRecorder.closeOldStartNew();
                }
            }
            catch (e) {
                sclogE("!!! Exception while freeing synths / busses " + e.stack);
                throwe(e);
            }
            finally {
                //There have been times where I get exceptions in some of the freeeing...
                rootSCNode = new TSCGroup('mutsynthRoot');
                rootSynthNode = new TSCGroup('mutsynthRootSynth', naddHead(rootSCNode));
                rootSCFXNode = new TSCGroup('mutsynthRootFX', naddTail(rootSCNode));
                //for now, I know that I want some FX that feed into ambi...
                //in future, I might want ambi that feeds into FX, in which case this may need revision.
                rootAmbiNode = new TSCGroup('mutsynthRootFX', naddTail(rootSCNode));
                hornBuffers = [];
                hornSynthIDs = {};
                guis = [];
                usedGeneNames = {};
                kbussesByName = {};
                bussesByName = {};
                synthsByBus = {};
                nextBusName = 0;
                // lastSynth = null;
                frameNum = 0;
                //updateFunctions = [];
                mpeFunctions = [];
                if (seq) {
                    seq.stop(); //is it enough?
                    //"_name" is a clue that this is not external interface
                    //seq._callbacks = {}; //won't work; was set to a reference of local value.
                    seq.terminate();
                }
                seq = new MaestroConstructor(true);
                seq.on('prepareBundle', processAllSynthBundles);
                Maestro.on('animateStart', () => seq.trigger('animateStart'));
                Maestro.on('postFrame', () => seq.trigger('postFrame'));
                mutsynthScene = new THREE.Group();
                mutsynthScene.name = "mutsynthScene";
                mutsynthScene.scale.set(1, 1, 1);
                V.rawscene.add(mutsynthScene);
                W.renderMainObject = true; //causes side effects if previously set to false.
                if (masterMeter)
                    masterMeter.free();
                masterMeter = new VUMeter2();
            }
        }
        try {
            //Bundling OSC helps to ensure that when it tries to do /s_new relative to recently created nodes,
            //they aren't missing...
            startOSCBundle();
            cleanupSynthBus("new synth code");
            //TODO: sync / await / promise / something
            //to allow old resources to be unclaimed before running new code... (nb, switch to SuperColliderJS)
            sclog("executing code...");
            const ambiBus = AmbiBus();
            //not sure where I can put it with current group hierarchy to guarantee order after effects
            //obvious answer is to have a more explicit group...
            //writeOSC('/n_move', [ambiBus.group.id])
            runSynthFunction(mutSynthPendingCode);
            //seq.start(); //only do this manually?
            //fade in... (not tracked as part of SynthBus structures etc)
            const fadeIn = new Synth('__fadeIn2', ["dur", NW_SC.hornFadeTime], naddTail(0));
            sclog(`user code ok... ${freeNodeIDs.freeCount()} nodes available.`);
            //calling this after rest of code used to mean the decode would be after all of the
            //runSynthFunction synths. This is altered by use of groups.
            ambiBus.__ambi_decodeBinaural({ outBus: 0 }); //XXX
            flashSCConsole(false);
            sclog("... success! (well, no uncaught exceptions anyway...)"); //TODO: automatically save synthFunction output in logdir, (with lib version?)
        }
        catch (e) {
            sclogE(`!!! Exception running synth code: "${e}"`);
            sclogE(`"${e.stack.replace(/\n/, "<br />")}"`); //review again?∆
            cleanupSynthBus(e);
            sclog(`keeping usedGeneNames from before around in case the genes actually had useful information`);
            sclog(`:: [${Object.keys(previousUsedGeneNames).join(', ')}]`);
            usedGeneNames = previousUsedGeneNames; //<<<<------- anything that doesn't happen immediately won't be caught by this, could review anyway.
        }
        finally {
            //cleangenesall();
            flushOSCBundle(); //if runSynthFunction is really async, this logic will be messed up.
        }
    }); //on(newHornSynth)
    async function runSynthFunction(userCode) {
        msgfixlog('tad+', 'runSynthFunction', userCode.substring(0, 50));
        if (userCode === 'no synth code yet')
            console.error('runSynthFunction called with no user code');
        //Is this a good way to create a local execution scope etc?
        //.... given the general shape of our code ....
        //this (at time of writing, eval()) can't make things much worse (plenty of damage could be already be done at global scope)
        //currently just defining some things in here, then using eval() rather than Function constructor
        //so that we have access to this scope, and things defined as such can refer to usedGeneNames etc
        //as appropriate.
        //Proxy could maybe make for better design involving not allowing users to run rough-shod over the system?
        //Function(userCode)();
        //it's late, I'm tired, and frankly I'm starting to show off.
        //https://stackoverflow.com/questions/48575697/specify-object-to-use-as-global-scope-in-new-function-constructor
        // const callable = Function(`with(this) { ${userCode} }`);
        // callable.call(new Proxy({}, {
        //     get: function(obj, prop) {
        //     }
        // })
        /// in place of import() which relied on running a separate rollup script
        // server should now be responsible for running rollup during development.
        // At exhibition runtime, this can be simpler.
        async function loadModule(name) {
            tranModuleLoader(name);
        }
        //////////////////////
        //////////////////////
        //////// Functions & things for use in SynthBus code
        //////// Before using these too heavily, I should think about forward compatibility.
        //////// But not too much.
        //////// I don't want to live fast and die young, nor wait until I'm old before I realise
        //////// that life is short anyway and should have been lived earlier.
        // (RIP JR)
        //////// Proxy could probably be arranged to have different configurations of provided
        //////// functions. So when loading a file with old and deprecated stuff, it would
        //////// load in the appropriate data for how proxy should behave for that version.
        ////////// These files could live in a new '.oaz' zip archive
        ////////// Although that would entail redundancy, and I suppose also potential re-opening of
        ////////// security issues if this were ever in some kind of public gallery.
        ////////// (at the moment, everything is wide open, so...)
        //////// Also, anything I want to be usable in horn will need to be elsewhere...
        //////// but that could be done by hoisting these later...
        //////// and that's all part of the process of revising the architecture
        ////////////
        //////// I'd be tempted to have some kind of help system in the code editor as well...
        //TODO : work out how to look up in proper genome & test implications etc....
        //const genes = currentGenes;
        /** 'Invoke' a gene with the given properties.
         * Returns a function to be evaluated (be careful not to do maths etc without evaluating).
         * It might be a new gene, in which case it will use given min/max
         * If the name already exists as a gene, it
         *
         *
         * f = () => { g(hn+'_bend') + 3 }; //this won't work well if g() returns a function to be evaluated...
         * ... but ...
         * bend = g(hn+'_bend')
         * f = () => { bend() + 3 } //doesn't look too bad??
         */
        ///--->>> this cause us to stop receiving OSC when running in browser???
        //(probably not this, but something use of this causes in certain circumstance)
        function g(gn, def = 0, min = 0, max = 1) {
            const existingGD = genedefs[gn];
            //we only want to do that if it's one we invented in previous iterration.
            //need to be careful about using our usedGeneNames
            let isNew = existingGD === undefined;
            //if it existed before, and is one of ours, but so far not used this time around, it is "new"
            //make sure we really get new range...
            if (!isNew && existingGD.fromSynthCode && !usedGeneNames[gn])
                isNew = true;
            if (isNew) {
                //sclog(`Adding g('${gn}', ${def}, ${min}, ${max})`);
                const conf = { name: gn, def, min, max };
                conf.addGui = false;
                addGene(conf);
                //addgene(name, def, min, max);
            }
            usedGeneNames[gn] = true;
            const gd = genedefs[gn];
            if (isNew) {
                gd.fromSynthCode = true;
                geneBounds(gn, min, max);
                gd.tag = "audio usercode";
            }
            //else sclog(`Making a g("${name}") mapping to original:\n ${JSON.stringify(gd)}... YMMV...`);
            const fn = function (outMin, outMax) {
                //TODO : really decide rules about when and how to normalise / scale ranges.
                //TODO : work out how to look up in proper genome.<<<
                const n = currentGenes[gn];
                if (outMin !== undefined || outMax !== undefined)
                    return linlin(n, gd.min, gd.max, outMin, outMax);
                return n;
            };
            ///if we're remapping, let's assume we want to normalise...CONFUSINGLY we're doing it anyway, internally...
            //the dontNormalise flag prevents some double-normalisation or... it's just a holdover from before anyway.
            // (although passing g(name) directly to parm in that case may be pointless)
            fn.dontNormalise = true;
            fn.geneName = gn;
            fn.geneDef = gd;
            //fn.norm = () => //just do "g('name')(0, 1)" if you want to take some existing gene and normalise it
            return fn;
        }
        //be more explicit about only reading / writing a gene
        function fromGene(name) {
        }
        function toGene(name, fnOrValue) {
            //could be nice to chain functions ~like:
            //SynthBus().ImpulseF({freq: 5}, {'/trig': v => lag(v).toGene('fluorescV')})
            //more likely:
            //SynthBus().ImpulseF({freq: 5}, {'/trig': v => toGene('fluorescV', lag(v)) }) <---------------
            //who pulls and who pushes? if it's something like a /trig, we should respond ASAP...
            //so in that case, rather than this function setting up something to be called in onUpdate
            //we should return a function that the synth can call when *it* wants to...
            //but something like lag will want to update at ~graphics rate, and expects to pull values from an input fn...
            //....
            // what about if rather than going trig => lag => gene, we had
            // trig => gene    in parallel with    lag(gene)
            // so trig could instantaneously set gene value, and lag would cause it to decay.
            // that isn't exactly right (certainly not equivalent), but may be close to something I'd often want
            // (decaying values) in response to single trigger from server
            // I'm sure I'm overthinking this...
            // If it's to control graphics, then the /trig doesn't have to be visualised any earlier than next frame.
            //> anything wanting to respond more sensitively should be configured to do so within scsynth server?
            // still, something must be done to resolve 'push from server' vs 'pull from onUpdate'.
            // What are the common use-cases?
            //
            // Synth is continuously feeding back scalar from something like an LFO, env follower.
            // Synth is intermittently feeding back triggers (like a simple bang)
            // Synth is intermittently feeding back triggered event with some value
            //     (that may or may not be scalar - may be more structured info, or vector? something like grain parms?)
            // Synth is continuously feeding back vector (FFT, MFCC, wave)
            //     (will be somewhat irregular in practice)
            // MPE data is coming in
            if (typeof fnOrValue === 'function') {
                const fn = fnOrValue;
                //onUpdate(() => currentGenes[name] = fn())
                return v => currentGenes[name] = v;
            }
        }
        function differentiate(fun) {
            //nb, I could have scsynth side stuff for all of this as well... taking a bus arg...
            //using a single dedicated bus / ReplaceOut / appropriate node order etc.
            //probably worth implementing Control rate busses before doing that.
            let lastVal = fun(), dv = 0, lastFrameNum = frameNum;
            function update() {
                if (lastFrameNum === frameNum)
                    return dv;
                lastFrameNum = frameNum;
                let val = fun();
                dv = (val - lastVal) * 1000 / synthUpdateDT;
                lastVal = val;
                return dv;
            }
            return update;
        }
        function lag(fun, halfLife = 1000) {
            let lastVal = fun(), lastFrameNum = frameNum;
            const type = typeof (halfLife);
            if (type !== 'function' && type !== 'number') {
                sclogE(`Unknown type "${type}" for lag(${String(fun)}, ${String(halfLife)})`);
            }
            let lt;
            if (type === 'number') {
                lt = halfLife;
            }
            return () => {
                if (lastFrameNum === frameNum)
                    return lastVal;
                lastFrameNum = frameNum;
                let v = fun();
                if (type === 'function')
                    lt = halfLife();
                let a0 = Math.pow(0.5, synthUpdateDT / lt);
                let b1 = 1 - a0;
                return lastVal = lastVal * a0 + v * b1;
            };
        }
        //why does this jump suddenly
        function differentiateSmooth(fun, halfLife = 1000) {
            return lag(differentiate(fun), halfLife);
        }
        function zeroCross(testFun, upFun, downFun) {
        }
        function onUpdate(fun) {
            //updateFunctions.push(fun);
            seq.on('synthUpdate', fun);
        }
        /** get called back with a list of activeNotes */
        function onMpe(fun) {
            mpeFunctions.push(fun);
        }
        // //SubGene / SynthGene that will have structured genename based on synth.mutID + .pname. Will then be available in GUIVR etc
        // //(needs some logic in the synth side when it recieves one of these to set it up appropriately)
        // //It might even be plausible to have sg's not directly applied to properties, but within
        // //higher fns, still be associated with the synth. I may be getting carried away... but it seems
        // //like something I might want soonish.
        // function sg(pname, def, min=0, max=1) {
        //     return {
        //         subGeneFn: function(parent) { parent.addgene(pname, def, min, max); }
        //     }
        // }
        ///// BETTER IDEA::::
        // Allow a genedef argument to Synth parm value that will always be used in place of 'genedefs' defaults.
        // actually isn't that more-or-less the same idea?
        // Anyway, make sure userChoice genedef has precedence over genedefs.json
        function meanLightStrength(nLights = 3) {
            var s = 0;
            //TODO : look up in proper genome.
            for (let i = 0; i < nLights; i++)
                s += currentGenes["light" + i + "s"];
            return s / nLights;
        }
        //These are of general use and now moved to a wider scope. --> tonal.ts
        //this needs Electron >6 to work as otherwise modules are served without MIME type.
        //https://stackoverflow.com/questions/51113097/electron-es6-module-import/51126482
        //https://gist.github.com/smotaal/f1e6dbb5c0420bfd585874bd29f11c43
        // const tonal = await import('../JSTS/tonal.js');
        // const {midiFreq, freqMidi, ampDb, dbAmp, mtof, ftom} = tonal;
        function ratioMidi(r) { return 12 * Math.log2(r); }
        function midiRatio(transposition) { return Math.pow(2, transposition / 12); }
        function midiFreq(pitch) { return 440 * Math.pow(2, (pitch - 69) / 12); }
        function freqMidi(freq) { return 69 + (12 * Math.log2(freq / 440)); }
        let mtof = midiFreq, ftom = freqMidi;
        function dbAmp(db) { return Math.pow(10, db / 20); }
        function ampDb(amp) { return 20 * Math.log10(amp); }
        //maybe I could use fnF naming convention for higher-order fn generally.
        function linlinF(inMin = 0, inMax = 1, outMin = 0, outMax = 1) {
            return (n = 0) => (n - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
        }
        function linlin(n, inMin = 0, inMax = 1, outMin = 0, outMax = 1) {
            return (n - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
        }
        //sketching out set of useful functions
        //although the idea of just being able to make things generate 0-1 and plug them in
        //seems appealing... generally when you're writing a funciton, it's because you have specific ideas
        //about the result... and most of the ranges we define in genedefs.json are arbitrary
        //so maybe it's better to set the impetus on user to explicitly say when they want things normalised
        function nfun() { }
        //Do something with events, that will be cleaned up & appropriately scoped to particular object
        function on(key, callback) {
            //it's really happening...
            seq.on(key, callback);
        }
        //make something that'll appear in GUI... see sg()
        function slider() {
        }
        let mutNode = mutsynthScene;
        let transformStack = [];
        function pushTransform() {
            transformStack.push(mutNode);
            let newNode = new THREE.Group();
            mutNode.add(newNode);
            mutNode = newNode;
            return mutNode;
        }
        function popTransform() {
            mutNode = transformStack.pop();
        }
        const scratchVector = new THREE.Vector3();
        //TODO: function input to transforms? or just take the returned value & operate on that.
        //in fact, probably best to just use pushTransform & avoid heavy transform hierarchy
        function translate(x = 0, y = 0, z = 0) {
            let node = new THREE.Group();
            mutNode.add(node);
            mutNode = node;
            if (!x.isVector3) {
                scratchVector.set(x, y, z);
                x = scratchVector;
            }
            mutNode.position.add(x);
            return mutNode;
        }
        function rotate(x = 0, y = 0, z = 0) {
            let node = new THREE.Group();
            mutNode.add(node);
            mutNode = node;
            if (!x.isVector3) {
                scratchVector.set(x, y, z);
                x = scratchVector;
            }
            mutNode.rotation.x = x.x;
            mutNode.rotation.y = x.y;
            mutNode.rotation.z = x.z;
            return mutNode;
        }
        function scale(x = 0, y, z) {
            let node = new THREE.Group();
            mutNode.add(node);
            mutNode = node;
            if (!x.isVector3) {
                if (y === undefined)
                    y = x;
                if (z === undefined)
                    z = x;
                scratchVector.set(x, y, z);
                x = scratchVector;
            }
            mutNode.scale.multiply(x);
            return mutNode;
        }
        function feedbackTexture() {
            //if (!V.renderfeed) V.renderfeed = true;
            //return cMap.render Fixview(genes)[1];
            return slots[0].dispobj.rt.texture;
        }
        function applyFeedback(obj) {
            const mat = obj.material;
            mat.map = slots[0].dispobj.rtback.texture;
            onUpdate(() => mat.map = feedbackTexture());
            return obj;
        }
        function defaultMaterial() {
            return new THREE.MeshBasicMaterial({
                depthWrite: false, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide, fog: false
            });
        }
        function Box(size = 1) {
            const geo = new THREE.BoxGeometry(size, size, size);
            const mat = defaultMaterial();
            const mesh = new THREE.Mesh(geo, mat);
            mutNode.add(mesh);
            //V.rawscene.add(mesh);
            return mesh;
        }
        const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
        function Sphere(size = 0.1) {
            const mat = defaultMaterial();
            const mesh = new THREE.Mesh(sphereGeometry, mat);
            mesh.scale.set(size, size, size);
            mutNode.add(mesh);
            return mesh;
        }
        function HornPulse(prefix, crp = 0) {
            const p = prefix.endsWith('_') ? prefix.substring(0, prefix.length - 1) : prefix;
            // return SynthBus(p + 'HornPulse').__HornPulse({
            //     pulseRate:     () => { return G[p + '_pulserate']      },
            //     pulsePerHorn:  () => { return G[p + '_pulseperhorn']   },
            //     pulsePow:      () => { return G[p + '_pulsepow']       },
            //     pulseScale:    () => { return G[p + '_pulsescale']     },
            //     pulseModRate:  () => { return G[p + '_pulsemodrate']   },
            //     pulseModScale: () => { return G[p + '_pulsemodscale']  }
            // });
            ///XXX: I had a couple of samples where I expected the result to be a SynthBus rather than fn
            //so if hitting an exception after this, adjust appropriately...
            let b = () => {
                let t = G.time, pRate = G[p + '_pulserate'], pScale = G[p + '_pulsescale'], pPerHorn = G[p + '_pulseperhorn'], pPow = G[p + '_pulsepow'], pModRate = G[p + '_pulsemodrate'], pModScale = G[p + '_pulsemodscale'];
                let mod = Math.sin(t * pRate * pModRate); //no relation to PI here?
                mod = (pModScale / Math.max(pModRate, 0.01)) * mod;
                let phase = (2 * Math.PI) * t * pRate - (crp * pPerHorn) + mod;
                return pScale * Math.pow(0.5 + 0.5 * Math.sin(phase), pPow);
            };
            return b;
        }
        /** New version of HeadSpace (Dec19), old version(s) were never quite right.
         *
         * 'source' should always be a THREE Object3D, default mutNode (with associated translation etc).
         * So it can always work out its world position, and later we may use orientation as well.
         * No messing with coersion of different argument types.
         *
         * Declaration inside runSynthFunction scope for possibly dubious reason that maybe
         * some day, it'll make sense to save objects which know which version of those functions they use
         * which might help allow us to redesign without breaking old examples???
        */
        SCBus.prototype.ObjectHeadSpace = function (source = mutNode, { logLabel = undefined, distPow = 0.5 } = {}) {
            //const synthArgs = {}; //all args will be pushed to synth in onUpdate?
            const worldPos = new THREE.Vector3(), viewPos = new THREE.Vector3();
            let azi = 0, ele = 0, distance = 0;
            this.__ambi_monoToAmbiVR();
            const synth = this.synths[this.synths.length - 1];
            let label;
            if (logLabel) {
                sclog('logging: ' + logLabel);
                label = dat.GUIVR.textCreator.create(logLabel, { scale: 0.5, color: 0xffffff });
                source.add(label);
            }
            ///when the synth is freed (which it will be by SCBus.free()), this should be cancelled / label removed...
            //at time of writing, we're not 'free'ing these directly.
            onUpdate(function () {
                if (synth.freed) {
                    //this.finished = true; //flag this function for removal (doesn't work with no new. never liked anyway)
                    if (label)
                        label.parent.remove(label);
                    return DONE_SIGNAL;
                }
                source.getWorldPosition(worldPos);
                if (Number.isNaN(worldPos.x)) {
                    //not enough.
                    return;
                }
                viewPos.copy(worldPos);
                viewPos.applyMatrix4(camera.matrixWorld);
                distance = viewPos.length() / (basescale * V.baseroomsize * currentGenes._uScale);
                viewPos.normalize();
                azi = Math.atan2(viewPos.x, viewPos.z);
                if (Number.isNaN(azi))
                    return;
                ele = Math.sin(viewPos.y);
                synth.setParms({ headAz: azi, headEle: ele, distance: distance });
                synth.setParms({ gain: 1, minDist: 0.05, speedOfSound: 500 });
                if (label) {
                    label.updateLabel(`${logLabel}:\nazi: ${azi.toFixed(3)}, ele: ${ele.toFixed(3)}\ndistance: ${distance.toFixed(3)}`);
                }
            });
            return this;
        };
        //for now, this is how I'm giving modules access to these inards...
        W.msynthScope = {
            onUpdate, g, SynthBus, seq, Sphere, Box, mutNode,
            rootSCNode, rootSCFXNode, rootSynthNode, EffectBus
        };
        // this allows the userCode to be asynchronous and stil reference the various functions from this scope
        // still a little unsure on exactly what we need to make that eval work, but below works  sjpt 5/1/20
        var uuucode;
        const uucode = eval(`uuucode = async function ucode() {\n${userCode}\n}`);
        await uuucode();
        // eval(userCode);
    } //runSynthFunction
    HornSetP.getSynthGeneNames = function () {
        return usedGeneNames;
    };
    SCBus.prototype.Get = function (fn) {
        this.SendReply({}, { '/reply': fn });
        return this;
    };
    // SCBus.prototype.Set = function(v) {
    //     this.Add({v: v}); //What about subsequent calls?
    //     return this;
    // };
    SCBus.prototype.FFTScope = function (label) {
        //XXX: makes sense to add this to bus...
        //doesn't make so much sense that the actual implementation refers to synth (from which it finds bus)
        //also, I should be able to specify things like W size.
        const s = new FFTScope(this.lastSynth, label);
        this.synths.push(s);
        return this;
    };
    SCBus.prototype.Ana = function (label, outArgs) {
        const s = new Ana(this.lastSynth, label);
        s.synth.mapOutArgs(outArgs);
        this.synths.push(s);
        return this;
    };
    //TODO: work out why all MFCC on a bus look the same (seems to be sc bug; check newer version)
    SCBus.prototype.MFCC = function (label) {
        const s = new MFCC(this.lastSynth, label);
        this.synths.push(s);
        return this;
    };
    SCBus.prototype.Scope = function (label, displayFrames) {
        const s = new OscScope(this.lastSynth, label, displayFrames);
        this.synths.push(s);
        return this;
    };
    SCBus.prototype.Spectrogram = function (label) {
        const s = new Spectrogram(this.lastSynth, label);
        this.synths.push(s);
        return this;
    };
    SCBus.prototype.VUMeter = function (label) {
        //TODO: different n
        const s = this.n === 1 ? new VUMeter(this.lastSynth, label) : new VUMeter2(this.lastSynth, label);
        this.synths.push(s);
        return this;
    };
    SCBus.prototype.GUI = function () {
        mainGUI.visible = true;
        const name = this.name;
        const f = dat.GUIVR.create(name);
        //this folderHeader stuff still needs to change.
        const run = f.add({ run: true }, 'run').showInFolderHeader().onChange(v => this.group.run(v));
        f.remove(run); //anti-pattern.
        f.detachable = true;
        f.addFolder(...this.synths.map(s => { if (s.createGUIVR)
            return s.createGUIVR(); }));
        return f;
        //sclog("made gui for " + name);
        // mainGUI.addFolder(f);
        // guis.push(f);
        // //TODO: VR positioning... make it a child of mutNode.
        // VH.positionGUI(0,0,0, mainGUI);
        // mainGUI.scale.set(0.6, 0.6, 0.6);
        // mainGUI.position.set(0.25, 1.1, 0);
        // mainGUI.matrixWorldNeedsUpdate = true;
        // return this;
    };
    SCBus.prototype.HeadSpace = function (rolloff, stereoWidth) {
        sclog('HEADSPACE::: Needs work!');
        //if (!listener) listener = camera; //considered having a listener argument, but really safe to assume it's camera.
        var sourcePos = new THREE.Vector3(); //nb, let's ignore arguments for now and use pan genes...
        //var camPos = new THREE.Vector3();
        var dp = new THREE.Vector3();
        var camRight = new THREE.Vector3();
        //ATM all spat synths take "distance" and "pan" args.
        //What would be a good idea is to share a similar interface to 'AudioPannerNode' in WebAudio.
        //http://www.html5rocks.com/en/tutorials/webaudio/positional_audio/
        //There's a slight question of how much of the spatialisation is done here in the client:
        //Ultimately if I were to have anything like realistic reverb etc, it wouldn't make sense to just
        //move things in the synth around relative to fixed reference frame, but for now that's likely
        //pragmatic choice.
        //Basically, sticking with the FoldSynth spatialisation style with OrganicArt / mutsynth
        //programming style.
        function posUpdate() {
            //check carefully _pos vs _pan
            sourcePos.set(currentGenes._panx, currentGenes._pany, currentGenes._panz);
            //camPos.setFromMatrixPosition(camera.matrix);
            dp.subVectors(sourcePos, camera.position);
            camRight.setFromMatrixColumn(camera.matrix, 0);
        }
        function panFn() {
            posUpdate();
            var pan = camRight.dot(dp) / dp.length();
            //sclog("pan " + pan);
            return pan;
        }
        function distFn() {
            posUpdate();
            var d = dp.length();
            if (d < 0.00001)
                d = 0.00001;
            //sclog("dist " + d);
            //TODO: check, never convinced this was sounding right... rolloff of ~0.01 seems ok
            //should be proportional to distance^2... is that in the SynthDef?
            //brings distance into sensible range... but then I probably want to compute actual rolloff differently
            return d * rolloff;
        }
        if (!stereoWidth)
            stereoWidth = 1;
        if (!rolloff)
            rolloff = 0.01;
        this.spatStereoDopC();
        this.lastSynth.mapParmFn("pan", panFn);
        this.lastSynth.mapParmFn("distance", distFn);
        return this;
    };
    //DEPRACATED? starting again with ObjectHeadSpace...
    //for now, we have uni-directional mono sound.
    //Could potentially have multichannel with transfrom.
    //doLog, if set, is a label for debugging.
    SCBus.prototype.AHeadSpace = function (sourcePosOrInputArgs, doLog = false) {
        let sourcePos, synthArgs = {};
        //extract sourcePos, or make default. If mentioned in inputArgs, use it & don't pass on to synth.
        if (!sourcePosOrInputArgs)
            sourcePos = new THREE.Vector3();
        else if (sourcePosOrInputArgs instanceof THREE.Vector3)
            sourcePos = sourcePosOrInputArgs;
        else {
            synthArgs = sourcePosOrInputArgs;
            if (synthArgs.sourcePos) {
                const p = synthArgs.sourcePos;
                delete synthArgs.sourcePos; //don't pass this on to the synth...
                if (p instanceof THREE.Vector3)
                    sourcePos = p;
                else {
                    if (Array.isArray(p) && p.length === 3)
                        sourcePos = new THREE.Vector3(...p);
                    else {
                        //sclogE(`AHeadSpace : unkown type for sourcePos ${p} on ${this.name}`);
                        //could be a function returning position...
                        return;
                    }
                }
            }
        }
        let synth, azi, ele, gain;
        let scratchPos = new THREE.Vector3();
        const dp = new THREE.Vector3(), euler = new THREE.Euler();
        const sourceMatrix = new THREE.Matrix4(), scratchMatrix = new THREE.Matrix4();
        // not sure I want separate headAz headEle headGain functions; what I want is to know when it's a new frame
        // and then update all three. Maybe bad style, but I'm going to pass in 'deltaTime' and map to that
        // then have side effects to set the real parameters.  Using deltaTime to lag other controls while I'm at it...
        let t = Date.now(); //nb: performance.now() probably not actually hi-res because of exploits. Maybe there's a Node module?
        //TODO: fix WRT G.__rot4ele, _scale etc
        function update() {
            if (!synth)
                return 0;
            let t1 = Date.now();
            let dt = t1 - t;
            t = t1;
            scratchPos.set(currentGenes._posx, currentGenes._posy, currentGenes._posz);
            scratchPos.add(sourcePos);
            sourceMatrix.makeTranslation(scratchPos.x, scratchPos.y, scratchPos.z);
            dp.subVectors(scratchPos, camera.position);
            scratchMatrix.multiplyMatrices(camera.matrixWorldInverse, sourceMatrix);
            scratchPos.setFromMatrixPosition(scratchMatrix);
            scratchPos.normalize();
            azi = Math.atan2(scratchPos.x, scratchPos.z); //jumps...
            ele = Math.asin(scratchPos.y);
            //gain = 1/dp.lengthSq(); //bear in mind genes._scale / useScale
            let distance = dp.length();
            //gain = 1/Math.max(0.01*distance, 0.00001);
            gain = 1 / Math.max(distance, 0.00001); ///XXX 01/20, this is generally deprecated, but check?
            synth.setParm('headAz', azi);
            synth.setParm('headEle', ele);
            synth.setParm('headGain', gain);
            synth.setParm('distance', distance);
            let f = (Math.PI - Math.abs(azi)) / Math.PI;
            f = f > 0.5 ? 20000 : f * 40000;
            //synth.setParm('lpf', f);
            if (doLog) {
                msgfix('ambi' + doLog, () => `azi: ${format(azi)}, ele: ${format(ele)}, gain: ${format(gain)}, lpf: ${format(f)}`);
                msgfix('dp' + doLog, `${format(dp.x)}, ${format(dp.y)}, ${format(dp.z)}`);
            }
            return dt * 0.001;
        }
        if (!synthArgs.outBus)
            synthArgs.outBus = AmbiBus().id;
        synthArgs.deltaTime = update;
        this.__ambi_monoToAmbiVR(synthArgs);
        synth = this.synths[this.synths.length - 1];
        return this;
    };
    SCBus.prototype.QuadSpace = function QuadSpace(radFn) {
        sclog("TODO: QuadSpace implementation is still basic...");
        //Similar to HeadSpace, but make a set of four, allow them to spread according to size???
        //Very last minute hacking here 10/11/16 for Norwich show.
        //I've added synths array to SCBus, which I need to make sure all synths are added to.
        //This should give me a slightly better pattern than this 'lastSynth' bollocks.
        ///update: finally fixing lastSynth bollocks March 2023?
        //Need to think a little bit about how I get the base bus ID + channel offset to each synth,
        //and hopefully fix whatever hack I come up with later.
        //Simple: just create the synths, then setParm("bus") afterwards...
        function makePanFns(i) {
            var sourcePos = new THREE.Vector3();
            var dp = new THREE.Vector3();
            var camRight = new THREE.Vector3();
            var angle = Math.PI / 2 + (Math.PI * 2 * i / 4);
            radFn = radFn || function () { return 10; };
            //if (arg && typeof arg.rad === 'function') radFn = arg.rad;
            function posUpdate() {
                var rad = radFn(); //TODO: control this with object or room size etc.
                //probably acheived by passing in a function to QuadSpace, then need to move these up...
                //was thinking of some brownian motion or something for these too... maybe pass in i to fn
                var offX = rad * Math.sin(angle), offZ = rad * Math.cos(angle); //TODO check if Z forward
                sourcePos.set(currentGenes._panx + offX, currentGenes._pany, currentGenes._panz + offZ);
                dp.subVectors(sourcePos, camera.position);
                camRight.setFromMatrixColumn(camera.matrix, 0);
            }
            return {
                pan: function () {
                    posUpdate();
                    var pan = camRight.dot(dp) / dp.length();
                    return pan;
                },
                dist: function () {
                    posUpdate();
                    var d = dp.length();
                    if (d < 0.00001)
                        d = 0.00001;
                    return d * 0.01;
                }
            };
        }
        sclogE('warning: shaky QuadSpace implementation / changed lastSynth logic...');
        for (var i = 0; i < 4; i++) {
            this.spatStereoDopC();
            this.lastSynth.setParm("bus", this.id + i);
            //create panFn & distFn with appropriate closure and relationship to object and/or room size??
            var fns = makePanFns(i);
            this.lastSynth.mapParmFn("pan", fns.pan);
            this.lastSynth.mapParmFn("distance", fns.dist);
        }
        return this;
    };
    //watch genedefs.json
    //TODO: switch to a new 'parmdefs.yaml' and ideally make a nice editor
    //at least make something so that new synth types are usable in browser runtime
    //without having to manually add entries anywhere.  This should be responsibility of nw_sc:
    //In the short term, there can be a 'knownSynths' file *not* to be hand-edited, with
    //SynthNames, ParmNames and *nothing else*
    var gdFile = 'synthdefs/map/genedefs.json';
    var synthGeneDefs = JSON.parse(getfiledata(gdFile));
    var bak;
    readGeneDefs();
    if (isNode()) {
        var fs = require('fs');
        fs.watchFile(gdFile, { persistent: true, interval: 500 }, readGeneDefs);
    }
    //pick up any synths that we have files for but not genedefs
    NW_SC.addSynthNameListener(function (newName, nameList) {
        for (var i = 0; i < nameList.length; i++) {
            var name = nameList[i];
            if (name.indexOf('__k_') === 0) {
                if (!SCKBus.prototype[name]) {
                    const shortName = name.substring(4, name.length);
                    SCKBus.prototype[shortName] = makeSynthFunc(name);
                }
            }
            else {
                if (!SCBus.prototype[name]) {
                    SCBus.prototype[name] = makeSynthFunc(name);
                }
            }
        }
    });
    function readGeneDefs() {
        sclog("------ updating synth genedefs @ " + new Date());
        try {
            //>>>
            //sclog("cleangenesall()");
            //cleangenesall();
            cleangenestagall('audio');
            bak = synthGeneDefs;
            synthGeneDefs = JSON.parse(getfiledata(gdFile));
            for (var sk in synthGeneDefs) {
                //2d array. Each element specifies name, default, min, max, delta, step, comment/tag?
                var gdSpec = synthGeneDefs[sk];
                //!!!won't change existing genedefs, only ones for newly made versions of that synth!!!
                //I could change prototype of given Synth, if that was fully in place... but there's no great need...
                if (synthsByType[sk])
                    synthsByType[sk].forEach(synth => synth.updateDefaultGenedefs(gdSpec));
                //HW.Horn.prototype[sk] = makeSynthFunc(sk, geneDefs);
                //TODO: log level
                //sclog(sk + " added as SynthFunc with genedefs: " + JSON.stringify(geneDefs));
                SCBus.prototype[sk] = makeSynthFunc(sk, gdSpec);
            }
            //add any other synths that we know about but don't have entries for in genedefs.json
            NW_SC.SynthNames.forEach(name => {
                if (name.indexOf('__k_') === 0) {
                    if (!SCKBus.prototype[name]) {
                        const shortName = name.substring(4, name.length);
                        SCKBus.prototype[shortName] = makeSynthFunc(name);
                    }
                }
                else {
                    if (!SCBus.prototype[name]) {
                        SCBus.prototype[name] = makeSynthFunc(name);
                    }
                }
            });
        }
        catch (e) {
            interfaceSounds.error.play();
            sclog("Error while processing genedefs.json: " + e);
            synthGeneDefs = bak; //TODO: restore prototype functions?
        }
    }
    function nextHornSynthID(type) {
        if (hornSynthIDs[type] === undefined) {
            hornSynthIDs[type] = 0;
            return type;
        }
        return type + '#' + ++hornSynthIDs[type];
    }
    // return a function for suitable for adding to Horn.prototype, for making Synths.
    // don't try to use it elsewhere, or 'this' will be wrong...
    // need to make sure we close on sk & geneDefs adequately.
    //
    // Note that much of this work should belong in more generic nw_sc: There should be
    // Synth subtypes that can be called like "new SynthName()" for each detected type of
    // synth, and they should have properties for each detected parameter.
    // mutsynth would still be responsible for appending these types with mutator
    // specific behaviour etc, which would mean in particular adding cases to setters.
    // This implies that the generic setter needs to refer to a dynamic property.
    // .... also bear in mind that it's possible I want to compose synthdefs from more than
    // one part at some point, (or do something comparable to NDef in SC) in which case thought
    // would need to go into other aspects of representation.
    // One benefit of doing this would be to allow using supercollider Pbind and friends.
    // Not clear if I want to involve sclang in that way...
    function makeSynthFunc(sk, geneDefs) {
        //consider how much of this could be moved to Synth.updateDefaultGeneDefs (2020?)
        return function (parmInput, parmOutput) {
            //let bus = this.id;//this.getSynthBus(); //....
            let args = Array.prototype.slice.call(arguments, 0); // convert from Arguments type to array
            // explicitly prefer object form to array form for arguments... even though we actually still use latter internally
            const quoteStrings = a => a.type === 'string' ? `"${a}"` : a;
            if (parmInput !== undefined && parmInput.type === 'string')
                sclog(`WARN: Deprecated use of ${sk}(${args.map(quoteStrings).join(", ")}), converting args to object.`);
            //if first argument is provided in key-value object form, then attempt to convert to array
            //this could be dealt with downstream at the synth constructor level, given that generally
            //associative array is preferred style to alternating name / value array (idiomatic of SuperCollider).
            let argObj, outArgs;
            if (args.length > 0 && typeof args[0] === "object") {
                if (typeof parmOutput === "object")
                    outArgs = parmOutput;
                if (args.length > 2)
                    throwe("I don't know what to do with >2 arguments when first arg is an object");
                argObj = args[0];
                args = [];
                for (var k in argObj) {
                    args.push(k);
                    args.push(argObj[k]);
                }
            }
            else {
                argObj = {}; //outArgs undefined
                for (var i = 0; i < args.length; i += 2) { //TODO: double check this for loop...
                    argObj[args[i]] = args[i + 1];
                }
            }
            //there might be some args that are functions etc and and not suitable for passing via OSC...
            //we deal with those in addSynth rather than remove them from args array, so that we can still
            //interpret them later in this method.
            //let synth = addSynth(sk, args ? ["bus", bus].concat(args) : ["bus", bus], outArgs);
            //expecting 'this' to be the bus, but not well enforced / expressed in the code:
            //result of makeSynthFunction (the anon function we're in here) is assigned to SCBus.prototype[sk]...
            let synth = addSynth(sk, args, outArgs, this);
            this.synths.push(synth);
            synth.mutID = nextHornSynthID(this.name + "." + sk);
            processSynthParameters(synth, args, argObj, this);
            return this; //'this' is an SCBus, for method chaining.
            //ts types have got a bit more convoluted, but TSynthBus / TSBus are used similarly at time of writing.
        };
        /**
         * XXX: could be clearer about role of this function when addSynth does some related stuff...
         * this is for mapping things for which ctrlNames are defined - creating genes, or mapping to functions etc. (how accurate is that statement?)
         */
        function processSynthParameters(synth, synthArgs, argObj, parent) {
            //this didn't quite work the way I tried for tadpoles.
            //hoping that not adding gui / uniforms in addgene will mean not too costly.
            //if (parent.noAutoGenes) return;
            const ctrlNames = NW_SC.ctrlNames[synth.type];
            if (!ctrlNames) {
                sclogE(`No ctrlNames found for ${synth.type}`);
                //why am I not looping on argObj, anyway?
                return;
            }
            //old comments:
            //TODO: use argObj instead?... just somehow, make sure we can map eg. function => "ctrlName not in genedefs.json"
            //so really, ctrlNames is the thing we want to through working out what to do for each one...
            //data in genedefs.json unfortunately has array with [name, etc]... rather than {name: [etc]}, or {name: {def: etc}}
            //make associative version for lookup.
            let gdefsObj = {};
            if (geneDefs)
                geneDefs.map(gd => gdefsObj[gd[0]] = gd.slice(0));
            ctrlNames.forEach(name => {
                const userChoice = argObj[name];
                const gd = gdefsObj[name];
                if (userChoice === undefined) {
                    //simplest case: no arg override for this ctrl, so use straightforward genedef if there is one, or do nothing otherwise
                    if (gd)
                        usedGeneNames[synth.addgene.apply(synth, gd)] = true; //using apply so that gd array args are used appropriately.
                }
                else
                    switch (typeof userChoice) {
                        case 'number':
                            if (!gd)
                                synth.setParm(name, userChoice);
                            break;
                            gd[1] = userChoice;
                            usedGeneNames[synth.addgene.apply(synth, gd)] = true; //using apply so that gd array args are used appropriately.
                            break;
                        case 'function':
                            processFunctionArg(userChoice, gd, name);
                            break;
                        case 'string':
                            processStringArg(userChoice, gd, name);
                            break;
                        //we'll deal with array->SCBuf in addSynth.
                        //case 'array'   : processArrayArg   (userChoice, gd, name); break;
                    }
            });
            //Alternatively (maybe complementary), this._addtrlow(sk, arguments); may fit in somewhere...
            return;
            function processFunctionArg(v, gd, name) {
                // original idea was that functions should return values 0-1 for subsequent normalisation.
                // or maybe sometimes -1..1
                // or actual values.  Turns out I mostly want the latter, especially when range I'm mapping to
                // tends to be arbitrary and maybe non-linear.
                //long and short of it is, that it was more trouble than it was worth, and I don't think I use the old style anywhere...
                //although I should check GalaxRefl I suppose to be sure...
                let fn = v; //v.dontNormalise || !gd ? v : makeNormalisedRangeFunction(v, { name: gd[0], min: gd[2], max: gd[3] });
                name = name || gd[0];
                synth.mapParmFn(name, fn);
            }
            function processStringArg(v, gd, name) {
                let n = v * 1;
                if (!Number.isNaN(n)) {
                    //numeric literal string value.
                    if (!gd)
                        synth.setParm(name, n);
                    //make this a locked gene rather than just a parm.
                    //synth.setParm(g[0], n);
                    //TODO: test
                    gd.length = 8; //other elements will be undefined...
                    gd[1] = n;
                    gd[8] = false; //not free (fixed)
                    const fullGN = synth.addgene.apply(synth, gd); //todo use obj for g rather than apply
                    usedGeneNames[fullGN] = true;
                    //TODO: decide fate of this somewhat awful string code....
                }
                else {
                    if (!gd) {
                        sclog(`instanceofdoesnotunderstanderror mapping ${v} => ${name} in ${synth.type}...`);
                        return;
                    }
                    //See if it looks like we're trying to map a gene, or maybe something from kinect etc.
                    //Since this case is quite complex, we may do well to factor it out into a named method.
                    // form "K:elbowleft.x ... never more than one colon for LHS, then RHS has '.' separator...
                    // Actually, would be nice to have some kind of JS objects for this, we could use autocompletion w/CodeMirror
                    //TODO: ^^^ reconsider ^^^
                    let desc = v.split(":"); //descriptor... there must be a better variable name.
                    if (desc.length === 2) {
                        let prop = desc[1].split('.'); // property eg ["elbowleft", "x"]
                        let mapFn;
                        //nb:::: dead comment?:::
                        //note the context we're in: we already have a genedef as gd. We're not allowed to map to non-genes...
                        //we might like to be able to, but for now, this is how it is.
                        //Should we use new Genedef rather than an object that looks a bit like one?
                        //Perhaps not strictly necessary, and would even require extra work in order not to be a regression
                        //(Genedef constructor expects all fields populated AFAICT)
                        let gd2 = { name: gd[0], min: gd[2], max: gd[3] };
                        switch (desc[0].toLowerCase()) {
                            case "k":
                                sclog("mapping kinect " + desc[1] + " to " + synth.type + "#" + synth.id + "." + gd[0]);
                                mapFn = makeKinectMapFn(prop, gd2);
                                break;
                            default:
                                sclog("couldn't parse parm descriptor " + v);
                                mapFn = function () { return gd2.min; };
                                break;
                        }
                        synth.mapParmFn(gd[0], mapFn);
                    }
                    else if (Object.hasOwnProperty.call(genedefs, v)) {
                        synth.mapGene(v, gd[0], gd[2], gd[3]); //expect this signature to change...
                    }
                    else
                        throwe("Invalid argument: string not numeric, genename, or parm descriptor " + gd[0]);
                }
            }
        } //processSynthParameters
    } //makeSynthFunc
    // return a function for putting into synth.mapParmFn() with a kinect property string to use as input.
    // necessary to close on input args, also makes less arrow code.
    function makeKinectMapFn(prop, gd) {
        return function () {
            try {
                if (kinect.current) {
                    var input = 0.5 * (1 + kinect.current[prop[0]][prop[1]]);
                    var output = gd.min + (gd.max - gd.min) * input;
                    //sclog(prop[0] + input + " -> " + output);
                    return output;
                }
                else
                    return undefined; //should leave parm unaffected.
            }
            catch (e) {
                // sclog("Exception in mapFn for " + v + " -> " +synth.name + g[0] + ":"); //<<<?PJT what is g? ? sjpt and v and synth
                sclog("Exception in mapFn for ????? synth, v, g"); //<<<?PJT what is g? ? sjpt and v and synth
                sclog('\t"' + e + '"');
                return gd.min;
            }
        };
    }
    // wrap a given function 'fn' returning values 0-1 to return values as specified by 'gd'
    function makeNormalisedRangeFunction(fn, gd) {
        return function (args) {
            var v = fn(args); //fn is assumed to return a value 0-1
            var output = gd.min + (gd.max - gd.min) * v;
            return output;
        };
    }
    //function makeBipolarToGeneFunction()
    //what happens when args contains an SCBus --- it gets the appropriate mapping, but some bad values get flagged at start
    //from a name like "a69", probably sent back from scsynth... so I should check that when receiving /n_info or whatever... (not here)
    function addSynth(synthType, args, outArgs, parent) {
        let bus = parent.id;
        args = args ? ["bus", bus].concat(args) : ["bus", bus];
        const fnsToMap = {};
        const checkedArgs = [];
        for (var i = 1; i < args.length; i += 2) {
            const pname = args[i - 1];
            const userChoice = args[i];
            //             if (userChoice.subGeneFn) { ///or genedef...
            // ////---->
            //             } else
            if (typeof userChoice === "function") {
                let f = userChoice;
                let v = f(); //get initial value to test f and provide starting value for synth.
                //it could be a generator function* ....
                if (NW_SC.isValidSynthParm(v)) {
                    fnsToMap[pname] = f;
                    //args[i] = v;
                    checkedArgs.push(pname, v);
                }
                else {
                    // we need to remove... or rather, not include in checkedArgs.
                    sclog(`${synthType}: Unexpected value ${v} from function ${f.toString()}.\nDropping userChoice "${pname}: ${f.toString()}".`);
                }
            }
            else if (Array.isArray(userChoice)) {
                if (userChoice.filter(d => typeof d !== 'number').length === 0) {
                    //array of numbers, make a buffer.
                    const buf = SCBuf(userChoice);
                    checkedArgs.push(pname, buf);
                }
                else if (userChoice.filter(d => !d.isJoinBus).length === 0) {
                    checkedArgs.push(pname, userChoice.map(b => b.id));
                }
            }
            else if (typeof userChoice === 'string') {
                //is this a mapped gene? how is this dealt with?
                //if (NW_SC.isValidSynthParm(userChoice)) checkedArgs.push(pname, userChoice);
                //else sclogE(`Unexpected string ${userChoice} for ${pname} in addSynth ${synthType}`);
            }
            else { //TODO: check more cases?
                checkedArgs.push(pname, userChoice);
            }
        }
        //2020 post Pompidou : it wouldn't be such a major change to make synth watch inArgs for changes...
        const synth = new Synth(synthType, checkedArgs, naddTail(parent.group));
        //const T = synthType: string => (generated interface)
        //What issues may there be with this at runtime?
        //When compiled to JS, it won't need to know the type, but if we're invoking some code here...?
        //let newStyleSynth = new TSCSynth<
        synth.startBundle();
        if (synth.killed)
            throw (synth.killed); //XXX: we can't fix this now. ??? <--- was this really happening???
        const lastSynth = synth;
        for (const k in fnsToMap)
            lastSynth.mapParmFn(k, fnsToMap[k]);
        if (outArgs)
            lastSynth.mapOutArgs(outArgs);
        const busID = lastSynth.parms.bus;
        //maybe not going to keep this...
        if (synthsByBus[busID] === undefined)
            synthsByBus[busID] = [];
        synthsByBus[busID].push(lastSynth);
        return lastSynth;
    }
    sclog("######## hornSynth init !!!OK!!! #########");
} // HornSynth
/********** code below global for historic reasons, should usually be embedded in tranrule ***/
function lightStrength() {
    var s = 0;
    for (let i = 0; i < 3; i++)
        s += currentGenes["light" + i + "s"];
    return s / 3;
}
function ratiomidi(r) { return 12 * Math.log2(r); }
function pTranspose() { return 12 + ratiomidi(currentGenes._uScale); }
function aTranspose() { return 0.5 * ratiomidi(currentGenes._uScale); }
function pGrainLen() {
    //  var size = currentGenes._uScale;
    return 3;
}
function pRadius() {
    return V.roomsize * 100;
}
function aRadius() {
    return V.roomsize * 60;
}
//# sourceMappingURL=mutsynth.js.map