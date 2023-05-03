'use strict';
// code to use Leap motion in CSynth
// https://developer-archive.leapmotion.com/documentation/javascript/devguide/Leap_Guides2.html

var Leap, msgfix, everyframe, V, camera, THREE, CSynth, searchValues, VEC3, G, rotcentre, dat, framenum, PushButton,
InteractablePlane, format, Maestro, renderVR, XMLHttpRequest, appendtextremote;

var CLeap = {};  // namespace
CLeap.camera = new THREE.OrthographicCamera();  // this should be set in renderFrame with appropriate camera for VR/noVR
// not sure why we can't just use global 'camera', but maybe it is sampled at wrong point ???
// it seems to give juddering and other oddities if we do.
CLeap.startLeap = function() {
    CLeap.controller = Leap.loop({}, frame=>CLeap.onframe(frame));  // => indirection to allow dynamic change of onframe
    CLeap.controller.setBackground(true);  // may help during debug if focussed on devtools
    everyframe(() => {
        if (CLeap.controller.connected())
            msgfix('leapc', 'connection ok');
        else
            msgfix('leapc', 'NO connection<br>Is Leap connected?<br>Have you allowed web apps in the Leap control panel?');
    });
    Leap.loopController.setMaxListeners(40);
    Leap.loopController.use('transform', {
        vr: true,
        effectiveParent: CLeap.camera
    });
    //TODO: send a message to server, restart service with "net start LeapService" *as admin*.
    Leap.loopController.connection.addListener('disconnect', e => {
        console.log('Leap Disconnected... attempting to request service restart.');
        var oReq = new XMLHttpRequest();
        oReq.onload = r => console.log(oReq.response);
        oReq.open("POST", "/leap-disconnected/");
        oReq.send();
    });
    let node = CLeap.node = new THREE.Group();
    node.name = "leap";
    V.camscene.add(node);
    Leap.loopController.use('boneHand', {scene: node, arm: false, opacity: 0.2, handMeshCallback: CLeap.handMeshCallback});
    //THREE.JSONLoader = THREE.LegacyJSONLoader;
    //Leap.loopController.use('riggedHand');

    let pnode = CLeap.pnode = new THREE.Group(); pnode.name = 'leapPnode';
    V.camscene.add(pnode);
    // const m = new THREE.Mesh(new THREE.SphereGeometry(0.005)); pnode.add(m);

    CSynth.camnearmin = CSynth.camnearmax = 0.1;

    CLeap.widgetTest();
}

CLeap.handleDisconnect = () => console.log("Leap Disconnected!!! Try restarting service ('net start LeapMotion' as admin on Windows)");

CLeap.last = {};
CLeap.onframe = function CLeap_onframe(frame) {
    try {
        CLeap._onframe(frame)
    } catch (e) {
        console.error('exception in leap frame', e);
    }
}

CLeap.handMeshCallback = function(hand, handMesh) {

    const c = hand.confidence ** CLeap.confidencePower;
    const m = handMesh.fingerMeshes[1]; // index finger

    m[0].material.opacity = c;  // spheres 0,2,4 shared for all finger joints
    m[1].material.opacity = c;  // cyls for shared all finger bones
    m[2].material.opacity = c;  // tip (mesh#2) of index finger (finger #1) is special case

    // make index tip special material and colour it
    // g=0 important to see colour at all with slight opacity
    if (m[2].material === m[0].material) {
        m[2].material = m[2].material.clone();
        m[2].material.color.setRGB(0.4, 0, 1);
    }

    // m[1].material.color.setHSV(hand.type === "right" ? 0 : 0.5, 1, 1);

}

CLeap._onframe = function CLeap__onframe(frame) {
    if (V.gpR && CLeap.controller.connected()) CLeap.controller.disconnect();
    if (V.gpR) return;
    if (!CLeap.controller.connected()) CLeap.controller.connect();

    var m = ['hands' + frame.hands.length];
    const hands = frame.hands;
    const ff = v => format(v, 3);
    hands.forEach((h,i) => {
        m.push(`${i} ${h.type} grab ${ff(h.grabStrength)}, pinch ${ff(h.pinchStrength)}, confidence ${ff(h.confidence)}`);
        m.push(`pos ${ff(h.palmPosition)}`);
        h.extended = h.fingers.map(f => +f.extended).join('');
        m.push('extend ' + h.extended); // + '   ' + h.palmNormal);
    });
    msgfix('leap1', m.join('<br>'));
    // var ch = CLeap.node.children.filter(n => n.visible)[2];
    //if (ch)
    //    msgfix('leap mat', ch.matrixWorld.elements.map(v=>v.toFixed(3)).join(', '))
    //else
    //    msgfix('leap mat', 'NONE');
    //msgfix('lcam', ()=> CLeap.camera.matrixWorld)
    //msgfix('scaleFactor', ()=> frame.scaleFactor(CLeap.lastFrame))


    // under here, code for manipulation ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const h0 = hands[0], h1 = hands[1];
    const h0p = frame.h0p = h0 ? VEC3(h0.palmPosition) : undefined;
    const h1p = frame.h1p = h1 ? VEC3(h1.palmPosition) : undefined;
    const clenchn = (!!h0 && h0.grabStrength >= CLeap.clenchThresh) + (!!h1 && h1.grabStrength >= CLeap.clenchThresh);
    const pinchn = (!!h0 && h0.pinchStrength >= CLeap.pinchThresh) + (!!h1 && h1.pinchStrength >= CLeap.pinchThresh);

    CLeap.leapGUI.visible = !CLeap.useHead;
    const gn = CLeap.leapGUI.zv;  // move after gn computer
    if (CLeap.useExtend && h0 && h0.extended === '11111' && gn) {
        const toCam = VEC3().subVectors(CLeap.camera.position, h0p).normalize();
        // const pn = VEC3(h0.palmNormal);
        const dot = toCam.dot(gn);
        if (dot > 0.5) {
            CLeap.showMainPanel();
            CLeap.leapGUI.visible = false;
        } else if (dot < -0.5) {
            // CLeap.hideMainPanel();
            V.camscene.remove(CLeap.menuPanel);
        }
    }

    const {ld, ldir, lpos, lmenud, lclenchn, lpinchn} = CLeap.last;
    CLeap.lastd = undefined;

    let menud;
    if (h0p && CSynth.msgfix.threeobj) {
        menud = VEC3().setFromMatrixPosition(CSynth.msgfix.threeobj.matrixWorld).distanceTo(h0p);
        if (menud < CLeap.menuthresh && lmenud >= CLeap.menuthresh)
            Maestro.trigger('leaptextclick');
        m.push('dist', menud);
    }
    if (clenchn === 1 && lclenchn === 0) Maestro.trigger('leapclench');
    if (pinchn === 1 && lpinchn === 0) Maestro.trigger('leappinch');

    // movement when both hands are clenched
    let d, dir, pos;
    if (clenchn === 2) {
        // note the returned position is is 'real' space, pos is in camera space
        // so that moving the camera by _camx etc does not modify pos
        pos = frame.pos = VEC3().addVectors(h0p, h1p).multiplyScalar(0.5).sub(CLeap.camera.position);
        const xx = VEC3().subVectors(h0p, h1p);
        d = xx.length();
        dir = xx.multiplyScalar(1/d);
        if (ld) {                                            // scale
            const bs = 0.008333333333333333;    // base scale factor ... some time make more general equation
            let ns = G.scaleFactor * CLeap.scaleRate ** (d-ld);
            if (ns < bs/10) ns = bs/10;
            if (ns > bs*10) ns = bs*10;
            G.scaleFactor = ns;     // could do this on objsize
        }
        if (ldir) {                                         // rotate
            const r = VEC3().crossVectors(dir, ldir);
            rotcentre(r.x, r.y, r.z);
        }
        if (lpos) {                                         // pan
            // We actually move the camera and not the object.
            // This means that the centre of the object remains correct for rotation etc.
            // The use feels that he/she is moving the object.
            const dpos = VEC3().subVectors(pos, lpos);
            G._camx -= dpos.x * CLeap.moveScale;
            G._camy -= dpos.y * CLeap.moveScale;
            G._camz -= dpos.z * CLeap.moveScale;
        }

//    } else {
//        CLeap.last = {};
    }
    CLeap.last = {ld: d, ldir: dir, lpos: pos, lmenud: menud, lclenchn: clenchn, lpinchn: pinchn};

    if (hands.length === 1 && h0.pinchStrength > 0.7) {
        /**/
    }

    // experiments with showing text (and menu?) at hand
    if (CLeap.pnode && CLeap.diagnostic) {
        CLeap.pnode.visible  = !!h0p;
        if (h0p) {
            CLeap.pnode.position.copy(h0p);
            //if (V.modesgui) {
            //    CLeap.pnode.add(V.modesgui);
            //    V.modesgui.visible = true;
            //}
            const yv = VEC3(0,1,0);
            const zv = VEC3().subVectors(h0p, CLeap.camera.position).normalize();
            const xv = VEC3().crossVectors(zv, yv).normalize();
            yv.crossVectors(xv, zv);
            CLeap.pnode.matrixAutoUpdate = false;
            const mm = CLeap.pnode.matrix.elements;
            mm.set([
                xv.x, xv.y, xv.z, 0,
                yv.x, yv.y, yv.z, 0,
                zv.x, zv.y, zv.z, 0,
                h0p.x, h0p.y, h0p.z, 1
            ]);

            //CLeap.pnode.remove(CLeap.textg);
            if (!CLeap.textg) {
                const t = CLeap.textg = dat.GUIVR.textCreator.create(m.join('\n'));
                CLeap.pnode.add(t);
            } else {
                CLeap.textg.updateLabel(m.join('\n'));
            }
        }
    }

    CLeap.updateGui(hands);

    CLeap.lastFrame = frame;
}
CLeap.menuRotate = Math.PI / 4;
CLeap.scaleRate = 10;
CLeap.moveScale = 1;
CLeap.clenchThresh = 1;
CLeap.pinchThresh = 1;
CLeap.confidencePower = 8;
CLeap.confidenceThreshold = 0.5;
CLeap.menuthresh = 0.1;
CLeap.diagnostic = false;
CLeap.flatGui = true;
CLeap.useExtend = false;

CLeap.tiltThreshOn = 0.3;  // y down value to display menu
CLeap.tiltThreshOff = CLeap.tiltThreshOn / 2;  // y down value to clear menu
CLeap.menuDist = 0.4;   // menu distance form eye, I'd prefer further but Leap is more reliable closer

CLeap.vup = VEC3(0,1,0);
CLeap.useHead = true;       // use head down for menu
// todo allow for menuOff
/** show gui as we look down */
CLeap.updateGuiFromHead = () => {
    const menu = CLeap.menuPanel;
    if (!menu) return;
    if (!renderVR.invr()) { //  || V.resting) { needs correct canvas display etc for resting
        V.nocamscene.add(menu);
        menu.scale.set(3,3,3);
        menu.position.set(0,-0.5,0);
        menu.updateMatrix();
        CLeap.menuPanel.visible = true;
        return;
    }

    V.camscene.add(CLeap.menuPanel);
    const ce = camera.matrix.elements;
    const vis = ce[9] > CLeap.tiltThreshOn
    if (ce[9] > CLeap.tiltThreshOn && !menu.visible) {
        menu.matrixAutoUpdate = false;
        menu.activeGUI = true;
        menu.visible = true;

        if (!CLeap.menuPanel.parent) V.camscene.add(CLeap.menuPanel);

        const toEye = VEC3(ce[8], ce[9], ce[10]);
        const p = camera.position.clone().addScaledVector(toEye, -CLeap.menuDist);  // pos
        const right = VEC3().crossVectors(CLeap.vup, toEye).normalize();
        // we may want up somewhere between these two ?
        // also todo offset by menuOff (in x and y)
        // const up = VEC3().crossVectors(CLeap.vup, right).normalize();  // that's for flat
        const toz = toEye;    // or CLeap.vup or in between
        const up = VEC3().crossVectors(toz, right).normalize();  // that's for right angles to lookdir

        const [x,y,z] = [right, up, toz];

        const w = menu.userData.width;
        if (w) p.addScaledVector(x, -w * 0.4); //XXX::: fudged width

        menu.matrix.elements = [
            x.x, x.y, x.z, 0,
            y.x, y.y, y.z, 0,
            z.x, z.y, z.z, 0,
            p.x, p.y, p.z, 1
        ];
    }
    if (ce[9] < CLeap.tiltThreshOff && menu.visible) {
        menu.activeGUI = false;
        menu.matrix.elements[12] = 1e20;
        menu.visible = false;
    }
}

CLeap.updateGui = hands => {
    if (!CLeap.leapGUI) return;
    if (CLeap.useHead) return CLeap.updateGuiFromHead();
    const left = hands.find(h => h.type === "left");
    const right = hands.find(h => h.type === "right");

    let hand;  // >>> todo prevent jumping
    let lasthand = CLeap.updateGui.lastHandType === 'left' ? left : right;
    const handTest = h => h && h.extended === '11111' && h.confidence > CLeap.confidenceThreshold;
    if (handTest(lasthand))
        hand = lasthand;
    else if (handTest(left))
        hand = left;
    else if (handTest(right))
        hand = right;

    if (hand) { //<---- TODO: ambidextrous
        // CLeap.leapGUI.activeGUI = true;
        CLeap.updateGui.lastHandType = hand.type;
        const p = VEC3(hand.palmPosition);
        const n = VEC3(hand.palmNormal);
        let d = VEC3(hand.direction);
        let r = VEC3().crossVectors(n,d);

        // change orientation
        let nn = VEC3().subVectors(n,r).normalize();
        let rr = VEC3().addVectors(r,n).normalize();

        let [xv, yv, zv] = [nn, d, rr];
        const isRight = hand.type === 'right';
        if (isRight) { zv.multiplyScalar(-1); xv.multiplyScalar(-1); }  // <<<< pending
        Object.assign(CLeap.leapGUI, {xv, yv, zv});

        CLeap.leapGUI.matrixAutoUpdate = false;
        const mm = CLeap.leapGUI.matrix.elements;
        //const mp = p.addScaledVector(n, 0.1);
        const mp = p.addScaledVector(n, isRight ? -0.1 : 0.1);
        mp.addScaledVector(yv, -0.05);
        mm.set([
            xv.x, xv.y, xv.z, 0,
            yv.x, yv.y, yv.z, 0,
            zv.x, zv.y, zv.z, 0,
            mp.x, mp.y, mp.z, 1
        ]);
        if (isRight && false) {
            //const yRot = new THREE.Quaternion(0, 1, 0, 0);
            const yRot = new THREE.Matrix4().makeRotationY(Math.PI);
            const m = CLeap.leapGUI.matrix;
            m.multiplyMatrices(m, yRot);
            CLeap.leapGUI.matrix.setPosition(mp);
        }
    } else {
        // CLeap.leapGUI.activeGUI = false;
        // CLeap.leapGUI.position.x = 1e20;    // hide
        CLeap.leapGUI.matrix.elements[12] = 1e20;
        CLeap.updateGui.lastHandType = undefined;
    }
}

CLeap.showMainPanel = () => {
    const menu = CLeap.menuPanel;
    menu.matrixAutoUpdate = false;
    menu.activeGUI = true;
    if (!CLeap.menuPanel.parent) V.camscene.add(CLeap.menuPanel);
    // CLeap.leapGUI.updateMatrixWorld(true);
    // //not sure what's wrong here.
    // CLeap.menuPanel.matrix.set(...CLeap.leapGUI.matrixWorld.elements);
    menu.matrix.extractRotation(CLeap.leapGUI.matrix);
    menu.matrix.copyPosition(CLeap.leapGUI.matrix);
    const dh = -menu.bottom * CLeap.menuOffsetUp;
    const dz = CLeap.menuOffsetForward;
    const e = menu.matrix.elements;
    e[12] += dh*e[4] + dz*e[8];
    e[13] += dh*e[5] + dz*e[9];
    e[14] += dh*e[6] + dz*e[10];
}
CLeap.menuOffsetUp = 1/3;
CLeap.menuOffsetForward = 0.01;  // 1 cm


CLeap.widgetTest = (buttonSize = 0.04, buttonPad = 0.2) => {
    CLeap.textureLoader = new THREE.TextureLoader();
    //CLeap.textureLoader.setPath(CSynth.current.fullDir);
    Leap.loopController.use('proximity');
    if (CLeap.leapGUI) CLeap.node.remove(CLeap.leapGUI);
    let leapGUI = new THREE.Group();
    CLeap.node.add(leapGUI);
    leapGUI.position.y = 0.3;
    //leapGUI.rotateY(0.25);
    CLeap.leapGUI = leapGUI;
}

CLeap.hideMainPanel = () => {
    CLeap.menuPanel.activeGUI = false;
}

CLeap.buttons = {};
// for now parent is defaulted,
CLeap.makeButton = ( {
    width = 0.05, height = 0.05, pad = 0.005, textCol = 0x000000,
    func = () => {}, image, text = '', x = 0, y = 0, parent = CLeap.leapGUI, key,
    xExpand = 0 // -ve to grow by this proportion to left... EXPERIMENTAL...
} = {} ) => {
    if (xExpand !== 0) {
        x += width * xExpand;
        width += width * Math.abs(xExpand);
    }
    //consider image effects? (de)saturation, uvMatrix animation...
    const buttonMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    if (image) {
        console.log(`CLeap.makeButton with texture ${image}, texturePath ${CLeap.textureLoader.path}`);
        const onLoad = t => { buttonMat.map = t; buttonMat.needsUpdate = true; console.log(`loaded ${image}`)}
        const onProgress = a => console.log(`loading texture ${image}... ${JSON.stringify(a)}`);
        const onError = e => console.error(`error loading texture ${e.target.src}`);
        CLeap.textureLoader.load(image, onLoad, onProgress, onError);
    }
    const buttonMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), buttonMat);
    const buttonOpts = {locking: false, shortThrow: -0.001, longThrow: -0.002};
    //highlight is false here because of dodgy behaviour. Hover callback is ok, we use that...
    const pressFunc = m => {
        Maestro.trigger('leapclick');
        const t = Date.now();
        const dt = new Date(t - CLeap.lastClickTime).toISOString().substr(11);
        CLeap.lastClickTime = t;
        appendtextremote('logs/leapclick.log', text + '\t' + new Date().toISOString() + '\t' + dt + '\n');
        V.resting = false;
        func();
    }

    const button = new PushButton(
        new InteractablePlane(buttonMesh, Leap.loopController, {hoverBounds: [0, 0.01], highlight: false}),
        buttonOpts
    ).on('press', pressFunc);
    buttonMesh.position.x = x;
    buttonMesh.position.y = y;

    const hoverMat = new THREE.MeshStandardMaterial({transparent: true, opacity: 0.0 });
    const dx = width + pad, dy = height + pad;
    const hoverMesh = new THREE.Mesh(new THREE.PlaneGeometry(dx, dy), hoverMat);
    hoverMesh.position.x = x;
    hoverMesh.position.y = y;
    hoverMesh.position.z = 0.001;

    const textNode = dat.GUIVR.textCreator.create(text, {color: textCol, scale: 0.3});
    button.plane.hover(
        m => { hoverMat.opacity = 0.6; textNode.visible = true; },
        m => { hoverMat.opacity = 0.0; textNode.visible = !image; }
    );
    textNode.position.x = x - textNode.computeWidth()/2;
    textNode.position.y = y - textNode.computeHeight()/2;

    textNode.position.z = 0.002;
    textNode.visible = !image;
    // // parent is defaulted for now, but ...
    // if (!parent) {
    //     parent = new THREE.Group();
    //     parent.name = name;
    // }
    if (key === undefined) key = text;
    textNode.name = key + '_label';
    buttonMesh.name = key;
    hoverMesh.name = key + '_hover';

    buttonMesh.renderOrder = 100;
    hoverMesh.renderOrder = 200;
    textNode.traverse(t => t.renderOrder = 300);

    parent.add(textNode);
    parent.add(buttonMesh);
    parent.add(hoverMesh);
    CLeap.buttons[key] = buttonMesh;
    // buttonMesh.sourceDefinition = // not easily avaiable
    buttonMesh.sourceFunc = func;   // ??? trigger leapclick ??
    buttonMesh.pressFunc = pressFunc;   // ??? trigger leapclick ??

    buttonMesh.selected = v => {
        //buttonMat.opacity = v ? 1 : 0.7;
        buttonMat.color.r = v ? 0 : 1;
    }
    buttonMesh.userData.width = width;
    buttonMesh.userData.height = height;
    if (!parent.userData.planes) parent.userData.planes = [];
    parent.userData.planes.push(button.plane);
    buttonMesh.userData.button = button;
    // // not used, and maybe defined on wrong object?
    // Object.defineProperty(buttonMesh, 'activeGUI', {
    //     get: () => buttonMesh.visible,
    //     set: v => {
    //         buttonMesh.visible = v;
    //         textNode.visible = v; // << TODO worry about hover
    //         hoverMesh.visible = v;
    //         button.plane.interactable = v;
    //     }
    // })
    return buttonMesh;
}

CLeap.makePanel = ( {
    panelSpec = 3, buttonAspect = 1, buttonWidth = 0.04, pad = 0.005,
    buttonSpecs = [], name = "CLeap panel"
} = {}) => {
    const group = new THREE.Group();
    group.name = name;
    const buttonHeight = buttonWidth * buttonAspect;
    const dx = buttonWidth + pad, dy = -(buttonHeight + pad);

    const numColumns = panelSpec.isPanelSpec ? panelSpec.numColumns : panelSpec;
    const n = buttonSpecs.length;
    group.userData.width = dx * n % numColumns;
    group.userData.height = -dy * Math.ceil(n / numColumns);
    group.userData.panelSpec = panelSpec;
    if (panelSpec.isPanelSpec) {
        CLeap.makePanelBacking(group);
    }

    const buttons = buttonSpecs.map((spec, i) => {
        const u = i % numColumns, v = Math.floor(i / numColumns);
        const x = u * dx, y = v * dy;
        //wrap buttons func in another func for 'highlight last pressed' behaviour
        if (spec) {
            const func = () => {  // immediate, no await
                // buttons.forEach((b, j) => b.selected(j===i));
                spec.func();
            }
            return CLeap.makeButton({
                image: spec.image, text: spec.text, xfunc: func, func: spec.func, key: spec.key, xExpand: spec.xExpand,
                x: x, y: y, width: buttonWidth, height: buttonHeight, parent: group
            });
        } else {
            return undefined;
        }
    }).filter(x => x);
    group.add(...buttons);
    return group;
}

CLeap.makePanelBacking = panel => {
    const {color, margin, opacity} = panel.userData.spec;
    let {width, height} = panel.userData;



    //could cache materials etc
    const mat = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: opacity});
    const mesh = new THREE.PlaneGeometry();
}

CLeap.posterPreview = () => {
    CLeap.textureLoader.load('poster8192.png', t => {
        const mat = new THREE.MeshBasicMaterial({map: t});
        const w = 1.189, h = 0.841;
        const geo = new THREE.PlaneGeometry(w, h);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.z = -0.75;
        V.camscene.add(mesh);
        CLeap.poster = mesh;
    });
}

if (searchValues.leap && !CLeap.controller) CLeap.startLeap();

// mouse click for menu when not in VR
// ... should be lower down stack and have preselect (even if we remove preselect for Leap finger)
var lastdocx, lastdocy, width, height, log, canvas, onframe;
CLeap.mouseClick = function() {
    if (renderVR.invr()) return;
    const x =(lastdocx/width*2-1)*width/height, y = -lastdocy/height*2+1;
    // log('click for leap', x, y);
    for (let bname in CLeap.buttons) {
        const b = CLeap.buttons[bname];
        const s = b.matrixWorld.elements[0]/2;  // allow for scale
        const w = b.userData.width*s, h = b.userData.height*s;
        const bx = b.matrixWorld.elements[12], by = b.matrixWorld.elements[13];
        if (bx - w <= x && x <= bx + w && by - h <= y && y <=  by + h) {
            // CLeap.lastClickTime = Date.now();
            b.pressFunc();
        }
    }
}
onframe(() => canvas.addEventListener('click', () => CLeap.mouseClick()), 5);
