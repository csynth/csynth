var {log, sleep, openfiles, CSynth, savshowDirectoryPicker, Files, saveimage} = window;  // globals from javascript and CSynth


async function process(file) {
    log('realwork', file.name)
    openfiles([await file.getFile()]);   // this will behave the same as dropping the single file
    await sleep(2000)
    log('realwork done, saving', file.name)
    CSynth.savepdb(file.name + '.pdb')
    await saveimage(800,600, false, false, file.name + '.tga')
}


async function test(reuse = true) {
    const dirhandle = await Files.setDirectory();           // this will establish the Files local directory to work in

    const nts = dirhandle.entries();
    log('starting');

    for await (const [name, file] of nts)
        if (name.endsWith('.txt')) await process(file);
    log('all files done');
}

test();
