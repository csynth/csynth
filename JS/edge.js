var zoomCam, feed, camera, xxxrt, imageOpts, xxxgenes, U

/** this will be called after uniforms set to patch them
scale up some edge details;
for now, G.baseksize is used to set required thickness and this code decides how to achieve that
if usethick thicken by image processing, else use 'real' baseksize
*/
function res2uniforms() {
    // const vk = feed.viewfactor
    // let k = vk || 1;
    zoomCam(feed.viewfactor);

    // const ww = camera.view?.enabled ? camera.view.fullWidth : xxxrt().width;
    const ww = (camera.view?.enabled ? camera.view.fullWidth/camera.view.width : 1) * xxxrt().width;

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
        if (U.occludewidth && U.occludewidth < U.baseksize) U.occludewidth = U.baseksize

        // use a little bit of thickness to allow for fractional basekdise
        imageOpts.thickness += U.baseksize % 1;
        U.baseksize = Math.floor(U.baseksize);
    }

}
window.addEventListener('setObjUniforms', res2uniforms);