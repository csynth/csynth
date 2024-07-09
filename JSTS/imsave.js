var _vieweditlist, genfname, fieldsFrom, tadbwSetup, saveLots;
var savesize = 4096;
var saveaspect = 1;
var maxblob = 36000000; // 6000 * 6000;
/**
 * saveframe: save current frame, various formats, via canvas2d, NO rt save <<< loses resolution in canvas
 * saveframe1: save single image (no panes)
 * saveframe2: save current layout
 * saveframe1 => saveframe2 => saveframe =>

~~~~~
 * imsize: work out sizes and enforce limit
 * conv: convert brga=>rgba, in cpu
 *
~~~~~
 * saveframetga: save tga frame (with rt option), uses GPU rgba=?rgb saveframetag.convert
 *     ?fast for video frame saving, BUT uses lots of extra GPU memory for conversion?
 * saveframetgabig: save in sections
 *
~~~~~
 * saveimage: save image (can invent fid, tga or bmp)
 *     saveimage => saveframetga for smaller images
 *     saveimage => saveframetgabig for bigger images
 * saveimage1: single pane
 * saveimage1high: high res, single pane
 * saveimagehigh: high res
 *
 * saveframetga
 *
 */
/** work out image size for saving */
function imsize(ww, hh, ar, forceUsear, defresguiname = 'imageres') {
    maxblob = nwfs ? 936000000 : 36000000; // 6000 * 6000;
    maxblob = Infinity; // now we are saving big ones with saveframttgabig
    var lmaxTextureSize = Infinity; // now we are saving big ones with saveframttgabig
    let dww = eval(trygeteleval(defresguiname, savesize));
    ww = Math.round(ww || dww);
    let dhh;
    if (ar) {
        dhh = typeof ar === 'string' ? eval(ar) : ar;
    }
    else if (forceUsear || trygetele('previewAr', 'checked', false)) {
        dhh = eval(trygeteleval('imageasp', saveaspect)); // height or aspect from gui
        if (dhh !== 1 * dhh) {
            serious("Invalid value in 'height or aspect' field, 16/9 used.");
            tryseteleval('imageasp', '16/9');
            dhh = 16 / 9;
        }
    }
    else {
        dhh = width / height; // actual aspect from screen
    }
    if (dhh < 0)
        dhh = -dhh;
    hh = hh || dhh;
    hh = hh > 10 ? hh : Math.round(ww / hh); // if hh <= 10 use it as aspect
    // specific size requested, check it
    if (arguments.length !== 0 && (ww * hh > maxblob || hh > lmaxTextureSize || ww > lmaxTextureSize)) {
        let ratio = Math.sqrt(maxblob / (ww * hh));
        ratio = Math.min(ratio, lmaxTextureSize / hh);
        ratio = Math.min(ratio, lmaxTextureSize / ww);
        ww = Math.floor(ww * ratio / 2) * 2; // even
        hh = Math.floor(hh * ratio);
        //tryseteleval('imageres', maxsize);
        let mm = "Size for saving limited to " + lmaxTextureSize + " each side by GL implementation\n";
        mm += "and to area " + maxblob + " by Chrome blob implementation.\n";
        mm += "Size set to " + ww + "x" + hh;
        msgfix('texture info', mm);
        console.log(mm);
    }
    return [ww, hh];
}
/** save a big image a given size setting */
function saveframe1(ww, hh, fid, comp, type) {
    let savefull = inputs.fullvp;
    setInput(W.fullvp, false);
    let viewports = vps;
    setViewports([0, 0]);
    saveframe2(ww, hh, fid, comp, type, review);
    function review() {
        setInput(W.fullvp, savefull);
        setViewports(viewports);
    }
}
/** save a frame with a given size setting */
function saveframe2(ww, hh, fid, comp, type, endfun) {
    let sww = width, shh = height;
    log("saveframe2 size", ww, hh);
    setSize(ww, hh);
    newframe();
    canvas.style.display = "none";
    // setTimeout(dosave, 100);
    Maestro.on("postframe", nextsave, undefined, true);
    function nextsave() {
        newframe();
        Maestro.on("postframe", dosave, undefined, true);
    }
    function dosave() {
        log("saveframe2 rsave size", width, height);
        saveframe(fid, comp, type);
        log("saveframe2 restore size", ww, hh, "to", sww, shh);
        setSize(sww, shh);
        canvas.style.display = "";
        if (endfun)
            endfun();
    }
}
/** save current frame as image, at current size
options o also allow specific region,
or a slot number, or a dispobj
*/
function saveframe(fid, comp, type, options, callback) {
    let t = new Date().toISOString().replace(/:/g, ".");
    type = type || getFileExtension(fid || '').substring(1);
    if (!fid) {
        const ds = getdesksave(); //XXX hit "Cannot find module 'os'" - tiff2.js require() strikes again.
        fid = (ds ? (ds + '/') : '') + currentGenes.name + '_' + t;
    }
    // if (!fid) fid = fid = getdesksave() + '/' + currentGenes.name + '_' + t;
    if (type === 'tga' && !options)
        return saveframetga(fid);
    let ctype = "image/" + (type === "jpg" ? "jpeg" : type);
    comp = comp || 0.9;
    // if (tt === undefined) fid += "." + (type === "jpeg" ? "jpg" : type);
    let canvasn = canvas;
    if (options) {
        let o = options;
        if (typeof o === 'number' || typeof o === 'string')
            o = slots[o].dispobj;
        canvasn = document.createElement('canvas');
        canvasn.width = o.width;
        canvasn.height = o.height;
        canvasn.getContext('2d').drawImage(canvas, o.left, canvas.height - o.top, o.width, o.height, 0, 0, o.width, o.height);
    }
    let dataurl = canvasn.toDataURL(ctype, comp);
    if (nwfs) {
        let sdataurl = dataurl.substr(dataurl.indexOf(",") + 1);
        if (callback) {
            nwfs.writeFile(fid, sdataurl, 'base64', callback);
        }
        else {
            // should be {encoding: 'base64'} ?
            nwfs.writeFileSync(fid, sdataurl, 'base64');
        }
    }
    else {
        // ??? this failed for Guido, whey ???
        writeUrlImageRemote(fid, dataurl, ctype);
        // it would be better to make writeUrlImageRemote async
        // we need async because of the way we are using events;
        // we need to be sure the event is triggered after we are waiting for it.
        // todo? don't use events
        if (callback)
            setTimeout(callback, 1);
    }
    log("saveframe file written", fid, canvas.width, canvas.height, 'uScale', G._uScale);
}
var savebuff; // saved buffer to avoid unnecessary buffer realloc
/** convert bgra to rgba (for reading/saving canvas)
factored out because that sometimes optimizes better */
function _conv(im) {
    for (let i = 0; i < im.length; i += 4) {
        let t = im[i];
        im[i] = im[i + 2];
        im[i + 2] = t;
        if (i % 1000000 === 0)
            log('conv', i, im.length, Math.floor(i * 100 / im.length));
    }
}
/** save current frame, readPixels, process and save.
If fid is not defined we will do a readPixels,
and then process and save on the next call with a fid
===
channels === 3 or 1 uses gpu saveframetga.convert to ensure correct format
channels === 4 uses cpu _conv
*/
var saveframetga = function (fid, rt = null, channels = 3) {
    if (saveframetga.convertDone < framenum && channels !== 4)
        saveframetga.convert(rt, undefined, channels); // first time in
    if (!fid)
        fid = genfname('wall', 'tga');
    const usert = channels === 4 ? rt : saveframetga.rt;
    const width = (usert || canvas).width;
    let widthi = width * 4 / channels;
    if (width % 1)
        return msgfixerror('saveframetga width not multiple of four', width);
    let heighti = (usert || canvas).height;
    // read out of the converted canvas
    // this is in correct format and has had all processing applied
    // buffer has 18 bytes head + 4 bytes per pixel image data
    renderer.setRenderTarget(usert);
    if (!savebuff || savebuff.byteLength < channels * widthi * heighti + 18) {
        savebuff = new ArrayBuffer(channels * widthi * heighti + 18);
    }
    let imageview = new Uint8Array(savebuff, 18); // view of buffer offset to hold just image data
    let xbpv3 = new Uint8Array(savebuff);
    if (saveframetga.prepread) {
        saveframetga.prepread = false;
    }
    else {
        renderer.setRenderTarget(usert);
        gl.flush(); // I thought readPixels would do this, but ...???
        gl.readPixels(0, 0, widthi * channels / 4, heighti, gl.RGBA, gl.UNSIGNED_BYTE, imageview); // read offset so we can safely move data inplace
        gl.flush(); // I thought readPixels would do this, but ...???
        if (saveframetga.convertDone < framenum)
            _conv(imageview);
    }
    // saveframetga.convertDone = false;                // no need, rely on framenum
    if (channels !== 4)
        saveframetga.convert(rt, undefined, channels); // ready for next frame
    if (!fid) { // this was a preread call
        saveframetga.prepread = true;
        return;
    }
    if (!fid.endsWith('.tga')) {
        log('saveframetga called with wrong type, no-op', fid);
        return;
    }
    // note, saveframe1 and saveframe2 are wrappers for saveframe
    // log("write sync", fid);  // around 1 sec 17MB
    // older machine
    //     with new Buffer around 300ms, 6.6MB (correct)
    //     saveframe around 750ms, 4.2MB
    //     saveimage with prealloc around 200ms
    //     saveframetga around 250ms with prealloc
    //     saveframetga with both prealloc, around 50ms
    // stephen laptop
    //      saveframe1 with reorder (and to 3 byte) around 123ms; reduced to 79ms with careful use of buffer types
    //      saveframetga with both prealloc, no reorder around 24ms
    //      it would be good to find an acceaptable rgba uncompressed image format
    //      saveframe 290ms
    // reorder pixels, works best where both sides are Uint8Array, various similar loops trivially more expensive
    //for (let i=0, j=18; i<width*height*4; i+=4) { xbpv3[j++] = imageview[i+2]; xbpv3[j++] = imageview[i+1]; xbpv3[j++] = imageview[i]; }
    // header 18
    //  0   0 imageid length
    //  1   0 color map type
    //  2   2 image tyupe (uncomp0 color)
    //  3   0,0,0,0,0 color map
    //  8   0,0 left
    // 10   0,0 top
    // 12   w,w width  90 06
    // 14   h,h height F2 03
    // 16   32 pixel depth  (? x18=24 for rgb)
    // 17   ? image descriptor 00 for rgb, ? 8 for rgba (8 bits alpha)
    // imageid 0
    // colour map spec 0
    let bbb = xbpv3;
    bbb[2] = channels === 1 ? 3 : 2;
    bbb[12] = widthi & 255;
    bbb[13] = widthi >> 8;
    bbb[14] = heighti & 255;
    bbb[15] = heighti >> 8;
    bbb[16] = channels * 8; // bits per pixel
    if (channels === 4)
        bbb[17] = 8;
    let sync = true;
    const ll = 18 + widthi * heighti * channels;
    const ssb = (savebuff.byteLength > ll) ? new Uint8Array(savebuff).subarray(0, ll) : savebuff;
    if (!nwfs) {
        if (Files.dirhandle) {
            Files.write(fid, ssb);
        }
        else if (WA.saveframetga_writetextremote || savebuff.byteLength > 50e6) { // << avoid websocket limit ? not sure what limit is
            writetextremote(fid, ssb);
        }
        else {
            WA.fileWriteWS(fid, ssb);
        }
    }
    else if (sync) {
        let xbpv3b = new Buffer(ssb); // fast, control length in write
        let fd = nwfs.openSync(fid, 'w');
        //nwfs.writeSync(fd, bbb, 0, bbb.length);
        nwfs.writeSync(fd, xbpv3b, 0, 18 + widthi * heighti * channels);
        nwfs.closeSync(fd);
        //writetextremote(fid, xbpv3);
        //log("write sync", fid, 18 + width*height*channels);
    }
    else {
        let xbpv3b = new Buffer(savebuff); // fast, control length in write
        // async in this form gloes slower (partly larger file), and might need synchronization, extra buffers to ensure right answer
        nwfs.writeFile(fid, xbpv3b, nop);
        log("write async", fid);
    }
};
saveframetga.convertDone = 0;
/** convert a frame so it is friendly to tga format
* by default conversion is only valid for the frame in which it is done
* late=1 allows the frame to be converted now (eg postframe_
* but still valid in the next frame. (eg during preframe)
 */
saveframetga.convert = function (rt, late = 0, channels) {
    let widthi, heighti;
    if (!rt) {
        saveframetga.intex = saveframetga.intex || new THREE.Texture(canvas, undefined, // define just once
        THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter);
        rt = saveframetga.intex;
        widthi = rt.image.width;
        heighti = rt.image.height;
        saveframetga.intex.needsUpdate = true;
    }
    else {
        let im = rt.image || rt;
        widthi = im.width;
        heighti = im.height;
        if (!widthi)
            debugger;
    }
    rt.needsUpdate = true;
    if (!saveframetga.rt || saveframetga.rt.width !== widthi * channels / 4 || saveframetga.rt.height !== heighti) {
        saveframetga.rt = WebGLRenderTarget(widthi * channels / 4, heighti, {
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            depthBuffer: false,
            stencilBuffer: false
        }, 'saveframetga.convert');
        saveframetga.rt.texture.generateMipmaps = false;
    }
    if (!saveframetga.material1) {
        saveframetga.uniforms = {
            intex: { type: 't' },
            res: { type: 'v2', value: new THREE.Vector2(0, 0) }
        };
        saveframetga.material3 = new THREE.ShaderMaterial({
            uniforms: saveframetga.uniforms,
            vertexShader: getfiledata("shaders/copy43.vs?" + Date.now()),
            fragmentShader: getfiledata("shaders/copy43.fs?" + Date.now()),
            depthTest: false, depthWrite: false,
            transparent: false,
            side: THREE.FrontSide
        });
        saveframetga.material1 = new THREE.ShaderMaterial({
            uniforms: saveframetga.uniforms,
            vertexShader: getfiledata("shaders/copy43.vs?" + Date.now()),
            fragmentShader: getfiledata("shaders/copy41.fs?" + Date.now()),
            depthTest: false, depthWrite: false,
            transparent: false,
            side: THREE.FrontSide
        });
        saveframetga.material1.name = 'saveframetga1';
        saveframetga.material3.name = 'saveframetga3';
        saveframetga.scene = newscene('saveframetga');
        let xgeometry = new THREE.PlaneGeometry(2, 2);
        saveframetga.mesh = new THREE.Mesh(xgeometry, saveframetga.material3);
        saveframetga.mesh.frustumCulled = false;
        saveframetga.scene.addX(saveframetga.mesh);
    }
    //saveframetga.rt = undefined;
    saveframetga.uniforms.res.value.x = widthi;
    saveframetga.uniforms.res.value.y = heighti;
    saveframetga.uniforms.intex.value = rt.texture || rt; // make sure relevant rt is used as input
    saveframetga.mesh.material = channels == 1 ? saveframetga.material1 : saveframetga.material3;
    // saveframetga.uniforms.intex.value = slots[0].dispobj.rt;
    //let renderer = renderer2;
    renderer.setClearColor(ColorKeywords.black, 0);
    renderer.setRenderTarget(saveframetga.rt);
    rendererSetViewportCanv(0, 0, widthi, heighti);
    renderer.clear();
    rrender('tgaconvert', saveframetga.scene, camera, saveframetga.rt); // reason, scene, camera not used, target, flag
    saveframetga.convertDone = framenum + late;
};
/** save single image: size is taken from parameter ss, or if none from imageres, or if none from savesize
 * does NOT save nocamscene (typically menu)
 */
async function saveimage1(ww, hh, bmp) {
    const s = V.nocamscene.visible;
    V.nocamscene.visible = false;
    try {
        await saveimage(ww, hh, bmp, true);
    }
    finally {
        V.nocamscene.visible = s;
    }
}
/** save single image high quality: size is taken from parameter ss, or if none from imageres, or if none from savesize */
async function saveimage1high(ww, hh, bmp) {
    await saveimagehigh(ww, hh, bmp, true);
}
/** save image: size is taken from parameter ss, or if none from imageres, or if none from savesize */
async function saveimagehigh(ww, hh, bmp, oneonly) {
    let sres = inputs.resbaseui;
    let srr = inputs.renderRatioUi;
    let srres = inputs.imageres;
    let sww = width, shh = height;
    // setSize(100,100);               // this may help having mutiple lots of big buffers around at once BUT upsets tile size and aspect
    clearrendertargets();
    inps.resbaseui = Math.max(inps.resbaseui, 14);
    //    setInput(W.renderRatioUi, 1);  // << tradeoff here, value such as 0.5 means imageres must be reduced
    setInput(W.imageres, 6 * 1024); // << would like 8*
    await saveimage(ww, hh, bmp, oneonly);
    setInput(W.resbaseui, sres);
    setInput(W.renderRatioUi, srr);
    setInput(W.imageres, srres);
    setSize(sww, shh);
}
var xpv4, xpv3; // save realloc if done in advance
/** save image: size is taken from parameter ss, or if none from imageres, or if none from savesize */
async function saveimage(ww, hh, bmp, oneonly, ffid) {
    // ??? check  usemask, renderRatioUI, springs.start,
    vpalleq = 'sides';
    let fullww = (slots[-1]) ? slots[-1].x : width; // don't include projvp
    let asp = inputs.previewAr ? inputs.imageasp : fullww / height;
    let wwhh = imsize(ww, hh, asp);
    ww = wwhh[0];
    hh = wwhh[1];
    /*** decide on fid ***/
    let t = new Date().toISOString().replace(/:/g, ".");
    let nmsg = t + "_" +
        "-w" + ww +
        "-h" + hh +
        "-" + inputs.resbaseui +
        "-" + inputs.resdyndeltaui +
        "-" + inputs.renderRatioUi +
        "";
    let iname = loadOao.lastfn.split('\\').pop().split('/').pop().replace('.oao', ''); // trygeteleval('imagename', "organic");
    let fid = ffid !== null && ffid !== void 0 ? ffid : (iname + nmsg + ".tga");
    fid = getdesksave() + fid;
    msgfixlog('saveimage', "starting ...", ww, hh, 'bmp', bmp, 'oneolny', oneonly, 'fid', fid);
    if ((oneonly || vps[0] * vps[1] <= 1) && ww > 3 * 1024)
        return await saveframetgabig(fid, ww, hh);
    inputs.resbaseui += 1;
    let vfast = false && ww === canvas.width && hh === canvas.height; // todo, decide if/when this can be used
    let rt, sww, shh, svp0, svp1, susebyte = Dispobj.usebyte;
    // Even with Dispobj.usebyte this path is broken (lots gl context) for 4096x4096
    Dispobj.usebyte = true; // not needed for tgabig, but useful here Stephen 17/11/2022
    if (!vfast) {
        sww = width, shh = height, svp0 = vps[0], svp1 = vps[1];
    }
    if (vfast) {
        renderer.setRenderTarget(null);
        /******* renderTarget method disabled 4 Sept 2016 ... for unknown reason the copy phase was just giving plain coloured images  *** /
        } else if (/**inputs.renderRatioUi*1 === 1 &&** / (slots.length === 1 || oneonly)) {  // save using renderTarget. ??? higher quality, but does not allow for viewports (all laid on top of each other)

            // this initial incantation seems to ensure that the gamma copy stage works correctly
            // otherwise it works just sometimes, eg if two saveimage() are done with no 'standard' rendering in between
            // TODO: find out why
            set Size(width, height); renderFrame();  //todo
            //set Size(ww,hh); renderFrame();  //todo

            let bdispobj = slots[(inputs.projvp) ? -1 : mainvp].dispobj; // dispobj to establish aspect ration
            let wwhh = imsize(ww, hh, bdispobj.width/bdispobj.height);

            // We make this look like a standard Dispobj with vpx composition rendering
            // Mayne overkill, and would be easier to make our own scene
            // but for now we are sure to get details such as Dispobj.tune consistent this way.
            let dr = new Dispobj();                       // dispobj for actual rendering
            dr.genes = bdispobj.genes;
            dr.vn = bdispobj.vn;  // not really true
            dr.needssUpdate = true;
            dr.needsRender = 1;

            ww = wwhh[0]; hh=wwhh[1];
            log("... save image starting ...", ww, hh, 'bmp', bmp, 'oneolny', oneonly);
            let rr = inputs.renderRatioUi;
            dr.width = ww; dr.height = hh;
            dr.cx = ww/2; dr.cy = hh/2;
            let scene = dr.scene;
            scene.position.x = dr.cx; scene.position.y = dr.cy;
            scene.position.z = 0;
            scene.scale.x = dr.width; scene.scale.y = dr.height;


            clearrendertargets();   // maxmize GPU space free
            for (let i=0; i<25; i++) renderObj(dr);  // loop for feedback
            if (checkglerror("gl after saveimage renderObj"))
                debugger;

            // extra step here for gamma, soft clipping, etc
            while (vpx QuadScene.children.length > 0)
                vpx QuadScene.remove(vpx QuadScene.children[0]);
            let vpxSceneRenderCamera = new THREE.OrthographicCamera(0, ww, hh, 0, -100, 100);
            //vpxSceneRenderCamera.matrixAutoUpdate = false;

            dr.visible = true;  // add to vpx quadscene

            let inrt = dr.rt;
            let rt = getrendertarget( 'rtopos', {sizer: {width:ww, height: hh}} ); // reuse one to save memory
            renderer.setRenderTarget(rt);
            // renderer.setClearColor(selcol);   // not needed? for debug
            renderer.clear();
            // dr.uniforms.intex.value = inrt;  // already true

            rrender("saveimage final copy", vpxQuadScene, vpxSceneRenderCamera, rt);
            checkglerror("gl after savimage final copy");
            renderer.setRenderTarget(rt);
        /********************* end disabled section **************/
    }
    else { // save by resizing the main window
        //let fullww = (slots[-1]) ? slots[-1].x : width;  // don't include projvp
        //let wwhh = imsize(ww, hh, fullww/height);
        //ww = wwhh[0]; hh=wwhh[1];
        if (oneonly)
            vps = [0, 0];
        let sfull = inputs.fullvp; // save special vp rules
        let sproj = inputs.projvp;
        inputs.fullvp = false; // ignore for image save
        inputs.projvp = false;
        clearrendertargets(); // have as little extra memory in use as possible
        let ok = setSizePX(ww, hh, true); // make sure all the slots dispobj etc set to correct size, maybe too big for canvas so use force
        if (!ok) {
            setSizePX(8, 8); // don't waste space on for now unused real canvas
            rt = WebGLRenderTarget(ww, hh, {
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType,
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                wrapS: THREE.ClampToEdgeWrapping,
                wrapT: THREE.ClampToEdgeWrapping,
                //depthBuffer: false,
                stencilBuffer: false
            }, 'saveimage_big_buffer');
            rt.texture.generateMipmaps = false;
            rt.depthBuffer = true; // can avoid this if we don't render boundaries of vps ???
            setViewports(vps, ww, hh); // set viewports for rt (rather than for canvas)
            log('test that we can render to big render target, current totsize', newTHREE_DataTextureSize / 1e6);
            renderObjsInner(rt); // so if we run out of memory we do it asap
            log('render to big render target ok, current totsize', newTHREE_DataTextureSize / 1e6);
        }
        checkglerror("gl after setSizePX");
        forcerefresh = true;
        msgfixlog('saveimage', "start render");
        const loop = cMap.renderState === 'color' ? 1 : 25;
        const loopmax = 150; // even with color we may not have repainted all neccessary
        refall();
        for (let i = 0; i < loop || (i < loopmax && slots.some(s => s.dispobj.needsRender)); i++) { // make sure up to date, even including feedback
            //renderFrame(rt);
            //framenum++;         // update for
            // await S.frame();
            await sleep(40); // S.frame does not finish if minimized, broken if minimized anyway
            msgfixlog('saveimage', `${i} tot:${slots.reduce((c, s) => c += s ? s.dispobj.needsRender : 0, 0)} byslot:${slots.map(s => s.dispobj.needsRender)}`);
        }
        checkglerror("gl after renderFrame");
        inputs.fullvp = sfull; // restore
        inputs.projvp = sproj;
        if (rt) {
            log('pre update big render target before saving, current totsize', newTHREE_DataTextureSize / 1e6);
            renderer.setRenderTarget(rt);
            renderObjsInner(rt); // so rt actually gets the latest data
            log('post update big render target before saving, current totsize', newTHREE_DataTextureSize / 1e6);
        }
    }
    inputs.resbaseui -= 1;
    // clean as much as possible before trying to convert
    if (rt) {
        clearrendertargets_exclusions = ['saveimage_big_buffer'];
        clearrendertargets();
        setSize();
        log('resize before trying tga conversion, current totsize', newTHREE_DataTextureSize / 1e6);
    }
    /***** save using tga code ******/
    msgfixlog('saveimage', 'converting');
    await S.frame();
    if (rt)
        saveframetga.convert(rt, undefined, 3); // dont convert canvas
    log('convert done, current totsize', newTHREE_DataTextureSize / 1e6);
    msgfixlog('saveimage', 'saving');
    await S.frame();
    saveframetga(fid, rt, rt ? 3 : 4);
    clearrendertargets_exclusions = [];
    log('image saved,  current totsize', newTHREE_DataTextureSize / 1e6);
    /**** convert saved image if possible */
    if (nwfs) {
        let tiffid = fid.replace(".ppm", ".tif").replace(".tga", ".tif");
        // compress saved file to .tif with tifc=1, lzw
        let iview = "C:\\Program Files (x86)\\IrfanView\\i_view32.exe";
        if (!fileExists(iview))
            iview = "C:\\Program Files\\IrfanView\\i_view64.exe";
        if (fileExists(iview)) {
            let spawn = require('child_process').spawn;
            let args = [fid, "/convert=" + tiffid, "/tifc=1", "dpi=(150,150)"];
            let proc = spawn(iview, args);
            proc.on("close", function (evt) {
                log("iview close", evt, proc.exitCode, "converted to", tiffid);
                if (evt === 0)
                    nwfs.unlink(fid, nop);
            });
        }
        else {
            //we should use ImageMagick to be more cross-platform compatible.
            log("No irfanview found, cannot replace .ppm file with .tif");
        }
    }
    // restore
    clearrendertargets(); // clean up any huge buffers
    if (sww) { // restore the size if necessary ~~ view ports
        vps[0] = svp0;
        vps[1] = svp1;
        setSize(sww, shh);
        refall(); // should redo things and lose our big rendertarget
    }
    Dispobj.usebyte = susebyte;
    msgfixlog('saveimage', 'done');
}
/** save a high resolution image in tiles
 * inputs may be absolute size, or multiples of current size
 *
 * implementation notes:
 * some details may be too specific to tadpoles still
 * we show rt kind of feedback
 *    first phase is run at high res (8192) to get best possible feedback frame. Can't afford antialias at this res
 *    we then grab this high res feedback frame, and move to a pseudo fixed mode using it for feedback
 *    second phase records images in stripes, each image is fairly low res, but with high antialias
 */
async function saveframetgabig(fid = 'big.tga', ww = width * 4, hh = height * 4, opts = {}) {
    const sv = [usemask, Dispobj.usebyte, WA.maxsize, inps.renderRatioUi, springs.isRunning];
    const restore = () => [usemask, Dispobj.usebyte, WA.maxsize, inps.renderRatioUi, springs.isRunning] = sv;
    try {
        await sethighres(5e9);
        await fixfeedcoreprep(50);
        await renderTiles(fid, ww, hh, opts);
    }
    finally {
        restore();
    }
}
/** set to maximum 'safe' resolution
 * 2e9 ->  8268x4651
 * 3e9 -> 10124x5695  1.4gB free (usebyte) 220MB free (float)
 */
async function sethighres(maxsize = 3e9, bigcanv = false) {
    const maxt = renderer.capabilities.maxTextureSize;
    if (usemask === 2)
        usemask = 1;
    Dispobj.usebyte = true;
    WA.maxsize = Infinity;
    // decide some values
    const rtsize = 4 * 4, depthsize = 4, totsize = 3 * rtsize + depthsize;
    const baseused = width * height * totsize;
    let ratio = Math.sqrt(maxsize / baseused);
    if (ratio * width > maxt)
        ratio = maxt / (width + 1);
    ratio = ((ratio * width) & 0xfffffc) / width;
    if (ratio * height > maxt)
        ratio = maxt / (height + 1);
    await saferResize(width * ratio, height * ratio, bigcanv);
}
/** move to size slowly to give bufferes chance to clean */
async function saferResize(nwidth, nheight = nwidth * height / width, bigsize = false) {
    // if (feed.feedfix) feed.feedfix = false;  // won't be valid any more, but could still be useful
    // clean old
    if (!bigsize && inps.renderRatioUi === width / nwidth)
        return; // already correct
    clearrendertargets();
    inps.renderRatioUi = 50;
    if (bigsize) {
        setSizePX(nwidth, nheight, true);
        fitCanvasToWindow();
    }
    // await S.frame(20); await S.sleep(1000);
    clearrendertargets();
    await S.nap(1000);
    inps.renderRatioUi = bigsize ? 1 : width / nwidth;
    await S.frame(2); // so feedback _rts established if necessary
}
// don't override on reload
var _fixinfo = _fixinfo !== null && _fixinfo !== void 0 ? _fixinfo : { feedrt: undefined, times: 0, width: 0, height: 0, core: undefined, mode: 'realtime feed', restore: () => { } };
/** fix feedback to a frozen copy of rendertarget  */
async function fixfeed(fwidth, fheight = fwidth * height / width) {
    // quick out if size OK
    _fixinfo.mode = 'fixed feed';
    if (_fixinfo.feedrt) {
        if (!fwidth)
            return log('feed already fixed, no size to match', _fixinfo.width, _fixinfo.height);
        if (fwidth === _fixinfo.width && fheight === _fixinfo.height)
            return log('fixfeed already fixed, correct size', _fixinfo.width, _fixinfo.height);
    }
    const ssave = [width, height, inps.renderRatioUi];
    function restore() {
        const [w, h, i] = ssave;
        if (w !== width || h !== height)
            setSize(w, h);
        if (i !== inps.renderRatioUi)
            inps.renderRatioUi = i;
    }
    try {
        if (_fixinfo.feedrt)
            unfixfeed();
        // TODO also avoid resize for explicit same width
        if (fwidth) {
            log('resize fixfeed', width, height, '=>', fwidth, fheight);
            await saferResize(fwidth, fheight);
            log('resize fixfeed done', width, height, '=>', fwidth, fheight);
            await S.frame(30); // ??? let it reestablish the feed
        }
        _fixinfo.width = width;
        _fixinfo.height = height;
        _fixinfo.times++;
        const dobj = slots[mainvp].dispobj, rt = dobj.rt;
        const oldname = rt.name;
        _fixinfo.feedrt = rt;
        rt.name += 'F@' + _fixinfo.times;
        const n = dobj._rts[0] === rt ? 0 : dobj._rts[1] === rt ? 1 : (console.error('bad rts'), 99);
        const newrt = dobj._rts[n] = rt.clone();
        newrt.name = oldname + 'C@' + _fixinfo.times++;
        if (bigrt === rt)
            bigrt = newrt;
        // if (dobj._rts) {
        //     const killrt = dobj._rts[dobj._rts[0] === rt ? 1 : 0];          // other rt to kill in usual way
        //     killrt.dispose();
        // }
        // dobj._rts = dobj._renderTarget = undefined;
        // delete rendertargets[rt.name];                        // make sure rt isn't killed
        dobj._rts[0].texture.name = 'rtt0texture';
        dobj._rts[1].texture.name = 'rtt1texture';
        _fixinfo.feedrt.texture.name = 'fixtexture';
        // TODO REGISTER new rt
    }
    finally {
        restore();
    }
}
/**
 * phases to run
 * sethighres() => ready  (optional)
 * feedcoreprep() => populate feedcore
 * fixfeedcorerun() => running using feedcore
 * feedcoreend() => normal running
 *
 */
/** setup fix feedback just using the core, automatically go into run after frames frames (if specified) */
async function fixfeedcoreprep(frames) {
    if (_fixinfo.core)
        return log('already in fixfeedcoreprep', _fixinfo.mode);
    unfixfeed(); // just in case
    _fixinfo.restore = () => {
        if (!_fixinfo.core)
            return;
        let feed_fp;
        [feed_fp, V.nocamscene.visible, V.camscene.visible, inps.resbaseui, feed.freeze] = _fixinfo.core;
        _fixinfo.core = undefined;
        Object.assign(feed.fp, feed_fp);
    };
    _fixinfo.core = [Object.assign({}, feed.fp), V.nocamscene.visible, V.camscene.visible, inps.resbaseui, feed.freeze];
    V.nocamscene.visible = V.camscene.visible = false;
    inps.resbaseui = Math.max(inps.resbaseui, 14);
    feed.freeze = true;
    const crx = G.centrerefl * G.centrereflx / feed.coreuse, cry = G.centrerefl * G.centrerefly / feed.coreuse;
    const fixw = xxxrt().width, fixh = xxxrt().height; // temporary assumes no aspect ratio change
    const fixww = fixw / crx, fixhw = fixh / cry; // equivalent full size, we are peeking centre section
    camera.setViewOffset(fixww, fixhw, (fixww - fixw) / 2, (fixhw - fixh) / 2, fixw, fixh);
    feed.viewfactor = -1;
    _fixinfo.crx = crx; // pending use
    _fixinfo.cry = cry;
    _fixinfo.centrerefl = [1, feed.coreuse, feed.coreuse]; // save these for dynamic change of uniforms
    _fixinfo.mode = 'prepare feedcore';
    feed.clear();
    if (frames !== undefined) {
        if (_vieweditlist.feed)
            _vieweditlist.feed.gui.style.background = 'red';
        await S.frame(frames);
        await fixfeedcorerun();
        if (_vieweditlist.feed)
            _vieweditlist.feed.gui.style.background = '';
    }
}
/**  */
async function fixfeedcorerun() {
    // [G.centrerefl, G.centrereflx, G.centrerefly] = _fixinfo.core;
    camera.clearViewOffset();
    await fixfeed();
    _fixinfo.mode = 'run with feedcore';
}
function fixfeedcoreend() {
    _fixinfo.mode = 'realtime feed';
    _fixinfo.restore();
    // for consistent state, could leave out but this would have odd (,aybe interesting) side-effects from the old fixed feedcore
    unfixfeed();
    feed.clear();
}
function unfixfeed() {
    _fixinfo.mode = 'realtime feed';
    if (!_fixinfo.feedrt)
        return;
    if (_fixinfo.core) {
        console.error('unexpected unfixfeed while in core mode, ending core');
        fixfeedcoreend();
    }
    _fixinfo.feedrt = undefined; // feedrt also used as active indicator
}
/** pending */
function showfeedview(k = 10, p = 0.7) {
    k = 10;
    p = 0.7;
    camera.setViewOffset(width, height, width * p, height * p, width / k, height / k);
    feed.viewfactor = -1;
}
var renderTilesInterrupt = false;
/** render out in tiles, dpi is dots per inch, wm is width in metres (overrides dpi) */
async function renderTiles(pfid, ww, hh, { bigRenderRatio = 1 / 3, deletetga = true, bw = false, convert = true, savetiles = false, xs = 2, dpi = 0, wm = 0, stripl = 0, stripr = NaN, striplm = 0, striprm = NaN } = {}) {
    var _a;
    // save some data, and set some high resolution details
    let Vguivisible = V.gui && V.gui.visible;
    if (!((_a = camera.view) === null || _a === void 0 ? void 0 : _a.enabled)) {
        camera.setViewOffset(width, height, 0, 0, width, height);
        camera.clearViewOffset();
    } // so it's available for saving
    let ocv = Object.assign({}, camera.view);
    const savestate = [
        inputs.resbaseui, tad.colorCyclePerMin, width, height,
        tad.continuousActive, tad.isInteract, springs.isRunning, inputs.renderRatioUi, inputs.imageasp, vps.slice(0),
        V.wallAspect, G.wallAspect, preventScale, render_depth_shadows, V.nocamscene.visible, V.camscene.visible, clone(imageOpts), specialPostrender, clone(U.edgecol),
        V.camscene.visible, zoomCam, feed.viewfactor, G.centrerefl, feed.fp.scale, renderRatio, renderRatioMain, renderRatioProj, feed.corefixfeed, feed.fixfeed, feed.freeze
    ];
    const restore = async () => {
        console.timeEnd('renderTiles ' + ww);
        let vpsx, tedgecol, timageOpts;
        [
            inps.resbaseui, tad.colorCyclePerMin, width, height,
            tad.continuousActive, tad.isInteract, springs.isRunning, inps.renderRatioUi, inps.imageasp, vpsx,
            V.wallAspect, G.wallAspect, preventScale, render_depth_shadows, V.nocamscene.visible, V.camscene.visible, timageOpts, specialPostrender, tedgecol,
            V.camscene.visible, zoomCam, feed.viewfactor, G.centrerefl, feed.fp.scale, renderRatio, renderRatioMain, renderRatioProj, feed.corefixfeed, feed.fixfeed, feed.freeze
        ] = savestate;
        U.edgecol.copy(tedgecol);
        Object.assign(imageOpts, timageOpts);
        feed.onChange();
        setSize(width, height);
        if (ocv.enabled)
            camera.setViewOffset(ocv.fullWidth, ocv.fullHeight, ocv.offsetX, ocv.offsetY, ocv.width, ocv.height);
        else
            camera.clearViewOffset();
    };
    try {
        feed.freeze = true; // do this asap
        const ds = getdesksave();
        let bfid = pfid || prompt('enter name for tga and settings files', 'tile' + dateToFilename());
        if (bfid.endsWith('.tga'))
            bfid = bfid.replace('.tga', '');
        if (!bfid.startsWith(ds))
            bfid = ds + bfid;
        await saveLots(bfid);
        const fid = bfid + '.tga';
        if ((G.renderBackground !== 0 || cMap.renderState === 'feedback') && !_fixinfo.core && feed.dofeed) {
            const tt = prompt(`core fixed feedback not set up, choose:
            'x': run with no fixed feedback
                        feedback areas will be wrong
            'f': set fixed feedback
                        feedback will be correct but not best quality
            'c': set core fixed feedback
                        will be delay while feedback established
            anything else:
                        return at once without rendering`, '');
            switch ((tt !== null && tt !== void 0 ? tt : '').toLowerCase()) {
                case 'x': break;
                case 'f':
                    feed.fixfeed = true;
                    await S.frame();
                    break;
                case 'c':
                    await fixfeedcoreprep(50);
                    break;
                default: return;
            }
            // if (!confirm('no fixed feedback core set up, continue?')) return;
        }
        log(`renderTiles given ww=${ww} wm=${wm} dpi=${dpi}`);
        const ipm = 100 / 2.54; // dots per metre
        if (dpi > 0 && wm > 0 && !ww)
            ww = Math.round(wm * ipm * dpi);
        else if (ww > 0 && wm > 0 && !dpi)
            dpi = ww / wm * ipm;
        log(`renderTiles used ww=${ww} wm=${wm} dpi=${dpi}`);
        if (!ww)
            return console.error('bad width for renderTiles');
        if (isNaN(stripr) && striprm)
            stripr = Math.round(striprm * ipm * dpi);
        if (!stripl && striplm)
            stripl = Math.round(striplm * ipm * dpi);
        if (isNaN(stripr))
            stripr = ww;
        log('render strips', stripl, stripr);
        console.time('renderTiles ' + ww);
        renderTilesInterrupt = false;
        // NO, above will have arranged this if appropraite ... feed.fix feed = true;
        // LOTS OF THIS should have been done BEFORE FIXING
        // set up some high res and fi details
        V.nocamscene.visible = false; // too late
        V.camscene.visible = false;
        inps.resbaseui = Math.max(inps.resbaseui, 12); // too late here fo fix!
        setInput(WA.shadr4096, true);
        setViewports([0, 0]);
        tad.colorCyclePerMin = 0;
        if (V.gui)
            V.gui.visible = false;
        tad.continuousActive = tad.isInteract, springs.isRunning = false;
        render_depth_shadows = nop;
        let { width: wwidth, height: wheight } = window;
        hh = hh !== null && hh !== void 0 ? hh : ww * wheight / wwidth; // preserve aspect if h not specified
        ww = Math.floor(ww);
        hh = Math.floor(hh);
        // compute tiles, use existing size or multiple xs
        const tx = 24, tx2 = 2 * tx; // extra boundary pixels to make sure tiles mesh correctly
        const twidthr = wwidth * xs, theightr = wheight * xs; // tile size rendered
        const twidthu = twidthr - tx2, theightu = theightr - tx2; // tile size used
        let stripw = stripr - stripl;
        let xx = Math.ceil(stripw / twidthu); // number of tiles
        let yy = Math.ceil(hh / theightu);
        setSizePX(twidthr, theightr, true); // true forces exactly as asked
        renderRatio = renderRatioMain = renderRatioProj = twidthr / xxxrt().width;
        const info = `${xx}x${yy} tiles, each tile ${twidthr}x${theightr}, used ${twidthu}x${theightu}, total ${stripw}x${hh} of ${xx * twidthu}x${yy * twidthu}, rr ${renderRatio}`;
        msgfixlog('tiling', `${info}`);
        // run real capture phase ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        await S.maestro('postframe');
        await S.maestro('postframe');
        // now start real work
        // http://www.paulbourke.net/dataformats/tga/
        // typedef struct {
        //     char  idlength;
        //     char  colourmaptype;
        //     char  datatypecode;
        //     short int colourmaporigin;
        //     short int colourmaplength;
        //     char  colourmapdepth;
        //     short int x_origin;
        //     short int y_origin;
        //     short width;
        //     short height;
        //     char  bitsperpixel;
        //     char  imagedescriptor;
        //  } HEADER;
        let bbb = new Uint8Array(18); // prepare and output tga header
        bbb[2] = bw ? 3 : 2; // datatype code, 2: rgb 3: grey
        bbb[12] = stripw & 255; // width
        bbb[13] = stripw >> 8;
        bbb[14] = hh & 255; // height
        bbb[15] = hh >> 8;
        bbb[16] = bw ? 8 : 24; // bits per pixel
        writetextremote(fid, bbb);
        let channels = bw ? 1 : 3;
        let b = new Uint8Array(twidthu * theightu * 4); // array to read from gpu; only useful bits not boundary
        let z = new Uint8Array(stripw * theightu * channels); // tga format data for one stripe of images
        // const res = ww / bigRenderRatio;            // so we can scale image edges
        if (tgaspreadusetga && (G.edgeprop !== 0 || G.fillprop !== 0)) {
            feed.viewfactor = -1; // dont let zoom Cam interfere with viewOffset
        }
        else {
            clearImageEdge();
        }
        feed.viewfactor = -1; // dont let zoom Cam interfere with viewOffset
        //?const r = 1/inps.renderRatioUi; // was used in res2uniforms() calculation of (ovearll) width
        // const offX = 0, offY = 0;  // offX,offY were used if original to be saved was already window offset
        //log('ViewOffset >>>>>>>>>>', widthi*r, heighti*r, '...', '...', twidthx*r, theightx*r);
        for (let yt = 0; yt < yy; yt++) {
            for (let xt = 0; xt < xx; xt++) {
                if (gl.isContextLost())
                    return (console.error('web context lost rendering tiles'));
                // camera.setViewOffset(widthi/xx, heighti/yy, width*x/xx, height*(yy-y-1)/yy, width/xx, height/yy);
                camera.setViewOffset(ww, hh, (twidthu * xt - tx) + stripl, hh - theightu * (yt + 1) - tx, twidthr, theightr);
                // log('view', yt, xt, '=>', camera.view)
                let nnnn = 0;
                for (let i = 0; i < nnnn; i++)
                    await S.frame();
                // await S.frame();
                await S.maestro('postframe');
                if (renderTilesInterrupt)
                    return;
                // await sleep(500);
                // read the used part of the rendered tile
                renderer.setRenderTarget(null);
                gl.flush(); // I thought readPixels would do this, but ...???
                gl.finish(); // I thought readPixels would do this, but ...???
                gl.readPixels(tx, tx, twidthu, theightu, gl.RGBA, gl.UNSIGNED_BYTE, b); // read offset so we can safely move data inplace
                gl.flush(); // I thought readPixels would do this, but ...???
                // format and copy the tile data into the tga stripe buffer, function to help optimizer and make visible in performance trace
                function formatAndCopy() {
                    const hiyp = Math.min(theightu, hh - yt * theightu); // last y pixel to use
                    const hixp = Math.min(twidthu, stripw - xt * twidthu);
                    for (let yp = 0; yp < hiyp; yp++) { // y pixel
                        let ip = 4 * (yp * twidthu); // input pos in tile
                        let op = channels * (yp * stripw + xt * twidthu);
                        let loxp = 0;
                        if (copyXflip < 0) {
                            // first is right aligned, last juts out to left of required area
                            const right = stripw - xt * twidthu, left = right - twidthu; // x pixels covered by this tile
                            op = channels * (yp * stripw + left); // op to use this left
                            if (left < 0) {
                                op -= channels * left; // only copy the used right hand end, increment 'from' position
                                ip -= 4 * left; // and increment 'to' position. nb, left is -ve, so -= is actually incrementing
                            }
                        }
                        for (let xp = loxp; xp < hixp; xp++) {
                            z[op++] = b[ip + 2];
                            if (!bw) {
                                z[op++] = b[ip + 1];
                                z[op++] = b[ip];
                            }
                            ip += 4;
                        }
                    }
                }
                formatAndCopy();
                if (savetiles)
                    saveframe('tile' + xt + yt + '.jpg');
            }
            msgfixlog('tiling', `done row ${yt + 1} of ${yy}, ${info}`);
            appendtextremote(fid, z);
        }
        log('saveframetgabig done');
        if (convert) {
            msgfixlog('tiling', `done, converting, ${info}`);
            const nfid = await tga2tif(fid, undefined, { dpi, dogray: bw });
            if (deletetga && await fileExistsAsync(nfid))
                fileDelete(fid);
        }
    }
    finally {
        await restore();
    }
}
/** convert image to high quiality jpg using ifranview, return new fid if ok, else undefined */
async function tga2tif(fid, nfid, { dogray = G.fillprop === 1, dpi = 0 } = {}) {
    fid = fid.split('/').join('\\');
    const iv = 'c:\\Program Files\\IrfanView\\i_view64.exe';
    const gray = dogray ? '/gray' : '';
    const ddpi = dpi > 0 ? `/dpi=(${dpi},${dpi})` : '';
    if (!nfid)
        nfid = `${fid}.iv.tif`;
    const cmd = `"${iv}" "${fid}" ${gray} ${ddpi} /convert=${nfid} /tifc=1`; // tifc=1 for LZW
    const rr = runcommandphp(cmd);
    // should convert to use Promises. n.b. await S.frame() doesn't seem to work here ...
    if (rr === '' && fileExists(nfid)) {
        const cmd1 = `start "iview" "${iv}" "${nfid}"`;
        const rr1 = runcommandphp(cmd1);
        return nfid;
    }
    else {
        alert(`tgaconv error:\n${cmd}\n${rr}\nMay be irfanView 64 bit not found where expected`);
        console.error(`tgaconv error:\n${cmd}\n${rr.responseText}`);
    }
}
/** generate strips, eg for wallpaper */
async function genstrips({ dpi = 50, n = 2 } = {}) {
    const ds = getdesksave();
    for (let i = 0; i < n; i++) {
        await renderTiles(ds + 'strip' + (i + 100) + '.tga', undefined, undefined, { wm: tadbwSetup.width, striplm: i, striprm: i + 1, dpi });
    }
}
/** generate a pair of images for wallpaper to get >64k images */
async function genpair({ dpi = 300 } = {}) {
    const ds = getdesksave();
    await renderTiles(ds + 'strip' + dpi + '_1.tga', undefined, undefined, { wm: tadbwSetup.width, striplm: 0, striprm: 5.4, dpi });
    await renderTiles(ds + 'strip' + dpi + '_2.tga', undefined, undefined, { wm: tadbwSetup.width, striplm: 5.4, striprm: tadbwSetup.width, dpi });
}
///// find sendkey avoiding // comments ..  ^(?:(?!\/\/).)*sendkey
//# sourceMappingURL=imsave.js.map