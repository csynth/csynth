/* eslint-disable no-empty */

'use strict';

// import { LightProbe } from "../JSdeps/three106SJPT";

var V, CSynth, posturimsg, xyzReader, THREE, random, seed, log, col3, dat, GLmolX,
distxyz, onframe, VEC3, msgfixlog, msgfixerror, performance, msgfix, GX, copyFrom, G, sleep,
searchValues, ima, remotesave, S, Maestro, Plane, renderVR, lastdocx, lastdocy, CLeap, W, framenum, distarr3, fileExists;

CSynth.loadExtraPDB = async function CSynth_loadExtraPDB(sstruct = CSynth.current.extraPDB,
    pgui = V.gui, pgroup = CSynth.rawgroup, filedata=undefined) {

    if (!sstruct) return;

    // load a single item from array
    async function load(i) {
        const f = sstruct[i];
        msgfix('extraPDB', `loading ${f.shortname}: ${i+1} of ${sstruct.length}`)
        await CSynth.loadExtraPDB(f, pgui, pgroup);
        if (searchValues.seed)
            await ima.show(i)
    }

    // handle case of array of items (can even have nested arrays)
    if (Array.isArray(sstruct)) {
        const promises = [];
        for (let i=0 ; i < sstruct.length; i++) {
            await(load(i));     // load them sequentially, looks neater and completes quicker (in one test)
            // promises.push(load(i));  // load them in parallel
        }
        await Promise.all(promises);    // irrelevant noop in serial case
        return;
    }

    // handle more structured options here
    if (typeof sstruct === 'string') sstruct = {filename: sstruct};
    if ('files' in sstruct) {      // nested groups
        const group = newgroupN('extraPDB_holdergroup');
        pgroup.add(group);
        const vgui = dat.GUIVR.createX(sstruct.name);
        vgui.myVisible = vgui.add(group, 'visible').listen().showInFolderHeader();
        pgui.addFolder(vgui);
        await CSynth_loadExtraPDB(sstruct.files, vgui, group);
        return;
    }
    const sfid = sstruct.filename;
    const shortname = sstruct.shortname = sstruct.shortname || sfid;

    // for now no lazy loading/parsing of raw data
    const cc = CSynth.current;
    const fid = cc.fullDir + sfid;
    CSynth.__overrideCentre();      // we must stop auto centre having any effect
    const data = filedata || await posturimsg(fid);
    if (!data) {msgfixerror('no data for', fid); return; }

    const glmol = CSynth.glmol[shortname] = new GLmolX(shortname, true);
    glmol.loadMoleculeStr(false, data);
    const atoms = glmol.atoms;
    if (sstruct.excludeChains) {
        glmol.atomlist = [];
        for (let i = 0; i < atoms.length; i++) {
            if (!sstruct.excludeChains.includes(atoms[i].chain))
                glmol.atomlist.push(i);
        }
    } else {
        glmol.atomlist = atoms.map((x,i)=>i);
    }
    const centre = sstruct.centre;  // << todo, change this to align or similar ...???
    glmol.sstruct = sstruct;
    if (centre) {
        let c;
        // temporary hard-coded compensation matrix. TODO
        // This matrix was computed to convert coordinates
        // from fom Hong_2017_15loops_5tc1.pdb
        // to 5tc1.pdb
        // See CSynth.mol2Align() below
        const mm = new THREE.Matrix4();
        mm.elements.set([
            // // old values from fom Hong_2017_15loops_5tc1.pdb 5tc1.pdb
            // 0.4286680870513188, 0.32579061600662484, 0.842679061044594, 0,
            // -0.12318417414230624, 0.9450630563620789, -0.3026912100216175, 0,
            // -0.8950251492013661, 0.025920054934883696, 0.4452901227328036, 0,
            // 3105.2010259300255, -78.00091558005715, -1523.3489488742994, 1

            // // new values frm "1aq3_fullDUP.pdb" to "All_capsid_proteins.pdb"
            // -0.2379551784197294, -0.9493101021481498, -0.20540538112256623, 5.898059818321144e-17,
            // -0.910261216260349, 0.14417141563719743, 0.38809691071199803, 4.527628272299467e-16,
            // -0.33881302324760637, 0.2793479213579766, -0.8984086824861683, -6.938893903907228e-18,
            // 1163.7934012624094, -988.5051735903289, 3106.937592847573, 1.0000000000000142

            // // from 5tc1 no y/z swap (more or less as above for 5tc1)
            // 0.429, 0.326, 0.843, 0,
            // -0.123, 0.945, -0.303, 0,
            // -0.895, 0.026, 0.445, 0,
            // 3105.3, -78.2, -1523.1, 1

            // from 5tc1 with y/z swap // commented out
            // 0.429, -0.843, 0.326, 0,
            // -0.123, 0.303, 0.945, 0,
            // -0.895, -0.445, 0.026, 0,
            // 3105.2, 1523.3, -78.1, 1

            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,0,0,1

        ]);
        if (centre === true) {
            c = glmol.useCentre();
        } else if (Array.isArray(centre)) {
            mm.elements.set(centre);
        } else {
            // TODO error checking
            const p = CSynth.glmol[centre];
            c = p.centre;
        }
        // EXPERIMENT HERE to align using computed centre of reference pdb
        // use one of the lines below
        // glmol.useCentre(c);  // use computed centre
        glmol.applyMatrix4(mm);  // compensate to match 5tc1
    }

    let vgroup;
    const options = {
        get visible() {return vgroup.visible; },
        set visible(v) {
            vgroup.visible = v;
            // if setting group visible but no children are, make first visible
            if (v && vgroup.children[0] && vgroup.children.every(c => !c.visible))
                vgroup.children[0].options.visible = true;
        }
    }

    // gui for the extraPDB group
    const vgui = glmol.gui = dat.GUIVR.createX(shortname);
    pgroup.remove(CSynth.loadExtraPDB.chainlines[shortname]);  // in case old one
    vgroup = CSynth.loadExtraPDB.group[shortname] = glmol.allgroup = newgroupN('extraPDBGroup_' + shortname, glmol);
    vgroup.visible = false;
    vgroup.options = options;

    vgui.myVisible = vgui.add(options, 'visible').listen().showInFolderHeader();
    CSynth.loadExtraPDBCartoon(shortname, vgui, vgroup);
    CSynth.loadExtraPDBSmooth(shortname, vgui, vgroup);
    if (sstruct.loadWire) CSynth.loadExtraPDBMywire(shortname, vgui, vgroup);
    CSynth.loadExtraPDBBond(shortname, vgui, vgroup);
    CSynth.loadExtraPDBBond(shortname, vgui, vgroup, 'atom');

    pgroup.add(vgroup);
    pgui.add(vgui);
}

/** interface into new FoldSynth style version of cartoon.
 * draw each chain separately, and run async so as not to disturb view
*/
CSynth.loadExtraPDBCartoon = async function CSynth_loadExtraPDBCartoon(sfid = CSynth.current.extraPDB, pgui=undefined, pgroup=undefined) {
    let group, glmol, options, mat, vgui; // for forward ref
    async function lazyload(time = 100) {
        // console.time('gen');
        CSynth.cleanGeometry(group);
        CSynth.colorBy(glmol, options);
        group.children = [];  // << will this clear resources in a timely way?
        // change below to supprt Edge (is it worth it?) which doesn't support ... spread operator.
        // sjpt 26 April 2019.
        const optsx = {group, atomlist: glmol.atomlist}
        copyFrom(optsx, options);
        const cartoonGen = glmol.drawFluidCartoon(optsx);
        while (true) {
            const next = cartoonGen.next();
            if (next.done) break;
            await sleep(0);     // visible frames will get in here if they can
        }

        let mergeChains = true; // helps for Firefox, reduces cpu
        if (mergeChains) {
            const mergeGeom = CSynth.catenateBufferGeometries(group.children.map(m =>m.geometry), mat);
            const mergeMesh = newmeshN(mergeGeom, mat, 'mergedChainCartoon_' + sfid, glmol);
            // mergeMesh.draw Mode = group.children[0].draw Mode;


            CSynth.cleanGeometry(group);
            group.children = [];  // << will this clear resources in a timely way?
            group.add(mergeMesh);
        }
        // function gen() {
        //     let t = Date.now();
        //     while (Date.now() - t < time) {
        //         const next = cartoonGen.next();
        //         //CSynth.colourSurfaceFromID(glmol, options, next.value);
        //         if (next.done) {
        //             // console.timeEnd('gen');
        //             return;
        //         }
        //     }
        //     onframe(gen);
        // }
        // gen();
        group.traverse(x => x.castShadow = x.receiveShadow = searchValues.useshadows );

        // CSynth.colorBy(glmol, options);
        //CSynth.colourSurfaceFromID(glmol, options, group);
        //// console.timeEnd('gen');
    }

    // define basic structure early so we can have gui from it
    glmol = CSynth.glmol[sfid];
    glmol.redrawCartoon = lazyload;
    group = glmol.cartoonGroup = CSynth.cartoonGroup[sfid] = newgroupN('cartoonGroup_' + sfid, glmol);
    group.visible = false;
    // const mesh = group;   // temporary during transition
    pgroup.add(group);
    mat = glmol.cartoonMat = CSynth.defaultMaterial.clone();

    let _colorBy = 'chain';
    options = group.options = {
        //TODO: clear up groupOrGeom related bits
        get visible() { return group.visible; },
        set visible(v) {
            if (v && !group.children.length) lazyload();
            group.visible = v;
            group.traverse(sg => sg.visible = v);
            if (v) CSynth.forceVisible(vgui);
        },
        get colorBy() { return _colorBy; },
        set colorBy(v) { options.setColorBy(v); },
        setColorBy: async function (v) {
            if (v === _colorBy) return;
            _colorBy = v;
            await CSynth.colourSurfaceFromID(glmol, options, group);
        },

        colDistNear: 110, colDistFar: 130,
        divURes: 5, divV: 6, edgeBunch: 1, baseRadius: 0.1, multiplierRadius: 2,
        ssNarrowRad: 0.1, ssBroadRad: 1, ssSheetBroadRad: 1, ssArrowSize: 1.5, tangentSpace: true,
        colorByTime: 0
        // colorBy: 'chain'
    }
    group.options = options;    // for turning on by parents

    vgui = dat.GUIVR.createX('cartoon');
    vgui.add(options, 'colorBy', CSynth.colorBy.files).listen();
    vgui.myVisible = vgui.add(options, 'visible').listen().showInFolderHeader();
    const geoGui = dat.GUIVR.createX('geometry options');
    geoGui.add(options, 'divURes', 3, 20).step(1);
    geoGui.add(options, 'divV', 3, 20).step(1);
    //geoGui.add(options, 'edgeBunch', 0.5, 2);
    geoGui.add(options, 'baseRadius', 0.01, 2);
    geoGui.add(options, 'multiplierRadius', 0.01, 4);
    geoGui.add(options, 'ssNarrowRad', 0.01, 4);
    geoGui.add(options, 'ssBroadRad', 0.01, 4);
    geoGui.add(options, 'ssSheetBroadRad', 0.01, 4);
    geoGui.add(options, 'ssArrowSize', 0.01, 4);
    //tangentSpace if bumpmapping, inferred not direct user choice. gui for comparing speed.
    //geoGui.add(options, 'tangentSpace');
    vgui.add(geoGui);
    CSynth.materialGui(mat, vgui);

    const bb = [1,
        { func: lazyload, tip: "apply all the set parameters", text: 'Apply' }
    ];
    vgui.addImageButtonPanel.apply(vgui, bb).setRowHeight(0.075); // .highlightLastPressed();
    if (glmol.sstruct.sym60) {
        const  cc = [2, {func: () => CSynth.symrepl(group), tip: "apply symmetries", text: "Apply sym60"}];
        vgui.addImageButtonPanel.apply(vgui, cc).setRowHeight(0.075);
    }
    pgui.add(vgui);
}
CSynth.cartoonGroup = {};
CSynth.bondGroup = {};


CSynth.loadExtraPDBMywire = function CSynth_loadExtraPDBMywire(sfid = CSynth.current.extraPDB, pgui=undefined, pgroup=undefined) {
    const glmol = CSynth.glmol[sfid];

    const atoms = glmol.atoms;

    const vgeom = new THREE.BufferGeometry();
    const vertices = [], colors = [], objectId = [];
    vgeom.objectId = objectId;
    const vlinemat = CSynth.loadExtraPDB.vlinemat[sfid] = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: 1 , vertexColors: THREE.VertexColors } );
    pgroup.remove(CSynth.loadExtraPDB.chainlines[sfid]);  // in case old one
    const lsegs = CSynth.loadExtraPDB.chainlines[sfid] = new THREE.LineSegments(vgeom, vlinemat);
    lsegs.visible = false;

    seed(123);
    let col = col3(random()**2, random()**2, random()**2);

    let chains = CSynth.loadExtraPDB.chains[sfid] = [];
    let lastatom = {x: 999999999, y: 99999999999, z: 99999999999, chain: 'none'};
    for (let i = 0; i < atoms.length-1; i++) {
        const atom = atoms[i];
        if (atom === undefined || (atom.atom !== 'CA' && atom.atom !== 'P')) continue;
        if (atom.chain !== lastatom.chain || distxyz(atom, lastatom) > 10) {
            col = col3(random()**2, random()**2, random()**2);
            chains.push(atom.chain);
        } else {
            vertices.push(lastatom.x, lastatom.y, lastatom.z);
            vertices.push(atom.x, atom.y, atom.z);
            colors.push(col.r, col.g, col.g);
            colors.push(col.r, col.g, col.g);
            objectId.push(atom.serial);
            objectId.push(atom.serial);
        }
        lastatom = atom;
    }
    vgeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    vgeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

    log('loadExtraPDB chains', sfid, chains.length, chains.join('.'));
    const group = glmol.wiregroup = CSynth.loadExtraPDB.chainlines[sfid];
    pgroup.add(group);
    vlinemat.transparent = true;
    vlinemat.color = col3(1,1,1);
    vlinemat.opacity=0.2;

    let _colorBy = 'chain';
    const options = group.options = {
        get colorBy() { return _colorBy; },
        set colorBy(v) { options.setColorBy(v); },
        setColorBy: async function (v) {
            if (v === _colorBy) return;
            _colorBy = v;
            await CSynth.colourSurfaceFromID(glmol, options, lsegs);
        },
        colDistNear: 100, colDistFar: 120, colorByTime: 0

    };

    const vgui = V.virusGui = dat.GUIVR.createX('wire');
    vgui.myVisible = vgui.add(glmol.wiregroup, 'visible').listen().showInFolderHeader();
    vgui.add(options, 'colorBy', CSynth.colorBy.files).listen();
    vgui.add(CSynth.loadExtraPDB.vlinemat[sfid], 'opacity').min(0).max(1).step(0.01).listen();
    vgui.add(options, 'colDistNear', 0, 200).step(1).listen();
    vgui.add(options, 'colDistFar', 0, 200).step(1).listen();

    // if (glmol.sstruct.sym60) {
    //     const  cc = [2, {func: () => CSynth.symrepl(CSynth.loadExtraPDB.chainlines[sfid]), tip: "apply symmetries", text: "Apply sym60"}];
    //     vgui.addImageButtonPanel.apply(vgui, cc).setRowHeight(0.075);
    // }
    pgui.add(vgui);
}

CSynth.colorBy = function CSynth_colorBy(glmol, {colorBy, col = 0x404040, colDistNear = 110, colDistFar = 130}, mesh = glmol.smoothMesh) {
    if (glmol.col === colorBy && !CSynth.forceColorBy) return;
    glmol.colorAtoms(glmol.atomlist, col); // some of the others are incomplete, so set all neutral
    let vertexColors = THREE.VertexColors;
    switch (colorBy) {
        case 'chain':       glmol.colorByChain(glmol.atomlist, true); break;
        case 'chaingroup':  glmol.colorByChaingroup(glmol.atomlist, true); break;
        case 'chainid':     glmol.colorByChainid(glmol.atomlist, true); break;
        case 'atom':        glmol.colorByAtom(glmol.atomlist, {}); break;
        case 'structure':   glmol.colorByStructure(glmol.atomlist, 0xff0000, 0x00ff00, true); break;
        case 'BFactor':     glmol.colorByBFactor(glmol.atomlist, true); break;
        case 'residue':     glmol.colorByResidue(glmol.atomlist); break;
        case 'polarity':    glmol.colorByPolarity(glmol.atomlist, 0xff0000, 0x0000ff); break;
        case 'atomDist':    glmol.colorByDist(glmol.atomlist, colDistNear, colDistFar); break;
        case 'meshDist':    CSynth.colourMeshByxyz(mesh, colDistNear, colDistFar); break; //careful of groups...
        case 'fixed':       vertexColors = 0; break;
    }
    glmol.col = colorBy;
    if (mesh.material && mesh.material.vertexColors !== vertexColors) {
        mesh.material.vertexColors = vertexColors;
        mesh.material.needsUpdate = true;
    }
}
CSynth.colorBy.files = ['chain', 'chaingroup', 'chainid', 'atom', 'structure', 'BFactor', 'residue', 'polarity',
    'atomDist', 'meshDist', 'fixed'];

CSynth.loadExtraPDBSmooth = function CSynth_loadExtraPDBSmooth(sfid, pgui, pgroup) {
    let currentSettings = {};
    let vgui;  // forward refs
    let options, glmol, mesh; // forward refs
    function lazyload() {
        currentSettings = {colorBy: options.colorBy, radInfluence: options.radInfluence};
        const u = undefined;
        CSynth.colorBy(glmol, options);
        // fid, mesh, {low, high, res, th, radInfluence, usecols, useids, cubic, xxmult}
        CSynth.Surface(sfid, mesh, options);
            //u,u, options.res, 1, options.radInfluence,
            //options.usecols, options.useids, options.cubic);
        // second pass uses range computed in first pass, mainly useful for medial surface
        if (options.twopass) {
            const a = mesh.geometry.attributes.position.array;
            const min = VEC3(), max = VEC3(), p = VEC3();
            for (let i = 0; i < a.length;) {
                p.x = a[i++];
                p.y = a[i++];
                p.z = a[i++];
                if (isNaN(p.x + p.y + p.z)) continue;
                min.min(p);
                max.max(p);
            }
            min.applyMatrix4(mesh.matrix);
            max.applyMatrix4(mesh.matrix);
            const optionsx = {};
            Object.assign(optionsx, options);
            optionsx.low = min;
            optionsx.high = max;
            CSynth.Surface(sfid, mesh, optionsx);
        }
        if (options.useids && !options.usecols)
            CSynth.colourSurfaceFromID(glmol, {colorBy: 'current'}, mesh);
    }

    // define basic structure early so we can have gui from it
    glmol = CSynth.glmol[sfid];
    glmol.redrawSmooth = lazyload;

    const mat = glmol.smoothmat = CSynth.defaultMaterial.clone();
    //  const groupOrGeom = glmol.smoothgeom = new THREE. Geometry();
    mat.vertexColors = THREE.VertexColors; mat.side = THREE.DoubleSide;
    mesh = glmol.smoothMesh = new newmeshN(undefined,  glmol.smoothmat, 'smoothmesh' + sfid, glmol);
    mesh.visible = false;
    mesh.frustumCulled = false;
    pgroup.add(mesh);

    let _colorBy = 'chain';
    options = mesh.options = {
        get visible() { return mesh.visible; },
        set visible(v) {
            if ((v && !mesh.geometry.attributes.position)) lazyload() ;
            mesh.visible = v;
            if (v) CSynth.forceVisible(vgui);
        },
        radInfluence: 1.5, radMult: 1, res: 200, cubic: true, justCA: false, twopass: false,
        colDistNear: 110, colDistFar: 130,
        get colorBy() { return _colorBy; },
        set colorBy(v) { options.setColorBy(v); },
        setColorBy: async function (v, force=false) {
            if (v === _colorBy && !force) return;
            _colorBy = v;
            if (glmol.smoothMesh.geometry.objectId) {
                const s = CSynth.forceColorBy;
                CSynth.forceColorBy = true;// TODO PASS DOWN
                await CSynth.colourSurfaceFromID(glmol, options, mesh);
                CSynth.forceColorBy = s;
            }
        },
        usecols: false, useids: true, colorByTime: 0
    }

    vgui = glmol.smoothgui = dat.GUIVR.createX('smooth');
    vgui.myVisible = vgui.add(options, 'visible').listen().showInFolderHeader();
    CSynth.materialGui(mat, vgui);
    vgui.add(options, 'colorBy', CSynth.colorBy.files).listen();
    vgui.add(options, 'colDistNear', 0, 200).step(1).listen().onChange(() => options.setColorBy(_colorBy, true));
    vgui.add(options, 'colDistFar', 0, 200).step(1).listen().onChange(() => options.setColorBy(_colorBy, true));
    vgui.add(options, 'radMult', 0, 10).step(0.01).listen();
    vgui.add(options, 'radInfluence', 1.01,3).step(0.01).listen();
    vgui.add(options, 'res', 50, 300).step(10).listen();
    vgui.add(options, 'justCA').listen();
    vgui.add(options, 'twopass').listen();
    options.xchain = 'none';
    const list = glmol.chains.map(c=>c.chain);
    list.splice(0,0,'none');
    const drop = vgui.add(options, 'xchain', list).name('xchain').listen();
    drop.setToolTip('"opposite" chain for medial surface');
    vgui.add(options, 'cubic').listen();
    vgui.add(options, 'useids').listen();
    vgui.add(options, 'usecols').listen();

    const bb = [1,
        { func: lazyload, tip: "apply all the set parameters", text: 'Apply' }
    ];
    vgui.addImageButtonPanel.apply(vgui, bb).setRowHeight(0.075); // .highlightLastPressed();
    // if (glmol.sstruct.sym60) {
    //     const  cc = [2, {func: () => CSynth.symrepl(mesh), tip: "apply symmetries", text: "Apply sym60"}];
    //     vgui.addImageButtonPanel.apply(vgui, cc).setRowHeight(0.075);
    // }
    pgui.add(vgui);
}   // loadExtraPDBSmooth

CSynth.bondDistThresh = 2;
/** this draws bonds for pairs using quadratic scan on distance, or just single atoms for useatoms = true */
CSynth.loadExtraPDBBond = function CSynth_loadExtraPDBBond(sfid, pgui, pgroup, type = 'bond') {
    let vgui; // forward refs
    const glmol = CSynth.glmol[sfid];
    let targ;                                  // structure of information in javascript terms
    const geom = new THREE.BufferGeometry();      // single geometry
    const useatoms = type === 'atom'
    let mat, mesh, group;

    glmol['redraw' + type] = lazyload;
    mat = glmol[type + 'Mat'] = CSynth.defaultMaterial.clone();
    mesh= glmol[type + 'Mesh'] = new newmeshN(geom, mat, type + 'Mesh_' + sfid, glmol);
    if (!CSynth[type + 'Group']) CSynth[type + 'Group'] = {};
    group = glmol[type + 'Group'] = CSynth[type + 'Group'][sfid] = newgroupN('CSynth.' + type + ' Group_' + sfid, glmol);

    mesh.frustumCulled = false;
    group.add(mesh);
    pgroup.add(group);
    group.visible = false;
    let lastrad;

    let _colorBy = 'chain';
    const options = group.options = {
        get visible() { return group.visible; },
        set visible(v) {
            if (v) lazyload() ;
            group.visible = v;
            group.traverse(sg => sg.visible = v);
            if (v) CSynth.forceVisible(vgui);
        },
        rad: useatoms ? 0.5 : 0.25,
        kcyl: 5, kend: 3,

        get colorBy() { return _colorBy; },
        set colorBy(v) { options.setColorBy(v); },
        setColorBy: async function (v) {
            if (v === _colorBy) return;
            _colorBy = v;
            await CSynth.colourSurfaceFromID(glmol, options, group);
        },
        usecols: false, useids: true, colorByTime: 0
    }

    vgui = glmol.smoothgui = dat.GUIVR.createX(type);
    vgui.myVisible = vgui.add(options, 'visible').listen().showInFolderHeader();
    CSynth.materialGui(mat, vgui);
    vgui.add(options, 'colorBy', CSynth.colorBy.files).listen();
    vgui.add(options, 'rad', 0.01,1).step(0.01).listen();
    vgui.add(options, 'kcyl', 2,16).step(1).listen();
    vgui.add(options, 'kend', 1,8).step(1).listen();
    const bb = [2,
        { func: lazyload, tip: "apply all the set parameters", text: 'Apply' },
        { func: rerad, tip: "apply rad", text: 'Re Rad' }
    ];
    vgui.addImageButtonPanel.apply(vgui, bb).setRowHeight(0.075); // .highlightLastPressed();

    if (glmol.sstruct.sym60) {
        const  cc = [2, {func: () => CSynth.symrepl(group), tip: "apply symmetries", text: "Apply sym60"}];
        vgui.addImageButtonPanel.apply(vgui, cc).setRowHeight(0.075);
    }
    pgui.add(vgui);

    function rerad() {
        // console.time('rerad');
        const rd = options.rad - lastrad;
        const p = targ.positions;
        const n = targ.normals;
        for (let i = 0; i < p.length; i++)
            p[i] += rd * n[i];
        lastrad = options.rad;
        geom.attributes.position.needsUpdate = true;
        // console.timeEnd('rerad');
    }
    //const currentSettings = {};
    function lazyload() {
        //console.profile('bonds');
        // console.time('bonds');
        const atoms = glmol.atoms.filter(a=>a);
        const {kcyl, kend} = options;

        const cylpoints = kcyl * (kend*2 + 2) + 2;// points in cylinder
        const size = atoms.length * cylpoints;    // guess size of arrays, based on 2 bonds per atom, #bonds = #atoms
        targ = CSynth.startGeom(size, targ);    // get a targ, reuse if appropriate
        CSynth.extendGeom.indn = 0; CSynth.extendGeom.posn = 0;
        let n = 0;
        for (let i = 0; i < atoms.length; i++) {
            const atomi = atoms[i];
            let atn = 0;
            if (useatoms) {
                CSynth.drawCyl(targ, atomi, atomi, atomi.serial, atomi.serial, options.rad, kcyl, kend);
            } else {
                for (let j = i+1; j < Math.min(i+30, atoms.length); j++) {
                    const atomj = atoms[j];
                    if (atomj.resi > atomi.resi + 1) break;
                    if (atomj.chain !== atomi.chain) break;
                    if (type === 'inter' && atomj.resi === atomi.resi) continue;
                    if (type === 'intra' && atomj.resi !== atomi.resi) continue;
                    if (distxyz(atomi, atomj) > CSynth.bondDistThresh) continue;
                    CSynth.drawCyl(targ, atomi, atomj, atomi.serial, atomj.serial, options.rad, kcyl, kend);
                    atn++;
                    n++;
                }
            }
        }

        // CSynth.cleanGeometry(group); // clean up so GPU resources are freed, NO now done in finishGeom if needed
        // group.children = [];         // no, group and mesh relationship stays
        CSynth.finishGeom(targ, geom);

        // console.timeEnd('bonds');
        // console.profileEnd('bonds');
        msgfix(type + 'cylinders generated', n, 'atoms', atoms.length, 'extends', CSynth.extendGeom.indn, CSynth.extendGeom.posn);
        //msgfixlog('guess sizes', size*6, size);
        //msgfixlog('final sizes', targ.ipos, targ.ppos/3);

        // console.time('colorBy');
        // done by below CSynth.colorBy(glmol, options);
        CSynth.colourSurfaceFromID(glmol, options, group);
        // console.timeEnd('colorBy');
        lastrad = options.rad;
    }

} // loadExtraPDBBond

// PENDING PENDING
// CSynth.loadExtraPDBBondOLD = function CSynth_loadExtraPDBLinks(sfid, pgui, pgroup) {
//     const glmol = CSynth.glmol[sfid];
//     //const currentSettings = {};
//     function lazyload() {
//         glmol.mat = mat;
// CSynth.cleanGeometry(group);

//         group.children = []; // get rid of previous ones
//         const geom = new THREE. Geometry();  // pass this in isntead of group and it breaks
//         glmol.drawBondsAsStick(group, glmol.atomlist, options.rad, options.rad*0.4, true, true, 0);  // 0.4 odd, experimental
//         //below too inefficent to use
//         //const geom = new THREE. Geometry();
//         //CSynth.mergeGeometry(geom, group);
//         //const mesh = new newmeshN(geom, mat);
//         //group.children = [];
//         //group.add(mesh);
//         //currentSettings = {colorBy: options.colorBy, radInfluence: options.radInfluence};

//         const u = undefined;
//         CSynth.colorBy(glmol, options);
//         //if (options.useids && !options.usecols)
//         //    CSynth.colourSurfaceFromID(glmol, {colorBy: 'current'});
//     }

//     let _colorBy = 'chain';
//     const options = {
//         get visible() { return group.visible; },
//         set visible(v) {
//             if (v) lazyload() ;
//             group.visible = v;
//             if (v) CSynth.forceVisible(vgui);
//         },
//         rad: 0.25,
//         get colorBy() { return _colorBy; },
//         set colorBy(v) { options.setColorBy(v); },
//         setColorBy: async function (v) {
//             if (v === _colorBy) return;
//             _colorBy = v;
//             //if (glmol.smoothMesh.geometry.objectId) {
//             //    await CSynth.colourSurfaceFromID(glmol, options)
//             //}
//         },
//         usecols: false, useids: true
//     }



//     const group = glmol.bondGroup = CSynth.bondGroup[sfid] = newgroupN('todo');
//     pgroup.add(group);
//     group.visible = false; group.name = 'CSynth.bondGroup_' + sfid;
//     const mat = glmol.bondMat = CSynth.defaultMaterial.clone();
//     const vgui = glmol.smoothgui = dat.GUIVR.createX('bonds');
//     vgui.myVisible = vgui.add(options, 'visible').listen().showInFolderHeader();
//     CSynth.materialGui(mat, vgui);
//     vgui.add(options, 'colorBy', CSynth.colorBy.files).listen();
//     vgui.add(options, 'rad', 0.01,1).step(0.01).listen();
//     pgui.add(vgui);
// }
// CSynth.bondGroup = {};


CSynth.loadExtraPDB.vlinemat = {};
CSynth.loadExtraPDB.chainlines = {};
CSynth.loadExtraPDB.chains = {};
CSynth.loadExtraPDB.group = {};
CSynth.glmol = {};

/** force visibility up myVisible chain */
CSynth.forceVisible = function(gui) {
    if (!gui) return;
    if (gui.myVisible) {
        if (!gui.myVisible.getValue())
            gui.myVisible.setValue(true);
        CSynth.forceVisible(gui.folderParent);
    }
}



/***
computation code used to work out alignment above
 */

 /** fom Hong_2017_15loops_5tc1.pdb
ATOM      1  N   ALA A   1      87.660 -70.0173497.199  1.00  0.00           N
ATOM  11018  C3' C   R1388     -89.438  48.7133408.215  1.00  0.00           C
ATOM   1373  CA  ARG B 185      63.645 -75.1043485.023  1.00  0.00           C
ATOM  13122  OP2 C   R1487      49.065  62.2063409.885  1.00  0.00           O

** from 5tc1.pdb
ATOM      1  N   ALA A   1      21.322 -24.965 128.982  1.00 67.93  1
ATOM  11018  C3'   C R 593      10.423  27.239 -95.817  1.00103.31           C
ATOM   1373  CA  ARG B  56      22.552 -37.912 104.863  1.00 57.02           C
ATOM  13122  OP2   C R2042      66.638  85.157  17.556  1.00 77.53           O
**/
// CSynth.mol2Align = function(fid1="1aq3_full.pdb", fid2="All_capsid_proteins.pdb") {
CSynth.mol2Align = function(fid1="Hong_2017_15loops_5tc1.pdb", fid2="5tc1.pdb", cg1 = -1, cg2 = -1) {
    // two reference atom sets
    //const a1 = CSynth.glmol[fid1].atoms.slice(0, 2894).map(a => a.rawxyz); // A 2894);  // all from first A,B,C
    //const a2 = CSynth.glmol[fid2].atoms.slice(0, 2894);
    const gl1 = CSynth.glmol[fid1];
    const gl2 = CSynth.glmol[fid2];
    let a1 = gl1.atoms;
    let a2 = gl2.atoms;
    let start1=0, start2 = 0;
    if (cg1 >= 0) a1 = a1.slice(start1 = gl1.chaingroups[cg1], gl1.chaingroups[cg1+1]);
    if (cg2 >= 0) a2 = a2.slice(start2 = gl2.chaingroups[cg2], gl2.chaingroups[cg2+1]);

    // find fairly spread representatives, use second as first does not have serial in the rawxyz
    const i0 = a2.reduce( (a,c) => a.x < c.x ? a : c, a2[1]).serial - start2;
    const i1 = a2.reduce( (a,c) => a.y < c.y ? a : c, a2[1]).serial - start2;
    const i2 = a2.reduce( (a,c) => a.z < c.z ? a : c, a2[1]).serial - start2;
    const i3 = a2.reduce( (a,c) => a.x > c.x ? a : c, a2[1]).serial - start2;

    const p = i => msgfixlog('align pos', i, a1[i].x, a1[i].y, a1[i].z, a2[i].x, a2[i].y, a2[i].z);
    p(i0); p(i1); p(i2); p(i3);
    msgfixlog('align indices', i0, i1, i2, i3);
    const d = (i,j) => msgfixlog('align dd', i, j, distxyz(a1[i], a1[j]), distxyz(a2[i], a2[j]));
    d(i0,i1); d(i0,i2); d(i0,i3); d(i1,i2); d(i1,i3); d(i2,i3);
    const m1 = [
        a1[i0].x, a1[i0].y, a1[i0].z, 1,
        a1[i1].x, a1[i1].y, a1[i1].z, 1,
        a1[i2].x, a1[i2].y, a1[i2].z, 1,
        a1[i3].x, a1[i3].y, a1[i3].z, 1
    ];
    const m2 = [
        a2[i0].x, a2[i0].y, a2[i0].z, 1,
        a2[i1].x, a2[i1].y, a2[i1].z, 1,
        a2[i2].x, a2[i2].y, a2[i2].z, 1,
        a2[i3].x, a2[i3].y, a2[i3].z, 1
    ];
    msgfixlog('align m1', m1);
    msgfixlog('align m2', m2);


    // // four points taken from each of the two versions
    // const m1 = [
    //     87.660, -70.017, 3497.199,  1,
    //     -89.438,  48.713, 3408.215,  1,
    //     63.645, -75.104, 3485.023,  1,
    //     49.065,  62.206, 3409.885,  1]

    // const m2 = [21.322, -24.965, 128.982, 1,
    //     10.423, 27.239,-95.817,1,
    //     22.552, -37.912, 104.863,1,
    //     66.638, 85.157, 17.556, 1]


        // convert points to array
    const mm1 = new THREE.Matrix4().fromArray(m1);
    const mm2 = new THREE.Matrix4().fromArray(m2);

    // xx * m1 = m2
    // xx = m2 * m1**-1
    const mm1i = new THREE.Matrix4().copy(mm1).invert();
    const xx = new THREE.Matrix4().multiplyMatrices(mm2, mm1i);
    msgfixlog ('align xx', xx.elements)
    msgfixlog ('align xxdet', xx.determinant())

    const mm1x = mm1.clone().multiply(xx)
    log ('mm1x', mm1x.elements)

    const mm1x2 = xx.clone().multiply(mm1)
    log ('mm1x2', mm1x2.elements);

    const a = VEC3(86.303,-49.300,3521.659).applyMatrix4(xx)
    log('a', a)

    // test
    // ATOM  13122  OP2 C   R1487      48.060  63.4983410.259  1.00  0.00           O
    // ATOM  13122  OP2   C R2042      66.638  85.157  17.556  1.00 77.53           O
    const old = VEC3(48.060, 63.498,3410.259)
    const nnew = old.clone().applyMatrix4(xx)
    //
    return xx;
}

// // slightly higher level mergeGeometry, but geom.mergeMesh doesn't work on buffer geometery
// CSynth.mergeGeometry = function CSynth_mergeGeometry(geom, obj) {
//     if (obj.isMesh) geom.mergeMesh(obj);
//     obj.children.forEach(c => CSynth.mergeGeometry(geom, c) );
// }

/** draw a cylinder and add to targ.  a,b are ends, aid,bid are identifiers for ends, r is radius
 * aid, bid may also be colours
 */
CSynth.drawCyl = function CSynth_drawCyl(targ, pa, pb, acolid=0, bcolid=0, rad=1, n=8, sn=2) {
    // targ has indices, ipos, positions, normals, ppos, ids
    /** test
    targ = {indices: [], ipos: 0, positions: [], normals: [], ppos: 0, ids: []}
    CSynth.drawCyl (targ, VEC3(0,0,0), VEC3(10,0,0), 'a', 'b', 1, 4, 2)
    **/
    const cylinds = n * (4*sn+4) * 3;   // indices in cylinder
    const cylpoints = n * (sn*2 + 2) + 2;// points in cylinder

    CSynth.extendGeom(targ, cylinds, cylpoints);
    let {indices, ipos, positions, colors, normals, ppos, ids} = targ;
    const m = CSynth.drawCyl;
    const dir = m.dir.subVectors(pb, pa);
    if (dir.length() === 0) dir.set(0,1,0);
    // const len = dir.length();
    const c = m.c.set((pa.x+pb.x) * 0.5, (pa.y+pb.y) * 0.5, (pa.z+pb.z) * 0.5);
    dir.normalize();
    const x0 = Math.abs(dir.x) > 0.5 ? m.x02 : m.x01;
    x0.cross(dir).normalize();
    const x1 = m.x1.crossVectors(dir, x0).normalize();

    const istart = ppos/3;
    let aid, acol;
    if (typeof acolid === 'number') {
        aid = acolid;
        acol = {r:1, g:1, b:1};
    } else {
        aid = 0;
        acol = acolid;
    }
    ids[ppos/3] = aid;
    positions[ppos] = pa.x - dir.x * rad; colors[ppos] = acol.r; normals[ppos++] = -dir.x;
    positions[ppos] = pa.y - dir.y * rad; colors[ppos] = acol.g; normals[ppos++] = -dir.y;
    positions[ppos] = pa.z - dir.z * rad; colors[ppos] = acol.b; normals[ppos++] = -dir.z;

    const iend = ppos/3;
    let bid, bcol;
    if (typeof bcolid === 'number') {
        bid = bcolid;
        bcol = {r:1, g:1, b:1};
    } else {
        bid = 0;
        bcol = acolid;
    }
    ids[ppos/3] = bid;
    positions[ppos] = pb.x + dir.x * rad; colors[ppos] = bcol.r; normals[ppos++] = dir.x;
    positions[ppos] = pb.y + dir.y * rad; colors[ppos] = bcol.g; normals[ppos++] = dir.y;
    positions[ppos] = pb.z + dir.z * rad; colors[ppos] = bcol.b; normals[ppos++] = dir.z;

    const ik = ppos/3;
    for (let i = 0; i < n; i++) {
        const ang = 2 * Math.PI * i /n;
        const sin = Math.sin(ang);
        const cos = Math.cos(ang);

        // start part, positions
        for (let j = 1; j <= sn; j++) {
            const dird = rad * (1 - j / sn)**0.5;  // in dir direction
            const radd = Math.sqrt(rad*rad - dird*dird);
            ids[ppos/3] = aid;
            let aa = positions[ppos] = pa.x - dird * dir.x + radd * (sin * x0.x + cos * x1.x);
            colors[ppos] = acol.r;
            normals[ppos++] = (aa - pa.x) / rad;

            aa = positions[ppos] = pa.y - dird * dir.y + radd * (sin * x0.y + cos * x1.y);
            colors[ppos] = acol.g;
            normals[ppos++] = (aa - pa.y) / rad;

            aa = positions[ppos] = pa.z - dird * dir.z + radd * (sin * x0.z + cos * x1.z);
            colors[ppos] = acol.b;
            normals[ppos++] = (aa - pa.z) / rad;
        }

        // cylinder centre, positions
        let id = aid;
        for (let j = 0; j < 2; j++) {
            ids[ppos/3] = id;
            positions[ppos] = c.x + rad * (sin * x0.x + cos * x1.x);
            colors[ppos] = bcol.r;
            normals[ppos++] = (sin * x0.x + cos * x1.x);  // tbd

            positions[ppos] = c.y + rad * (sin * x0.y + cos * x1.y);
            colors[ppos] = bcol.g;
            normals[ppos++] = (sin * x0.y + cos * x1.y);

            positions[ppos] = c.z + rad * (sin * x0.z + cos * x1.z);
            colors[ppos] = bcol.b;
            normals[ppos++] = (sin * x0.z + cos * x1.z);

            id = bid;
        }

        // end part, positions
        for (let j = 0; j < sn; j++) {
            const dird = rad * (j / sn)**0.5;  // in dir direction
            const radd = Math.sqrt(rad*rad - dird*dird);
            ids[ppos/3] = bid;
            let aa = positions[ppos] = pb.x + dird * dir.x + radd * (sin * x0.x + cos * x1.x);
            colors[ppos] = acol.r;
            normals[ppos++] = (aa - pb.x) / rad;

            aa = positions[ppos] = pb.y + dird * dir.y + radd * (sin * x0.y + cos * x1.y);
            colors[ppos] = acol.g;
            normals[ppos++] = (aa - pb.y) / rad;

            aa = positions[ppos] = pb.z + dird * dir.z + radd * (sin * x0.z + cos * x1.z);
            colors[ppos] = acol.b;
            normals[ppos++] = (aa - pb.z) / rad;
        }
    }

    // indices
    // first triangles
    for (let i = 0; i < n; i++) {
        const ii0 = i * 2 * (sn+1) + ik;
        const ii1 = ((i+1)%n) * 2 * (sn+1) + ik;
        indices[ipos++] = istart;
        indices[ipos++] = ii0;
        indices[ipos++] = ii1;

        for (let j = 0; j < 2*sn+1; j++) {
            indices[ipos++] = j + ii0;
            indices[ipos++] = j + ii0 + 1;
            indices[ipos++] = j + ii1 + 1;

            indices[ipos++] = j + ii0;
            indices[ipos++] = j + ii1 + 1;
            indices[ipos++] = j + ii1;
        }

        indices[ipos++] = iend;
        indices[ipos++] = ii1 + 2 * sn + 1;
        indices[ipos++] = ii0 + 2 * sn + 1;
    }
    if (ppos > targ.positions.length || ipos > targ.indices.length)
        debugger;
    targ.ppos = ppos;
    targ.ipos = ipos;
}



CSynth.startGeom = function(n = 10000, targ=undefined) {
    if (targ && targ.startSize === n) {
        targ.ipos = targ.ppos = 0;
        return targ;
    }
    const positions = new Float32Array(n*3);    // each pos has 3 coords
    const normals =  new Float32Array(n*3);
    const colors =  new Float32Array(n*3);
    const ids = new Uint32Array(n);
    const indices = new Uint32Array(n*6);       // each pos reused 6 times (approx)
    return {indices, ipos: 0, positions, normals, colors, ppos: 0, ids, startSize: n}
}

// extend the geometry extents as needed
// more expensive than I would like, more time in theis than in drawCyl itself for largebond view.
CSynth.extendGeom = function(targ, ixs = 1000, pxs = ixs) {
    let t;
    if (targ.ipos + ixs > targ.indices.length) {
        const n = Math.ceil(targ.indices.length * 1.5 + ixs);
        t = new Uint32Array(n);
        t.set(targ.indices);
        targ.indices = t;
        CSynth.extendGeom.indn++;
    }
    if (targ.ppos/3 + pxs > targ.ids.length) {
        const n = Math.ceil(targ.ids.length * 1.5 + pxs);
        t = new Uint32Array(n);
        t.set(targ.ids);
        targ.ids = t;
        t = new Float32Array(n*3);
        t.set(targ.positions);
        targ.positions = t;
        t = new Float32Array(n*3);
        t.set(targ.normals);
        targ.normals = t;
        t = new Float32Array(n*3);
        t.set(targ.colors);
        targ.colors = t;
        CSynth.extendGeom.posn++;
    }
}
CSynth.extendGeom.indn = 0; CSynth.extendGeom.posn = 0;


// finish off the geometry
// optimize cases where it is very like the old geometry in sizes etc
// Where the old geometry is passed in, reuse and optimize if possible
CSynth.finishGeom = function(targ, geom) {
    // correct the array lengths if necessary
    if (targ.indices.length !== targ.ipos) {
        targ.indices = targ.indices.slice(0, targ.ipos);
    }
    if (targ.positions.length !== targ.ppos) {
        targ.ids = targ.ids.slice(0, targ.ppos/3);
        targ.positions = targ.positions.slice(0, targ.ppos);
        targ.normals = targ.normals.slice(0, targ.ppos);
        targ.colors = targ.colors.slice(0, targ.ppos);
    }

    // decide one of three cases
    //     1: use old geometry and all the old buffers, just update them
    //     2: use old geometry, but clean up old buffers and replace them.
    //     3: create new geometry and set up buffers
    if (geom
        && geom.attributes.position && geom.attributes.normal
        && geom.attributes.position.array === targ.positions
        && geom.attributes.normal.array === targ.normals
        && geom.attributes.color.array === targ.colors
        && geom.index.array === targ.indices
        && geom.objectId === targ.ids
    ) {     // case 1: use old geometry and all the old buffers, just update them
        // after regen of a ond view with different radius,
        // the indices and normals are probably unchanged,
        // but not bothering to prevent update
        // msgfixlog('bond geom', 'reuse attributes');
        geom.attributes.position.needsUpdate = true;
        geom.attributes.normal.needsUpdate = true;
        geom.attributes.color.needsUpdate = true;
        geom.index.needsUpdate = true;
    } else {
        if (geom) {           // 2: use old geometry, but clean up old buffers and replace them
            // msgfixlog('bond geom', 'reuse geometry, new attributes');
            geom.dispose();     // if there was a geom and things have changed, garbage collect it
        } else {
            // msgfixlog('bond geom', 'new geometry, new attributes');
            geom = new THREE.BufferGeometry();  // case 3: create new geometry and set up buffers
        }
        geom.setIndex(new THREE.BufferAttribute(targ.indices, 1));
        geom.setAttribute('position', new THREE.BufferAttribute(targ.positions, 3));
        geom.setAttribute('normal', new THREE.BufferAttribute(targ.normals, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(targ.colors, 3));
        geom.objectId = targ.ids;
    }
    return geom;
}

/****  comment, sjpt 14 April 2019
Summary: to avoid problems, do geometry.dispose() when a geometry is no longer needed
before letting a geometry become unreferenced.
It will eventually be disposed during garbage collection, but that may well be too late.

I have not found a way to dispose the attributes separately.
If you dispose the geometry that seems to do the trick.
You can even continue to use the disposed geometry, though this seems logically dangerous.
Creating a new BufferGeometry object and assigning it to the mesh is very cheap anyway.
***/

// recursive call to clean geometries
CSynth.cleanGeometry = function(obj) {
    if (!obj || !obj.traverse) return;
    obj.traverse( x => {
        if(x.geometry && x.geometry.dispose)
        x.geometry.dispose();
    });
}

// compute bounding spheres for residues and chains
GLmolX.prototype.makeResSpheres = function CSynth_makeResSpheres() {
    if (this.resSpheresDone) return;

    // bounding spheres for residues
    const as = this.atoms;
    const min = Math.min, max = Math.max;
    for (let rn in this.residue) {
        const r = this.residue[rn];
        let minx, miny, minz, maxx, maxy, maxz;
        minx = miny = minz = Number.POSITIVE_INFINITY; maxx = maxy = maxz = Number.NEGATIVE_INFINITY;
        const atrad = 1.5;  // nominal atom radius
        for (let i = r.startResi; i <= r.endResi; i++) {
            const a = as[i];
            minx = min(minx, a.x); maxx = max(maxx, a.x);
            miny = min(miny, a.y); maxy = max(maxy, a.y);
            minz = min(minz, a.z); maxz = max(maxz, a.z);
        }
        r.min = VEC3(minx - atrad, miny - atrad, minz - atrad);
        r.max = VEC3(maxx + atrad, maxy + atrad, maxz + atrad);
        r.centre = VEC3((minx+maxx)*0.5, (miny+maxy)*0.5, (minz+maxz)*0.5);
        r.radius = r.min.distanceTo(r.max) / 2;
    }

    // bounding spheres for chains
    for (let i = 0; i < this.chains.length; i++) {
        const chain = this.chains[i];
        const rs = chain.residues;
        let minx, miny, minz, maxx, maxy, maxz;
        minx = miny = minz = Number.POSITIVE_INFINITY; maxx = maxy = maxz = Number.NEGATIVE_INFINITY;
        rs.forEach(r => {
            minx = min(minx, r.min.x); maxx = max(maxx, r.max.x);
            miny = min(miny, r.min.y); maxy = max(maxy, r.max.y);
            minz = min(minz, r.min.z); maxz = max(maxz, r.max.z);
        })
        chain.min = VEC3(minx, miny, minz);
        chain.max = VEC3(maxx, maxy, maxz);
        chain.centre = VEC3((minx+maxx)*0.5, (miny+maxy)*0.5, (minz+maxz)*0.5);
        chain.radius = chain.min.distanceTo(chain.max) / 2;
    }
    this.resSpheresDone = true;
}

// check for ray hitting sphere,
// help from https://gamedev.stackexchange.com/questions/96459/fast-ray-sphere-collision-code
CSynth.rayHitSphere = function CSynth_rayHitSphere(org, dir, cen, rad) {
    const dx = (org.x - cen.x), dy = (org.y - cen.y), dz = (org.z - cen.z);
    const a = dir.x*dir.x + dir.y*dir.y + dir.z*dir.z;
    const b = 2 * (dir.x*dx + dir.y*dy + dir.z*dz);
    const c = dx*dx + dy*dy + dz*dz - rad*rad;
    const rr = b*b-4*a*c;
    if (rr < 0) return false;       // no hit at all
    const rrs = Math.sqrt(rr);
    if (-b + rrs < 0) return false; // even the big one negative
    // This code is used for higher level course filtering as well as low level detail.
    // and also the t value is compared to low level hits from previous glmols.
    // So, for the high level being inside is potentially (at this level) better than anything we have seen before
    // so we return a 0 value.
    if (-b - rrs < 0) return 0;     // small -ve, big +ve, inside, so immediate hit
    return (-b - rrs) / (2*a);
}

// cast into the residue with the given raycaster,
// if resoonly is false go to per atom level
// optional input atom is best so far
GLmolX.prototype.cast = function CSynth_castGlmol(raycaster, atom = {hitdist: Number.POSITIVE_INFINITY}) {
    this.makeResSpheres();
    const st = performance.now();

    const c = raycaster.ray.origin;
    const dir = raycaster.ray.direction;

    const atradius = window.atradius || 1.5;
    const rhs = CSynth.rayHitSphere;
    let bestat = atom;
    let bestt = atom.hitdist;

    for (let ch = 0; ch < this.chains.length; ch++) {
        const chain = this.chains[ch];
        const chaint = rhs(c, dir, chain.centre, chain.radius);
        if (chaint === false || chaint > bestt) continue;
        for (const rn in chain.residues) {
            const res = chain.residues[rn];
            const rest = rhs(c, dir, res.centre, res.radius);
            if (rest === false || rest > bestt) continue;
            for (let i = res.startResi; i <= res.endResi; i++) {
                const at = this.atoms[i];
                const t = rhs(c, dir, at, atradius)
                if (t === false || t > bestt) continue;
                bestat = at;
                bestt = t;
                at.hitdist = t;
            }   // atoms i
        }   // residues rn
    }  // chains ch


    // CSynth.highlightHits(bestat);
    // CSynth.hits = bestat;

    const et = performance.now();
    msgfix('pick time', (et-st).toFixed());

    return bestat;
}

CSynth.highlightHits = async function CSynth_highlightHits(atom) {

    // we modify an existing glmolp to represent the pick
    if (!CSynth.glmol.pick) {
        await CSynth.loadExtraPDB('pick', undefined, undefined, '// test no data');
        CSynth.glmol.pick.allgroup.visible = true;
        CSynth.glmol.pick.bondGroup.visible = true;
        GX.setValue('pick/smooth/res', 32);
        GX.setValue('pick/bonds/rad', 0.4);
        GX.setValue('pick/bonds/colorBy', 'atom');
    }
    const glmolp = CSynth.glmol.pick;
    const atoms = glmolp.atoms = [];
    const atomlist = glmolp.atomlist = [];
    let msg;
    if (atom.hitdist !== Number.POSITIVE_INFINITY) {
        const glmol = atom.glmol;
        const gatoms = glmol.atoms;
        const res = atom.residue;
        for (let i = res.startResi; i <= res.endResi; i++) {
            const serial = i - res.startResi;
            atomlist.push(serial);
            const nat = Object.assign({}, gatoms[i]);
            nat.glmol = glmolp;
            nat.serial = serial;
            atoms.push(nat);
        }
        msg = `${atom.glmol.id}
res=${atom.resn} ${atom.residue.k} at=${atom.atom} ch=${atom.chain}`;
        msgfix('!HIT', msg, atom.fileserial, atom.serial, '<br> gr=', atom.chaingroup, atom.x, atom.y, atom.z);
        glmolp.col = 'notsetyet';
    }

    if (glmolp.bondGroup.visible) {
        glmolp.redrawbond();
    }
    if (glmolp.smoothMesh.visible) glmolp.redrawSmooth();

    /// now text feedback
    // for now, position at residue centre, orient to camera, fixed 'real' scale
    // to consider, should scale be more arranged to size on screen.  Maybe different VR/nonVR?
    CSynth.cleanGeometry(CSynth.highlightHitsText);
    V.camscene.remove(CSynth.highlightHitsText);
    if (msg) {
        const textg = CSynth.highlightHitsText = dat.GUIVR.textCreator.create(msg + '\n');  // extra \n helps position
        V.camscene.add(textg);
        textg.position.copy(atom.residue.centre).applyMatrix4(CSynth.rawgroup.matrix).applyMatrix4(V.rawscene.matrix);
        textg.position.z += CSynth.highlightHitsForward * G.scaleFactor;
        // msgfix('pos', textg.position)
        const k = CSynth.highlightHitsScale * G.scaleFactor;
        textg.scale.set(k,k,k);
    } else {
        CSynth.highlightHitsText = undefined;
    }
}
CSynth.highlightHitsForward = 10;
CSynth.highlightHitsScale = 50;
// CSynth.highlightHitsTemp = {m4: new THREE.Matrix4(), v3p: new THREE.Vector3(), v3sc: new THREE.Vector3(), q: new THREE.Quaternion() };

CSynth.getrawray = function() {
    let ray = CSynth.getray();  // get the ray

    // and convert by rawgroup inverse transform
    const m = new THREE.Matrix4();
    m.copy(CSynth.rawgroup.matrixWorld).invert();
    ray.ray.origin.applyMatrix4(m);
    const mn = new THREE.Matrix3().getNormalMatrix(m);
    ray.ray.direction.applyMatrix3(mn).normalize();
    return ray;
}

/** cast a ray into all visible fixed glmol objects */
CSynth.castExtra = function() {
    // TODO, better lauch of casting so test below not necessary (see launch below at '!RAYA')
    // needed for Edge, but could be needed for any browser
    if (!V.gui) return {hitdist: 'casting will start when gui ready ...'}; // in case casting starts too early

    let hit = {hitdist: Number.POSITIVE_INFINITY};
    if (!window.canvas) return hit;
    let ray = CSynth.getrawray();  // get the ray

    for (const fid in CSynth.glmol) {
        const glmol = CSynth.glmol[fid];
        if (glmol.id !== 'pick' && glmol.allgroup.visible)
            hit = glmol.cast(ray, hit);
    }
    CSynth.highlightHits(hit);
    return CSynth.hits = hit;
}
onframe(() => msgfix('!RAYA', () => CSynth.castExtra().hitdist), 50);


// // debug convenience while getting pick going
// onframe(() => {
//     if (CSynth.glmol["All_capsid_proteins.pdb"]) {
//         window.gg = CSynth.glmol["All_capsid_proteins.pdb"];
//         msgfix('!RAYA', () => CSynth.glmol["All_capsid_proteins.pdb"].cast(CSynth.getray()).hitdist);
//     }
// }, 50);



CSynth.drawCyl.x01 = VEC3(1,0,0);
CSynth.drawCyl.x02 = VEC3(0,1,0);
CSynth.drawCyl.x1 = VEC3();
CSynth.drawCyl.dir = VEC3();
CSynth.drawCyl.c = VEC3();

CSynth.sphereCol = function(i) {
    return col3().setHSV(i/10, 1, 0.9);
}

CSynth.polySpheres = {};
CSynth.spheres = async function(fid, pgroup = CSynth.rawgroup, col = col3()) {
    if (fid.contains('*')) {
        const group = CSynth.polySpheres[fid] = CSynth.spheresGroup = newgroupN('spheres_' + fid);
        let i = 1;
        while (true) {
            let color = CSynth.sphereCol(i);
            const ffid = fid.replace('*', i)
            let r = await CSynth.spheres(ffid, group, color);
            if (!r) break;
            i++;
        }
        pgroup.add(group);
        CSynth.polySpheres[fid] = group;
        return i-1;
    }
    let xyzd;
    const fffid = CSynth.current.fullDir + fid;
    if (!fileExists(fffid)) return;
    await posturimsg(fffid).then(r => xyzd = r, e => {})
    if (xyzd === undefined) return false;
    const xyzv = xyzReader(xyzd, fid, true, true);  // n.b. true for parse only, true for all points
    const c = xyzv.coords;

    const targ = CSynth.startGeom(2000);    // get a targ, reuse if appropriate
    CSynth.extendGeom.indn = 0; CSynth.extendGeom.posn = 0;
    //let cen = VEC3();
    const rad = 3;
    const kcyl = 16, kend = 8;

    for (let i = 0; i < c.length; i++) {
        const cp = c[i];
        CSynth.drawCyl(targ, cp, cp, i, i, rad, kcyl, kend);
        //cen.add(cp);
        // n++;
    }
    const geom = CSynth.finishGeom(targ);
    const mat = CSynth.defaultMaterial.clone();
    mat.color.set(col);
    // mat.emissive = col; //TODO: optional
    const k = 0.2;
    mat.emissive.setRGB(col.r*k, col.g*k, col.b*k); //TODO: optional
    const mesh = new newmeshN(geom, mat, 'spheresMesh_' + fid);
    mesh.sphereCoords = c;
    pgroup.add(mesh);
    CSynth.polySpheres[fid] = mesh;
    //log('spheres centre', cen)

    return true;
}

function newgroupN(name, glmol) {
    var g = new THREE.Group();
    g.name = name || 'unnamed';
    g.matrixAutoUpdate = false;
    if (glmol) g.glmol = glmol;
    return g;
}

function newmeshN(geom, mat, name, glmol) {
    var g = new THREE.Mesh(geom, mat);
    g.name = name || 'unnamed';
    g.matrixAutoUpdate = false;
    g.castShadow = g.receiveShadow = searchValues.useshadows;
    if (glmol) g.glmol = glmol;
    return g;
}

// catenate typed arrays, assume all have same type
CSynth.catenateArrays = function(arrays) {
    const totlen = arrays.reduce( (n, a) => n += a.length, 0)
    const arr = new (arrays[0].constructor)(totlen);
    let off = 0;
    for (let i=0; i<arrays.length; i++) {
        arr.set(arrays[i], off);
        off += arrays[i].length;
    }
    return arr;
}

// catenate attributes, assume all have same type
CSynth.catenateAttributes = function(attributes) {
    const arrays = attributes.map(a => a.array);
    const arr = CSynth.catenateArrays(arrays);
    const atts = new THREE.BufferAttribute(arr, attributes[0].itemSize);
    atts.needsUpdate = true;
    return atts;
}

// catenate buffer geometries, assume same attributes
CSynth.catenateBufferGeometries = function(geometries) {
    if (!geometries[0]) return;
    const geom = new THREE.BufferGeometry();
    let sattname;   // sample attribute name
    // catenate all the attributes
    for (let attname in geometries[0].attributes) {
        const atts = CSynth.catenateAttributes(geometries.map(g => g.attributes[attname]))
        geom.setAttribute(attname, atts);
        sattname = attname;
    }

    // catenate ids if any
    if (geometries[0].objectId)
        geom.objectId = CSynth.catenateArrays(geometries.map(g => g.objectId));

    // catenate the indices and update
    const inds = CSynth.catenateArrays(geometries.map(g => g.index.array));
    let ioff = 0;   // index into the index buffer
    let poff = 0;   // index into the attributes
    for (let i = 0; i < geometries.length; i++) {
        const inum = geometries[i].index.count;
        const nioff = ioff + inum;
        for (let j = ioff; j < nioff; j++)
            inds[j] += poff;
        ioff = nioff;
        poff += geometries[i].attributes[sattname].count;
    }
    geom.setIndex(new THREE.BufferAttribute(inds, 1));
    geom.index.needsUpdate = true;
    if (geom.attributes.color)
        geom.attributes.color.normalized = geometries[0].attributes.color.normalized

    // todo, copy objectId if present
    // todo, allow for matrices if non-identity
    return geom;
}

// trim a pdb file to remove all atoms excpet CA
CSynth.trimPdb = async function(fid) {
    const r = await posturimsg(fid);
    const res = [];
    const ll = r.split('\n');
    for (let i = 0; i < ll.length; i++) {
        const l = ll[i].trim();
        if (l.startsWith('ATOM ') && l.substr(12,4).trim() !== 'CA') {

        } else {
            res.push(l)
        }
    }
    const ress = res.join('\n');
    const fida = fid.split('.');
    const fidext = fida.pop();
    const nfid = fida.join('.') + '_short.' + fidext;
    remotesave(fid, ress);
}

/** work out centres of chains and residues */
CSynth.posStats = function(id) {
    const glmol = CSynth.xxxGlmol(id);

    if (glmol.chains[0].rpo) return;    // already done
    for (let rn in glmol.residue) { const r = glmol.residue[rn]; r.atnum = 0; r.spos=VEC3(); }
    glmol.chains.forEach(r => {r.atnum = 0; r.spos=VEC3()});
    glmol.spos = VEC3();
    glmol.atnum = glmol.atoms.length;
    glmol.atoms.forEach(a => {
        a.residue.atnum++;
        a.residue.spos.add(a);
        const ch = glmol.chains[a.chainid]
        ch.atnum++;
        ch.spos.add(a);
        glmol.spos.add(a);
    });
    for (let rn in glmol.residue) {
        const r = glmol.residue[rn];
        r.pos = r.spos.clone().multiplyScalar(1/r.atnum);
    }
    glmol.chains.forEach(r => r.pos = r.spos.clone().multiplyScalar(1/r.atnum));
    glmol.pos = glmol.spos.multiplyScalar(1/glmol.atnum);
}

/** prepare a mesh (or group) for morphing */
CSynth.chainMorph = function(mesh) {
    if (!mesh.visible) return;
    const glmol = mesh.glmol;
    const geom = mesh.geometry;
    if (geom && glmol) {
        log('mesh to convert', mesh.name);
        CSynth.posStats(glmol);
        const ia = geom.attributes.position.array;
        const rp = geom.attributes.position.clone();
        const rps = geom.morphAttributes.position = [rp, rp.clone(), rp.clone()];
        const as = rps.map(r => r.array);
        const ids = geom.objectId;
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const atom = glmol.atoms[id];
            // this gives targets of centre of residue, centre of chain, and centre of chaingroup
            const xposs = [atom.residue.pos, glmol.chains[atom.chainid].pos, glmol.pos];
            xposs[-1] = atom;
            for (let q = 0; q < xposs.length; q++) {
                const a = as[q];
                let ii = i*3;
                const xpos = xposs[q];      // target position
                const tpos = xposs[q-1];    // relative to next down in heirachy
                // tpos-xpos means that +ve influences expand in that dimension, -1 collapes
                // That is more 'natural' in use than the more obvious xpos-tpos.
                a[ii] = tpos.x + ia[ii] - xpos.x; ii++;
                a[ii] = tpos.y + ia[ii] - xpos.y; ii++;
                a[ii] = tpos.z + ia[ii] - xpos.z; ii++;
            }
        }
        rps.forEach(r => r.needsUpdate = true);

        mesh.material.morphTargets = true;
        mesh.material.needsUpdate = true;
        mesh.updateMorphTargets();
    }
    mesh.children.forEach(c => CSynth.chainMorph(c));
}

/** clear complete group of morphTargets */
CSynth.chainMorphSet = function(mesh, v) {
    // delete mesh.morphTargetInfluences;
    if (mesh.isMesh) {
        mesh.material.morphTargets = v;
        mesh.material.needsUpdate = true;
        if (!mesh.morphTargetInfluences) mesh.morphTargetInfluences = [0,0,0]; // added for three.js change (?150 or ?webgl2)
    }
    mesh.children.forEach(c => CSynth.chainMorphSet(c, v));
}


CSynth.setInfluences = function(inf = [0,0,0], id = ima.showing) {
    const glmol = CSynth.xxxGlmol(id);
    glmol.allgroup.traverse(g => {
        if (g.morphTargetInfluences)
            g.morphTargetInfluences.set(inf);
    });
}

CSynth.fade = async function(group, target, time = 1000) {
    group.traverse(g => {
        g.visible = true;
        if (g.material) {
            g.material.transparent = true;
            S.rampP(g.material, 'opacity', target, time, {fun: (_pt, _v, lv) => lv*lv, scurve: true} );
        }
        if ('renderOrder' in g)
            S.rampP(g, 'renderOrder', 2-target, time);
    });

    await sleep(time);
    if (target === 0)
        group.traverse(g => {
            g.visible = false;
            if (g.material) {
                g.material.transparent = false;  // return to 'normal' state in case we make visible some other way
                g.material.opacity = 1;
            }
        });
    if (target === 1)
        group.traverse(g => { if (g.material) g.material.transparent = false; });
}

CSynth.interactTime = 2000;
/** give a message and wait for interaction
 * if the interaction is from menu (via Maestro) return true to allow interrupt of caller
 */
CSynth.interactMessage1 = async function(x, t) {
    let interrupt;
    if (CSynth.interrupt.framenum > CSynth.interrupt.startFrame) return CSynth.interrupt;  // eg interrup during running part

    // CSynth.msgtagadd('\nclick here or pinch or right trigger to continue,\nselect (new) virus to interrupt');
    const rr = CSynth.temprr = Promise.race( [
        S.interact('click infobox', W.infobox, 'click'),
        // S.maestro('Maestro', 'leappinch'),  // happened too easily
        // S.maestro('Maestro', 'leaptextclick'),  // not reliable
        S.maestro('Maestro', 'gp_righttrigger'),
        // S.maestro('Maestro', 'constructionClick'),
        sleep(t),
        S.maestro('Maestro', 'selectvirus')
    ])
    const res = (await rr) || ['sleep'];
    CSynth.msgtag(x);
    log('interrupt by', res);
    interrupt = res[2] === 'selectvirus';
    // if (interrupt) CSynth.msgtag('interrupted');
    return interrupt;
}

// 2 stage to allow user to read text (stage 1) and see chnange (stage 2)
CSynth.interactMessage = async function(x, t = CSynth.interactTime) {
    let rr = await CSynth.interactMessage1(x, t);
    if (rr) return rr;

    rr = await CSynth.interactMessage1(x);
    if (rr) return rr;
}

CSynth.interrupt  = function(reason) {
    CSynth.interrupt.reason = reason;
    CSynth.interrupt.framenum = framenum;
    if (!reason) CSynth.interrupt.startFrame = framenum;
}


// var glmol, mesh, mi, opts;  // to help with debug/experiment
/** script for testing animation of morphing etc */
CSynth.construction1 = async function CSynth_construction1({sweep = true, prepareonly = false} = {}) {
    // Maestro.trigger('constructionClick');  // constructionClick not used

    CSynth.interrupt('construction1');              // signal anyone interseted
    if (CSynth.running === 'construction1') return; // kill myself, this will go through finally

    if (searchValues.leap) CLeap.buttons.construct.selected(true);     // early so user knows button registered

    while(CSynth.running) await sleep(100);

    // everyone else out of the way, get to do real start
    await ima.show('SV40');
    ima.selection = 'capsid'; ima.showg();
    const id = ima.showing;
    let glmol = CSynth.xxxGlmol(id);
    CSynth.saveShow(glmol);
    CSynth.interrupt(false);
    CSynth.running = 'construction1';

    const forcetile = () => {
        if (ima.selection === 'tiling') {ima.selection = 'capsid'; ima.showg();}
    }
    Maestro.on('preframe', forcetile);

    try {
        await CSynth._construction1({id, sweep, prepareonly});
    } finally {
        CSynth.restoreShow(glmol);
        CSynth.chainMorphSet(glmol.allgroup, false);
        if (searchValues.leap) CLeap.buttons.construct.selected(false);
        CSynth.running = undefined;
        Maestro.remove('preframe', forcetile);
    }
}
CSynth._construction1 = async function _CSynth_construction1({id, sweep, prepareonly}) {
    const mm = CSynth.interactMessage;
    let glmol = CSynth.xxxGlmol(id)
    if (!glmol.pos) CSynth.posStats(glmol);
    let opts = {scurve: true};

    // CSynth

    glmol.tilemesh.visible = false;
    glmol.allgroup.traverse(g => g.visible = false);
    glmol.allgroup.options.visible = true;
    if (!glmol.intraGroup) {    // prepare the morph targets etc
        glmol.atomGroup.options.visible = true
        const shortname = glmol.id;
        CSynth.loadExtraPDBBond(shortname, glmol.gui, glmol.allgroup, 'intra');
        CSynth.loadExtraPDBBond(shortname, glmol.gui, glmol.allgroup, 'inter');
        glmol.interGroup.options.rad = 0.5;
        // glmol.bondGroup.options.visible = true
        glmol.intraGroup.options.visible = true
        glmol.interGroup.options.visible = true
        glmol.cartoonGroup.options.visible = true
        CSynth.chainMorph(glmol.allgroup);  // this is undone in finally
        log('chainMorph done');
    }
    if (prepareonly) {
        await sleep(200);   // make sure the materials are compiled
        return;
    }

    CSynth.chainMorphSet(glmol.allgroup, true);

    const ppp = glmol.pos.clone().normalize().applyMatrix4(glmol.allgroup.matrix); // .multiplyScalar(-1);
    CSynth.rotTo(ppp, 0.1, false);
    S.rampP(CSynth, 'camdist', 1.25, 1000);


    glmol.intraGroup.options.colorByTime = 0;
    glmol.atomGroup.options.colorBy = 'atom';
    glmol.intraGroup.options.colorBy = 'residue';
    const colby = CSynth.current.extraPDB[id].colorBy || 'chain';
    glmol.interGroup.options.colorBy = colby;
    glmol.cartoonGroup.options.colorBy = colby;

// glmol.atomGroup.options.visible = true;
    await CSynth.fade(glmol.atomGroup, 1, 0);   // fade with time 0 also makes sure transparency etc correct
    await CSynth.fade(glmol.intraGroup, 0, 0);
    await CSynth.fade(glmol.interGroup, 0, 0);
    await CSynth.fade(glmol.cartoonGroup, 0, 0);
    glmol.intraGroup.options.visible = false;
    glmol.interGroup.options.visible = false;
    glmol.cartoonGroup.options.visible = false;

    let mesh = glmol.atomGroup.children[0];
    let mi = mesh.morphTargetInfluences;
    glmol.allgroup.traverse(m => { if (m.morphTargetInfluences) m.morphTargetInfluences = mi; });

    CSynth.setInfluences([3, 1, 1]);

    // this is the point the atoms are ready to display
    CSynth.msgtag('atoms');
    // if (await mm('atoms')) return;
    if (await mm('residues')) return;

    await S.rampP(mi, '0', 0, 2000, opts);          // bring the atoms into residues
    await CSynth.fade(glmol.intraGroup, 1, 2000);   // fade in the residue bonds
    await CSynth.fade(glmol.atomGroup, 0, 1000);    // fade out the atoms
    //await sleep(1000)
    //await S.interact('atoms collected into residues\nnow collect residues into chains');

    if (await mm('chains1')) return;
    glmol.intraGroup.options.colorByTime = 2000;
    log('about to await setColorBy')
    await glmol.intraGroup.options.setColorBy(colby);
    log('setColorBy done')

    if (await mm('chains2')) return
    // await S.interact('atoms collected into residues\nnow collect residues into chains');
    S.rampP(mi, '1', 0, 2000, opts);          // bring the residues into folded chains
    await S.rampP(mi, '2', 0.5, 2000, opts);    // but don't separate the chains too much
    await sleep(1000)

    CSynth.fade(glmol.interGroup, 1, 1000);         // and fade in the intergroup chains
    //await S.interact('residues collected into chains\nnow see the structure of the chains');
    // await sleep(2000)

    S.rampP(mi, '0', -1, 2000, opts);
    await CSynth.fade(glmol.intraGroup, 0, 2000);
    // await sleep(2000)

    // await keystroke();
    /*
        S.speedup = 1;
        console.clear();
        CSynth.setInfluences([-1, 0, 1]);  // debug ?? should base the residue on CA and not on centroid?
        CSynth.fade(glmol.interGroup, 1, 0);
        CSynth.fade(glmol.cartoonGroup, 0, 0);
        setTimeout( ()=> {
            console.clear();
            kk = 1200; ddd = 1;
            CSynth.fade(glmol.interGroup, 1-ddd, kk);
            CSynth.fade(glmol.cartoonGroup, ddd, kk);
            S.process();
        }, 100);

    */
    if (await mm('secstruct')) return
    S.rampP(mi, '0', 0, 2000, opts);
    glmol.cartoonGroup.options.colorByTime = 2000;
    glmol.cartoonGroup.options.setColorBy('structure');  // colour will overlap with coming together
    CSynth.fade(glmol.interGroup, 0, 2000);
    CSynth.fade(glmol.cartoonGroup, 1, 2000);
    // await sleep(3000)

    if (await mm('chaingroup')) return
    await glmol.cartoonGroup.options.setColorBy('chain');
    await S.rampP(mi, '2', 0, 2000, opts);


    if (await mm('ggdone', 2*CSynth.interactTime)) return
    if (await mm('constrend')) return
    log('>>>> testInfluences complete');

    if (sweep) await CSynth.testsweep();  // await so restore happens
}

/** restore state for glmol after broken by insteraction */
CSynth.saveShow = function(pglmol) {
    const glmol = CSynth.xxxGlmol(pglmol);
    if (CSynth.running || !pglmol.symgroup.visible)
        console.error('csynth saveshow error'); // debugger;
    glmol.allgroup.traverse(g => g.savevisible = g.visible)
}

/** restore state for glmol after broken by insteraction */
CSynth.restoreShow = function(pglmol) {
    const glmol = CSynth.xxxGlmol(pglmol);
    if (glmol.allgroup.savevisible) {
        // glmol.allgroup.traverse(g => {g.visible = g.savevisible || false;})
    } else {
        console.error('attempt to restoreShow with no saveShow');
    }
    // make just the full symmetry visible
    // there code above should be more correct,
    // but there were sometimes (?) saveShow() calls at incorrect times
    glmol.allgroup.traverse(g => g.visible = false);
    glmol.symgroup.traverseAncestors(g => g.visible = true);
    glmol.symgroup.traverse(g => g.visible = true);

}

/**
glmol = CSynth.xxxGlmol(ima.showing)
glmol.allgroup.traverse(g => g.visible = false)
glmol.allgroup.options.visible = true
glmol.atomGroup.options.visible = true
CSynth.chainMorph(glmol.allgroup)
mesh = glmol.atomGroup.children[0]
mi = mesh.morphTargetInfluences
glmol.allgroup.traverse(g => if (g.morphTargetInfluences)
CSynth.setInfluences([3, 2, 1]);
S.ramp(mi, '0', 10, 2000)
setTimeout(() => S.ramp(mi, '0', 0, 2000), 2000)
 */

var XX;
// function to ensure single frame of sweep happens
// CSynth.fsweep = function() {CSynth.applyBiomt(ima.showing, 0, CSynth.makeSymMatrix(sweep).sym60)};
//[5, 2, 3, -2]
XX.options = {
    axisOrder: [-2, 3, 2, 5] // 5, 2, 3, -2], // [5, 2, 3, -2]

}
CSynth.fsweep = function(sweepOptions, cols=false, symgroup=CSynth.xxxGlmol().symgroup) {
    if (ima.selection === 'tiling') {ima.selection = 'both'; ima.showg();}
    if (ima.currentShortname !== 'SV40') log('cannot fsweep for ', ima.currentShortname, 'apply to SV40');
    symgroup = CSynth.xxxGlmol('SV40').symgroup;    // restore SV40 whatever is 'current'
    if (sweepOptions === 0) sweepOptions = {m5: 0, m3: 0, m2:0, m2x: 0};
    if (sweepOptions === undefined) sweepOptions = {m5: 1, m3: 1, m2:1, m2x: 1};

    const ch = symgroup.children;
    // below a little expensive and cloned the meshes, and broke the saved colours
    //CSynth.applyBiomt(ima.showing, 0, XX.genSymmetry(XX.options))
    //if (cols)
    //    ch.forEach((c, i) => c.material.color.copy(XX.symCol[i]));

    // below assumes just meshes, and no 'extra' matrices to apply
    const mats = XX.genSymmetry({sweep: sweepOptions});
    ch.forEach((c, i) => {
        c.matrix.elements.set(mats[i].elements)
        if (cols) c.material.color.copy(XX.symCol[i]);
    });
};

/** show a sweep to illustrate the 60 symmetry positions */
CSynth.testsweep = async function(t = 2000, id = ima.showing, cols = false) {
    try {
        ima.show('SV40');
        ima.selection = 'both'; ima.showg();
        log('CSynth.testsweep starting');
        const mm = CSynth.interactMessage;
        let opts = {scurve: true};
        let glmol = CSynth.xxxGlmol(id);
        CSynth.current.extraPDB[id].tilemesh.visible = false;
        glmol.cartoonGroup.options.visible = false;
        glmol.symgroup.traverse(c=>c.visible = true)
        //if (!renderVR.invr())
        //    CSynth.cameraToDist(4000, undefined, 2000);

        const sweepOptions = XX.options.sweep = {m5: 0, m3: 0, m2:0, m2x: 0};
        const sweepfun = CSynth.testsweep.sweepfun = () => CSynth.fsweep(sweepOptions, cols, glmol.symgroup);
        Maestro.onUnique('preframe', sweepfun );
        glmol.symgroup.visible = true;

        if (cols)
            glmol.symgroup.children.forEach(x => x.material = x.material.clone());

        await CSynth.rotTo(Plane.axis5.clone().multiplyScalar(-1), 0.03, false)
        // 5 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        CSynth.msgtag('single');
        if (await mm('pre5')) return;
        if (await S.rampP(sweepOptions, 'm5', 1.01/5, t, opts)) {}
        if (await S.rampP(sweepOptions, 'm5', 2.01/5, t, opts)) {}
        if (await S.rampP(sweepOptions, 'm5', 3.01/5, t, opts)) {}
        if (await S.rampP(sweepOptions, 'm5', 4.01/5, t, opts)) {}
        //await sleep(t);

        // 2 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        //await CSynth.rotTo(Plane.axis2x, 0.03, false)
        //await CSynth.rotTo(Plane.axis2, 0.03, false)
        if (await mm('pre2')) return;
        if (await S.rampP(sweepOptions, 'm2', 1.01/2, t, opts)) {}
        //await sleep(t);

        // 3 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        //await CSynth.rotTo(Plane.axis2, 0.03, false)
        // await CSynth.rotTo(Plane.axis3, 0.03, false)
        if (await mm('pre3')) return;
        if (await S.rampP(sweepOptions, 'm3', 1.01/3, t, opts)) {}
        if (await S.rampP(sweepOptions, 'm3', 2.01/3, t, opts)) {}
        //await sleep(t);

        // 2x ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        //await CSynth.rotTo(Plane.axis5, 0.03, false)
        // await CSynth.rotTo(Plane.axis2x, 0.03, false)
        //await CSynth.rotTo(VEC3(-0.809, 0.5, 0.309), 0.03, false)
        if (await mm('pre2x')) return;
        if (await S.rampP(sweepOptions, 'm2x', 1.01/2, t, opts)) {}

        if (await mm('symend')) return;
        if (await mm('constrend')) return;

        CSynth.msgfix();
    } finally {
        Maestro.remove('preframe', CSynth.testsweep.sweepfun);
        log('CSynth.testsweep ending');
        CSynth.fsweep();
    }
}
if (ima && ima.demo) CSynth.testsweep()

// // if reusing, add try/finally
// CSynth.testsweepMad = async function(t = 2000, id = ima.showing, cols = false) {
//     ima.show('SV40');
//     let glmol = CSynth.xxxGlmol(id);
//     const sweepOptions = XX.options.sweep = {m5: 0, m3: 0, m2:0, m2x: 0};
//     const sweepfun = () => CSynth.fsweep(sweepOptions, cols, glmol.symgroup);
//     Maestro.onUnique('preframe', sweepfun);
//     let opts = {scurve: true};

//     // CSynth.rotTo(VEC3(0.748, -0.476, -0.462), 0.03, false);
//     S.rampP(sweepOptions, 'm2x', 0, t, opts);
//     S.rampP(sweepOptions, 'm2', 0, t, opts);
//     S.rampP(sweepOptions, 'm3', 0, t, opts);
//     await S.rampP(sweepOptions, 'm5', 0, t, opts);

//     await S.rampP(sweepOptions, 'm2x', 1.01/2, t, opts);
//     await S.rampP(sweepOptions, 'm3', 2.01/3, t, opts);
//     await S.rampP(sweepOptions, 'm2', 1.01/2, t, opts);
//     await S.rampP(sweepOptions, 'm5', 4.01/5, t, opts);
//     Maestro.remove('preframe', sweepfun);
// }

// this performs a single frame for interactive sweeping
CSynth.intersweep = function(s) {
    if (CSynth.running !== 'intersweep') return;
    if (CSynth.interrupt.framenum > CSynth.interrupt.startFrame)
        return CSynth.intersweep.stop('framenum interrupt found');
    var x = 0, y = 0, z = 0, use = 0;
    const r = v => Math.min(1, Math.max(0, v*2));  // move 1/2 metre for full range
    if (searchValues.leap && CLeap.lastFrame && CSynth.intersweep.mode !== 'mouse') {
        const hands = CLeap.lastFrame.hands;
        if (hands.length === 2) {
            const dist = distarr3(hands[0].palmPosition, hands[1].palmPosition);
            use = 3 * Math.min(Math.max(dist - 0.1, 0), 1);  // so 10cm -> 1.1 m maps to 0..1
        } else {
            return;     // just leave the last sweep
        }
    } else if(V.gpR) {
        const dir = VEC3().setFromMatrixColumn(V.gpR.raymatrix, 2).normalize();
        if (!CSynth.intersweep.gpRdir) CSynth.intersweep.gpRdir = dir;
        use = dir.angleTo(CSynth.intersweep.gpRdir);
    } else {
        x = lastdocx / document.body.clientWidth;
        y = 1 - lastdocy / document.body.clientHeight;
        use = x;
    }
    use *= 9;
    const  fuse = Math.floor(use);
    var f = use%1;
    var sw;
    switch(fuse) {
        case 0: sw = {m5: 0, m2: 0, m3: 0, m2x: 0}; break;
        case 1: sw = {m5: f * 4/5, m2: 0, m3: 0, m2x: 0}; break;

        case 2: sw = {m5: 1, m2: 0, m3: 0, m2x: 0}; break;
        case 3: sw = {m5: 1, m2: f * 1/2, m3: 0, m2x: 0}; break;

        case 4: sw = {m5: 1, m2: 1, m3: 0, m2x: 0}; break;
        case 5: sw = {m5: 1, m2: 1, m3: f * 2/3, m2x: 0}; break;

        case 6: sw = {m5: 1, m2: 1, m3: 1, m2x: 0}; break;
        case 7: sw = {m5: 1, m2: 1, m3: 1, m2x: f * 1/2}; break;

        case 8: sw = {m5: 1, m2: 1, m3: 1, m2x: 1}; break;
        // case 9: sw = {m5: 1, m2: 1, m3: 1, m2x: 1}; break;
    }
    CSynth.fsweep(sw);
    msgfix('sweep', sw);
    CSynth.msgtag('isweep' + fuse)
}

CSynth.isweeptime = 60000;
CSynth.intersweep.start = async function(mode) {
    if (searchValues.leap) CLeap.buttons.isweep.selected(true);  // early to confirm it has been pressed

    CSynth.interrupt('intersweep');         // signal interrupt to anyone else
    if (CSynth.running === 'intersweep')    // reclick stops myself
        return CSynth.intersweep.stop('double intersweep stop');

    while(CSynth.running) await sleep(100); // wait for anyone else

    // real start of intersweep, everything else out of the way
    CSynth.interrupt(false);
    CSynth.running = 'intersweep';

    CSynth.intersweep.mode = mode || renderVR.invr() ? 'leap' : 'mouse';
    CSynth.intersweep.mae = Maestro.onUnique('preframe', CSynth.intersweep);
    ima.selection = 'both';
    ima.showg('SV40');
    CSynth.msgtag('isweep');

    CSynth.fsweep(0);
    await CSynth.rotTo(Plane.axis5.clone().multiplyScalar(-1), 0.09, false)
    await sleep(CSynth.isweeptime);

    //await CSynth.interactMessage('isweep', CSynth.isweeptime); // continue for interrupt or continue signal
    //CSynth.intersweep.stop();
}
CSynth.intersweep.stop = function(reason) {
    log('intersweep stop', reason)
    Maestro.remove('preframe', CSynth.intersweep);
    CSynth.fsweep();
    CSynth.intersweep.mode = undefined;
    CSynth.intersweep.gpRdir = undefined;
    if (searchValues.leap)
        CLeap.buttons.isweep.selected(false);
    CSynth.running = undefined;
    CSynth.msgtag('endisweep');
}

