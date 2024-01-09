var zoomCam, feed, camera, xxxrt, imageOpts, xxxgenes, U, killev, msgfixlog

/** this will be called after uniforms set to patch them
scale up some edge details;
for now, G.baseksize is used to set required thickness and this code decides how to achieve that
if usethick thicken by image processing, else use 'real' baseksize
*/
function res2uniforms() {
    // const vk = feed.viewfactor
    // let k = vk || 1;
    zoomCam(feed.viewfactor);

    // no xxxrt() during startup, but let it create some values
    const ww = (camera.view?.enabled ? camera.view.fullWidth/camera.view.width : 1) * (xxxrt()?.width ?? 1);

    let k = ww / imageOpts.baseres;
    const g = xxxgenes(); // g.xxx is gene value, should be the same as initial U.xxx
    if (g === undefined) return;
    ///imageOpts.speccol.setScalar((framenum * 7 % 17 + 1) * 2**-19)
    //U.edgecol.copy(imageOpts.speccol)
    // we are relying on feeddepth w channel to ensure we only thicken original, not background
    imageOpts.speccol.copy(U.edgecol); imageOpts.speccol.w = 0;

    if (g.baseksize == 0) {
        U.occludewidth = U.profileksize = U.baseksize = imageOpts.thickness = 0;
    } else if (imageOpts.usethick) {
        U.occludewidth = g.occludewidth ? k * (g.occludewidth + g.baseksize) : 0;
        U.profileksize = g.profileksize ? k * (g.profileksize + g.baseksize) : 0;
        imageOpts.thickness = g.baseksize * k; // ???  / 2;
        U.baseksize = 1;
    } else {
        // basic 'pure' wider kernel
        imageOpts.thickness = 1;
        U.baseksize *= k;
        U.occludewidth *= k;
        U.profileksize *= k;

        // detailed adjustments to pure kernel

        // less black edges so very thin lines can be represented
        // We won't be adding thickness, so speccol is not relevant
        if (U.baseksize < 1) {
            U.edgecol.setScalar((1-U.baseksize)); // ???  ** (1/2.2));
            U.baseksize = 1;
        } else {
            U.edgecol.setRGB(0,0,0); // need to have a reference value to reset it to
        }

        // occlusion less than line width gives odd line edge effect (todo? fix in shader)
        // for now, allow these odd line edge effects to happen
        // if (U.occludewidth && U.occludewidth < U.baseksize) U.occludewidth = U.baseksize

        // use a little bit of thickness to allow for fractional basekdise
        if (imageOpts.usethick) {
            imageOpts.thickness += U.baseksize % 1;
            U.baseksize = Math.floor(U.baseksize);
        }
    }

}
window.addEventListener('setObjUniforms', res2uniforms);

var edge = {}
var copyXflip, oldlayerX, width, oldlayerY, height, inps, readWebGlFloatDirect, getrendertarget, msgfixerror, tad, G, log,
    floor, MAX_HORNS_FOR_TYPE, msgfixerrorlog
/*** choose a colour based on picked point */
edge.chooseColour = function(evt, rt = getrendertarget('rtopos')) {
    killev(evt);
    if (tad.TADS === undefined || tad.TADS < 0) return msgfixerrorlog('edge', 'chooseColour for tadpoles only, not direct horns');
    if (G.OPOSZ !== 1) return msgfixerrorlog('edge', 'chooseColour for OPOSZ == 1 only');
    const sleft = copyXflip>0 ? oldlayerX : width - oldlayerX;
    const stop = height - oldlayerY;
    const left = sleft / inps.renderRatioUi;
    const top = stop / inps.renderRatioUi;
    const rrr = readWebGlFloatDirect(rt, { left, top, width: 1, height: 1 });
    const w = rrr[3];
    const thornid = floor(w / MAX_HORNS_FOR_TYPE)
    if (thornid !== 4) return msgfixerrorlog('edge', 'chooseColour not hitting expected tadpole');
    const hornnum = Math.floor(w % MAX_HORNS_FOR_TYPE)
    const tadnum = Math.floor(rrr[0] * tad.RIBS);  // << todo allow for capres
    const colid = tad.getCols(hornnum * tad.RIBS + tadnum);

    if (!edge.picker) {
        edge.picker = document.createElement('input');
        edge.picker.type = 'color';
        document.body.appendChild(edge.picker);
    }
    edge.picker.style.display = '';
    edge.picker.style.top = oldlayerY + 'px'
    edge.picker.style.left = oldlayerX + 'px'
    edge.picker.style.position = 'fixed';
    edge.picker.value = '#' + U.custcol[colid % 8].getHexString();
    edge.picker.focus()
    edge.picker.click()
    edge.picker.onchange = edge.picker.oninput = _evt => {
        U.custcol[colid % 8].setHex(parseInt(edge.picker.value.substring(1), 16))
    }
    edge.picker.onclose = edge.picker.onblur = _evt => edge.picker.style.display = 'none';

    msgfixlog ('edge', 'read point ', {w, rrr, thornid, hornnum, tadnum, colid})
}
