// ~~~~~~~~ almost always take the not OPTEST route
#if OPMODE != OPTEST

gene(distortpixk, 0, 0,0.5,0.01,0.1,gtex,frozen)  // k for pixel distortion

//#if (OPMODE == OPOPOS2COL || OPMODE == OPSHAPEPOS || OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL)
uniform mat4 rot4;  // rotation part of viewing transform
uniform mat4 rot44d;  // 4d viewing transform

uniform float pointSize;

//attribute vec3 position;
//#if OPMODE == OPMAKESKELBUFF
#if __VERSION__ < 300
	attribute float instanceID;
#else
	#define instanceID float(gl_InstanceID)  // needs 1.40 or above, but use with gles  300 es
#endif

#if (OPMODE == OPREGULAR || OPMODE == OPOPOS || OPMODE == OPTEXTURE)
	varying vec4 opos;         // original position passed, ????? // ??? todox should not need to pass this always, but ... temp to help USESKELBUFF
#else
	vec4 opos;  // some time remove this and references to it, but optimizer should do that anyway ???
#endif
// todo, note that always passing makes it look as if it is around at fragment when it may not be set in vertex
float reflnorm = 1.;  // keep track of reflections so normals can be corrected, passed from hornmaker to lights
float xhornid = -99.;
float colourid;	// used for colouring, usually == xhornid, not really used in vertex shader? but may be referenced
uniform sampler2D pickrt;  //pick texture
#include common.vfs;

#if (OPMODE == OPTSHAPEPOS2COL)
#else
	#include hornmaker.vs;
#endif

#ifdef U360
    varying vec4 poskey;    // used to check for wraparound
#endif
uniform float gridExtra;  // used to extend grid and waste part of it ...
gene(USELOGDEPTH, 0, 0,1, 1,1, system, frozen) // 0 no log depth, >0 our old log, <0 three compatible log,

const float logDepthBufFC = 0.15;  // may adapt to camera later, but this should be fine???
const float EPSILON = 1e-6;  // from three.js

// change ooo to work for logarithmic depth, note, shared with springsynth.js
vec4 logdepth (in vec4 ooo) {
    if (USELOGDEPTH > 99.) {        // special for no depth shadows, when using shadows for usemask=0
    } else if (USELOGDEPTH > 0. || OPMODE == OPSHADOWS) {  // old
        // note, shadows are hard-coded to use the inverse of this version regardless of USELOGDEPTH
        float z = ooo.w;
        ooo.xy /= z;
        ooo.w = 1.;
        // ooo.z = ( (z - _camd.x) * _camd.y * 2.) - 1.;  // range -1..1
        ooo.z = ( (log(z) - _camd.z) * _camd.w * 2.) - 1.;  // log range -1..1
    } else if (USELOGDEPTH < 0.) {  // three.js compatible;
        // but there are issues so do not use for now
        // in particular, it seems to get camera.near wrong
        ooo.z = log2(max( EPSILON, ooo.w + 1.0 )) * logDepthBufFC;
        ooo.z = (ooo.z - 1.0) * ooo.w;
    }
    // else no log needed
    return ooo;
}

/*** from three.js ... the way they do logarithmic depth buffer
	var logdepthbuf_pars_vertex = "
    #ifdef USE_LOGDEPTHBUF
        #ifdef USE_LOGDEPTHBUF_EXT
            varying float vFragDepth;
        #endif
        uniform float logDepthBufFC;
    #endif";

	var logdepthbuf_vertex = "
    #ifdef USE_LOGDEPTHBUF
        gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;
        #ifdef USE_LOGDEPTHBUF_EXT
            vFragDepth = 1.0 + gl_Position.w;
        #else
            gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;
        #endif
    #endif\n";


    p_uniforms.setValue( _gl, 'logDepthBufFC', 2.0 / ( Math.log( camera.far + 1.0 ) / Math.LN2 ) );
    2.0 / ( Math.log( 10000 + 1.0 ) / Math.LN2 ) => 0.15


***/

void main()	{

    float id = instanceID;              // used for instancing version
    vec4 p;
    #if 1==2
    #elif defined(NOTR)
        p = vec4(position, 1.);
        p.z += id;
    #elif defined(GPUGRIDN) && ( OPMODE == OPOPOS || OPMODE == OPPOSITION || OPMODE == OPSHADOWS ) // || OPMODE == OPMAKESKELBUFF )
        #if (1==2)  // vertexid not supported on webgl 1.0
            float vid = float(gl_VertexID);
        #else
            float vid = float(positioni);
        #endif
		{
		#if (OPMODE == OPMAKESKELBUFF)  // not working right now
			float i = 0.;
			float j = ( (vid-2.) / (lennum+5.) ) - 0.5;
		#else
			float i = floor (vid / (lennum+1.) ) / (radnum) - 0.5;
			float j = fract (vid / (lennum+1.) ) - 0.5;
		#endif
		p = vec4(j, i, id, 1.);
		}
    #else
		p = vec4(position.xy, id, 1.);    // input range for x,y  -0.5 .. 0.5, usually mapped to 0..1 below
        //p = vec4(position, 1.);
		//p.z = id;
	#endif

    #ifdef XNORMALDEFINED
        xnormal = normal;           // pass down javascript defined normal
        if (abs(normal.x) == 1.) xnormal.z += 0.0001;  // otherwise left and right walls disappear.  Why???. sjpt 4 Aug 2015
    #endif

//////#define QUICK // for performance comparison,
// OPOS becomes as simple as possible and we can see essential cost of processing triangles
// (10ms for horns for perfmirror)
	#if (defined(QUICK) && OPMODE == OPOPOS)
		gl_Position = vec4(1e20, 1e20, 1e20, 1.);
		opos = p;
		return;

    #elif (OPMODE == OPOPOS2COL || OPMODE == OPSHAPEPOS || OPMODE == OPTSHAPEPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPBUMPNORMAL)
        // operations that work on image buffer->buffer
        //?p.x += 0.5; p.y += 0.5;     // to range 0 .. 1  including both ends
		//?opos = p;
        gl_Position = p;
        return; // end cases of buffer->buffer
    #else
    //### ~~~ below here, operations that work on triangle geometry ~~~
        #ifdef NOTR  // move plane box from -0.5 ,, 0.5 to 0..1
        #else
            p.x += 0.5; p.y += 0.5;     // to range 0 .. 1  including both ends
            // p.z += modelMat rix[3][2];   // used to pass extra instance information for old style horn render
            #if (OPMODE != OPTSHAPEPOS2COL)
                if (NORMTYPE >= 5.) p.y *= 0.5;  // only forward facing parts needed with NORMTYPE=5
            #endif
        #endif

        vec4 shapepos;
        opos = p; // ??? should not need to pass this always, but ... temp to help USESKELBUFF
        #if (OPMODE == OPMAKESKELBUFF)
            objpos = trskel(p);
            opos = vec4(999.,999.,999.,999.);  // not used
            gl_PointSize = 1.;
            gl_Position =  vec4(skbuffpointscreen(p.xyz, skelnum), 0., 1.);
            return;
        #endif

        vec3 xmu, xmv, xmnormal;    // normals computed by tr and used by computeNormalsEtc
        vec3 unusedtexpos;
        float unusedribnum;
        #ifdef SINGLEMULTI
            float vv = opos.z;
            #ifdef COMMON
                // <<<< skip chooseHornCode for COMMON
                ribs = 99.;
            #else
                // <<<< chooseHornCode
                $$$chooseHornCode$$
            #endif

        #endif
        shapepos = tr(p, xmnormal, unusedtexpos, unusedribnum);


        gl_PointSize = pointSize;
        #if (OPMODE == OPMAKEGBUFFX)
            objpos = shapepos;
            objpos.w = 1.; // xr;
            gl_PointSize = 1.;
            gl_Position =  vec4(buffpointscreen(p.xyz, lennum, radnum), 0., 1.);
            return;
        #elif OPMODE == OPPOSITION
            // put the coord into one of 8 slots, thus gather mins and maxs
            // assume there is a total of 8 slots with 2 unused
            // there will be slightly random sampling of sample->value recorded,
            // but plenty good enough to give adequate value
            gl_PointSize = 1.;
            float q = mod(p.x * lennum +  p.y * radnum, 8.);
            float l;  // to hold the value that will be passed
            vec4 rr;  // to hold gl_Position
            if (q < 1.) { l = -shapepos.x; rr.x = -7./8.; }
            else if (q < 2.) { l = shapepos.x; rr.x = -5./8.; }
            else if (q < 3.) { l = -shapepos.y; rr.x = -3./8.; }
            else if (q < 4.) { l = shapepos.y; rr.x = -1./8.; }
            else if (q < 5.) { l = -shapepos.z; rr.x = 1./8.; }
            else if (q < 6.) { l = shapepos.z; rr.x = 3./8.; }
            else if (q < 7.) { l = -shapepos.w; rr.x = 5./8.; }
            //else if (q < 999.) { l = shapepos.z; rr.x = 3./8.; }
            else { l = shapepos.w; rr.x = 7./8.; }
            rr.y = 0.;
            // map rl to range -1 to 1, right for depth buffer
            // rl in -1 to 1 maps to ll=0 ~~~ this means we can't scale tiny objects
            // rl > 1 maps to negative values, rl < -1 maps to negative values
            // extreme or incorrect values (eg NaN) are ignored
            // with tr/l scale 128 as below we can go down to around 1/00, an up to around 1e6
            // The scaling and other l=>ll code does not affect scalVary itself,
            // it only affects the value in the depth buffer to ensure appropriate min/max
            float rl = l * 128.;
            float ll = 0.;
            if (rl > 1.) ll = - log(rl) / 20.;
            if (rl < -1.) ll = log(-rl) / 20.;
            if (ll < -1. || ll > 1.) rr.x = 999.;      // ignore points computed wrong  ll in range [-1 .. 1]
            if (ll != ll) rr.x = 999.;                 // ignore points computed wrong
            rr.z = ll; rr.w = 1.;
            gl_Position = rr;
            //#ifdef GPUSCALE		// NO always use this and get data with readWebGLFloat
                scaleVary = l;      // pass the full floating point number for easy use in GPU, and on GPU by readWebGLFloat
            //#else
            //    scaleVary = ll;     // pass the log to help turn to integer and scale for transfer to CPU
            //#endif
            return;
        #endif

        vec4 trpos = shapepos * rot4;           // do our 4d rotation NOT OPTEST
        trpos = vec4(trpos.xyz, 1.);            // for gl, flatten to 3d
        vec4 ooo;
        #if (OPMODE == OPTSHAPEPOS2COL || OPMODE == OPOPOS2COL || OPMODE == OPTEXTURE || OPMODE == OPSHAPEPOS)
            // camera is passed in but should not be used for this stage,
            // just there for lighting
            gl_Position = trpos;
            return;
        #endif

        vec4 mtrpos = modelViewMatrix * trpos;  //

        #ifdef U360
            float x = mtrpos.x, y = mtrpos.y, z = mtrpos.z; // extract x,y,z for easy reading
            float w = projectionMatrix[0][0], h = projectionMatrix[1][1];
            ooo.x = atan(z, x) / 3.14159;
            ooo.y = atan(y, sqrt(x*x + z*z)) * 2. / 3.14159;
            ooo.z = sqrt(x*x + y*y + z*z) / 5000.0; // temp
            ooo.w = 1.;

            // pass on keys that help check for wraparound triangles
            poskey.x = (ooo.x > 0.) ? 1. : 0.;
            poskey.y = (ooo.x > 0.33) ? 7. : (ooo.x > -0.33) ? 6. : 5.;
        #else
            ooo = projectionMatrix * mtrpos;   // save in standard gl format

            #if 1 == 1 ||  OPMODE == OPSHADOWS
            // for more sensible depth range, but beware, this makes things WORSE for z-fighting of main (non-shadow) object
            // no, that seems ok, indeed better> 12/1/18
            // BUT using it for other than shadows gives very odd effect, espeicially if very near a wall ... TODO check
            // there may be issues going through walls???? TODO
                ooo = logdepth(ooo);
            #endif

        #endif



        gl_Position = ooo;
        #if OPMODE == OPSHADOWS && defined(USEVSHAD)
            // If we do not divide by w, saved shadow depths used not get used correctly.
            // Just letting gl_Position->gl_FragCoord do it's thing and everything works ok
            // If we always divide by w, objects that get wrapped around camera give bad issuse.
            vdepth = ooo.z;  // higher precision
        #else
        #endif

        //#if OPMODE != OPREGULAR && OPMODE != OPOPOS
        //	gl_Position = vec4(0.,0.,0.,0.);  // should never be reached, just a check
        //#endif

        // implement distortion for variable pixel size, must match four.fs
        #if defined(DISTORTPIX)
            gl_Position /= abs(gl_Position.w);
            float dp = distortpixk;

            vec2 xy = gl_Position.xy;
            xy = clamp(xy, -1.1, 1.1);  // stop object behind head getting seen, NOT needed in four.fs
            xy = (1.+dp) * xy - dp *xy*xy*xy;
            gl_Position.xy = xy;
        #endif

        #if (OPMODE == OPREGULAR)
            opos = p;
            opos.w = xhornid;
        #endif
        #if (OPMODE == OPOPOS)
            opos = p;
            opos.w = xhornid;
        #endif
    //### ~~~ above here, operations that work on triangle geometry ~~~
    #endif
    }  // end main()

// ~~~~~~~~ almost always take the not OPTEST route, below here just for debug
#else  // OPTEST

// used for various tests, currently simple opopos
varying vec4 opos;         // original position passed, ????? // ??? todox should not need to pass this always, but ... temp to help USESKELBUFF
uniform mat4 rot4;  // rotation part of viewing transform
uniform mat4 rot44d;  // 4d viewing transform
uniform float flatx, flaty, flatz, horncount, flatxfrominst;


//attribute vec3 position;
attribute float instanceID;
// todo vertex ID changes


void main()	{ // <<<<<<<<<<<<<<<<< OPTEST VERSION, performance tests only, not in regular use
    vec4 p = vec4(position, 1.);    // input range for x,y  -0.5 .. 0.5, usually mapped to 0..1 below
    p.z += instanceID;              // used for instancing version
    p.x += 0.5; p.y += 0.5;     // to range 0 .. 1  including both ends
    opos = p;
	vec4 f = (opos - vec4(0.5, 0.5, 0.5*horncount, 0.)) * vec4(flatx, flaty, flatz/horncount, 1.);
	f.x += flatxfrominst/horncount*opos.z;

	vec4 shapepos = f;

	vec4 trpos = shapepos * rot4w;           // do our 4d rotation OPTEST
    trpos = vec4(trpos.xyz, 1.);            // for gl, flatten to 3d
	vec4 mtrpos = modelViewMatrix * trpos;
	vec4 ooo = projectionMatrix * mtrpos;
	gl_Position = ooo;
}

#endif  // OPTEST

// end overrides here, needed for overrides that access methods and uniforms, etc
$$$endoverrides$$
