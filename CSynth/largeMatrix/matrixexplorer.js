'use strict';
//if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
var THREE, FFTNayuki, getstats, location, BroadcastChannel; // keep netbeans happy


var requestAnimationFrame, W=window, alert, FileReader, posturi ;
var renderer, scene1, scene2, mcamera, stats, material, canvas, savetext, triScene, triMaterial, sepColor, rawdata;
var muniforms;
var mouse = new THREE.Vector2();
var mousedownobj;
var mousewhich = 0;  // accumulate mouse button info (needed for Firefox)
var copyscene, copymaterial;
var lineScene, lineVertices, lineGeometry;
var lineVertices2, lineGeometry2;
var lineMaterial, lineMaterial2;
var rangefac = 2;        // relative scale at each level of zoom, recomputed on load except for very small files
var zrangefac = 2;        // relative range to use for brighter images at each level of zoom
var zrangebase = 200;  // 15000;
var targsize = 128;    // target resolution for final vp[3]
var linewidth = 1;
var pointExaggerate = 1;

var res = 5000;  // data resolution in x and y

var animating = false;
var vps;
var gmaxid, gminid, gmaxv, gnumInstances;    // maxid for all scenes
var valueArray; // array of raw values, upper/lower halves for yellow blue

var symtest = false; // set to true for symmetry testing

/** initialize the system to set up renderers, scenes, etc. Executed only once on first drop */
function init(quickout) {
    if (mcamera) return;  // so only one init

    // -- set up the basic renderer, camera ------------------------------------------
    mcamera = new THREE.OrthographicCamera(-1,1,-1,1,-1000,1000);

    renderer = new THREE.WebGLRenderer({
        //antialias: false,
        //premultipliedAlpha: false,
        //preserveDrawingBuffer: true
    });
    renderer.autoClear = false;
    renderer.devicePixelRatio = 1;
    renderer.setSize( window.innerWidth, window.innerHeight );
    canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.top = "0px";
    document.body.appendChild( canvas );
if (quickout) return;
    // -- prepare the shader (which will also set the material)
    shader();

    // prepare for the lines ---------------------------------------------------------
    lineScene = new THREE.Scene();

    // for red position boxes
    lineGeometry = new THREE.Geometry();
    lineVertices = lineGeometry.vertices;
    lineMaterial = new THREE.LineBasicMaterial( { color: 0xff0000, linewidth:1 } );
    var line = new THREE.LineSegments(lineGeometry, lineMaterial);
    lineScene.add(line);
    for (let i=0; i<16; i++)
        lineVertices.push(new THREE.Vector3());

    // for yellow broken matrix lines
    lineGeometry2 = new THREE.Geometry();
    lineVertices2 = lineGeometry2.vertices;
    lineMaterial2 = new THREE.LineBasicMaterial( { color: 0xffff00, linewidth:1 } );
    var line2 = new THREE.LineSegments(lineGeometry2, lineMaterial2);
    lineScene.add(line2);
    for (let i=0; i<4; i++)
        lineVertices2.push(new THREE.Vector3());


    // prepare for the lower triangle in each matrix --------------------------------------
    triScene = new THREE.Scene();

    var geom = new THREE.Geometry();
    var k = 9999;
    var v1 = new THREE.Vector3(k,-k,0);
    var v2 = new THREE.Vector3(-k,k,0);
    var v3 = new THREE.Vector3(k,k,0);

    console.log(geom.vertices);
    geom.vertices.push(v1);
    geom.vertices.push(v2);
    geom.vertices.push(v3);

    geom.faces.push( new THREE.Face3( 0, 1, 2 ) );
    geom.computeFaceNormals();

    triMaterial = new THREE.MeshBasicMaterial();
    triMaterial.depthTest = false;
    triMaterial.depthWrite = false;
    var mesh = new THREE.Mesh( geom, triMaterial);
    triMaterial.color = new THREE.Color(0.1,0.1,0.1);
    triScene.add(mesh);

    // prepare for the stats -------------------- --------------------------------------
    //stats = new Stats();
    //stats.domElement.style.position = 'absolute';
    //stats.domElement.style.top = '0px';
    //document.body.appendChild( stats.domElement );

    // prepare for the copying of each level's rendertarget to the entire screen -------
    copyscene = new THREE.Scene();
    // We used to use a MeshBasicMaterial with gammaOutput = true
    // but this conflicted with the spring code because of the over-wide scope of gammaOutput
    // This looks as it it will be corrected in later versions of three
    // but meanwhile we make our own custom shader that applies sqrt gamma correction.
    copymaterial = new THREE.ShaderMaterial({
        uniforms: { intex: { value: undefined, type: 't' } },
        vertexShader: "varying vec2 tpos; void main() { gl_Position = projectionMatrix * vec4( position, 1.0 ); tpos = position.xy * 0.5 + 0.5; tpos.y = 1.0 - tpos.y; }",
        fragmentShader: "varying vec2 tpos; uniform sampler2D intex; void main() { gl_FragColor = sqrt(texture2D(intex, tpos)); }"
    });

    copymaterial.depthTest = false;
    copymaterial.depthWrite = false;
    var cgeom = new THREE.PlaneGeometry(2, -2);
    var cmesh = new THREE.Mesh(cgeom, copymaterial);
    copyscene.add(cmesh);

    sepColor = new THREE.Color(0.1,0.1,0.2);

    requestAnimationFrame(animate);
    // animating = true;  // only do animation when needed

    // set up the interaction code -----------------------------------------------------
    window.addEventListener( 'resize', onWindowResize, false );
    document.onmousemove = onDocumentMouseMove;
    document.onmousedown = onDocumentMouseDown;
    document.onmouseup = onDocumentMouseUp;

    W.slider1.onchange = W.slider1.oninput = W.sliderChange;
    W.slider2.onchange = W.slider2.oninput = W.sliderChange;
    W.slider1.onmousedown = W.slider2.onmousedown = function(evt) {
        mousewhich = 0;
        evt.stopPropagation();
    }

    // change what is displayed once we get started
    W.running.style.display = "block";
    W.dropinfo.style.display = "none";
    W.dragger.ondragstart = function(ev) {
        var r = vps[3].r;
        var i = Math.round;
        var cmd = 'dna.loadRawa("data/DNA/' + scene1.fid + '");\n';
        if (scene2) cmd += 'dna.loadRawb("data/DNA/' + scene2.fid + '");\n';
        cmd += 'dna.setForLMV();\n';
        cmd += 'dna.setFoldPair(' + i(r.x) + ',' + i(r.y) + ',' + i(r.z) + ',' + i(r.w) + ');';
        savetext = W.dragger.innerHTML;
        W.dragger.innerHTML = cmd;
        ev.dataTransfer.setData("text", cmd);
        ev.stopPropagation();
    }
    W.dragger.ondragend = function() { W.dragger.innerHTML = savetext; }
    document.body.ondragstart = function() { return false; }  // stop dragging overriding normal move
}

/** work out pos based on x 0..1 and definition r */
function pos(x,r) {
    var w1 = r.y - r.x;
    var w2 = r.w - r.z;
    var w = w1 + w2;
    var rr = (x < w1/w) ? (r.x + x * w) : (r.z + (x - w1/w) * w);
    return Math.round(rr);
}

/** work out 0..1 based on v and definition r */
function dpos(v, r) {
    var w1 = r.y - r.x,  w2 = r.w - r.z,  w = w1 + w2;
    var rr =
        v < r.x                 ?   0 :  // just enough to be invisible, could be - infinity
        r.x <= v && v <= r.y    ?   ((v - r.x) / w) :
        r.y <= v && v <= r.z    ?   w1/w :
        r.z <= v && v <= r.w    ?   ((v - r.z + w1)/w) :
                                    1.01;  // just enough to be invisible, could be infinity
    return rr*2 - 1;
}

/** main interaction code */
function onDocumentKeyDown( evt ) {
    //console.log(evt);
    if (evt.keyCode === 79) {    // 'O', with or without shift etc
        W.fileChooser.multiple = true;
        W.fileChooser.click();
        return killev(evt);
    }
    if (evt.keyCode === 67 && evt.ctrlKey) {  // ctrl-C

    }
}

function onDocumentMouseDown( event ) {
    mousedownobj = event.srcElement; // record down object to allow special case for W.dragger
    mousewhich |= 1 << event.which;
    const r = onDocumentMouseMove(event);
    const [xpp, ypp] = r;
    if (xpp <= ypp) {
        CSynth.bc.postMessage( {command: 'setMarker', args: [0, xpp]});
        CSynth.bc.postMessage( {command: 'setMarker', args: [1, ypp]});
    }
    return r;
}

function onDocumentMouseUp( event ) {
    mousedownobj = undefined; // record down object to allow special case for W.dragger
    mousewhich &= ~(1 << event.which);
}

function showData(vpn, xp, yp) {
    var dist = (yp - xp)/res;
    const xpp = Math.round(xp/res) * res, ypp = Math.round(yp/res) * res;  // pos in base pairs
    var xpk = Math.round((xpp - gminid)/res), ypk = Math.round((ypp - gminid)/res);  // integer i,j values
    var xpc = xpk * res + gminid, ypc = ypk * res + gminid;     // original bp as in data file
    const d = 20;
    const avg = averageForBdist(Math.round(dist));

    const v1 = valueArray[xpk + gnumInstances1 * ypk]; const v1f = (v1 === undefined ) ? '?' : v1.toLocaleString();
    const v2 = valueArray[xpk * gnumInstances1 + ypk + 1]; const v2f = (v2 === undefined ) ? '?' : v2.toLocaleString();
    window.info.innerHTML = ""; // vpn + ">" + xpp.toLocaleString() + " " + ypp.toLocaleString() + '  [' + Math.round(dist) + ']';
    window.pane.innerHTML = vpn;
    window.id1.innerHTML = xpp.toLocaleString() + ' ' + xpc + ' ' + xpk;
    window.id2.innerHTML = ypp.toLocaleString() + ' ' + ypc + ' ' + ypk;
    window.value1.innerHTML = v1f;
    window.value2.innerHTML = v2f;
    window.avg1.innerHTML = avg[0].toLocaleString();
    window.avg2.innerHTML = avg[1].toLocaleString();
    window.dist.innerHTML = (Math.round(dist) * res).toLocaleString() + " / " + Math.round(dist);
    return {xpp, ypp};
}

function onDocumentMouseMove( event ) {
    if (!vps) return;  // not yet populated
    if (!vps[0].r) return;  // not yet populated

    const x = event.clientX;
    const y = canvas.height - event.clientY;
    // var xpp, ypp;

    for (let vpn = 0; vpn < vps.length; vpn++) {  // find the viewport, if any
        const vp = vps[vpn];

        if (vp.x <= x && x <= vp.x + vp.w && vp.y <= y && y <= vp.y + vp.h) {
            const xp = pos((x-vp.x)/vp.w, vp.r);
            const yp = pos((y-vp.y)/vp.h, vp.r);
            var {xpp, ypp} = showData(vpn, xp, yp);

            if (mousewhich && mousedownobj !== W.dragger) {
                setxy(vpn, xp, yp);
            }
        }
    }
    if (xpp <= ypp) {
        CSynth.bc.postMessage( {command: 'setMarker', args: [2, xpp]});
        CSynth.bc.postMessage( {command: 'setMarker', args: [3, ypp]});
    }

    return [xpp, ypp];
    //killev(event);
}

function bp2i(bp) { return Math.round((bp-gminid) / res); }

/** set the position in view vpn (and higher res views */
    function setxyShow(vpn, xp, yp) {
        setxy(vpn, xp, yp);
        showData('csynth', xp, yp);
    }

/** set the position in view vpn (and higher res views */
function setxy(vpn, xp, yp) {
    requestAnimationFrame( animate );
    for (var vpn2 = vpn+1; vpn2 < vps.length; vpn2++) {
        var v2 = vps[vpn2];
        var r = v2.r;
        // set up for two segments initially
        r.x = xp - v2.range/4;
        r.y = xp + v2.range/4;
        r.z = yp - v2.range/4;
        r.w = yp + v2.range/4;
        if (r.y > r.z || xp > yp) {  // near enough diagonal to merge to one big segment
            var ap = (xp + yp)/2;
            r.x = ap - v2.range/2;
            r.y = ap + v2.range/2;
            r.z = -1;
            r.w = -1;
        }
    }
}
/** and a window size change */
function onWindowResize() {

    //mcamera.aspect = window.innerWidth / window.innerHeight;
    //mcamera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    setvps();
    // this just stretches existing rendering, needs more work to rerender() correctly
}

/** continuous 'game' style animation, not used */
function animate() {
    if (animating) requestAnimationFrame( animate );

    render();
    if (stats) stats.update();
}

/** render the scene: render each viewport */
function render() {
    if (!muniforms) return;
    if (!vps) return;
    //renderer.setClearColor(new THREE.Color(0.1,0.1,0.2)); // applies to separators
    renderer.setClearColor(sepColor);
    renderer.clear();
    renderer.setClearColor(new THREE.Color(0,0,0)); // applies to background of each view

    var range = gmaxid - gminid;
    var zrange = zrangebase;
    for (var vpn = 0; vpn < vps.length; vpn++) {
        var vp = vps[vpn];
        vp.range = range;
        vp.zrange = zrange;
        rendervp(vp);
        range /= rangefac;
        zrange /= zrangefac;
    }
    for (vpn = 0; vpn < vps.length; vpn++) {
        showvp(vps[vpn]);
    }
}

/** render the rendertarget for the viewport, if the conditions have changed */
function rendervp(vp) {
    var key = JSON.stringify(vp.r) + vp.zrange;  // stringify(vp) fails, why ???
    if (vp.last === key) return;
    vp.last = key;

    var w = vp.w, h = vp.h;  // width and height of renderTarget
    // Experiment to align renderTarget size with # particles shown, not with paint area
    // Then let final copy do interpolation.
    // Avoids some pixellation artefacts, but creates others.
    if (vp.id >= 33) {  // > 3 never used
        var r = vp.r;
        var ww = r.y - r.x + r.w - r.z;
        w = h = Math.floor(2*ww/res);
    }
    if (!vp.renderTarget) { // todo test size as well
        vp.renderTarget = new THREE.WebGLRenderTarget( w, h, {
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            stencilBuffer: false
        } );
        vp.renderTarget.texture.generateMipmaps = false;
    }

    renderer.autoClear = false;
    renderer.setRenderTarget(vp.renderTarget);
    renderer.clear(vp.renderTarget);


    muniforms.r.value.copy(vp.r);
    muniforms.zrange.value = vp.zrange * (pointExaggerate * pointExaggerate);
    muniforms.pointSize.value = vp.pointsize = vp.w / (vp.range/res) * pointExaggerate; // / 1.3 * 3;
    muniforms.ar.value = vp.w / vp.h;


    renderer.setViewport(0, 0, w, h);
    var s;
    if (scene2) {
        scene2.overrideMaterial = material;
        s = scene2.strength;
        muniforms.color.value.set(0,0,s,1);
    //muniforms.color.value.set(s,0,0,1);
        renderer.render( scene2, mcamera, vp.renderTarget );      // main render using custom shader, mcamera not really used

        s = scene1.strength;
        muniforms.color.value.set(s,s,0,1);
    //muniforms.color.value.set(0,s,0,1);
    } else {
        s = scene1.strength;
        muniforms.color.value.set(s,s,s,1);
    }
    scene1.overrideMaterial = material;
    renderer.render( scene1, mcamera, vp.renderTarget );      // main render using custom shader, mcamera not really used
    renderer.render( triScene, mcamera, vp.renderTarget );    // 'empty' lower triangle

}

/** clear the vp render cahces and rerender all */
function rerender() {
    for (var i=0; i<vps.length; i++) vps[i].last = undefined;
    render();
}

/** capture W.slider changes */
function sliderChange(evt) {
    var s1 = window.W.slider1.value / gmaxv * 500;  // 0..10
    var s2 = window.W.slider2.value / 100;
    scene1.strength = s1 * s2 / 2;
    if (scene2) {
        scene2.strength = s1 * (2-s2) / 2;
        var v = scene2.strength/scene1.strength;
        window.W.slider2val.innerHTML = v.toFixed(2) + "/" + (1/v).toFixed(2);
    }

    rerender();
    mousewhich = 0;
    return killev(evt);
}

/** show a viewport using saved rendertarget, then impose lines and lower triangle */
function showvp(vp) {
    renderer.setRenderTarget();
    renderer.autoClear = false;
    renderer.setViewport(vp.x, vp.y, vp.w, vp.h);
    copymaterial.map = vp.renderTarget;
    copymaterial.uniforms.intex.value = vp.renderTarget;
    renderer.render(copyscene, mcamera);


    // set up the lines
    var d = 0.1;    // for sticking out lines
    var r = vp.r;   // copy my range for convenience

    // first yellow lines to show broken pair matrices, if broken
    if (r.z !== r.w) {
        let i = 0;
        lineVertices2[i++].set(0, -1, 0);
        lineVertices2[i++].set(0, d, 0);
        lineVertices2[i++].set(d, 0, 0);
        lineVertices2[i++].set(-1, 0, 0);
        // three.js oddity/bug that computes bounding sphere based on first instance seen
        // so we force it to something that can be seen
        lineGeometry2.boundingSphere.center.set(0, 0, 0);
        lineGeometry2.boundingSphere.radius = 1;
    } else {
        for (let i = 0; i < lineVertices2.length; i++) lineVertices2[i].set(999, 999, 999);
    }
    lineGeometry2.verticesNeedUpdate = true;


    // then red lines to show position of higer res within lower res
    if (vp.id !== vps.length-1) {
        var r2 = vps[vp.id + 1].r;
        var x = dpos(r2.x, r);
        var y = dpos(r2.y, r);
        var z = dpos(r2.z, r);
        var w = dpos(r2.w, r);

        window['y' + (vp.id+2) + '1'].innerHTML = Math.ceil(r2.x).toLocaleString() + '<br>' + Math.floor(r2.y).toLocaleString();
        window['y' + (vp.id+2) + '2'].innerHTML = r2.z === -1 ? "" : Math.ceil(r2.z).toLocaleString() + '<br>' + Math.floor(r2.w).toLocaleString();

        let i = 0;
        lineVertices[i++].set(x, -z, 0);
        lineVertices[i++].set(x, -w, 0);
        lineVertices[i++].set(y, -z, 0);
        lineVertices[i++].set(y, -w, 0);

        lineVertices[i++].set(x, -x+d, 0);
        lineVertices[i++].set(x, -y, 0);
        lineVertices[i++].set(x, -y, 0);
        lineVertices[i++].set(y+d, -y, 0);

        lineVertices[i++].set(x, -z, 0);
        lineVertices[i++].set(y, -z, 0);
        lineVertices[i++].set(x, -w, 0);
        lineVertices[i++].set(y, -w, 0);

        lineVertices[i++].set(z, -z+d, 0);
        lineVertices[i++].set(z, -w, 0);
        lineVertices[i++].set(z, -w, 0);
        lineVertices[i++].set(w+d, -w, 0);
    } else {
        for (let i=0; i<lineVertices.length; i++) lineVertices[i].set(999, 999, 999);
    }
    lineGeometry.verticesNeedUpdate = true;


    // and draw them, linewidth does not work on Windows/ANGLE
    var k = (linewidth - 1) / 2;  // linewidth
    for (let i=-k; i<=k; i++) for (let j=-k; j<=k; j++) {
        mcamera.projectionMatrix.elements[12] = 2*i/vp.w;
        mcamera.projectionMatrix.elements[13] = 2*j/vp.h;
        renderer.render(lineScene, mcamera);
    }
    mcamera.projectionMatrix.elements[12] = 0;

}

function log() {
    console.log([].slice.call(arguments).join('\t'));
}

/** do everything to make sure the event does not get handled any further */
function killev(evt) {
    if (!evt) return;
    evt.stopPropagation();
    evt.preventDefault();
    return false;
}

/** handle document file drop */
function docdrop(evt) {
    var dt = evt.dataTransfer;
    if (!dt) { alert("unexpected dragdrop onto mutator"); return killev(evt); }

    if (dt.files.length === 2) scene1 = undefined;
    if (dt.files.length > 2) {
        alert('Cannot process more than two files');
        return killev(evt);
    }

    for (var f=0; f<dt.files.length; f++) {
        openfile(dt.files[f]);
    }
    return killev(evt);
}

function docover(evt) {
    return killev(evt);
}
document.ondrop = docdrop;
document.ondragenter = docover;
document.ondragover = docover;

/** called as a result of a drop, open the file and pass to handler */
function openfile(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        window.info.innerHTML = "read file " + file.name;
        var data = e.target.result;
        handler(data, file.name);
    };
    window.info.innerHTML = "reading file " + file.name;
    reader.readAsText(file);        // start read in the data file
}

/** process entire data (already read from file,  fid just for error message)
* Each line will be made into a point in the pointclound.
*/
function handler(data, fid) {

    var k = 0;

    window.info.innerHTML = "splitting file " + fid;
    var lines = data.split("\n");
    window.info.innerHTML = "file " + fid + " lines=" + lines.length;
    log('lines split ' + lines.length);

    var positions = new Float32Array( lines.length * 3 );  // may reduce later if wasted lines
    var badlines = 0;
    let symdict = {};
    let np = 0, nn = 0;  // counts for symmetry
    let zeros = 0, diag = 0;
    let off = 0; // initialize to 'no' for using offsets;  helps with large bp number corrupted as float32
    let lastid0 = -1e50;
    //off = 'no';
    // off = 32000000;
    for (var i=0; i<lines.length; i++) {
        if (i%10000 === 0) window.info.innerHTML = "processing file " + fid + "  " + i + " of " + lines.length + "  " + Math.floor(i*100/lines.length) + "%";
        var line = lines[i];
        var ff  = line.split("\t");
        if ((ff.length === 3 || ff.length === 5) && !isNaN(ff[0])) {
            var v = +ff[2];
            if (v === 0) {zeros++; continue; }
            if (k === 0) off = ff[0] > 16000000 ? ff[0] : 0;    // try to adjust but avoid big integer/float issues
            let id0 = + ff[0]-off;
            let id1 = + ff[1]-off;

            // test for symmetry if requested (requires large dictionary, so no by default)
            if (symtest) {
                symdict[id0 + '/' + id1] = v;
                const vv = symdict[id1 + '/' + id0];
                if (vv !== undefined && vv !== v)
                    log('symmetry error', id0, id1, v, vv);
            }

            // count +ve and -ve pairs, and make all +ve
            if (id1 > id0) { np++;
            } else if (id0 === id1) { diag++;
            } else if (id0 > id1) {
                nn++;
                [id0, id1] = [id1, id0];
            }

            positions[k++] = id0;
            positions[k++] = id1;
            positions[k++] = v;
        } else {
            badlines++;  // extra positions will be at end and contain 0,0,0
        }
    }
    positions = positions.slice(0, k);  // some were wasted lines // this breaks things for some reason
    newdata(positions, fid);
    log('lines processed', lines.length, 'good', k/3, 'bad', badlines,
        'np/nn', np, nn, 'zeros', zeros, 'diag', diag);
}

function newdata(positions, fid) {
    init();

    var maxid = 0, minid = 1e50, maxv = 0, sumv = 0, sumv2 = 0, n = 0, badlines = 0, mindiff = 1e50, lastid0 = -9999;
    for (let k =0; k < positions.length; ) {
        let id0 = positions[k++], id1 = positions[k++], v = positions[k++]; //  *= 10000;
        maxid = Math.max(maxid, id0, id1);
        minid = Math.min(minid, id0, id1);
        if (id0 !== id1) mindiff = Math.min(mindiff, Math.abs(id0-id1));
        if (id0 !== lastid0) mindiff = Math.min(mindiff, Math.abs(id0-lastid0));
        lastid0 = id0;
        maxv = Math.max(v, maxv);
        sumv += v;
        sumv2 += v*v;
        n++;

    }

    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.computeBoundingBox();

    var points = new THREE.Points( geometry, material );
    points.frustumCulled = false;

    var scene = new THREE.Scene();
    scene.add( points );
    scene.fid = fid;
    scene.minid = minid; scene.maxid = maxid; scene.n = n; scene.maxv = maxv; scene.sumv = sumv; scene.sumv2 = sumv2; scene.mindiff = mindiff;
    scene.avgv = sumv/n; scene.avgv2 = sumv2/n;
    scene.strength = 1;
    log('idrange', minid, maxid, mindiff, 'stats', sumv, scene.avgv, scene.avgv2);
    if (scene1) {
        scene2 = scene;
        window.filenames.innerHTML = 'files:<p class="file1">' + scene1.fid + '</p><p class="file2">' + scene2.fid + '</p>';
        gmaxid = Math.max(scene1.maxid, scene2.maxid);
        gminid = Math.min(scene1.minid, scene2.minid);
        gnumInstances = (gmaxid - gminid)/res + 1;
        gmaxv = Math.max(scene1.maxv, scene2.maxv);
        window.W.running.classList.add("scene2");
    } else {
        scene1 = scene;
        window.filenames.innerHTML = 'file:<p class="file">' + scene1.fid + '</p>';
        gmaxid = scene1.maxid;
        gminid = scene1.minid;
        res = scene1.mindiff;
        gnumInstances = (gmaxid - gminid)/res + 1;
        gmaxv = scene1.maxv;
        window.W.running.classList.add("scene1");
    }
//gminid = 0; // until rest of code corrected

    // make sure we have a good starting point
//    if (maxid/res > targsize*4)
    rangefac = Math.max(2, Math.pow( (gmaxid-gminid)/res/targsize, 1/3)); // at least 2 to be interesting for small inputs
    zrangefac = 1/Math.sqrt(rangefac);
    setvps();
    setxy(0, maxid/4, 3*maxid/4);
    window.y11.innerHTML = Math.ceil(vps[0].r.x).toLocaleString() + '<br>' + Math.floor(vps[0].r.y).toLocaleString();
    window.y12.innerHTML = "";


    rawdata = scene.rawdata = positions;
    // if (scene2)
        saveArray();  // todo, check if scene2 is coming to save waste on scene1
        sliderChange();
        setxy(0,gminid*0.75 + gmaxid*0.25, gmaxid*0.75 + gminid*0.25);
}

var gnumInstances1;
/** save position data packed into array for lookup */
function saveArray() {
    gnumInstances1 = gnumInstances + 1;
    valueArray = new Float32Array(gnumInstances1 * gnumInstances);
    let p = scene1.rawdata;
    //console.clear();
    for (let i=0; i < p.length;) {
        const a = (p[i++] - gminid) / res;
        const b = (p[i++] - gminid) / res;
        const v = p[i++];
        valueArray[a + gnumInstances1*b] = v;
        //log(a,b, a + gnumInstances1*b);
    }
    //log('---');
    p = (scene2 || scene1).rawdata;
    for (let i=0; i < p.length;) {
        const a = (p[i++] - gminid) / res;
        const b = (p[i++] - gminid) / res;
        const v = p[i++];
        valueArray[a * gnumInstances1 + b+1] = v;
        //log(a,b, a * gnumInstances1 + b+1);
    }
}


/** find average on a distance line, d ist dist, w is range of d d-w to d+w */
function averageForBdist(d, w = 10) {
    let sum1 = 0, sum2 = 0, n = 0;
    for (let dd = Math.max(1, d-w); dd <= d+w; dd++) {
        for (let x = 0; x < gnumInstances - dd; x++) {
            let y = x + dd;
            sum1 += valueArray[y * gnumInstances1 + x];
            sum2 += valueArray[x * gnumInstances1 + y + 1];
            n++;
        }
    }
    return [sum1/n, sum2/n];
}

/** find cumulative contacts distances */

/** find interesting average points */
function findinteresting() {
    let d1=[], d2=[];
    for (let d=1; d < gnumInstances; d++) [d1[d], d2[d]] = averageForBdist(d);

    const xover = [];
    for (let d=2; d < gnumInstances; d++) {
        if (Math.sign( (d1[d]-d2[d]) * (d1[d-1]-d2[d-1]) ) === -1) xover.push(d);
    }
    const xovert = [];
    for (let i=0; i < xover.length; i++) {
        const d = xover[i];
        if (xover[i+1] < d + 5) {
            i++;
        } else {
            xovert.push(d);
            log(d*res, d, d1[d], d2[d]);
        }
    }
    return [d1,d2];
}

const fftlist = {}; // will hold fft code generated as needed
function getfft(w) {
    let fft = fftlist[w];
    if (!fft) fft = fftlist[w] = new FFTNayuki(w);
    return fft;
}
/** try some fft */
function tryfft(id = gnumInstances/2, w = 256, d = 11) {
    let fft = getfft(w);
    const a=[], b=[];
    for (let i = id - w/2; i < id + w/2; i++) {
        a.push(valueArray[i * gnumInstances1 + i + d]); // ??? valueArray diagonal changed
        b.push(0);
    }
    fft.forward(a, b);
    const c = a.map((v,i) => Math.sqrt(a[i]**2 + b[i]**2));
    return c;
}

/** cumulative contacts over distance range */
function cumcontacts(id = gnumInstances/2, w = 512, lod = 50, hid = 450) {
    const ra = [], rb = [];
    for (let i = id-w; i < id+w; i++) {
        let ca = 0, cb = 0;
        for (let d = lod; d <= hid; d++) {
            ca += vala(i, i+d);
            cb += valb(i, i+d);
        }
        ra.push(ca);
        rb.push(cb);
    }
    const ffta = fftreal(ra);
    const fftb = fftreal(rb);
    return [ra, rb, ffta, fftb];
}

/** return real fft for real input */
function fftreal(a) {
    const n = a.length;
    const ra = a.slice();
    const ia = new Array(n).fill(0);
    const fft = getfft(n);
    fft.forward(ra, ia);
    const r = ra.map( (v,i) => Math.sqrt(ia[i]*ia[i] + ra[i]*ra[i]));
    return r;
}

/** get contact value for x,y from first file */
function vala(x,y) {
    if (x>y) [x,y] = [y,x];
    if (x<0 || y > gnumInstances-1) return 0;
    return valueArray[y * gnumInstances1 + x];
}

/** get contact value for x,y from second file */
function valb(x,y) {
    if (x>y) [x,y] = [y,x];
    if (x<0 || y > gnumInstances-1) return 0;
    return valueArray[x * gnumInstances1 + y + 1];
}


/** do some stats on region, w.i.p. */
function dostats(id = gnumInstances/2, w = 50, lod = 1, hid = 25) {
    id = Math.round(id);
    const gstats = [];
    for (let d = lod; d <= hid; d++) {
        let a = [];
        for (let i = Math.max(0, id-w); i < Math.min(gnumInstances-d, id+w); i++)
            a.push(valueArray[i * gnumInstances1 + i+d]); //??? check
        const s = gstats[d] = getstats(a);
        const va = [];
        let sa = '';
        let n = 0;
        for (let i = Math.max(0, id-w); i < Math.min(gnumInstances-d, id+w); i++) {
            va.push( (valueArray[i * gnumInstances1 + i+d] - s.mean) / s.sd);
            sa += va[n] === 0 ? '0' : va[n] > 0 ? '+' : '-'; //??? check
            n++;
        }
        log(d, sa);
    }
}


/** find average in a region */
function averagerect(lx, hx, ly, hy) {
    if (lx === undefined) {
        const r = vps[3].r;
        lx = bp2i(r.x);
        hx = bp2i(r.y);
        ly = bp2i(r.z);
        hy = bp2i(r.w);
        if (r.z === -1) {
            ly = lx;
            hy = hx;
        }
    }
    let sum1 = 0, sum2 = 0, n = 0;
    for (let x = lx; x <= hx; x++) {
        for (let y= Math.max(x+1, ly); y <= hy; y++) {
            sum1 += valueArray[y * gnumInstances1 + x];
            sum2 += valueArray[x * gnumInstances1 + y + 1];
            n++;
        }
    }
    return [sum1/n, sum2/n];
}

/** analysis with web audio (not working/used 10/9/18) */
function waanal() {
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const length = 102400;
    var arrayBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    var buff = arrayBuffer.getChannelData(0);
    setTimeout(()=>{

        log('bufflen', buff.length);
        for (let i=0; i<length; i++) buff[i] = Math.random() * 2 - 1;

        // Get an AudioBufferSourceNode.
        // This is the AudioNode to use when we want to play an AudioBuffer
        var source = audioCtx.createBufferSource();
        // set the buffer in the AudioBufferSourceNode
        source.buffer = arrayBuffer;
        // connect the AudioBufferSourceNode to the
        // destination so we can hear the sound
        source.connect(audioCtx.destination);
        // start the source playing
        source.start();
    }, 1000)

    const anode = audioCtx.createAnalyser();
    anode.fftSize = 1024;
    const alen = anode.frequencyBinCount;
    const adata = new Float32Array(alen);
    anode.getFloatFrequencyData(adata);
    log('adata', adata.slice(0,10));
    setTimeout(() => audioCtx.close(), 1000);

}

/** load default data */
function loaddefaultdata() {
    var redfn = '../data/polymer3col/matrix_ery_3col.contacts';
    var whitefn = '../data/polymer3col/matrix_esc_3col.contacts';
    var red = posturi(redfn);
    var white = posturi(whitefn);
    handler(red, redfn);
    handler(white, whitefn);
    window.slider1.value=2; window.slider1.onchange();
}
// if (location.origin.indexOf('localhost') !== -1) setTimeout(loaddefaultdata, 100);

/** set up the viewports */
function setvps() {
    vps = [];

    var m = 5;  // margin
    var dx = Math.floor(canvas.width / 2);  // x step between vps
    var dy = Math.floor(canvas.height / 2);  // y step between vps
    var w = dx - 2*m;
    var h = dy - 2*m;
    const xres = 0;  // set to res for better alignment, but needs compensation elsewhere
    var range = gmaxid - gminid + xres;
    for (var i=0; i<4; i++) {
        vps[i] = {x: i%2 * dx + m, y: (1 - Math.floor(i/2)) * dy + m, w: w, h: h};
        vps[i].range = range;
        vps[i].r = {x:gminid - xres/2, y:range + gminid + xres/2, z:0, w:0};
        vps[i].id = i;
        range /= rangefac;
    }

}

/** set up the custom points shader */
function shader() {
    var vs = `
        uniform vec4 r;
        uniform float pointSize;
        uniform float zrange;
        uniform float distanceCompensate;
        varying float z;
        #define w1 (r.y - r.x)      // width of first visible range
        #define w2 (r.w - r.z)      // width of secobnd visible range
        #define ww (w1 + w2)        // total width of ranges
        float dpos(float v){        // position in -1..1 space allowing for r
            float rr =
              r.x <= v && v <= r.y ? ((v - r.x) / ww) :
              r.z <= v && v <= r.w ? ((v - r.z + w1) / ww) : 1e14;
            return rr*2.-1.;
        }

        void main(){
            gl_PointSize = pointSize;
            float x = dpos(position.x);
            float y = dpos(position.y);
            gl_Position =  vec4(x, y, 0., 1.);
            z = position.z/zrange;
            z *= pow(abs(x-y) + 0.1, distanceCompensate);  // todo: consider good fit, must be good at x==y
            //z = 0.7;
        }`;

    var fs = `
        //uniform float zrange;
        uniform vec4 color;
        varying float z;
        uniform float ar;
        uniform float baseval;
        void main() {
            vec2 pc = gl_PointCoord * 2. - 1.; // range -1 .. 1
            pc.y *= ar;
            if (abs(pc.y) > 1.) discard;  // the matrix display regions are not square, but the 'points' are
            // float zz = z / (length(pc) + 0.5);
            float zz = max(0., z - baseval);
            //float zz = z;
            gl_FragColor = vec4(zz,zz,zz,1.) * color;
            // gl_FragColor = sqrt(gl_FragColor);
        }`;

    muniforms = {
        pointSize: {type: 'f', value: 1},
        zrange: {type: 'f', value: 1},
        ar: {type: 'f', value: 1},
        baseval: {type: 'f', value: 0},
        distanceCompensate: {type: 'f', value: 1},
        r: {type: 'v4', value: new THREE.Vector4( 0, 1, 0, 1 )},
        color: {type: 'v4', value: new THREE.Vector4( 1, 1, 1, 1 )}
    };


    material = new THREE.ShaderMaterial({
        uniforms: muniforms,
        vertexShader: vs,
        fragmentShader: fs
    });
    material.depthTest = false;
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;
    material.transparent = true;


    //if (points) points.material = material;  // for dynamic change of shader
}  // shader

W.fileChooser.addEventListener('change', handleFileSelect, false);
function handleFileSelect(evt) {
    var sourcefile = evt.target.files;
       if (!sourcefile) return;
    for (var i = 0; i<sourcefile.length ; i++) {
        const f = sourcefile[i];
        const reader = new FileReader();

        reader.onerror = function(e) {
            //msgbox.textContent = "error reading file " + e.target.error.message;
            alert(W.msgbox.textContent);
        };

        // Closure to capture the file information.
        reader.onload = function(e) {
            //msgbox.textContent = "selecting from read data file ...";
            var lrawdata = e.target.result;
            handler(lrawdata, f.name);
        };
        reader.readAsText(f);        // start read in the data file
        //msgbox.textContent = "reading file ...";
    }
}


document.onkeydown = onDocumentKeyDown;


/**** experimental code does not work.  Why should drag-drop work but not copy-paste? * /
document.onpaste = function (event) {
  // use event.originalEvent.clipboard for newer chrome versions
  var items = (event.clipboardData  || event.originalEvent.clipboardData).items;
  console.log(JSON.stringify(items)); // will give you the mime types
  // find pasted image among pasted items
  var blob = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") === 0) {
      blob = items[i].getAsFile();
    }
  }
  // load image if there is a pasted image
  if (blob !== null) {
    var reader = new FileReader();
    reader.onload = function(event) {
      console.log(event.target.result); // data url!
    };
    reader.readAsDataURL(blob);
  }
}
/****/

/** strong lines etc for paper */
function strong() {
    linewidth = 5;
    window.W.running.classList.add("strong");
    W.dragger.innerHTML = "Drag to ...";
    muniforms.distanceCompensate.value = 0.8;
    zrangebase = 1500;
    muniforms.distanceCompensate.value = 1;
    zrangebase = 200;
    zrangefac = 1/Math.sqrt(rangefac);
    //muniforms.distanceCompensate.value = 0.5;
    //zrangebase = 700;
    if (stats) stats.domElement.style.display = "none";
    triMaterial.color = new THREE.Color(0.8,0.8,0.8);
    sepColor = new THREE.Color(1,1,1);
    rerender();
}

window.onload = function() {
    eval(window.location.href.post('?'));

}

var plotScene, plotGeometry, plotVertices, plotMaterial;
function plot() {
    // prepare for the plots ---------------------------------------------------------
    plotScene = new THREE.Scene();
    const cols = [0xffff00, 0x4444ff];
    const a = arguments;

    let xf = Math.log2; // f = x=>x; x=> 1/x; //
    let yf = Math.log2; // f = x=>x;
    //xf = yf = x=>x;

    const len = a[0].length;

    for (let n=0; n < a.length; n++) {
        const aa = a[n];

        plotGeometry = new THREE.Geometry();
        plotVertices = plotGeometry.vertices;
        plotMaterial = new THREE.LineBasicMaterial( { color: cols[n], linewidth:1, transparent: true} );
        var plotLine = new THREE.Line(plotGeometry, plotMaterial);
        plotScene.add(plotLine);
        let xx = 0;
        for (let i=1; i<aa.length/2-1; i++) {
            xx += aa[i];
            if (i % plot.avg === 0) {
                plotVertices.push(new THREE.Vector3(xf(i), yf(xx/plot.avg), 0));
                xx = 0;
            }
            //plotVertices.push(new THREE.Vector3(i+1, aa[i+1], 0));
        }
    }

    /* plot the individual particle distances
    plotGeometry = new THREE.Geometry();
    plotVertices = plotGeometry.vertices;
    plotMaterial = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth:1, transparent: true} );
    var plot = new THREE.LineSegments(plotGeometry, plotMaterial);
    plotScene.add(plot);
    for (let i = 2; i < 10; i++) {  // i is particle spacing
        const x = len / i;
        plotVertices.push(new THREE.Vector3(xf(x), yf(-10000), 0));
        plotVertices.push(new THREE.Vector3(xf(x), yf(100), 0));
    }
    for (let i = 20; i < 100; i+=10) {  // i is particle spacing
        const x = len / i;
        plotVertices.push(new THREE.Vector3(xf(x), yf(-10000), 0));
        plotVertices.push(new THREE.Vector3(xf(x), yf(100), 0));
    }
    /**/

    const statsp = getstats(a[0], {short:true});
    plotScene.scale.set(1/Math.max(xf(1), xf(len/2)), -0.1/yf(statsp.sd), 1);
    plotScene.position.set(-0.5,0.5,0);
    renderer.setViewport(0,0, vps[0].w*2, vps[0].h*2);
    renderer.render(plotScene, mcamera);

}
plot.avg = 1;

var CSynth = {};
var copyFrom;
CSynth.bc = new BroadcastChannel('csynth');
CSynth.bc.onmessage = function(ev) {
    const data = ev.data;
    switch (data.command) {
        case 'function':
            const fun = CSynth[data.function] || window[data.function];
            if (fun) {
                fun(...data.args)
            } else {
                console.error('bad message, no function', data);
            }
            break;
        case 'windowdata':
            copyFrom(window, data);
            break;
        case 'info':
            console.error('INFO message', data);
            break;
        case 'data':
            newdata(new Float32Array(data.positions), 'fromCSynth');
            break;
        default:
            console.error('bad message', data);
            break;
    }
};
CSynth.bc.postMessage({command: 'evalq', args: ["CSynth.bc.postMessage({command: 'data', positions: ccc0.data})"]});
