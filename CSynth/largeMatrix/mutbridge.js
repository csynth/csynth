// declarations to prevent 'undeclared global' and work towards namespace cleanup
var THREE, renderer, uniforms, currentGenes, horn, resetMat, postCache, XMLHttpRequest,
message, firstfail, location, serious, loadedfiles;

// interface for use outside Organic context
if (!uniforms) uniforms = {};
function adduniform(name, def, type) {
	type = type || "f";
	if (uniforms[name])
		uniforms[name].value = def;
	else
		uniforms[name] = { type: type, value: def };
}

function addgeneperm(name, def, min, max, delta, step, help, tag, free, internal) {
	adduniform(name, def);
}

function rrender(why, scene, camera, renderTarget, forceClear) {
	renderer.setRenderTarget(renderTarget);
	renderer.render(scene, camera, renderTarget, forceClear );
}

function setval(name, val) {
	uniforms[name] = val;
}
var addgene = adduniform;

function nop() {};

var Maestro = {stop: nop, start: nop, onUnique: nop, remove: nop };
var kinect = {standardOff: nop};
var trysetele = nop;


/** return part of string before k, or all string if k not found */
String.prototype.pre = String.prototype.pre || function (k) {
    var i = this.indexOf(k);
    return i === -1 ? this.toString() : this.substring(0, i);
};

/** return part of string after k, or undefined if k not found */
String.prototype.post = String.prototype.post || function (k) {
    var i = this.indexOf(k);
    return i === -1 ? undefined : this.substring(i + k.length);
};

/** return part of string after k, or undefined if k not found */
String.prototype.contains = String.prototype.contains || function (k) {
    var i = this.indexOf(k);
    return i !== -1;
};



// wrapper for new rendertarget, with added name option
function WebGLRenderTarget(width, height, options, name) {
    var r = new THREE.WebGLRenderTarget(width, height, options);
    r.name = name;
    return r;
}

/** create a new identified scene */
function newscene(s) {
    var scene = new THREE.Scene();
    scene.autoUpdate = false;
    scene.name = s + newscene.id++;
    scene.frustumCulled = false;
    return scene;
}
newscene.id = 0;

// we use scenes in a very limited way, so this makes it easier to optimize our setup calls
THREE.Scene.prototype.addX = function sceneaddX(m) {
	this.add(m);
	/*** /
	m.updateMatrix();
	this.updateMatrix();
	m.updateMatrixWorld();
	this.updateMatrixWorld();
	m.matrixAutoUpdate = false;
	this.matrixAutoUpdate = false;
	/***/

}

/** post a uri and return result string, if error if errres return errres else throw error  */
function posturi(puri, data, errres) {
    //console.log("post:" + uri);
    var uri = puri;
    var useMyCache = false;
    if (data === undefined && uri.indexOf(".txt") === -1) {
        if (postCache[uri]) return postCache[uri];  // cache queries but not write requests or database access
        data = "";
        useMyCache = true;
    } else {
        //uri += "?date=" + Date.now();   // force no lower level cache, write or db access
    }
    try {
        var req = new XMLHttpRequest();

        // nb, POST ensures browser cache not used, but does not work with NetBeans web server
        // and sometimes fails under other conditions.
        // GET with extra ? seems to work ok
        if (!data) uri += "?date=" + Date.now();
        //console.log("posting ..." + uri);
        req.open(data ? "POST" : "GET", uri, false);
        req.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
        req.send(data);
        if (useMyCache) postCache[puri] = req.responseText;  // set cache if useful
        return req.status === 200 ? req.responseText : errres;
    } catch (e) {
        message("post failed " + e);
        if (arguments.length>= 3) return(errres);  // cannot check errres direct in case it is explicitly undefined
        console.error("post failed " + e);
        if (firstfail) {
            firstfail = false;
            var msg = ["Failed to load data, maybe because no web server used.",
                "Try loading files by hand, click on 'Choose files' near top of main gui",
                "navigate to '" + location.pathname + "/../shaders' and select all files."
            ];
            serious(msg.join("\n"), e);
        }
        throw e;
    }
}


/** get file data, either from preloaded cache, or from posturi, return undefined if none */
function getfiledata(fn) {
    var base = fn.substr(fn.lastIndexOf("/")+1);
    var pre = loadedfiles[base];
    return pre || posturi(fn, undefined, undefined);
}


///////////////>>>>>>>>>>>> start real code

var stepsPerStep = 200;

/** get the body from a function */
function getBody(f) {
	if (typeof f !== 'function') return f;  // getBody no longer needed with `` strings
	return f.toString().post('/*').pre('*/');
}

/** get file data, assumed to be in javascript getdata[xxx] */
function getdata(fid) {
	var fidx = fid.pre('?');
	var sh = getdata[fidx];
	return getBody(sh);
}

/** make sure n looks like a float to glsl */
function ffloat(n) {
    n = n + '';
    if (n.indexOf('.') !== -1) return n;
    if (n.indexOf('e') !== -1) return n;
    if (n.indexOf('E') !== -1) return n;
    return n + '.0';
}

function substituteVirtualShaderCode(s) { return s;}
function doInclude(s) { return s;}
function parseUniforms() {}
var ColorKeywords = {};
for (var k in {red:0, green:0, black:0, white:0}) ColorKeywords[k] = new THREE.Color(k);

Maestro = {};
Maestro.trigger = ()=>{};
Maestro.onUnique = ()=>{};
Maestro.remove = ()=>{};

currentGenes = this;

var shaderdef = nop;
var changeMat = nop;
var setInput = nop;
var W = this;

