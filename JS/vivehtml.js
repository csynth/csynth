'use strict';

/****
todo, stephen, 4 Feb 2017
clean up object hierachy
    just one scene (V.rawscene)
    two controllers in scene, each with bigcontroller underneath
DONE gui not attached to textscene (ok when it starts but breaks on gui dragging)
clear match between left/right red/green controller1/2
make it so the controller raymatrix mat is computed in the right place
    find out why it is wrong with the 'standard' definition (scaling???)
text directly on buttons


****/
var textcanvas, textscene, texttexture, textgeom, CSynth, Image, Blob, framenum, msgfix, renderer, rrender, V, camera, runcommandphp,
CubeMap, vivecontrol, dat, resolveFilter, log, showvals, THREE, inputs, loadfree, springs,
W, html2canvas, renderVR, framedeltasmooth, currentHset, newscene, loadopen, processFile, setInput,
genedefs, currentGenes, setval, GX;

var VH = vivehtml;
// 0 is flat pad, 1 is trigger, 2 is side button, 3 is above pad button
function vivehtml() {


    if (VH.usetext) {
        if (!VH.all) {
            var all = document.getElementsByTagName("*");
            var alls = VH.all = {};
            for (var i=0;  i < all.length; i++)
                if (all[i].id !== '') alls[all[i].id] = all[i];

            W.xallbody = W.allbody;  // just in case
            document.body.removeChild(W.allbody);
            for (var id in alls)
                if (!W[id])
                    W[id] = alls[id];
            W.xxx = W.horncontextmenu;
        }

        if (!VH.canvas) {
            var cs = document.body.getElementsByTagName('canvas');
            for (var c = 0; c < cs.length; c++)
                if (!cs[c].id) {
                    cs[c].id = 'xcanvas';
                    VH.canvas = cs[c];
                }
        }
        //document.getElementsByTagName('html-gl')[0].innerHTML = W.msgbox.innerHTML;
        // document.getElementsByTagName('html-gl')[0].innerHTML =  '<h1 style="color: #fff; font-size:5em">' + Date.now() + 'asdfasdfasdf~~~~~~~~~~~~~#############</h1>';
W.forhtmlrender.innerHTML = '<h1 style="color: #fff;">hi there------------------------!!!</h1><h1 style="color: #fff;">hi there</h1><h1 style="color: #fff;">hi there</h1><h1 style="color: #fff;">hi there</h1><h1 style="color: #fff;">hi there</h1>';
W.forhtmlrender.innerHTML = '<h1 style="color: #fff;">hi there------------------------!!!</h1>';
W.forhtmlrender.style.display = '';
W.forhtmlrender.style.width = '300px';
       html2canvas(W.forhtmlrender).then(function(canvas) { W.xcanvas = canvas; })
    }
}


/** write text for vive, undefined for default set, '' to clear, -1 to add timeout */
VH.writetext = function vwriteetxt(msgs, timeout) {
    // if (!VH.system) return;  // no text while id exhibition (!system) mode
    if (msgs === undefined) msgs = [
        // 'MODE = ' + VH.mode.name,
        '$resbaseui$resdyndeltaui',
        'vrrat=' + renderVR.ratio,
        'fps=' + (1000/framedeltasmooth),
        'horn#=' + currentHset.horncount
    ];
    if (timeout === undefined) timeout = 3000;
    VH.usetext2 = true;
    if (timeout) setTimeout(function() {VH.usetext2 = false}, timeout);
    if (msgs === -1) return;

    if (!Array.isArray(msgs)) msgs = (msgs + "").split('\n');

    if (!textcanvas) {
        textcanvas = document.createElement('canvas');
        textcanvas.width = textcanvas.height = 1024;
        /**
        document.body.appendChild(textcanvas);
        var s = textcanvas.style;
        s.position = 'absolute'
        s.right = '0';
        s.top = 0;
        s.zIndex = 999999;
        **/
        textcanvas.id = 'textcanvas';
        textscene = newscene('textscene');
        var geometry = new THREE.PlaneGeometry(1, 1);
        var material = new THREE.MeshBasicMaterial();
        material.name = 'textcanvas';
        material.depthTest = V.depthTest;
        material.side = THREE.DoubleSide;
        texttexture = new THREE.Texture(textcanvas, undefined, undefined, undefined, undefined, THREE.LinearFilter );//
        texttexture.generateMipmaps = false;

        material.map = texttexture;
        //material.color.set(ColorKeywords.white);
        var mesh = new THREE.Mesh(geometry, material);
//         mesh.frustumCulled = false;
        textscene.add(mesh);
        mesh.matrixAutoUpdate = true;
        textgeom = geometry;
        textscene.matrixAutoUpdate = false;

        geometry = new THREE.SphereGeometry(1);
        material = new THREE.MeshBasicMaterial();
        material.depthTest = V.depthTest;
        VH.hitmesh = new THREE.Mesh(geometry, material);
        textscene.add(VH.hitmesh);

    }
    var sc = 5*128;
    textscene.scale.set(sc,sc,1);
    textscene.position.z = -1000;
    textscene.updateMatrix();
    textscene.matrix.multiplyMatrices(camera.matrix, textscene.matrix);
    textscene.updateMatrixWorld(true);

    var ctx = textcanvas.getContext('2d');
    if (msgs[0][0] === '<') {
        // try svg to render as in https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject
        // However, fails becuase of crossOrigin restrictions and thus tainted canvas
        var data = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">' +
           '<foreignObject width="100%" height="100%">' +
           '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px; background-color: white">' +

           msgs[0] +

           '</div>' +
           '</foreignObject>' +
           '</svg>';

           var DOMURL = window.URL || window.webkitURL || window;

            var img = new Image();
            var svg = new Blob([data], {type: 'image/svg+xml'});
            var url = DOMURL.createObjectURL(svg);

            img.onload = function () {
                log('image loaded');
                var lctx = textcanvas.getContext('2d');
                lctx.fillStyle = 'red';
                lctx.fillRect(0,0,textcanvas.width, textcanvas.height);
                lctx.fillStyle = 'white';

                lctx.drawImage(img, 0, 0);
                DOMURL.revokeObjectURL(url);
                textgeom.verticesNeedUpdate = true;
                textgeom.uvsNeedUpdate = true;
                texttexture.needsUpdate = true;
                VH.usetext2 = true;
            }

            VH.usetext2 = false;
            img.crossOrigin = "anonymous";
            img.src = url;
            //img.src = "https://graph.facebook.com/1387819034852828/picture?width=256&height=256";
            return;

    } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(0,0,textcanvas.width, textcanvas.height);
        ctx.fillStyle = 'white';
        ctx.font = "48px serif";
        var w = 0;
        var y = 1;
        for (var i = 0; i < msgs.length; i++) {
            var line = msgs[i];
            if (line[0] === "!") {
                var ii = line.substring(1);
                if (!VH.imgs[ii]) {
                    VH.imgs[ii] = document.createElement('img');
                    VH.imgs[ii].src = ii;
                    VH.imgs[ii].onload = () => VH.writetext(msgs, timeout);
                }
                ctx.drawImage(VH.imgs[ii], 10, 60*(y-1));
                y += 4;
                w = Math.max(w, 11);
            } else {
                ctx.fillText(showvals(line), 10, 60*y);
                y += 1;
                w = Math.max(w, msgs[i].length);
            }
        }
        var charsw = Math.min(1, (w+0.5)/42);  // max chars across
        var charsh = Math.min(1, (y+0.2)/17);  // max chars up
        textgeom.charsw = charsw;  // for later reference when picking
        textgeom.charsh = charsh;
    //charsh=1;
        var v = textgeom.vertices;
        v[0].set(-charsw, charsh,0);
        v[1].set(charsw, charsh,0);
        v[2].set(-charsw, -charsh,0);
        v[3].set(charsw, -charsh,0);

        var u = textgeom.faceVertexUvs[0];
        u[0][0].set(0,1);
        u[0][1].set(0,1-charsh);
        u[0][2].set(charsw,1);

        u[1][0].set(0,1-charsh);
        u[1][1].set(charsw,1-charsh);
        u[1][2].set(charsw,1);
    }

    textgeom.verticesNeedUpdate = true;
    textgeom.uvsNeedUpdate = true;
    texttexture.needsUpdate = true;
    // currentGenes._fov = 80;
}
VH.imgs = {};  // cache of image elements

VH.render = function vhrender(rt) {
    if (!textscene) return;
       msgfix(">hitpos");
       VH.hitmesh.visible = !!VH.hit;
       VH.raytest();
    if (VH.hit) {
        if (VH.usetext2) {
            // u 0 .. charsw   =>  x -charsw .. charsw
            // v 1-charsh .. 1 => -charsh .. charsh
            VH.hitmesh.position.set(VH.hit.uv.x * 2 - textgeom.charsw, VH.hit.uv.y * 2 - 2 + textgeom.charsh, 0);
            var r = 0.02;
        } else {
            //VH.hitmesh.position.set(VH.hit.uv.x * 500, VH.hit.uv.y * 500, 500);
            textscene.matrix.identity();
            textscene.matrixWorld.identity();
            VH.hitmesh.position.copy(VH.hit.point);
            VH.hitmesh.material.color.setRGB(1,0,0);
            r = 10;

            if (V.gpR && V.gpR.buttons[2].pressed && framenum)
                VH.mousemover();
        }

        msgfix("hitpos", VH.hitmesh.position);
        msgfix("hitpoint", VH.hit.point);
        VH.hitmesh.scale.set(r,r,r);
        VH.hitmesh.updateMatrixWorld();
    }


    textscene.children[0].visible = !!VH.usetext2;
    renderer.setRenderTarget(rt);
    renderer.clearDepth();


    rrender('textscene', textscene, camera, rt); // textscene not combined as group within raw as not really used at the moment
    V.textscene = textscene;  // help debug
}

// arrange mouse moving as fast as reasonable, next one when previous is complete
VH.mousemoving = false;
VH.mousemover = function vhmousemover() {
    if (!VH.mousemoving) {
        runcommandphp('P:\\utils\\nircmd.exe setcursor ' + (-VH.hit.uv.x) * 1920  + ' ' + VH.hit.uv.y * 1080, mousemoved);
        VH.mousemoving = true;
    }
    function mousemoved(evt) {
        VH.mousemoving = false;
    }

}


VH.raytest = function vhraytest(rt) {
    msgfix("ray");
    var meshes =  (!VH.usetext2 || !textscene) ? [CubeMap.cubecube2] : textscene.children;
    for (var i = 0; i < meshes.length; i++) {
        var mesh = meshes[i];
        if (!V.gpR || !V.gpR.raymatrix) return undefined;
        var ee = V.gpR.raymatrix.elements;

        var pos = new THREE.Vector3(ee[12], ee[13], ee[14]);
        var dir = new THREE.Vector3(-ee[8], -ee[9], -ee[10]);
msgfix('>myray', pos, dir);
        var raycaster = new THREE.Raycaster(pos, dir);
        var hit = raycaster.intersectObject(mesh, false);
        if (hit[0]) {
            msgfix(">ray", hit.length, hit[0].uv);
            vivehtml.hit = hit[0];
            return hit[0];
        }
    }
    msgfix(">ray", 'no');
}

VH.tester = function() {
    VH.img=0; VH.writetext(['123890', '!CSynth/icons/whitecell256.png','ttt','!CSynth/icons/redcell256.png', ';'], 0)
}

/** create or add to GUI */
VH.orgGUI = function(name = 'VH.orgGUI', filter = inputs.genefilter) {
    if (!V.gui) {
        V.gui = dat.GUIVR.createX(name);
        V.gui.name = 'VH.orgGUI';
        V.camscene.add(V.gui);

        V.showbigcontrollers = true;
        dat.GUIVR.enableMouse(V.nocamcamera, renderer);
    }

    var gui = V.gui;

    // no dat.GUIVR.remove. so clean old gui .. for testing remake of gui, dangerous use of V.gui.children[0]
    // (nb, there is now a dat.GUIVR.remove)
    var cc = V.gui.children[0]; while (cc.children.length > 0) cc.remove(cc.children[0]);

    V.gui.add(VH, 'positionGUI');
    VH.genes = dat.GUIVR.createX("genes");
    var ll = resolveFilter(filter);
    for (var gn in ll)
        guiFromGene(VH.genes, gn);
    gui.addFolder(VH.genes);
    VH.positionGUI();
    V.alwaysShowRender = true;

    // resoverride.radnum = 5; V.gui.add(resoverride, 'radnum', 1, 10).step(1);
}

/** set gui visibility, and reposition (make sure it has correct parent for VR/noVR) */
///argh... now we can detach folders from GUI, this needs rethinking...
VH.setguivisible = function(bool) {
    if (!V.gui) return;
    if (bool === 'toggle') bool = !V.gui.visible;
    if (bool === 'same') bool = V.gui.visible;
    if (bool) VH.positionGUI(); else if (V.gui.parent) V.gui.parent.remove(V.gui);
    V.gui.visible = bool;
};

// kill the gui menu so we can start over
///argh... now we can detach folders from GUI, this needs rethinking...
VH.killgui = function() {
    if (!V.gui) return;
    GX.clearAll();
    if (CSynth && CSynth.filedropgui) delete CSynth.filedropgui;
    delete V.gui;
}

// create a gui item from a gene
function guiFromGene(gui, gn, xgn = gn) {
	var gd = genedefs[gn];
    if (currentGenes[gn] === undefined) currentGenes[gn] = gd.def;
    let gg;

    if (gd.togui || gd.fromgui) {
        if (gd.togui === Math.log && !gd.fromgui) gd.fromgui = Math.exp;
        if (gd.togui === Math.log10 && !gd.fromgui) gd.fromgui = v => Math.pow(10, v);
        const x = {};
        Object.defineProperty(x, xgn, {
            get: () => { return gd.togui(currentGenes[gn]) },
            set: (v) => { currentGenes[gn] = gd.fromgui(v); }
        })
        gg = gui.add(x, xgn, gd.togui(gd.min), gd.togui(gd.max));
        gg.step = 0.01;
    } else {
        // need intermediate name between var name and description
        gg = gui.add(currentGenes, xgn, gd.min, gd.max);
        gg.step(gd.step);
    }

    gg.listen();
    gg.name(xgn);
	gg.gn = gn;
	gg.onChange( function(s) {
		setval(gg.gn, gd.fromgui ? gd.fromgui(s) : s);   // this does not contain gg
    });
    if (gd.help) gg.setToolTip(gd.help + '\nGENE: ' + gn + (gd.togui ? ' fun:' + gd.togui.name : ''));
    guiFromGene.items[gn] = guiFromGene.items[xgn] = gg;
	return gg;
}
guiFromGene.items = {};



VH.guiScale = 300;
VH.guiDistance = 400;
// position gui in front of camera (or optional matrix passed as argument)
// fairly arbitrary choosing that level of 'obj' to pass around, might change that at some point.
// (ie, might change to pass obj.matrix directly instead) :: relevant with raymatrix vs poseMatrix
VH.positionGUI = function(matrix, distance, scale, gui) {
    gui = gui || V.gui;
    if (!gui) return;
    matrix = matrix || camera.matrix;
    var s = scale || VH.guiScale;
    // VH.fixguiForVR can fix gui even in VR mode,
    // for develop/debug only ... not working well at the moment
    if (!renderVR.invr() || VH.fixguiForVR) {
        s = V.defaultGuiScale;
        gui.position.set( V.nocamcamera.aspect  - 0.9 ,0.95, 0);
        matrix = V.nocamcamera.matrix;
        V.nocamscene.add(gui);
        //this is really an inappropriate side effect here
        dat.GUIVR.enableMouse(V.nocamcamera, renderer);
    } else {
        let d = distance || VH.guiDistance;
        const k = renderVR.scale / 400;  // values below were tuned for renderVR.scale = 400
        d *= k; s *= k;
        gui.position.set(s * -0.5, s * gui.spacing / 2, -d);
        gui.position.applyMatrix4(matrix);
        V.camscene.add(gui);
        //dat.GUIVR.enableMouse(camera, renderer);
    }
    gui.scale.set(s,s,s);
    gui.rotation.setFromRotationMatrix(matrix);
    if (VH.updateCsynthGUI) VH.updateCsynthGUI();
}
V.defaultGuiScale = 0.7;

