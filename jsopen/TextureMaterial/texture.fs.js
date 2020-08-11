import {} from './noiseGLSL.fs.js';
import {} from './pohnoise.fs.js';

window.THREE.ShaderChunk.O_texture = /*glsl*/`
#ifndef TEXTUREDEFINED
#define TEXTUREDEFINED
#include <O_noiseGLSL>
#include <O_pohnoise>

// for alternative perlin
//# include noise2.glsl;
// for lookup based wincat
//uniform sampler2D wincattext;

// maybe silly values taken from Evolutionary Art and Computers, p203
const vec3 k1 = vec3(0.99, 0.89, 0.79);
const vec3 k2 = vec3(0.69, -0.59, 0.49);
const vec3 k3 = vec3(1.99, 1.89, -1.79);
const vec3 k4 = vec3(1.29, -1.59, -1.49);

// TODO prepare iii for real 4d
//const float iii = 0.;
const vec3 v1 = vec3(1.,0.,0.);
const vec3 v2 = vec3(0.,1.,0.);
const vec3 v3 = vec3(0.,0.,1.);
const vec3 v4 = vec3(0.,k1.y,k1.z);
const vec3 v5 = vec3(0.,k2.y,-k2.z);
const vec3 v6 = vec3(k1.x,0.,k3.z);
const vec3 v7 = vec3(k2.x,0.,-k4.z);
const vec3 v8 = vec3(k3.x,k3.y,0.);
const vec3 v9 = vec3(k4.x,-k4.y,0.);
const vec3 v10 = vec3(1.,1.,1.);

vec4 colpos = vec4(-999,-999,-999,-999);   // position used in colour work; initialization to prevent warning messages

uniform sampler2D rttexture;

struct Colsurf {
    vec4 col;
    vec4 surftype;  // shininess, gloss, subband, plastic
	vec4 fluoresc;  // floorescH/S/V,  iridescence
} fff;

Colsurf colsurf(in vec4 col, in vec4 surftype, in vec4 fluoresc) {
    Colsurf r;
    r.col = col;
    r.surftype = surftype;
	r.fluoresc = fluoresc;
    return r;
}

Colsurf mixx(in Colsurf a, in Colsurf b, in float p) {
    Colsurf r;
    r.col = mix(a.col, b.col, p);
    r.surftype = mix(a.surftype, b.surftype, p);
	r.fluoresc = mix(a.fluoresc, b.fluoresc, p);
    return r;
}

//const float time = 0.;  // might want to use it later
// animation function, multiplier, range 0..1
//float aa(float kt) {
//    return (1. + sin(time*kt)) * 0.5;
//}

// NOTE groups of 4 and ordering significant below
genet(red1, 1, 0, 1, u, 0.01, texture, frozen)  // red 1
genet(green1, 0, 0, 1, u, 0.01, texture, frozen)  // green 1
genet(blue1, 0, 0, 1, u, 0.01, texture, frozen)  // blue 1
genet(refl1, 0.5, 0, 1, u, 0.01, texture, frozen)  // reflection 1

genet(red2, 0, 0, 1, u, 0.01, texture, frozen)  // red 2
genet(green2, 1, 0, 1, u, 0.01, texture, frozen)  // green 2
genet(blue2, 1, 0, 1, u, 0.01, texture, frozen)  // blue 2
genet(refl2, 0.5, 0, 1, u, 0.01, texture, frozen)  // reflection 2

genet(red3, 0, 0, 1, u, 0.01, texture, frozen)  // red 3
genet(green3, 1, 0, 1, u, 0.01, texture, frozen)  // green 3
genet(blue3, 1, 0, 1, u, 0.01, texture, frozen)  // blue 3
genet(refl3, 0.5, 0, 1, u, 0.01, texture, frozen)  // reflection 3

genet(reflred, 1, 0, 1, u, 0.01, texture, frozen)  // red for reflection
genet(reflgreen, 1, 0, 1, u, 0.01, texture, frozen)  // green for reflection
genet(reflblue, 1, 0, 1, u, 0.01, texture, frozen)  // blue for reflection
genet(texscale, 50, 30, 100, u, 0.1, texture, frozen)  // texture scale //brussels increased min

//ene(texoffset, 0, -2, 2, u, 0.01, texture, frozen)  // offset of texture to change relative thickness of bands
genet(band1, 1, 0,10, u, 0.1, texture, frozen)  // width of band 1
genet(band2, 1, 0,10, u, 0.1, texture, frozen)  // width of band 2
genet(band3, 1, 0,10, u, 0.1, texture, frozen)  // width of band 3
genet(bandbetween, 0.1, 0, 5, u, 0.01, texture, frozen)  // scale of the area where extreme colors are mixed

const float i10 = 10.; //geneno(i10, 10., 0, 30, u, 0.1, texture, frozen)  // debug: i10 factor for w4
genet(texrepeat, 1., 0.1, 2, u, 0.1, texture, free)  // texture repeat rate within pattern //brussels changed range
genet(texfinal, 1., 0.,1., u, 0.1, texture, frozen)  // control final lookup
genet(texfract3d, 1., 0.,1., u, 0.1, texture, frozen)  // control whether texture based n texpos or grid opos final lookup


genet(texalong, 0, 0,20, 2, 0.2, texture, frozen)  // texture vary along shape
genet(texaround, 0, 0,20, 2, 0.2, texture, frozen)  // texture scale around shape
genet(texribs, 0, 0,20, 2, 0.2, texture, frozen)  // texture scale along ribs
genet(texalong1, 0, 0,20, 2, 0.2, texture, frozen)  // texture vary along shape
genet(texaround1, 0, 0,20, 2, 0.2, texture, frozen)  // texture scale around shape
genet(texribs1, 0, 0,20, 2, 0.2, texture, frozen)  // texture scale along ribs
genet(texalong2, 0, 0,20, 2, 0.2, texture, frozen)  // texture vary along shape
genet(texaround2, 0, 0,20, 2, 0.2, texture, frozen)  // texture scale around shape
genet(texribs2, 0, 0,20, 2, 0.2, texture, frozen)  // texture scale along ribs
genet(texdiv, 3, 0,10, 0.1, 0.01, texture, frozen)  // texture divisor

genet(wob, 1, 0, 5, u, 0.01, texture, frozen)  // 'wobble' to apply to texture
genet(bumpscale, 20, 2, 50, u, 0.01, texture, frozen)  // scale of bumpmap bumps
genet(bumpstrength, 1, 0, 1, u, 0.01, texture, frozen)  // strength of bumpmap bumps
// g e n e(bumpclamp, 0.5, 0, 1, u, 0.01, texture, frozen)  // clamp max effect of bumpmap bumps

genet(shininess1, 25, 1.01, 100, 0.1, 0.1, texture, frozen) // set the shininess, higher number for sharper highlight
genet(gloss1, 0.6, 0, 1, 0.01, 0.01, texture, frozen) // set the gloss
genet(subband1, -1, -1, COL.NUM, 1, 1, texture, frozen) // subband
genet(plastic1, 0.5, 0, 1, 0.01, 0.01,  texture, frozen) // pastic=1 has white highlights

genet(shininess2, 25, 1.01, 100, 0.1, 0.1, texture, frozen) // set the shininess, higher number for sharper highlight
genet(gloss2, 0.6, 0, 1, 0.01, 0.01, texture, frozen) // set the gloss
genet(subband2, -1, -1, COL.NUM, 1, 1, texture, frozen) // subband
genet(plastic2, 0.5, 0, 1, 0.01, 0.01,  texture, frozen) // pastic=1 has white highlights

genet(shininess3, 25, 1.01, 100, 0.1, 0.1, texture, frozen) // set the shininess, higher number for sharper highlight
genet(gloss3, 0.6, 0, 1, 0.01, 0.01, texture, frozen) // set the gloss
genet(subband3, -1, -1, COL.NUM, 1, 1, texture, frozen) // subband
genet(plastic3, 0.5, 0, 1, 0.01, 0.01,  texture, frozen) // pastic=1 has white highlights

genet(fluorescH1, 0.5, 0, 1, 0.01, 0.01, texture, frozen) // fluorescent Hue
genet(fluorescS1, 0.5, 0, 1, 0.01, 0.01, texture, frozen) // fluorescent Saturation
genet(fluorescV1, 0.0, 0, 1, 0.01, 0.01, texture, frozen) // fluorescent Value
genet(iridescence1, 0.1, -0.5, 0.5, 0.01, 0.01, texture, free) // amount to modulate texture colour hue depending on viewing angle

genet(fluorescH2, 0.5, 0, 1, 0.01, 0.01, texture, frozen) // fluorescent Hue
genet(fluorescS2, 0.5, 0, 1, 0.01, 0.01, texture, frozen) // fluorescent Saturation
genet(fluorescV2, 0.0, 0, 1, 0.01, 0.01, texture, frozen) // fluorescent Value
genet(iridescence2, 0.1, -0.5, 0.5, 0.01, 0.01, texture, free) // amount to modulate texture colour hue depending on viewing angle

genet(fluorescH3, 0.5, 0, 1, 0.01, 0.01, texture, frozen) // fluorescent Hue
genet(fluorescS3, 0.5, 0, 1, 0.01, 0.01, texture, frozen) // fluorescent Saturation
genet(fluorescV3, 0.0, 0, 1, 0.01, 0.01, texture, frozen) // fluorescent Value
genet(iridescence3, 0.1, -0.5, 0.5, 0.01, 0.01, texture, free) // amount to modulate texture colour hue depending on viewing angle

genet(tex2dxstretch, 1, 0, 1000, 1, 10, texture, free) // amount to stretch 2d textures in x (along)
genet(tex2dystretch, 1, 0, 100, 1, 10, texture, free) // amount to stretch 2d textures in y (around)

gene(g_hueshift, 0, 0, 1, 0.1, 0.1, texturex, frozen) //global colour shift to rotate colour scheme


// ge ne (hsvprop, 1, 0., 1., 0.1, 0.1, gtex, frozen)  // proportion of hsv to use

const float bumpclamp = 0.5;     // clamp max effect of bumpmap bumps,  not gene, William will misuse it

//? to allow some element of 2d texture ~ not the right way
//?ene(use3d, 1,0,2, u, 0.01, texture, frozen) // proportion of 3d to use
//?ene(useox, 0,0,2, u, 0.01, texture, frozen) // proportion of original x
//?ene(useoy, 0,0,2, u, 0.01, texture, frozen) // proportion of original y

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/** return texture based on single float v, result range -1..1 */
float w(float i, float v) {
	i *= 0.1;  // debug: to find issues with w4 ~ texrepeat turned out to be what we wanted
    i += 2.;
    //float vv = (sin( v * (1.+sin(time*0.00 + i))) + cos( 0.73 * v * (1.+cos(time*0.00 - i)))) * 0.5;
    float vv = (sin( v * i + i * 2.) + cos( 0.73 * v * i + i)) * 0.5;
    //vv = vv > 0. ? sqrt(vv) : -sqrt(-vv);
    return vv;
}

/** return texture based on single float v, result range -1..1 */
/**
float wX(float i, float v) {
    return textureget(wincattext, vec2(v, i/16.)).x * 2. - 1.;
}
**/

float wnot(float i, float v) { return v; }  // debug: for testing changes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


/** get texture value for given position */
float textval(vec3 texpos, float texr) {
float r;
#ifndef RAND
    float q = texpos.z * 0.01;
    r = q - floor(q);
#elif (defined(PERLIN))
    r = snoise(texr*texpos.xyz);
#elif (defined(POHNOISE))
    r = pohnoise((2.*texr)*texpos.xyz);
    return r;  // do not fall through to the renormalization
#else
    float v1 = dot(v10, vec3(
    w(1., dot(v1, texpos) + wob * (w(4., dot(v4,texpos)) + w(5., dot(v5,texpos)))),
    w(2., dot(v2, texpos) + wob * (w(6., dot(v6,texpos)) + w(7., dot(v7,texpos)))),
    w(3., dot(v3, texpos) + wob * (w(8., dot(v8,texpos)) + w(9., dot(v9,texpos))))
    ));
    float v2 = w(i10, texr * v1);
    r = mix(v1, v2, texfinal);
#endif
    return r * 0.5 + 0.5;
}

/** get texture value for given 3d position mixed with grid position */
virtual float textvalmix(in vec3 texpos, in vec3 lopos, in float texr) {
    // if (texfract3d == 1.) {return textval(texpos, texr);}  // shortcut for textvalmix NOTR test
    #ifdef NOTR  // textvalmix, ??? irrelevant for texfract3d = 1
        // lopos is different for walls (x range -boxsize..boxsize rather than 0..1)
        // todo at some point, standardize opos for walls and set them to proper size in tr() for NO TR
        // vec3 tp = texpos;  // should be the same for walls, at least right now (4 Oct 2015)
        lopos = lopos / _boxsize * 0.5 + 0.5;
    #endif

    lopos.z = sin(lopos.y * 2. * 3.14159);
    lopos.y = cos(lopos.y * 2. * 3.14159);
    vec3 tp = mixk(lopos * vec3(tex2dxstretch,tex2dystretch,tex2dystretch), texpos, texfract3d);
    //if (texfract3d == 1.) tp = texpos;  // bug in mix makes this necessary for large stretch values that should not be used
	return textval(tp, texr);
}

// apply bump mapping to normal
vec3 bump(vec3 ttpos, vec3 mnormal) {
#ifndef BUMP
    vec3 bnorm = normalize(mnormal);
#else
    // bump
	NONU(if (bumpstrength == 0.) return normalize(mnormal);)
    vec3 mun = cross(vec3(1., 0., 0.), mnormal);
    vec3 mvn = normalize(cross(mnormal, mun));
    mun = normalize(cross(mnormal, mvn));

    float bumpfreq = 1./max(bumpscale, 0.0001);
    vec3 bumppos = ttpos.xyz * bumpfreq;
    float d = 0.01;                        // sample offset in bumptexture space
    float vb0 = textval(bumppos, 1.);
    float vbu = textval(bumppos + d*mun, 1.) - vb0;
    float vbv = textval(bumppos + d*mvn, 1.) - vb0;
    //float vbu = textval((ttpos.xyz + d*mun)  * bumpfreq, 1.) - vb0;
    //float vbv = textval((ttpos.xyz + d*mvn)  * bumpfreq, 1.) - vb0;

	// after texture lookups in case of NONU,
	// further 0.001 change to make even more sure.  TODO check
	float ubumpstrength = bumpstrength;
	if (ubumpstrength == 0.) ubumpstrength = 0.001; // return normalize(mnormal);

    // get bumps in range and apply clamping
    // could add progressive clamping if needed later
    float rfac = 0.15;                      // experimental factor to make bumpstrength 1 sensible
    vbu *= ubumpstrength / d * rfac;         // get up to strength
    vbv *= ubumpstrength / d * rfac;
    float len = sqrt(vbu*vbu + vbv*vbv);    // degree of bump offset
    float lenc = min(len, bumpclamp);       // clamped
    float factor = lenc / len;              // factor needed for clamping
    vbu *= factor;                          // perform clamping
    vbv *= factor;
    vec3 bnorm = normalize(mnormal + vbu * mun + vbv * mvn);
#endif
	return bnorm;
}


//http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 hsv2rgb(in vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    vec3 pp = c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    return clamp(pp, 0.0, 1.0);  // added sjpt 30 July 2015, can probably remove other clamp???
}
vec3 rgb2hsv(in vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
float tpxx = 1.;  // shared texture lookup value, this will always be overwritten but the compiler could not see that so must initialize

Colsurf colsurfd() { return colsurf(vec4(0.5,0.5,0.5,0), vec4(25, 0.6, -1, 0.5), vec4(0,0,0,0)); }
Colsurf colsurf1() { return colsurf(red1green1blue1refl1, shininess1gloss1subband1plastic1, fluorescH1fluorescS1fluorescV1iridescence1); }
Colsurf colsurf2() { return colsurf(red2green2blue2refl2, shininess2gloss2subband2plastic2, fluorescH2fluorescS2fluorescV2iridescence2); }
Colsurf colsurf3() { return colsurf(red3green3blue3refl3, shininess3gloss3subband3plastic3, fluorescH3fluorescS3fluorescV3iridescence3); }
Colsurf colsurf1(float colourid) { return colsurf(red1green1blue1refl1, shininess1gloss1subband1plastic1, fluorescH1fluorescS1fluorescV1iridescence1); }
Colsurf colsurf2(float colourid) { return colsurf(red2green2blue2refl2, shininess2gloss2subband2plastic2, fluorescH2fluorescS2fluorescV2iridescence2); }
Colsurf colsurf3(float colourid) { return colsurf(red3green3blue3refl3, shininess3gloss3subband3plastic3, fluorescH3fluorescS3fluorescV3iridescence3); }
/** return a standard texture color, with 4th component typically interpreted as reflection strength */
//. note 22 Feb. 2017.
// Implicit inputs include colourid and opos,
// Colour inputs include colsurf inputs (see directly below) and band1/2/3, bandbetween, texrepeat, texalong, texaround, texribs
// Working towards deciding best way to get well focussed overrides
Colsurf standardTexcol(in vec3 texpos, float colourid, bool realLookup) {
	// note, red1green1blue1refl1 etc implicitly use colourid
	Colsurf col1 = colsurf1(colourid);
	Colsurf col2 = colsurf2(colourid);
	Colsurf col3 = colsurf3(colourid);

#ifndef REFLECTION
	col1.col.a = col2.col.a = col3.col.a = 0.;
#endif
	//if (texoffset <= -2.) return col1;
	//if (texoffset >= 2.) return col2;
	// experiment to check front facing, only works with certain usemask values as not carried forward through rtopos
	// if (gl_FrontFacing) return col2;

    NONU(if (band1 > 100.) return col1;)
    NONU(if (band2 > 100.) return col2;)
    NONU(if (band3 > 100.) return col3;)
    float bb = band1+band2+band3+2.*bandbetween;
    float ibb = 1./bb;
    float tbbb = bandbetween * ibb;
    // bb1s = 0
    float bb1e = band1 * ibb;              // end of band 1 in range 0..1
    float bb2s = bb1e + tbbb;  // start of band2
    float bb2e = bb2s + band2 * ibb;       // end of band2
    float bb3s = bb2e + tbbb;  // start of band 3
    // bb3e = 1

	texpos /= max(texscale, 0.0001);
    float tp;
	// tp = w(1., texpos.y) + w(2., texpos.x) + w(3., texpos.z);
    NONU(if (texscale == 0. || texrepeat == 0.) {)
    NONU(    tpxx = 0.;)
    NONU(} else {)
        #if (OPMODE == OPTSHAPEPOS2COL || OPMODE == OPBUMPNORMAL)
            if (realLookup)			// needed for subbands, texture in rttexture for top layer only
                tpxx = textvalmix(texpos, opos.xyz, texrepeat); // + texoffset;  to range approx 0 .. 1
            else
                tpxx = textureget(rttexture, gl_FragCoord.xy * screen).x;
        #else
            tpxx = textvalmix(texpos, opos.xyz, texrepeat); // + texoffset;  to range approx 0 .. 1
        #endif
    NONU(})
    #ifdef NOTR  // standardTexcol, make sure ribs defined for walls
        float ribs = 1.;
    #endif
    // ribs = 1.; // NOTR test

    NONU(if (texalong != 0. || texaround != 0. || texribs != 0.) {)
		#ifdef NOTR // relevant to texalong/texaround/texribs only
			colpos /= 1000.; // so it works at a similar scale to the objects
		#endif
    // colpos *= 0.; // NOTR test
        float xx =  floor(texalong * colpos.x + texaround * colpos.y + texribs * colpos.z / ribs);
        xx +=  floor(texalong1 * colpos.x + texaround1 * colpos.y + texribs1 * colpos.z / ribs);
        xx +=  floor(texalong2 * colpos.x + texaround2 * colpos.y + texribs2 * colpos.z / ribs);
		tpxx += fract(xx / texdiv);
        tpxx = fract(tpxx);
		//tpxx -= 0.5;
    NONU(})
    tp = tpxx;

    /** broken in some WebGL implementations
    Colsurf r = tp < bb1e ? col1 :
             tp > bb3s ? col3 :
             tp < bb2s ? mixx(col1, col2, (tp-bb1e)/ tbbb) :
             tp < bb2e ? col2 :
             mixx(col2, col3, (tp-bb2e)/ tbbb);
    **/
    Colsurf r;

    if (tp < bb1e) r = col1;
    else if (tp > bb3s) r = col3;
    else if (tp < bb2s) r = mixx(col1, col2, (tp-bb1e)/ tbbb);
    else if (tp < bb2e) r = col2;
    else r = mixx(col2, col3, (tp-bb2e)/ tbbb);

	return r;
}

Colsurf standardTexcol(in vec3 texpos) {
    return standardTexcol(texpos, colourid, false);
}

/** return the full surface at a point, based on texture etc */
virtual Colsurf iridescentTexcol(in vec3 texpos, in vec3 viewDir, in vec3 normal) {
	Colsurf r = standardTexcol(texpos);
    vec3 c = rgb2hsv(r.col.rgb);
// to explore again later, mutate in hsv space
// initial experiments gave worse results than mutate in rgb, sjpt March 2015
//	vec3 c = mix(rgb2hsv(r.col.rgb), r.col.rgb, hsvprop);
//c.g = sqrt(c.g); // exagg saturation
//c.g = sqrt(c.g);
//c.g=1.;
//c=vec3(1.,1.,1.);
	float iridescence = r.fluoresc.a;
	float f = iridescence * (1.-dot(viewDir, normal)) + g_hueshift;
	c.x += f;				// shift hue of base colour
	r.fluoresc.x += f;		// and of fluroescent
	c.x = mod(mod(c.x, 1.) + 1., 1.);
	r.fluoresc.x = mod(mod(r.fluoresc.x, 1.) + 1., 1.);

	r.col.rgb = hsv2rgb(c);	// and convert back to rgb
    r.col += xcol;			// add in special effects colour, usually 0 or for debug, can be set in horn definition

    float subband = r.surftype.z;
    if (subband >= 0.) {   // subband
        // todo: tailor orientation, scale of subband, and blending of band and subband
        // main issue is lack of parameters!
        vec3 ttexpos = texpos.yzx * 5.; ttexpos.x += subband;
        return standardTexcol(ttexpos, subband, true);
    }
	return r;
}


//https://gamedev.stackexchange.com/questions/34110/how-can-i-implement-3d-textures-using-webgl
vec4 sampleAs3DTexture(sampler2D tex, vec3 texCoord, float size) {
   //PJT: there seems to be a lot of redundant computation for every time this function gets called...
   //this size stuff could be uniform??? but would complicate things a bit...
   float sliceSize = 1.0 / size;                         // space of 1 slice
   float slicePixelSize = sliceSize / size;              // space of 1 pixel
   float sliceInnerSize = slicePixelSize * (size - 1.0); // space of size pixels
   float zSlice0 = min(floor(texCoord.z * size), size - 1.0);
   float zSlice1 = min(zSlice0 + 1.0, size - 1.0);
   float xOffset = slicePixelSize * 0.5 + texCoord.x * sliceInnerSize;
   float s0 = xOffset + (zSlice0 * sliceSize);
   float s1 = xOffset + (zSlice1 * sliceSize);
   vec4 slice0Color = texture2D(tex, vec2(s0, texCoord.y));
   vec4 slice1Color = texture2D(tex, vec2(s1, texCoord.y));
   float zOffset = mod(texCoord.z * size, 1.0);
   return mix(slice0Color, slice1Color, zOffset);
}

#endif
`
