// 'copy' shader used to compose final canvas from separate rendertargets
// add clamp effect to stop wild values
// may later have effects added?
varying vec2 tpos;          // original position x,y  0..1
uniform vec2 res;           // resolution in input space
uniform float despeckle;    // ratio to use for despeckling
uniform sampler2D intex;    // input texture
uniform float renderRatio;  // ratio of input space to output space pixels
uniform float R;            // high of range for averaging samples (-R .. R)
uniform float S;            // step of range for averaging samples
uniform float bwthresh;     // if bwuse, then use as be threshold
uniform float bwuse;        // if != 0 then use bw

uniform float zoom;         // amount to zoom
uniform vec2 zoompos;       // centre of zoom  (0..1)

uniform float outpower;  // use for 1/gamma
uniform float softt;    // set soft clipping
uniform float screenR;
uniform float screenG;
uniform float screenB;
uniform float distortpixk;  // for pixel-saving distortion

#define spx (1./res.x)        // step to move 1 pixel in the INPUT
#define spy (1./res.y)
#define ires vec2(spx, spy)
//float R = renderRatio;
//float S = renderRatio;


/** get valuefor single sample, using lookup with whatever interpolation is defined by texture filters */
vec4 val1(vec2 p) {

	/*** pseodo-cubic  *** /  // does not help
	// from http://www.iquilezles.org/www/articles/texture/texture.htm
	vec2 myTexResolution = res;
	p = p*myTexResolution + 0.5;
    vec2 i = floor(p);
    vec2 f = p - i;
    f = f*f*f*(f*(f*6.0-15.0)+10.0);
    p = i + f;
    p = (p - 0.5)/myTexResolution;
	/**/

    vec4 r = texture2D(intex, p);
    r.a = float(r.g >= 0.);   // transparency signals is -ve green
    return r;
}

/** get valuefor single sample, using closest exact position */
vec4 val1p(vec2 pos) {
    pos = (floor(pos * res) + 0.5)/res;
    vec4 r = texture2D(intex, pos);
    r.a = float(r.g >= 0.);         // transparency signals is -ve green
    return r;
}


// define how to average: todo fit in with renderRatio (maybe even non integer)
// these may be #defines later for efficiency, but freer for now for tuning
// values imposed from graphbase.js
//#define R 0.01  	// range of the averaging
//#define S 1.	// step of the averaging

// BADBASE is passed down as bias in the .a component to indicate a bad normal
// badnormal detects this situation (as long as the raw .r is not > 5)
// and it can be compensated for if necessary by removing the BADBASE bias
// 10 April 2016, the .a calculation in val1() was masking BADBASE
// which wasn't being passed correctly anyway because xcold was applied BEFORE lighting.
// For now, we are not trying special processing here for badnormal.
//#define BADBASE -100.
//#define badnormal(v) (v.a < BADBASE + 5.)

/** get value at given pos using average of pixels, allowing for transparency and funny values (from normals) */
vec4 val(vec2 pos, float r, float s) {
    vec3 t = vec3(0.,0.,0.);    // cumulative value
    float a = 0.;               // cumulative number used
    vec3 tn = vec3(0.,0.,0.);   // cumulative value allowing for funny normals
    float an = 0.;		// cumulative number without funny normals
    float n = 0.;

	vec2 ipos = (floor(pos * res) + 0.5) * ires;  // should hit exact pixel

    float ddx = -r; 			// ddx and ddy are offsets from ipos in pixels
    for (int dx = 0; dx < 5; dx++) {  // silly glsl
        float ddy = -r;
        for (int dy = 0; dy < 5; dy++) {
			vec2 spos = ipos + vec2(ddx*spx,ddy*spy);  // sampling position
            vec4 v = val1(spos);
            float van;
            //if (badnormal(v)) {
            //    v.a -= BADBASE; 	// compensate and recover real red value
            //    van = 0.;		// but do not use in cumulative no funny normals
            //} else {
                van = v.a;
            //}
			vec2 sdist = spos - pos;
			float w = 1. / ( 0.00001 + dot(sdist, sdist) ); // 1. / (1. + abs(ddx)) * 1. / (1. + abs(ddy));
            t += v.rgb * v.a * w;
            a += v.a * w;
            tn += v.rgb * van * w;
            an += van * w;
            n += w;
            ddy += s; if (ddy > r) break;
        }
        ddx += s; if (ddx > r) break;
    }
    // return (a == 0.) ? val1(pos) : vec4(t/a, a/n);

    vec4 rrr;
    if (a == 0.) {
        rrr = vec4(0.,0.,0.,0.);
    } else if (an == 0.) {      // no good normals so use the average from the bad normals
        rrr = vec4(t/a, a/n);
    } else {
        rrr = vec4(tn/an, a/n);    // at least one good normal, use the average of the good normals
    }
    return rrr;

//    return (a == 0.) ? vec4(0.,0.,0.,1.) : vec4(t/a, a/n);  // black where no good evidence
    // IE compiler worked with conditional return as alternative here
}


/** get value at given pos using average of pixels, do not allow for background, bad normals etc */
vec4 valAVG(vec2 pos, float r, float s) {
    vec3 t = vec3(0.,0.,0.);    // cumulative value
    float a = 0.;               // cumulative number used
    vec3 tn = vec3(0.,0.,0.);   // cumulative value allowing for funny normals
    float an = 0.;		// cumulative number without funny normals
    float n = 0.;
    //@float maxg = 0.; vec4 max; // to kill max value; horrible on menu

	vec2 ipos = (floor(pos * res) + 0.5) * ires;  // should hit exact pixel

    float ddx = -r; 			// ddx and ddy are offsets from ipos in pixels
    for (int dx = 0; dx < 5; dx++) {  // silly glsl
        float ddy = -r;
        for (int dy = 0; dy < 5; dy++) {
			vec2 spos = ipos + vec2(ddx*spx,ddy*spy);  // sampling position
            vec4 v = val1p(spos);
            float van;
            t += v.rgb;
            n += 1.;
            //@if (v.g > max.g) max = v;
            ddy += s; if (ddy > r) break;
        }
        ddx += s; if (ddx > r) break;
    }
    vec3 res = t / n;
    //@vec3 res = (t - max.rgb)/(n - 1.);

    return vec4(res, 1.);

//    return (a == 0.) ? vec4(0.,0.,0.,1.) : vec4(t/a, a/n);  // black where no good evidence
    // IE compiler worked with conditional return as alternative here
}


/** get max from 4 immediate neighbours
vec4 val4(vec2 pos) {
	vec4 mmax = val1(pos + vec2(spx, 0.));
	mmax = max(mmax, val1(pos + vec2(-spx, 0.)));
	mmax = max(mmax, val1(pos + vec2(0., spy)));
	mmax = max(mmax, val1(pos + vec2(0., -spy)));
	return mmax;
}
*/

/** get min and max from 4 immediate neighbours */
void minmax(vec2 pos, out vec4 mmin, out vec4 mmax) {
    vec4 a = val1(pos + vec2(spx, 0.));
    vec4 b = val1(pos + vec2(-spx, 0.));
    vec4 c = val1(pos + vec2(0., spy));
    vec4 d = val1(pos + vec2(0., -spy));
    mmin = min(min(a,b), min(c,d));
    mmax = max(max(a,b), max(c,d));
}


//#define renderRatio 1.
//#define R 1.

void main(void) {
//gl_FragColor = vec4(1.,0.,1.,1.); return;
    vec4 rrr;  // result before final tuning

	// implement variable pixel size distortion, must match threek.vs
#ifdef DISTORTPIX
	float dp = distortpixk;
	vec2 xy = tpos * 2. - 1.;   // into -1 .. 1
	xy = (1.+dp) * xy - dp *xy*xy*xy;
	vec2 rpos = (xy + 1.) * 0.5;		// back to 0 .. 1
#else
	vec2 rpos = tpos;
#endif

#define NOTEST	// for newsc just use interpolation for now, >>> todo check
#ifdef TEST
rrr=val(rpos, 1., 1.);

#else

    if (zoom > 0. && rpos.x > 0.5 && rpos.y > 0.5) { // display zoom area if required
        rrr = val1p(zoompos + (rpos - 0.75) / zoom);
        if (rrr.a == 0.) rrr = vec4(1.,0.,1.,1.);  // debug
    } else {                                            // normal display

        #define NODSANTI
        #ifdef DSANTI  // skip despekle, antialias etc if NOT defined
        if (renderRatio >= 1.) {
            //vec4 vxx = val1(rpos + vec2( 0.0,  0.0));
            vec4 vxx = val1(rpos);
            if (vxx.w == 0.) discard;
            if (R < 0.) {
                rrr = vxx;
            // IE compiler does not accpt conditional return here
            } else {
                //if (vxx.r < 0.) discard;
                //if (vxx.w != 1.) { gl_FragColor = vec4(1.,1.,0.,1.); return; }
                // todo, mix this filtering with the averaging filter better

                // sample surround
                vec4 avg = val(rpos, 1., 1.);

                // and clamp this to a factor despeckle of average
                // despeckling low with avg/despeckle did not help enough
                rrr = clamp(vxx, avg / despeckle, avg * despeckle);
                if (vxx.w == 0.) rrr = avg;
                if (avg.w == 0.) discard;    // ?? todo, semi transparent

            }
        } else {
            rrr = val(rpos, R, S);
            //
            if (rrr.w == 0.) discard;
        }
        #else  // end DSANTI
            if (renderRatio == 1.) {
                rrr = val1(rpos);
            } else {
                rrr = valAVG(rpos, R, S);
            }
            //rrr = val1(rpos);  // use local if good

            // experiment for different despeckle
            //if (despeckle < -998.) {
            //    vec4 mmin, mmax;
            //    minmax(rpos, mmin, mmax);
            //    rrr = min(max(rrr, mmin), mmax);
            //}
			//rrr = min(rrr, val4(rpos));
            //if (badnormal(rrr))	// if not good (no good latenormals) then find from surround
            //    rrr = val(rpos, R,S);
		#endif	// end NOT DSANTI
    } // normal nonzoom
#endif // NOT TEST

    if (rrr.a == 0.) discard;

    // soft clip, Evolutionary Art p 179
    float rr = max(max(rrr.x, rrr.y), rrr.z);
    if (rr > softt) {
        float ss = 1. - (1.-softt)*(1.-softt) / (rr + 1. - 2.* softt);
        float rat = ss/rr;
        rrr.xyz *= rat;
    }

    if (bwuse != 0.) {
        float t = float(rr > bwthresh);
        rrr.xyz = vec3(t,t,t);
    }
    rrr.r *= screenR;
    rrr.g *= screenG;
    rrr.b *= screenB;

    rrr = pow(abs(rrr), vec4(outpower, outpower, outpower, 1.));

    gl_FragColor = rrr;


}
