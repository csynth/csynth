
'use strict';

/* notes:
CubeMap performs two separate but related functions:
1) environment map
2) surrounding walls
This has been somewhat cleaned up 20/10/2017, eg renaming variables and removing dead(ish?) code
check earlier versions on SVN if any new bugs appear!
    remove cMap.walls, cMap.materialArray
    rename skyMesh->wallMesh, scene->wallScene


environment:  6 faces are rendered with different 'interesting' maps, but do NOT use our rendering/texturing
cMap.   cubescene, cubecube, cubemats, cubeCamera used for environment => cMap.cubeCamera.renderTarget

main walls:   6 faces are rendered with single isntance of our rendering/texturing, but may take reflections from environment
cMap.   wallScene, wallMesh, wallMesh.material

general
cMap.textures;  // will have textures to match the m_urls
*/
// cMap and CubeMap defined because of confusion in NetBeans flagging warnings otherwise
var W, renderer, THREE, uniforms, genedefs, currentGenes, target, gl, permgenes, canvas, URL,
    render_camera, opmode, OPTSHAPEPOS2COL, OPREGULAR, newframe, newscene, log, getMaterial, addgeneperm,
    newmain, inputs, setInput, qscene, HornWrapFUN, rrender, setlots, vivehtml, resolveFilter, updateGuiGenes,
    frametime, renderVR, framenum, serious, cdispose, rtt1, rtt2, alert, location, selcol, slots, alwaysNewframe,
    Maestro, _boxsize, mix, G, S, oneside, setAllLots, vrresting, V, viveAnim, nop, onframe, filterDOMEv,
    WebGLRenderTarget, camera, renderPipe, camToGenes, blackcol, copyFrom, olength, debugCurrentObjectsSize, fitCanvasToWindow,
    extraSlots, currentObjects, setViewports, DispobjC, oxcsynth, HW, deferRender, objeq, usemask,
    adduniform, vec3, U, _fixinfo;
var WALLID = 2;
// singleton
var CubeMap = new function () {
    var cMap = this;
    cMap.m_urls = ["images/Sky_LT.jpg", "images/Sky_RT.jpg",
        "images/Sky_UP.jpg", "images/Sky_DW.jpg",
        "images/Sky_FT.jpg", "images/Sky_BK.jpg"];
    cMap.renderState = 'color';
    cMap.width = 2048;

    var loadCount = 0;
    var mapper = { cubeleft: 0, cuberight: 1, cubeup: 2, cubedown: 3, cubefront: 4, cubeback: 5 };
    cMap.rot4 = uniforms.cMapRot4.value = new THREE.Matrix4(); cMap.rot4.identity();

    /** called from GUI to set 6 fixed image textures  */
    cMap.UploadTexture = function (element) {
        var i = mapper[element.id];
        var tl = new THREE.TextureLoader();
        cMap.m_urls[i] = element.files[0].path;    // the id is the axis in this case
        cMap.textures[i] = tl.load(cMap.m_urls[i]);
    }

    // // TODO, refactor other functions
    // /** loading cubemap values from settings (? unused utility function?) */
    // cMap.Load = function (settings) {
    //     if (oxcsynth) return;
    //     // init urls
    //     cMap.m_urls = settings.urls;
    //     cMap. Init();

    //     // face status
    //     var i = 0;
    //     var end = settings.faces.length;
    //     for (i; i < end; i++) {
    //         cMap.skyMesh.material.materials[i].opacity = settings.faces[i].opacity;
    //     }
    //     // render status
    //     cMap.SetRenderState(settings.enabled);
    //     newframe();
    // };

    /** default initializer. Called on lack of saved data, and changed _boxsize */
    cMap.Init = function (dotext, genes) {
        if (oxcsynth) return;
        cMap.Colours(genes);
        if (cMap.renderState === 'color') return;

        cMap.wallScene = newscene('cMap.wallScene');

        if (dotext) {

            cMap.textures = [];
            loadCount = 0;

            var loader = new THREE.TextureLoader();
            //loader.setCrossOrigin( this.crossOrigin );

            for (var i = 0; i < 6; i++) {
                cMap.textures[i] = loader.load(cMap.m_urls[i],  // 73 and over {minFilter: THREE.LinearFilter},
                    function matload(oo) {
                        log("materials loaded ", ++loadCount, oo.sourceFile);
                        newmain();
                    },
                    undefined, // function matprog() { log('material load progress'); },
                    function matloaderr(err) {
                        log("material load failed ", i, cMap.m_urls[i], err);
                    }
                );
                cMap.textures[i].minFilter = THREE.LinearFilter;
            }
        }
        adduniform('walllow', vec3(), 'v3', 'wall');
        adduniform('wallhigh', vec3(), 'v3', 'wall');

        // cMap.newmesh(undefined, genes);
        var w = 2 * _boxsize;       // width/height/depth of box
        var dr = 1;         // depth ratio for extra long side walls, not used while we have front wall pushaway below ...
        var dd = w * dr;      // depth
        var cmr = cMap.wallres; // 20;       // box resolution so vPosition accurate enough, needed if pixel distortion used distortion does not get out of control
        // for some reason (unknown, July16) using w and BackSide did not work correctly for single sided, but -w and FrontSize does
        // cMap.wallMesh.material will be filled in j.i.t. depending on opmode
        cMap.newmesh(undefined, genes);
        cMap.wallScene.matrixAutoUpdate = true;
        cMap.rot4 = uniforms.cMapRot4.value = new THREE.Matrix4();
        cMap.rot4.identity();
        cMap.rot4.elements[11] = (dd - w) / 2;  // zpan so box at right depth

        // add wall mesh to the wallScene
        // cMap.wallScene.addX(cMap.wallMesh); // moved to newmesh
    };
    cMap.wallres = 100;  // was 20, needs to be higher for superegg walls, else sections sometimnes go missing when near wall

    cMap.boxtdef = {x:1, y:1, z:1, fixFloor:undefined};
    /**
     * @param {*} n
     * @param {*} genes
     */
    cMap.newmesh = function (n = cMap.wallres, genes = currentGenes, tsize = cMap.boxtdef) {
        // if (deferRender) { Maestro.onUnique('firstRealRender', () => cMap.newmesh(n, genes = currentGenes, tsize = cMap.boxtdef)); return; }
        if (cMap.renderState === 'color') return;
        if (n === cMap.wallres && uniforms._boxsize.value === _boxsize && objeq(tsize, cMap.lastboxdef)
            && genes.wallFrontExtra === cMap.wfx && genes.wallBackExtra === cMap.wbx) return;

        uniforms._boxsize.value = _boxsize;
        cMap.boxtdef = tsize;
        cMap.lastboxdef = Object.assign({}, tsize);
        var w = 2 * _boxsize;       // width/height/depth of box
        var dr = 1;         // depth ratio for extra long side walls, not used while we have front wall pushaway below ...
        var dd = w * dr;      // depth
        var cmr = cMap.wallres = n || cMap.wallres; // 20;       // box resolution so vPosition accurate enough, needed if pixel distortion used distortion does not get out of control
        // for some reason (unknown, July16) using w and BackSide did not work correctly for single sided, but -w and FrontSize does
        // cMap.wallMesh.material will be filled in j.i.t. depending on opmode
        cMap.wallMesh = new THREE.Mesh(new THREE.BoxGeometry(-w*tsize.x, -w*tsize.y, -dd*tsize.z, cmr, cmr, cmr * dr));
        cMap.wallMesh.frustumCulled = false;
        //cMap.wallMesh.geometry.computeFaceNormals();
        //cMap.wallMesh.geometry.computeVertexNormals();
        U.walllow.set(-w*tsize.x/2, -w*tsize.y/2, -dd*tsize.z/2);
        U.wallhigh.set(w*tsize.x/2, w*tsize.y/2, dd*tsize.z/2);

        // push the front vertices out of the way
        cMap.wfx = genes.wallFrontExtra, cMap.wbx = genes.wallBackExtra;
        const dd2 = (dd - 0.00001)/2;
        const vv = cMap.wallMesh.geometry.getAttribute('position').array;
        if (cMap.wfx) {
            for (let i=2; i<vv.length; i+=3) if (vv[i] >= dd2) vv[i] *= cMap.wfx;  // move over the z's, 2 is the z's
            U.wallhigh.z *= cMap.wfx;
        }
        if (cMap.wbx) {
            for (let i=2; i<vv.length; i+=3) if (vv[i] <= -dd2) vv[i] *= cMap.wbx;  // move over the z's, 2 is the z's
            U.walllow.z *= cMap.wfx;
        }
        const ff = tsize.fixFloor;
        if (ff !== undefined) {
            for (let i=1; i<vv.length; i+=3) if (vv[i] < 0) vv[i] = ff;     // fix the floor, 1 is the y's
        }

        //note, material set at render ... TODO choose wallScene or rot4
        while (true) {   // should only be 0 (first time in) or 1 children
            const c = cMap.wallScene.children[0];
            if (!c) break;
            cMap.wallScene.remove(c);
            c.geometry.dispose();
        }
        cMap.wallScene.addX(cMap.wallMesh);
    }

    // make genes for wall color/texture (initially copied from horn)
    cMap.Colours = function (genes) {
        if (cMap.ColoursDone) return;
        cMap.ColoursDone = true;
        function agp(name, def, min, max, delta, step, help, tag, free) {
            return addgeneperm(name, def, min, max, delta, step, help, tag, free, false, genes);
        }
        for (var name in genedefs) {
            var gd = genedefs[name];
            if (gd.tag !== "texture") continue;
            var myname = "wall_" + name;
            var gdef = genes[name] === undefined ? gd.def : genes[name];
            if (name.endsWith("scale")) {
                agp(myname, gdef * 10, gd.min * 10, gd.max * 10, gd.delta * 10, gd.step * 10, gd.help, "wallcol", gd.free);
            } else {
                agp(myname, gdef, gd.min, gd.max, gd.delta, gd.step, gd.help, "wallcol", gd.free);
            }
        }

        // make sure genes added early so they are included in display
        // agp('feed scale', 1.1,  0.5, 2, 0.1, 0.01, "scale used for feedback", "feedback", 0);
        agp('feedxrot', 0, -90, 90, 0.1, 0.01, "xrot for feedold (degrees)", "feedoldenv", 0);
        agp('feedyrot', 0, -90, 90, 0.1, 0.01, "yrot for feedold (degrees)", "feedoldenv", 0);
        agp('feedzrot', 0, -360, 360, 5, 0.5, "zrot for feedold (degrees)", "feedoldenv", 0);
        agp('feedr', 1, 0, 1, 0.1, 0.01, "red for feedold", "feedoldenv", 0);
        agp('feedg', 1, 0, 1, 0.1, 0.01, "blue for feedold", "feedoldenv", 0);
        agp('feedb', 1, 0, 1, 0.1, 0.01, "green for feedold", "feedoldenv", 0);
        agp('wallAspect', 1, -3, 3, 0.1, 0.01, "aspect ratio for walls,<br>for +ve values RELATIVE to frame aspect ratio,<br>for -ve values absolute", "wallgeom", 0);
        agp('wallSize', 1, 0, 3, 0.1, 0.01, "height for walls", "wallgeom", 0);
        agp('wallFrontExtra', 0, 0, 100, 1, 1, "extra push for front walls", "wallgeom", 0);
        agp('wallBackExtra', 0, 0, 100, 1, 1, "extra push for back walls", "wallgeom", 0);
    }

    /** rendering each pass: (TODO remove interface layer, just change render() when sure)   */
    cMap.RenderPass = function (genes, uniformsp, rendertarget, pscene) {
        renderwall(render_camera, rendertarget, pscene, genes);
    };

    // simple rendering function. Takes the current renderer and camera from mutbase.js
    // permit an override scene, eg for mask phases
    function renderwall(main_camera, render_texture, oscene, genes) {
        if (usemask === 4) return;
        if (uniforms._boxsize.value !== _boxsize) cMap.Init(false, genes);   // variant of new mesh()?
        if (oxcsynth) return;
        if (!permgenes.wall_red1) cMap.Colours(genes);  // sometimes Init called so soon that the genes are not registered, TODO clean
        if (cMap.renderState !== 'color' && cMap.renderState !== 'walls' && !inputs.REFLECTION) setInput(W.REFLECTION, true);

        var wallScene = oscene || cMap.wallScene;
        if (!cMap.renderBack) return;

        // this must be refreshed often for the different opmodes/passes
        var mat = getMaterial("NOTR", genes);
        if (wallScene === qscene)
            mat.depthTest = mat.depthWrite = false;
        mat.transparent = opmode === OPTSHAPEPOS2COL || opmode === OPREGULAR;

        // prepare colour mapping
        if (!cMap.cols) {
            cMap.cols = {};
            for (var name in genedefs) {
                var gd = genedefs[name];
                if (gd.tag !== "texture") continue;
                var myname = "wall_" + name;
                cMap.cols[name] = myname;
            }
        }

            // cMap.wallScene.children[0] = cMap.wallMesh;// do in newmesh
        wallScene.children[0].material = mat;

        var save = uniforms.rot4.value;  // save and move to local matrix
        // warning, wallSize != 1 or asp !== 1 got shadows wrong, fixed by addition of uniforms.cMapRot4, 25/07/2021
        var asp = cMap.computedWallAspect = genes.wallAspect === 0 ? 1 : genes.wallAspect > 0 ? genes.wallAspect * render_texture.width / render_texture.height : -genes.wallAspect;
        cMap.rot4.elements[0] = asp * genes.wallSize;
        cMap.rot4.elements[5] = genes.wallSize;
        uniforms.rot4.value = cMap.rot4;
        var shid = uniforms.hornid.value;
        uniforms.hornid.value = WALLID;

        // force this late as sometimes was getting overwritten ???
        cMap.wallMesh.material.side = camera.aspect > 0 ? THREE.FrontSide : THREE.BackSide;

//        if (!HW.cubeEarly)   // no, only getting called with correct opmode, for which we do need it
            rrender("wall", wallScene, main_camera, render_texture, false);
        uniforms.hornid.value = shid;

        uniforms.rot4.value = save;  // return to the old position
    }


    /** set up CubeMap with various presets for simple situations */
    cMap.SetRenderState = function (value, genes = currentGenes) {   // genes = target for smooth transition
        // create uniforms even if not rendering, otherwise three/gl doesn't like it
        // don't create a brand new uniform unless really necessary
        // three.js will get confused because of its caching
        // do this early even if no CubeMap, w.i.p 16/10/17 towards removing CubeMap for feedback
        // log('cMap.SetRenderState', cMap.renderState, '=>', value);
        if (!uniforms.cubeMap) uniforms.cubeMap = { type: "t" };
        if (!uniforms.flatMap) uniforms.flatMap = { type: "t" };
        cMap.wallType = ['none', 'none', 'none', 'none', 'none', 'none'];

        if (oxcsynth) return;
        if (value === 'colour') value = 'color';
        if (value === 'color' && cMap.renderState === 'color') return; // no, maybe just first time ???
        cMap.renderState = value;

        // remove selcol.setRGB(0.13, 0.13, 0.2);

        if (!cMap.textures) cMap.Init(true, genes);

        cMap.renderBack = true;
        cMap.renderMap = true;
        cMap.wallType.fill('rt');  // rt for feedback, camera, 0..6 for fixed image texture map

        // set up some 'standard' things that may have been lost
        setAllLots('wall_refl[rgb]', {value:1, free: 0});

        // remove selcol.setRGB(0.8, 1, 1);
        switch (value) {
            case 'color':
                cMap.renderMap = false;
                cMap.renderBack = false;
                // remove selcol.setRGB(0.13, 0.13, 0.2);
                break;
            case 'cubemap': case 'skymap':
                genes.wall_refl1 = genes.wall_refl2 = genes.wall_refl3 = 1;
                cMap.wallType = [0, 1, 2, 3, 4, 5];
                break;
            case 'walls':
                cMap.renderMap = false;
                genes.wall_refl1 = genes.wall_refl2 = genes.wall_refl3 = 0;
                cMap.wallType.fill('plain');
                break;
            case 'allsolid':
                setlots(genes, 'refl1 | refl2 | refl3', 0);  // sets for all objects including walls
                cMap.wallType.fill('plain');
                break;
            case 'allreflective':
                setlots(genes, 'refl1 | refl2 | refl3', 1);  // sets for all objects including walls
                break;
            case 'feedback':
                genes.wall_refl1 = genes.wall_refl2 = genes.wall_refl3 = 1;
                break;
            case 'feedbacknoshow':
                cMap.renderBack = false;
                break;
            case 'peekfeedback':
                genes.wall_refl1 = genes.wall_refl3 = 1;
                genes.wall_refl2 = 0;
                genes.wall_band1 = genes.wall_band2 = genes.wall_band3 = 1;
                break;
            case 'fixpeekfeedbackNOSET':
                cMap.wallType = ['fixview', 'fixview', 'fixview', 'fixview', 'fixview', 'fixview'];  // nb only 5'th used for flat map
                setInput(W.FLATMAP, true);
                setInput(W.FLATWALLREFL, false);
                break;
            case 'fixpeekfeedback':
                genes.wall_refl1 = genes.wall_refl3 = 1;
                genes.wall_refl2 = 0;
                genes.wall_band1 = genes.wall_band2 = genes.wall_band3 = 1;

                cMap.wallType = ['fixview', 'fixview', 'fixview', 'fixview', 'fixview', 'fixview'];  // nb only 5'th used for flat map
                cMap.fixres = 2048;
                setAllLots('wall_refl[123]', {value:0.95, free: 0});
                setAllLots('wall_refl[rgb]', {value:1, free: 0});
                setAllLots('wall_refl2', {value:0.5, free: 0});
                setAllLots('wall_bumpstrength', {value:0.2, free: 0});
                setAllLots('wall_bumpscale', {value:400, free: 0});
                // setAllLots('walltype', {value:2, free: 0});
                setAllLots('superwall', {value:0.4, free: 0});
                setAllLots('centrerefl', {value:1, free: 0});
                setInput(W.FLATMAP, true);
                setInput(W.FLATWALLREFL, false);
                break;
            case 'fixpeekfeedbackbase':
                cMap.wallType = ['fixview', 'fixview', 'fixview', 'fixview', 'fixview', 'fixview'];  // nb only 5'th used for flat map
                break;
            case 'texturefeedback':
                genes.wall_refl1 = genes.wall_refl2 = genes.wall_refl3 = 0.5;
                genes.wall_band1 = genes.wall_band2 = genes.wall_band3 = 1;
                break;
            case 'objrwalls':  // object refl, walls solid
                setlots(genes, 'refl1 | refl2 | refl3', 1);  // sets for all objects including walls
                setlots(genes, 'wall_refl1 | wall_refl2 | wall_refl3', 0);  // override for walls
                break;
            case 'objswallr':  // object solid, walls refl
                setlots(genes, 'refl1 | refl2 | refl3', 0);  // sets for all objects including walls
                setlots(genes, 'wall_refl1 | wall_refl2 | wall_refl3', 1);  // override for walls
                break;
            case 'flufeedback':
                setlots(genes, 'refl1 | refl2 | refl3', 1);  // sets for all objects including walls
                setlots(genes, 'bumpstrength', 0);  // sets for all objects including walls
                genes.wall_band1 = genes.wall_band2 = genes.wall_band3 = 1;
                genes.wall_fluorescH2 = 0.82;
                genes.wall_fluorescS2 = 0.87;
                genes.wall_fluorescV2 = 1;
                genes.wall_fluwidth = 2;
                setInput(W.FLUORESC, true);
                break;
            case 'mixwall':
                genes.wall_refl1 = genes.wall_refl3 = 1;
                genes.wall_refl2 = 0;
                genes.wall_band1 = genes.wall_band2 = genes.wall_band3 = 1;
                cMap.wallType = ['rt', 'rt', 'rt', 'rt', 'rt', 'rt'];
                break;
            case 'canvas':
                genes.wall_refl1 = genes.wall_refl3 = 1;
                genes.wall_refl2 = 0;
                genes.wall_band1 = genes.wall_band2 = genes.wall_band3 = 1;
                cMap.wallType = ['rtg', 'rtg', 'rtg', 'rtg', 'rtg', 'rtg'];
                break;
            case 'plainfloor':
                genes.wall_refl1 = genes.wall_refl2 = genes.wall_refl3 = 1;
                genes.wall_band1 = genes.wall_band2 = genes.wall_band3 = 1;
                cMap.wallType = ['rt', 'rt', 'rt', 'plain', 'rt', 'rt'];
                break;
            case 'walltypes':
                genes.wall_refl1 = genes.wall_refl3 = 1;
                genes.wall_refl2 = 1;
                genes.wall_band1 = genes.wall_band2 = genes.wall_band3 = 1;
                cMap.wallType = ['webcam', 4, 'video', 'rtg', 'rt', 'rt'];
                break;
            case 'wallhtml':
                genes.wall_refl1 = genes.wall_refl3 = 1;
                genes.wall_refl2 = 1;
                genes.wall_band1 = genes.wall_band2 = genes.wall_band3 = 1;
                cMap.wallType = ['xcanvas', 'xcanvas', 'xcanvas', 'xcanvas', 'xcanvas', 'xcanvas'];
                break;
            case 'webcam':
                genes.wall_refl1 = genes.wall_refl3 = 1;
                genes.wall_refl2 = 0;
                genes.wall_band1 = genes.wall_band3 = 1;
                genes.wall_band2 = 0.25;
                cMap.wallType = ['webcam', 'webcam', 'webcam', 'webcam', 'webcam', 'webcam'];
                break;
            case 'webcamnotex':
                genes.wall_refl1 = genes.wall_refl2 = genes.wall_refl3 = 1;
                genes.wall_band1 = genes.wall_band3 = 0;
                genes.wall_band2 = 1;
                cMap.wallType = ['webcam', 'webcam', 'webcam', 'webcam', 'webcam', 'webcam'];
                break;
            case 'screenshare':
                genes.wall_refl1 = genes.wall_refl2 = genes.wall_refl3 = 1;
                genes.wall_band1 = genes.wall_band3 = 0;
                genes.wall_band2 = 1;
                cMap.wallType = ['screenshare', 'screenshare', 'screenshare', 'screenshare', 'screenshare', 'screenshare'];

                // var uvs = CubeMap.wallMesh.geometry.faceVertexUvs[0];
                var uvs = CubeMap.cubecube.geometry.faceVertexUvs[0];
                if (uvs[0][0].x === 0) {
                    for (var ii = 0; ii < uvs.length; ii++) {
                        var tri = uvs[ii];
                        for (var jj = 0; jj < tri.length; jj++)
                            tri[jj].x = 1 - tri[jj].x;
                    }
                    CubeMap.cubecube.geometry.uvsNeedUpdate = true;
                }
                vivehtml.writetext('screensharing'); // so relevent code triggered
                break;
            case 'video':
                genes.wall_refl1 = genes.wall_refl3 = 1;
                genes.wall_refl2 = 0;
                genes.wall_band1 = genes.wall_band3 = 1;
                genes.wall_band2 = 0.25;
                cMap.wallType = ['video', 'video', 'video', 'video', 'video', 'video'];
                break;
            case 'freerefl':
                for (let gn in resolveFilter('refl | opacity')) genedefs[gn].free = 1;
                break;
            case 'freezerefl':
                for (let gn in resolveFilter('refl | opacity')) genedefs[gn].free = 0;
                break;
            case 'freewalls':
                for (let gn in resolveFilter('wall_ 1 | wall_ 2 | wall_ 3')) genedefs[gn].free = 1;
                break;
            case 'freezewalls':
                for (let gn in resolveFilter('wall_ 1 | wall_ 2 | wall_ 3')) genedefs[gn].free = 0;
                break;
            case 'freegeomtex':
                for (let gn in resolveFilter('texalong | texaround | texribs')) genedefs[gn].free = 1;
                break;
            case 'freezegeomtex':
                for (let gn in resolveFilter('texalong | texaround | texribs')) genedefs[gn].free = 0;
                break;
        }
        // if it looks asa if we have reflection keep animation going
        Object.keys(resolveFilter('refl1 | refl2 | refl3')).forEach(gn => { if (genes[gn]) alwaysNewframe = true });

        if (cMap.renderState !== 'color' && cMap.renderState !== 'walls') setInput(W.REFLECTION, true);
        updateGuiGenes();    // may well have changed, update juar in case
        newmain();
        setInput(W.backgroundSelect, value);
    };

    cMap.lastRenderState = 'fixpeekfeedbackNOSET';
    cMap.toggle = function() {
        const rs = cMap.renderState;
        if (rs === 'color') {
            cMap.SetRenderState(cMap.lastRenderState);
        } else {
            cMap.lastRenderState = rs;
            cMap.SetRenderState('color');
        }
    }

    /** render a single frame from the fixed camera for feedback
     * major side-effect is to set uniforms.flatMap.value or uniforms.cubeMap.value
     */
    cMap.renderFeedback = function (dispobj) {
        if (_fixinfo.feedrt) uniforms.feedtexture.value = uniforms.flatMap.value = _fixinfo.feedrt.texture;
        if (cMap.renderState === 'color' || cMap.renderState === 'walls' || usemask === 4) return;
        if (inputs.FLATMAP && cMap.wallType) {  // very temp while sorting out
            const mat = {};  // << temporary silly interface, sjpt 1 Dec 2017
            const wt =  cMap.wallType[5];  // << temporary silly interface
            const genes = dispobj.genes;
            const rt = dispobj.rtback;
            uniforms.flatMap.value = cMap.renderMat(mat, wt, genes, rt);
        } else {
            cMap.renderFeedbackCube(dispobj);
        }
    }

    cMap.fixFilter = THREE.LinearFilter;
    cMap.fixWrapping = THREE.ClampToEdgeWrapping;

    /** render a single frame from the fixed camera for feedback, return the map.mat, which will also be in uniforms.flatMap.value */
    cMap.renderFixview = function(genes) {
        if (framenum === cMap.lastFixedFrame)  // do not render same fixed camera multiple times
            return cMap.lastfix;
        cMap.lastFixedFrame = framenum;

        const r = cMap.fixres;
        if (!cMap.fixtarget1 || cMap.fixtarget1.width !== r) {
            const opts = {
                format: THREE.RGBFormat,
                type: THREE.FloatType,
                minFilter: cMap.fixfilter,
                magFilter: cMap.fixFilter,
                wrapS: cMap.fixWrapping,
                wrapT: cMap.fixWrapping,
                stencilBuffer: false,
                depthBuffer: false,
                depthTest: false,
                depthWrite: false
            }
            cMap.fixtarget1 = WebGLRenderTarget(r, r, opts, 'fixview1');
            cMap.fixtarget1.texture.generateMipmaps = false;
            cMap.fixtarget2 = WebGLRenderTarget(r, r, opts, 'fixview2');
            cMap.fixtarget2.texture.generateMipmaps = false;
        }
        if (!cMap.fixcamera) {
            cMap.fixcamera = new THREE.PerspectiveCamera( 30, 1, camera.near, camera.far);
            // cMap.fixcamera.position.z = 1500;
            //cMap.fixcamera.quaternion.set(0,1,0,0);
            const k = renderVR.scale / 400;
            cMap.fixcamera.position.set(800*k, 800*k, 0);
            // note, camera at exactly 45 degrees seemed to make NaN values worse
            // probably a red herring, but ??? remove these comments March 2020 or later
            cMap.fixcamera.lookAt(0, 0, 0);
            // no, if _posx etc will change we would need to track it for below to be any use ???
            // cMap.fixcamera.lookAt(new THREE.Vector3(G._posx, G._posy * 1/4, G._posz)); //<< TODO check scales here

// test code to cause bug
//            G._posx=9999999; cMap.fixcamera.position.set(1.303, 1.303, 0); cMap.fixcamera.lookAt(0,0,0); cMap.fixtarget1 = cMap.fixtarget2 = undefined
        }
        const save = [camera, render_camera, cMap.renderfeedbackCube, uniforms.cutx.value, uniforms.cuty.value];
        camera = render_camera = cMap.fixcamera; cMap.renderfeedbackCube = nop;
        uniforms.cutx.value = uniforms.cuty.value = 0.01;

        camToGenes(genes);
        let matmap;
        try {
            let rtf;
            if (framenum%2) {
                rtf = cMap.fixtarget1;
                matmap = cMap.fixtarget2.texture;
            } else {
                rtf = cMap.fixtarget2;
                matmap = cMap.fixtarget1.texture;
            }
            cMap.lastfix = [matmap, rtf];
            uniforms.flatMap.value = matmap;
            renderer.setRenderTarget(rtf);
            renderer.setClearColor(cMap.feedbackcol);
            renderer.clearColor();

            rrender.xtag.push('fixview');
            renderPipe(genes, uniforms, rtf, 3);
if (V.renderfeed) rrender('extraspecialfeedback', V.rawscene, camera, rtf);
            rrender.xtag.pop();
            // renderObjsInner(rtf);
        } finally {
            [camera, render_camera, cMap.renderfeedbackCube, uniforms.cutx.value, uniforms.cuty.value] = save;
            camToGenes(genes);
        }
        return cMap.lastfix;
    }

    cMap.renderMat = function(mat, wt, genes, rt) {
        if (mat.color && genes.feedr !== undefined) {  // won't be fore wall-like things'
            mat.color.r = genes.feedr;
            mat.color.g = genes.feedg;
            mat.color.b = genes.feedb;
        }

        // set up map dynamically to make it easier to change
        // usually the same every frame
        mat.visible = true;
        if (typeof wt === 'number') {
            mat.map = cMap.textures[wt];
        } else if (wt === 'none') {
            mat.visible = false;
        } else if (wt === 'plain') {
            mat.map = undefined;
        } else if (wt === 'rt') {
            mat.map = (V.usePrecamTexture && V.precamRT ? V.precamRT : rt).texture;
        } else if (wt === 'fixview') {
            mat.map = cMap.renderFixview(genes)[0];
        } else if (wt === 'rtg') {
            if (!cMap.canvastexture) {
                cMap.canvastexture = new THREE.Texture(canvas, undefined, undefined, undefined, undefined, THREE.LinearFilter);
                cMap.canvastexture.generateMipmaps = false;
            }
            mat.map = cMap.canvastexture;
            cMap.canvastexture.needsUpdate = true;
        } else if (wt === 'xcanvas') {  // eg for captured html
            if (W.xcanvas) {
                if (!cMap.xcanvastexture) {
                    cMap.xcanvastexture = new THREE.Texture(W.xcanvas, undefined, undefined, undefined, undefined, THREE.LinearFilter);
                    cMap.xcanvastexture.generateMipmaps = false;
                }
                cMap.xcanvastexture.image = W.xcanvas;
                mat.map = cMap.xcanvastexture;
                cMap.xcanvastexture.needsUpdate = true;
            } else {
                mat.visible = false;
            }

        } else if (wt === 'webcam') {
            if (!cMap.webcamtexture) cMap.setupwebcam();
            mat.map = cMap.webcamtexture;
            if (cMap.webcamvideo.readyState === cMap.webcamvideo.HAVE_ENOUGH_DATA)
                cMap.webcamtexture.needsUpdate = true;

        } else if (wt === 'screenshare') {
            if (!cMap.screensharetexture) cMap.setupscreenshare();
            mat.map = cMap.screensharetexture;
            if (cMap.screensharevideo.readyState === cMap.screensharevideo.HAVE_ENOUGH_DATA && framenum % cMap.screenupdateframes === 0)
                cMap.screensharetexture.needsUpdate = true;

        } else if (wt === 'video') {
            if (!cMap.videotexture) cMap.setupvideo();
            mat.map = cMap.videotexture;
            if (cMap.video.readyState === cMap.video.HAVE_ENOUGH_DATA) {
                cMap.videotexture.needsUpdate = true;
                //cMap.textures[ii].needsUpdate = true;  //??
                /**
                for (var i=0; i<6;i++) {
                    if (cMap.wallType[i] === 'video') {
                        //cMap.videocontext.drawImage( cMap.video, 0, 0 );
                        cMap.textures[i].needsUpdate = true;
                    }
                }
                **/

            }
        } else {
            serious('insupported wall type', wt);
            mat.map = rt.texture;
        }
        return mat.map;
    }

    /** render a single frame Cubemap for feedback */
    cMap.renderFeedbackCube = function (dispobj) {
        if (oxcsynth) return;
        if (!cMap.wallType) return;  // not properly initialized, eg fano
        if (cMap.renderState === 'color') return;

        var rt = dispobj.rtback;    // rt is the old one, that will be used for texture
        // even if we don't have full feedback etc make sure walls with reflection enabled don't use rt as texture input
        if (uniforms.flatMap.value === rt.texture) uniforms.flatMap.value = dispobj.rtback.texture;  // only captures last one for all walls for now, 20/10/2017 TODO
        if (cMap.updateRate) {
            if (frametime - cMap.lastUpdate < cMap.updateRate) return;
            cMap.lastUpdate = frametime;
        }

        if (!cMap.renderMap) return rt;
        if (renderVR.eye2) return;
        var genes = dispobj.genes;
        if (!genes) return rt;

        // prepare cubemap generation ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        if (!cMap.cubeCamera || !cMap.cubemats || cMap.cubeCamera.renderTarget.width !== cMap.width) {
            var w = 1000;
            cMap.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(cMap.width)
            cMap.cubeCamera = new THREE.CubeCamera(1, 2000, cMap.cubeRenderTarget)
            cMap.cubeCamera.renderTarget.texture.minFilter = THREE.LinearFilter;
            cMap.cubeCamera.renderTarget.texture.magFilter = THREE.LinearFilter;
            cMap.cubeCamera.renderTarget.texture.generateMipmaps = true; //<<<
            cMap.cubeCamera.renderTarget.depthBuffer = false;


            cMap.cubescene = newscene('cMap.cubescene');

            cMap.cubemats = [];
            for (let ii = 0; ii < 6; ii++) {
                cMap.cubemats[ii] = new THREE.MeshBasicMaterial({
                    depthTest: false,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                cMap.cubemats[ii].name = 'cubemat' + ii;
            }
            cMap.cubecube = new THREE.Mesh(new THREE.BoxGeometry(w, w, w), cMap.cubemats);
            cMap.cubecube2 = new THREE.Mesh(new THREE.BoxGeometry(-w, -w, -w), cMap.cubemats);  // ?used for Vive raytest?
            cMap.cubecube.frustumCulled = false;
            cMap.cubescene.addX(cMap.cubecube);
        }


        // prepare cubemap details and render it ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        /* set up some experimental values: add controls later */
        var s = 1; // size is relative so does not matter as long as sensible
        var o = cMap.cubecube;   // was cMap.wallMesh
        //o.matrixAutoUpdate = true;
        o.scale.x = s;
        o.scale.y = s;
        o.scale.z = s;
        o.rotation.x = genes.feedxrot * Math.PI / 180; // Math.PI/3;  // kaleidoscope effect
        o.rotation.y = genes.feedyrot * Math.PI / 180; // Math.PI/3;  // kaleidoscope effect
        o.rotation.z = genes.feedzrot * Math.PI / 180; // Math.PI/3;  // kaleidoscope effect
        o.updateMatrix();
        o.updateMatrixWorld();


        /* make sure all cMap faces set up */
        for (let ii = 0; ii < cMap.cubemats.length; ii++) {
            var mat = cMap.cubemats[ii];
            //mat.side = THREE.DoubleSide;
            var wt = cMap.wallType[ii];

            cMap.renderMat(mat, wt, genes, rt);  // render that material with the appropriate wallType texture
        }
        if (inputs.FLATMAP) {
            // note, stereo only works if you don't do the renderVR.eye2 test
            // and in any case looks horrible, Stephen and Peter, 30/10/17
            if (cMap.monofeedback)
                uniforms.flatMap.value = mat.map = slots[1].dispobj.rtback.texture;
            else
                uniforms.flatMap.value = mat.map === rt.texture ? dispobj.rtback.texture : mat.map;  // only captures last one for all walls for now, 20/10/2017 TODO
        } else {
            renderer.setRenderTarget(cMap.cubeCamera.renderTarget);
            opmode = "updateCubeMap";
            rrender(opmode, cMap.cubescene, cMap.cubeCamera, cMap.cubeCamera.renderTarget);  // calls cMap.cubeCamera.updateCubeMap
            // NONO duplicate of rrender above DON'T DO BOTH cMap.cubeCamera.updateCubeMap(renderer, cMap.cubescene);
            uniforms.cubeMap.value = cMap.cubeCamera.renderTarget.texture;
        }

        return rt;
    };
    cMap.screenupdateframes = 5;  // proportion of frames to update screen video
    cMap.fixres = 2048;      // initial value
    cMap.feedbackcol = blackcol;

    cMap.cleanup = function () {
        cdispose(cMap.m_samplerCube);
        cMap.m_samplerCube = undefined;
        cdispose(cMap.wallMesh.material);
        cMap.wallMesh.material = undefined;
        cdispose(rtt1);
        cdispose(rtt2);
        rtt1 = rtt2 = undefined;
    };

}();  // CubeMap
var cMap = CubeMap;
cMap.updateRate = 0;  // update rate in millesec, 0 for continuous
cMap.lastUpdate = 0;


/** render single faceted sphere for test */
cMap.spheretest = function (a = 11, b = 5, genes = currentGenes) {
    // this comes up faceted as the shapepos phase does not know it is a sphere
    // that can be a good thing if faceting is required
    genes.walltype = 0;
    cMap.wallMesh.geometry = new THREE.SphereGeometry(-_boxsize, a, b);
}

/** get a device based on key match */
cMap.devices = async function(lkey) {
    const mediaDevices = await navigator.mediaDevices.enumerateDevices();
    let r;
    mediaDevices.forEach(mediaDevice => {
        log('device:', mediaDevice.kind, mediaDevice.label)
        if (mediaDevice.kind === 'videoinput') {
            if (mediaDevice.label.match(lkey)) r = mediaDevice;
        }
    });
    return r;
}

/** set up webcam, prefer Kinect */
cMap.setupwebcam = async function (ctype='Kinect', cwidth=1920, cheight=1080) {
    var video = cMap.webcamvideo;
    if (video) {
        const ss = cMap.webcamvideo.captureStream();
        for (const s of ss.getTracks()) s.stop()
        video = cMap.webcamvideo = undefined;
    }
    if (ctype === 'none') return;
    // if (!video) {
        video = document.createElement('video');
        video.width = cwidth;
        video.height = cheight;
        video.autoplay = true;
        video.loop = true;
        // expose video as this.video
        cMap.webcamvideo = video;
    // }

//     navigator.getUserMedia({ video: true },
//         function (stream) { video.src = URL.createObjectURL(stream); },
//         function () { alert('no WebRTC webcam available'); }
//     );
    log('getting webcam');
    const k = await cMap.devices(ctype); // ('Kinect');
    log(k ? 'using camera ' + k.label: 'no kinect camera, use default');
    const vc = { video: { width: cwidth, height: cheight }};
    if (k) vc.video.deviceId = k.deviceId;
    navigator.mediaDevices.getUserMedia(vc)
        .then(function(stream) {  /* use the stream */
            cMap.lastStream = stream;
            log('webcam stream ready');
            video.srcObject = stream; // URL.createObjectURL(stream);
            log('webcam stream used for video');
        })
        .catch(function(err) {
            console.error('no video', err); /* handle the error */
         }
     );

    cMap.webcamtexture = new THREE.Texture(video, undefined, undefined, undefined, undefined, THREE.LinearFilter);
    cMap.webcamtexture.generateMipmaps = false;
};


cMap.setupscreenshare = function () {
    startscreensharing();
    var video = document.createElement('video');
    video.width = 1920;
    video.height = 1080;
    video.autoplay = true;
    video.loop = true;
    // expose video as this.video
    cMap.screensharevideo = video;

    cMap.screensharetexture = new THREE.Texture(video, undefined, undefined, undefined, undefined, THREE.LinearFilter);
    cMap.screensharetexture.generateMipmaps = false;
};


cMap.setupvideo = function (src, width, height) {
    var video = document.createElement('video');
    video.id = "wallvideo";
    video.autoplay = true;
    video.loop = true;
    // expose video as this.video
    cMap.video = video;
    //cMap.videocontext = video.getContext('2D');
    video.width = width || 320;
    video.height = height || 240;
    //video.src = 'images/MutationSpaceUnescoYork.webm';
    video.src = src || 'images/YorkShort.webm';
    //video.width    = 1920;
    //video.height    = 1080;
    //video.src = 'D:/Dropbox/iMAL Mutator 1 + 2 2014/Demo/tadpolesRoom1.mp4';

    //    navigator.getUserMedia({video:true},
    //       function(stream){ video.src = URL.createObjectURL(stream); },
    //       function(error){ alert('no WebRTC webcam available'); }
    //       );

    // do not use VideoTexture as it does its own refresh loop
    cMap.videotexture = new THREE.Texture(video, undefined, undefined, undefined, undefined, THREE.LinearFilter);
    cMap.videotexture.generateMipmaps = false;

};



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// from app.js

var extensionInstalled = false;

//document.getElementById('start').addEventListener('click', function() {
function startscreensharing() {
    // send screen-sharer request to content-script
    if (!extensionInstalled) {
        var message = 'Please install the extension:\n' +
            '1. Go to chrome://extensions\n' +
            '2. Check: "Enable Developer mode"\n' +
            '3. Click: "Load the unpacked extension..."\n' +
            '4. Choose "extension" folder from the repository\n' +
            '5. Reload this page';
        alert(message);
    }
    window.postMessage({ type: 'SS_UI_REQUEST', text: 'start', url: location.origin }, '*');
}
//});

// listen for messages from the content-script
window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) return;

    // content-script will send a 'SS_PING' msg if extension is installed
    if (event.data.type && (event.data.type === 'SS_PING')) {
        extensionInstalled = true;
    }

    // user chose a stream
    if (event.data.type && (event.data.type === 'SS_DIALOG_SUCCESS')) {
        startScreenStreamFrom(event.data.streamId);
    }

    // user clicked on 'cancel' in choose media dialog
    if (event.data.type && (event.data.type === 'SS_DIALOG_CANCEL')) {
        console.log('User cancelled!');
    }
});

function startScreenStreamFrom(streamId) {
    navigator.webkitGetUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: streamId,
                maxWidth: 1920, // window.screen.width,
                maxHeight: 1080 // window.screen.height
            }
        }
    },
        // successCallback
        function (screenStream) {
            var videoElement = cMap.screensharevideo; // document.getElementById('video');
            videoElement.src = URL.createObjectURL(screenStream);
            videoElement.play();
        },
        // errorCallback
        function (err) {
            console.log('getUserMedia failed!: ' + err);
        });
}

/** called to produce pseudo-random twisted walls, based on time
op = start or stop to start and stop, standard to return to stanadard walls */
cMap.walltwister = function (op = cMap.walltwister, genes = currentGenes) {
    genes.walltype = 0;
    if (op.msgtype) op = cMap.walltwister;  // in case called via Maestro
    if (op === 'start') { if (!cMap.walltwister.id) cMap.walltwister.id = Maestro.on('preframe', cMap.walltwister); return; }
    if (op === 'stop') { if (cMap.walltwister.id) Maestro.remove('preframe', cMap.walltwister.id); cMap.walltwister.id = 0; return; }
    if (op === 'standard') { cMap.walltwister('stop'); cMap.walltwister({ base: 500, var: 0 }); return; }

    if (cMap.wallres !== 1) { cMap.wallres = 1; cMap.newmesh(undefined, genes); }
    const pa = cMap.wallMesh.geometry.getAttribute('position');
    const a = pa.array;
    const t = frametime / 1000 / cMap.walltwister.rate;
    const sin = Math.sin;
    const s = Math.sign;
    const base = op.base;
    const varr = op.var;
    for (let i = 0; i < a.length; i+=3) {
        a[i] = s(a[i]) * (base + varr * sin(t * (20 + i) / 25 * 3.14159));
        a[i+1] = s(a[i+1]) * (base + varr * sin(t * (17 + i) / 22 * 3.14159));
        a[i+1] = s(a[i+1]) * (base + varr * sin(t * (23 + i) / 28 * 3.14159));
    }
    pa.needsUpdate = true;
    // cMap.wallMesh.geometry.vert icesNeedUpdate = true;

}
cMap.walltwister.rate = 10;
cMap.walltwister.base = 750;
cMap.walltwister.var = 250;

// needs update for no THREE. Geometry if to be reused
// cMap.wallwilliam = function () {
//     current Genes.walltype = 0;
//     if (!cMap.wallwilliam.loop) {
//         cMap.wallwilliam.loop = Maestro.onUnique('postframe', cMap.wallwilliam);
//         addgene perm('wallwa', _boxsize, 0, _boxsize * 2, _boxsize / 20, _boxsize / 20, 'depth of wall at edge', 'wallgeom', 0);
//         addgene perm('wallwb', _boxsize * 2, 0, _boxsize * 2, _boxsize / 20, _boxsize / 20, 'depth of wall at middle', 'wallgeom', 0);
//         addgene perm('wallws', 0.5, 0, 1, 0.1, 0.1, 'wall amount out', 'wallgeom', 0);
//     }
//     if (cMap.renderState === 'color') cMap.SetRenderState('walls');
//     if (cMap.wallres !== 8) {
//         cMap.new mesh(8);
//         cMap.basev = cMap.wallMesh.geometry.vert ices;
//         cMap.new mesh(1);
//         cMap.new mesh(8);
//     }

//     const iv = cMap.basev;
//     const ov = cMap.wallMesh.geometry.vert ices;
//     for (let i = 0; i < iv.length; i++) {
//         const ip = iv[i];
//         const op = ov[i];
//         const walla = current Genes.wallwa;  // size at edges
//         const wallb = current Genes.wallwb;  // size at back
//         const walls = current Genes.wallws;  // abound in/out
//         if (ip.z === -_boxsize) {
//             switch (Math.abs(ip.x / _boxsize * 4)) {
//                 case 0: op.x = 0; op.z = -wallb; break;
//                 case 1: op.z = -wallb; break;
//                 case 2: op.x = mix(1 / 4, 3 / 4, walls) * _boxsize * Math.sign(ip.x); op.z = -mix(walla, wallb, walls); break;
//                 case 3: op.z = -walla; break;
//                 case 4: op.z = -walla; break;
//                 default:
//                     log('wrong values');
//                     break;
//             }
//         }
//         cMap.wallMesh.geometry.verticesNeedUpdate = true;
//     }
// }

cMap.setegg = function(genes = currentGenes) {
    G.walltype = 2; // for superegg
    cMap.newmesh(40, genes);
    cMap.SetRenderState('objswallr');
    vrresting.bypassResting = true;
    V.resting = false;
    if (renderVR.invr()) {
        G._scale = 0.2;
    } else {
        G._camz = 1500;
    }

    setInput(W.FLATMAP, true);
    setInput(W.FLATWALLREFL, false);
    setInput(W.USEGROT, false);
    setInput(W.doAutorot, true);
    setInput(W.xzrot, -0.3);
    onframe( () => setInput(W.guifilter, 'feedsc|centrere|asp|size|superw|wall_band|wall_bump|wall_refl[123]'), 2);  // after all wall genes established
    setInput(W.genefilter, '');
    onframe(()=>filterDOMEv(), 3);  // delay in case adding genes AFTER filtering

    G.wall_bumpstrength = 0.2;
    G.wall_bumpscale = 300;

    G.wall_reflred = G.wall_reflblue = G.wall_reflgreen = 1;  // no colouration (other than irridescence) by reflection
    G.wall_refl1 = 0.8;
    G.wall_refl2 = 0.5;
    G.wall_refl3 = 1;
    setAllLots('wall_refl', {free:0});  // freeze all the wall refl genes
    G.superwall = 1 / 2.5;
    G.centrerefl = 1;
    //dead G.feed scale = 1;
    updateGuiGenes();
}

// cMap.wallscript = function* cwallscript(genes = currentGenes) {
//     cMap.setegg();
//     const save = { viveAnim, wallframe: V.wallframe };
//     viveAnim = nop; V.wallframe = nop;


//     G.walltype = 0; // standard
//     yield 'preframe'; yield 'preframe';  // in case needs to compile shaders

//     const t = 5000;

//     // william tests
//     G.wallwa = 500;
//     G.wallwb = 500;
//     G.wallws = 0;
//     Maestro.onUnique('postframe', cMap.wallwilliam);
//     yield S.ramp(G, 'wallwb', 1000, t)
//     yield S.ramp(G, 'wallws', 1, t);
//     yield S.ramp(G, 'wallwa', 1000, t);
//     Maestro.remove('postframe', cMap.wallwilliam);

//     yield 2000;

//     G.walltype = 2;
//     cMap.newmesh(40, genes);

//     G.superwall = 0;
//     yield S.ramp(G, 'superwall', 1, t * 2);

//     yield S.ramp(G, 'superwall', 1/2, t);

//     yield 2000;
//     G.walltype = 0;
//     cMap.spheretest(11, 5);
//     yield 2000;
//     cMap.spheretest(7, 3);
//     yield 2000;
//     cMap.spheretest(17, 13);
//     yield 2000;
//     cMap.spheretest(27, 23);

//     for (let i = 0; i < 4; i++) {
//         yield 1000;
//         G.walltype = 1;
//         yield 1000;
//         G.walltype = 0;
//     }

//     viveAnim = save.viveAnim; V.wallframe = save.wallframe;
// }

// cMap.run wall = function () { run TimedScript(cMap.wallscript()); }

/** load a diamond wall file */
cMap.diamond = function () {
    var loader = new THREE.OBJLoader();
    loader.setPath('files/');
    loader.load('Diamond.obj', cMap.diamondloader);
}
/** prepared loaded diamond, external function for easier debug */
cMap.diamondloader = function (object, genes = currentGenes) {
    genes.walltype = 0;
    if (cMap.renderState === 'color') cMap.SetRenderState('walls');
    cMap.diamondobj = object;
    cMap.wallMesh.geometry = object.children[0].geometry;
    cMap.wallMesh.scale.set(100, 100, 100); cMap.wallMesh.updateMatrix(); cMap.wallMesh.updateMatrixWorld();
    oneside(THREE.DoubleSide);

}

/** experiment with fixed camera feedback */
cMap.fixedtest = function() {
    setInput(W.FLATMAP, true);
    setInput(W.FLATWALLREFL, false);
    onframe( () => setInput(W.guifilter, 'wall (refl | bump) | feedb | superw'), 2);  // after wall genes established
    cMap.SetRenderState('fixpeekfeedback');
    cMap.fixres = 2048;
    cMap.wallType[5] = 'fixview';
    vrresting.bypassResting = true;
    setAllLots('wall_refl[123]', {value:0.95, free: 0});
    setAllLots('wall_refl[rgb]', {value:1, free: 0});
    setAllLots('wall_refl2', {value:0.5, free: 0});
    setAllLots('wall_bumpstrength', {value:0.2, free: 0});
    setAllLots('wall_bumpscale', {value:400, free: 0});
    setAllLots('walltype', {value:2, free: 0});
    setAllLots('superwall', {value:0.4, free: 0});
    setAllLots('centrerefl', {value:1, free: 0});
    if (!renderVR.invr()) {
        setInput(W.fixcontrols, true);
        G._camz = 1500;
    } else {
        G._camz = 300;
    }
    onframe( () => extraSlot(600), 4);  // permament small window showing extra slot, defer till target ready
    renderVR.pairOnMonitor = true;  // so we don;t get monitor left window
    // slots[0].dispobj.overwritedisplay = cMap.fixtarget1
    // cMap.fixcamera.position.set(-400,-400,-400); cMap.fixcamera.lookAt(new THREE.Vector3(-G._posx, G._posy * 1/4, -G._posz)); cMap.fixcamera.updateMatrix(); cMap.fixcamera.updateMatrixWorld(true);

    // temp
    G.light1s = G.light2s = 0;
    G.light0dirx = 9999;

    HW.cubeEarly = 1;
}

function extraSlot(s = 200, genes = currentGenes) {
    setViewports();  // clean up previous extraSlots

    const vn = renderVR.invr() ? 0 : 1;
    const slot = {col: 0, cx:s/2, cy:s/2, height:s, width: s, x: 0, y: 0};
    const dispobj = new DispobjC();
    dispobj.vn = vn;
    dispobj.genes = genes;
    slots[vn] = slot;
    copyFrom(dispobj, slot);
    slot.dispobj = dispobj;
    dispobj.overwritedisplay = cMap.fixtarget1;
    currentObjects.extraslot = dispobj;
    debugCurrentObjectsSize = olength(currentObjects);
    fitCanvasToWindow();
    dispobj.alwaysPaint = true;
    if (!renderVR.invr()) {
        onframe( () => slots[vn].dispobj.needsRender = true);
    }

    return slot;
}

/** feedback tests
 * k=5; camera.setViewOffset(width*k, height*k, 0,0, width, height)
 * cMap.fixFilter = 1003; cMap.fixtarget1 = 0
 * cMap.fixFilter = 1006; cMap.fixtarget1 = 0
 *
 * feedback control (wall)
 * inputs.FLATWALLREFL: true for maximum flexibility; allows mix of flat position and reflected direction
 * inputs.FLATMAP: true for maximum flexibility
 * G.flatwallreflp: 0 is pure reflection, 1 is pure 'paste feedback on wall'
 * G.wall_bumpscale: (needs to understand overall scale?)
 * G.wall_bumpstrength
 * G.wall_reflr/g/b
 * G.wall_refl1/2/3 (for bands, sometimes only 1 band)
 * G.feeds cale
 * G.centrerefl only use central part of feedback; for oval window in VR ?????
 * cMap.fixcamera: (not if setting up, do lookAt(0,0,0) again)
 *     fixcam.fov = 30; fixcam.up.set(0,1,0); fixcam.lookAt(0,0,0); fixcam.updateMatrix(); fixcam.matrix
 * cMap.wallType: array of 6 for 6 walls, rt and fixview most interesting
 *     cMap.wallType.fill('fixview')
 *
 * not used?:
 * G.feedr/g/b
 * G.feedxrot (& y,z) rotation of feeedback (? only applies to full cube)
 *
 * related:
 * G.wall_fluwidth = 0
 * V.wallAspect, G.wallAspect makes room look different
 * tad.colorCyclePerMin=0
 */

cMap.obs = function() {
    cMap.setupwebcam('OBS');
    cMap.SetRenderState('webcamnotex')
    cMap.webcamtexture.flipY = true;
    cMap.webcamtexture.center.set(0.5, 0.5);
    cMap.webcamtexture.rotation = Math.PI;
}