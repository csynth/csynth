var {log, sleep, openfiles, CSynth, savshowDirectoryPicker, Files, saveimage, G, S, monitorX, GX, V} = window;  // globals from javascript and CSynth

/** process a single input txt file */
async function process(file) {
    log('csyscript: realwork', file.name)
    await openfiles([await file.getFile()]);        // this will behave the same as dropping the single file
    await S.waitVal(() => CSynth.current.ready);    // wait till really started

    GX.getgui('ribbon/diameter').setValue(30);
    G.stepsPerStep=50       // 50 simulation steps per grahics display, less wasted graphics effort, more GPU for simulation
    G.springrate = 10       // bigger simulation steps for faster convergence
    await sleep(3000)
    G.springrate = 1        // standard simulation steps for better stability
    await sleep(10000)
    CSynth.showEigen(true);
    await S.frame()         // sleep till next frame (so eigen will have effect)
    log('csyscript: realwork done, saving', file.name)
    CSynth.savepdb(file.name + '.pdb')
    const sgui = V.gui.visible
    V.gui.visible = false;
    await saveimage(3000,2000, false, false, file.name + '.tga')
    V.gui.visible = sgui;
    log('csyscript: savingdone', file.name)
}

/** main test file */
async function test() {
    const dirhandle = Files.dirhandle || await Files.setDirectory();           // this will establish the Files local directory to work in
    const nts = dirhandle.entries();

    log('csyscript: starting');

    for await (const [name, file] of nts)
        if (name.endsWith('.txt')) await process(file);
    log('csyscript: all files done');
}

/** looping test file for debug, generally use test() directly */
async function tests(n = 10) {
    for (let i = 0; i < n; i++) {
        await test();
        Files.write('progress' + i, 'done')
    }
}

test()