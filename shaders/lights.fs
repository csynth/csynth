/** file to include to get standard lighting */
#ifndef LIGHTS
#define LIGHTS
#define BADNORM 1.09


/* Current light position */
//sjpt uniform vec3 lightDir;
// arrays may not be declared constant since they cannot be initialized
#if (defined(SHADOWS) || defined(SHADOWS1) || defined(SHADOWS2))
	#include fourShadowMapping.fs;
#endif
#define NOEDGEMAIN
uniform vec3 edgecol, fillcol, occcol, unkcol, profcol, wallcol, backcol;   	// 'target' colour for edges, fill, occlusion and profile
uniform vec3[8] custcol;
#include edge2.fs;
#include cubeReflection.fs;

uniform vec3 cameraPositionModel;
uniform float ymin;     // used for removing 'overwater' reflection
uniform float ymax;     // ...
vec4 ucol = vec4(-999.,-1.,-1.,1.);  // colour to use to replace all others
vec4 postxcol = vec4(0.,0.,0.,0.);  // colour to add at very end of pipeline
void usecol(float r, float g, float b) {  // use this as the absolute colour
    if (ucol.r == -999.) ucol = vec4(r,g,b,1.);
}

gene(flulow, 0.5, 0, 1, 0.1, 0.01, gtex, frozen)  //  position of fluor band
genet(fluwidth, 0.5, 0, 1, 0.01, 0.01, texture, free)  //  width of fluor band within texture
gene(flurange, 1, 0, 3, 0.01, 0.001, gtex, frozen)  //  range of flu hue variety along horn

gene(opacity, 1, 0, 1, 0.01, 0.001, gtex, frozen)   //  opacity, not generally used
gene(badnormals, 2, 0, 4, 1, 1, system, frozen)     // choice to take for backward facing normals<br>0=yellow, 1=ignore, 2=coerce, 3=flip, 4=coerce/flip
gene(edgeprop, 0, 0,1, 0.1, 0.01, gtex, frozen)     // strength for edges vs shading, 1 for black, only used if EDGES set, edgeprop == 0 && fillprop == 0 gives no edges
gene(fillprop, 0, 0,1, 0.1, 0.01, gtex, frozen)     // whiteness for non-edges, 1 for white, only used if EDGES set
gene(edgethresh, 4, -1,5, 1, 1, gtex, frozen)       // threshold number of neighbours to count as 'fill'


gene(colribs, 0, -1,1, 0.1, 0.01, gtex, frozen)    // multiplier for colouring different ribs with different colour

gene(fogr, 0.1, 0,1, 0.1, 0.01, gtex, frozen)    // red for fog
gene(fogg, 0.1, 0,1, 0.1, 0.01, gtex, frozen)    // green for fog
gene(fogb, 0.1, 0,1, 0.1, 0.01, gtex, frozen)    // blue for fog
gene(fogstartdist, 0, 0,4000, 10, 1, gtex, frozen)    // dist at which fog starts applying
gene(foghalfdepth, 0, 0,4000, 10, 1, gtex, frozen)    // half depth for fog, 0 for no fog

gene(lightoutpower, 1, 0,3, 0.01, 0.01, gtex, frozen)   // power for output of lighting stage

// gene for debug
gene(xxposprop, 0, 0,1, 1,0.1, gtex, frozen) // proportion of 'position' color to use, 0 for normal colouring
gene(xxnormprop, 0, 0,1, 1,0.1, gtex, frozen) // proportion of 'normal' color to use, 0 for normal colouring

gene(useProjectionImage, 0, 0,5,0.1,0.1, gtex, frozen) // 0, no projection image, larger for greater strength
uniform sampler2D projectionImage;

uniform mat4 lightProjectionMatrix0;
uniform mat4 lightViewMatrix0;
uniform vec4 light_camd0;
uniform mat4 lightProjectionMatrix1;
uniform mat4 lightViewMatrix1;
uniform vec4 light_camd1;
uniform mat4 lightProjectionMatrix2;
uniform mat4 lightViewMatrix2;
uniform vec4 light_camd2;

#ifdef COOKIE0
uniform sampler2D cookieTexture0;
#endif
#ifdef COOKIE1
uniform sampler2D cookieTexture1;
#endif
#ifdef COOKIE2
uniform sampler2D cookieTexture2;
#endif
//encodes color being projected into scene along with shadow visibility in 'a' channels.
struct CookieVis {
    vec4 L0; vec4 L1; vec4 L2;
};


//ge ne(softt, 0.97, 0.9, 1, 0.01, 0.001, system, frozen) // set soft clipping
//uniform float outpower;  // use for gamma, usually done later



float sqr(float x) { return x*x; }

#define OLDnot  // define to use old single light

#define backb 1.    // back blue
#define fronts 1.0  // front strength
#define backs 0.0  // back strength

#define light0dir vec3(light0dirx, light0diry, light0dirz)
#define light1dir vec3(light1dirx, light1diry, light1dirz)
#define light2dir vec3(light2dirx, light2diry, light2dirz)

#define light0Pos vec3(light0x, light0y, light0z)
#define light1Pos vec3(light1x, light1y, light1z)
#define light2Pos vec3(light2x, light2y, light2z)


#ifdef OLD
#define lll 0.
#define hhh 0.
const vec3 Light0Color = vec3(1., 1., 1.);
#else
#define lll 0.6
#define hhh 0.6
const vec3 Light0Color = vec3(hhh, lll, lll)*fronts;
#endif
uniform sampler2D rtnormal;

const vec3 BackLight0Color = vec3(hhh, lll, backb)*backs;
//const vec3 light1dir = vec3(-200., 000., 200.);
const vec3 Light1Color = vec3(lll, hhh, lll)*fronts;
const vec3 BackLight1Color = vec3(hhh, lll, backb)*backs;
//const vec3 light2dir = vec3(-200., -100., -400.);
const vec3 Light2Color = vec3(lll, lll, hhh)*fronts;
const vec3 BackLight2Color = vec3(hhh, lll, backb)*backs;

const float loopDuration 	= 160.0;
const float step 			= 360.0 / loopDuration;
#define currentTime mod(appTime, loopDuration)				//< current time in the 360 degree animation

#undef lll
#undef hhh

#ifdef Zero
#else
//-----------------------------------------------------------------------------
/* Some useful vector constants */
#define Zero  vec3(0.0, 0.0, 0.0)
#define Unit  vec3(1.0, 1.0, 1.0)
#define AxisX vec3(1.0, 0.0, 0.0)
#define AxisY vec3(0.0, 1.0, 0.0)
#define AxisZ vec3(0.0, 0.0, 1.0)
#endif

//-----------------------------------------------------------------------------
/* Phong material of metaballs */
// name, val, min, max, delta, step, help
gene(ambient, 0.01, 0, 1, 0.01, 0.01, lights, frozen) // set ambient
gene(light0s, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light0 strength
gene(light1s, 1., 0, 1, 0.01, 0.01, lights, frozen) // set light1 strength
gene(light2s, 1., 0, 1, 0.01, 0.01, lights, frozen) // set light2 strength

gene(light0r, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light0 red
gene(light0g, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light0 green
gene(light0b, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light0 blue
gene(light1r, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light1 red
gene(light1g, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light1 green
gene(light1b, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light1 blue
gene(light2r, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light2 red
gene(light2g, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light2 green
gene(light2b, 1., 0, 1., 0.01, 0.01, lights, frozen) // set light2 blue

gene(light0x, 400,  -500, 500, 10,10, lightpos, frozen)  // x position for light 0
gene(light0y, 400,  -500, 500, 10,10, lightpos, frozen)  // y position for light 0
gene(light0z, 400,  -500, 500, 10,10, lightpos, frozen)  // z position for light 0
gene(light1x, -200,  -500, 500, 10,10, lightpos, frozen)  // x position for light 1
gene(light1y, 0,  -500, 500, 10,10, lightpos, frozen)  // y position for light 1
gene(light1z, 500,  -500, 500, 10,10, lightpos, frozen)  // z position for light 1
gene(light2x, -200,  -500, 500, 10,10, lightpos, frozen)  // x position for light 2
gene(light2y, -100,  -500, 500, 10,10, lightpos, frozen)  // y position for light 2
gene(light2z, -400,  -500, 500, 10,10, lightpos, frozen)  // z position for light 2

#define NODIR 490. // >NODIR flag for no light direction given, use position for dir, below 500 in case animation slightly distorts it
gene(light0dirx, 9797,  -500, 500, 10,10, lightpos, frozen)  // x direction for light 0
gene(light0diry, 400,  -500, 500, 10,10, lightpos, frozen)  // y direction for light 0
gene(light0dirz, 400,  -500, 500, 10,10, lightpos, frozen)  // z direction for light 0
gene(light1dirx, 9797,  -500, 500, 10,10, lightpos, frozen)  // x direction for light 1
gene(light1diry, 0,  -500, 500, 10,10, lightpos, frozen)  // y direction for light 1
gene(light1dirz, 500,  -500, 500, 10,10, lightpos, frozen)  // z direction for light 1
gene(light2dirx, 9797,  -500, 500, 10,10, lightpos, frozen)  // x direction for light 2
gene(light2diry, -100,  -500, 500, 10,10, lightpos, frozen)  // y direction for light 2
gene(light2dirz, -400,  -500, 500, 10,10, lightpos, frozen)  // z direction for light 2

gene(light0Spread, 0.5, 0,1, 0.1, 0.01, lightpos, frozen)  // spread for light 0
gene(light1Spread, 0.5, 0,1, 0.1, 0.01, lightpos, frozen)  // spread for light 1
gene(light2Spread, 0.5, 0,1, 0.1, 0.01, lightpos, frozen)  // spread for light 2

gene(light0HalfDist, 300, 1, 2000, 10, 1, lightpos, frozen)  // distance for half power light 0
gene(light1HalfDist, 300, 1, 2000, 10, 1, lightpos, frozen)  // distance for half power light 1
gene(light2HalfDist, 300, 1, 2000, 10, 1, lightpos, frozen)  // distance for half power light 2

//ge ne(roughness, 0.5, 0,1, 0.1, 0.01, gtex, frozen)  // roughness for CookTorrance (spectype 3)
gene(fresnel0, 0.8, 0,1, 0.1, 0.01, gtex, frozen)  // F0 (fresnel) for CookTorrance (spectype 3)
//ge ne(xxd, 1,  0, 50, 10,10, gtex, frozen)  // debug test for screen offset
#define xxd 1.


/* Small value for moving origin of shadow ray(see code)*/
#define EPSILON 0.01

/* Use these macro for enable / disable shadows */
float visibilityL0 = 1.0;

/* structure for passing around lighting specifications. Might help with making PhongLight virtual in a way
that overriding version doesn't need a complex set of arguments.
 */
struct LightProperties {
    vec4 trpos; 		// position of point on surface
    vec3 viewdir;    	/* normalized direction from point to eye */
    vec3 normal;   		/* normalized normal to the surface in this point */
    Colsurf colsurf;  /* diffuse color in this point */
    vec3 lightDir; 	/* direction light is pointing */
    vec3 lightPos; 	/* position of light */
    float lightSpread; /* spread of light */
    float lightHalfDist; 	/* dist for falloff to 50% */
    vec3 LightColor; 	/* light color */
    vec3 BackLightColor; /* light color */
    vec4 ShadowCookie; /* 'rgb' is projected color (or white), 'a' is shadow value */
    float strength;
    bool directional;
};

/** auto rotate a single light around the origin on the Z axis  */
/**
vec3 RotateLight(const vec3 light_in)
{
	float angle = step * currentTime;

	float s = sin(angle);
	float c = cos(angle);

	vec3 ret = vec3(0.0);
	ret.x = light_in.x * c - light_in.y * s;
	ret.y = light_in.x * s + light_in.y * c;
	ret.z = light_in.z;

	return ret;
}
**/

// use genes below for experiment
// generally rely on built in #define values
//g ene(spectypen, 3,  0, 3, 1,1, system, frozen)  // specular type, 0 phong, 1 blinn-phong, 2 winsom (blinn?), 3 Cook Torrence
//g ene(speckgene, -1, -1,10, 1,1, gtex, frozen) // specular multiplier defined by user, -ve use speckk
#define spectypen 3.
#define speckgene -1.

// to fix in conjuction with spectype and maybe specular average/integrate of some kind
// code below was in horn.js
//var ssrat = 15;
//var ss = function sf(v) {
//    if (currentGenes.spectype === 2) return 4;
//    //return 100/(v+1)/(v+2);  // for my (very flawed) integration
//    return ssrat/(v+1);  // another integral guess
//    //return ssrat/v;  // original
//    //return ssrat/Math.sqrt(v+500);  // experimental guesswork
//};

//var type = 0.1;
//if (currentGenes.spectype === 3) type = 1;
//if (currentGenes.spectype === 2) type = 1;
//    const type = 1;  // fixed for spectype === 3, to match #defined spectype rather than gene in lights.fs
// var type = currentGenes.spectype === 3 || !currentGenes.spectype ? 1 : 0.1;
//        COL.set("subband1", p, (type!==0) ? ss(COL.get("shininess1", p)*type) : 1);
//        COL.set("subband2", p, (type!==0) ? ss(COL.get("shininess2", p)*type) : 1);
//        COL.set("subband3", p, (type!==0) ? ss(COL.get("shininess3", p)*type) : 1);
//        COL.set("subband1", p, (type===3) ? ssrat/COL.get("shininess1", p) : 1);
//        COL.set("subband2", p, (type===3) ? ssrat/COL.get("shininess2", p) : 1);
//        COL.set("subband3", p, (type===3) ? ssrat/COL.get("shininess3", p) : 1);
const float speckk = 1.;
const float ssrat = 15.;

float getspecular(const vec3 lightdir, const vec3 viewdir, const vec3 normal, const float shininess) {
    float specular;
    float speckk;
    // specular type, 0 phong, 1 blinn-phong, 2 winsom (blinn?), 3 Cook Torrence
    if (spectypen < 0.5) {  // original phong code we have used for ages
        speckk = 0.1 * ssrat / (shininess + 1.);
        vec3 refl = reflect(-viewdir, normal);
        specular = pow(max(dot(refl, lightdir), 0.0), shininess);
    } else if (spectypen <= 1.5) {  // 1
        speckk = 0.1 * ssrat / (shininess + 1.);
        // alternative http://en.wikipedia.org/wiki/Blinn%E2%80%93Phong_shading_model
        //Calculate the half vector between the light vector and the view vector.
        //This is faster than calculating the actual reflective vector.
        vec3 H = normalize( lightdir + viewdir );
        //Intensity of the specular light
        float NdotH = dot( normal, H );
        float intensity = pow( max(0.0, NdotH ), shininess*3. );
        specular = intensity;
    } else if (spectypen <= 2.5) {  // winsom/Blinn
        speckk = 4.;
        // copied and changed from devlight.pascal
        // but still doesn't work  (wrong assumption about variable mappings?)
        vec3 H = normalize( lightdir + viewdir );
        //Intensity of the specular light
        float NdotH = dot( normal, H );
        float blinnk = 5./shininess;  //<<< temp
        blinnk = -1./(0.35*0.35-1.); //     {  specular shaping constant     }
        blinnk = -1./(sqr(min(max(1.-shininess/100.,0.0001),0.9999))-1.);  // << from DEVSURF.PASCAL
        blinnk = -1./(sqr(sqr(min(max(1.-shininess/47.,0.000000001),0.9999999)))-1.);

        float hdotn = NdotH;
        float ldotn = dot(lightdir, normal);
        float vdoth = dot(viewdir, H);
        float vdotn = dot(viewdir, normal);
        float BlinnD = sqr( (-blinnk+1.) / (sqr(hdotn)-blinnk) );
        float BlinnG;
        if (vdotn < ldotn)
            if (2.0*vdotn*hdotn < vdoth)
                BlinnG = 2.0*hdotn/vdoth;
            else
                BlinnG = 1.0/vdotn;
        else
            if (2.0*ldotn*hdotn < vdoth)
                BlinnG = 2.0*hdotn*ldotn/(vdoth*vdotn);
            else
                BlinnG = 1.0/vdotn;
       specular = BlinnG * BlinnD;// / 4.;  // the old explicit speck value removed
       //return vec3(vdoth, -vdoth, vdotn);

    } else { // if (spectypen <= 3.5) { // borrowed Cook Torrence
        speckk = ssrat / (shininess + 1.);
        // https://github.com/chrisglass/ufoai/blob/master/base/shaders/cook-torrance_fs.glsl
        vec3 L = lightdir;
        vec3 V = viewdir;
        vec3 N = normal;
    //L = normalize(L);
    //V = normalize(V);
    //N = normalize(N);
    //L = normalize(vec3(0,0,1));  // direction TO light
    //V = normalize(vec3(0,0,1));
    //N = normalize(vec3(0,0, 1));
    V.z += 0.0001;  // for unknown reason this fixed at least many bad lighting bugs, especially on walls
    // but 31/08/2016 also added some very clear bad circles, radius greater as added part greater

        vec3 H = normalize(L + V);

    /************
    //ucol = vec4((V + 1.) * 0.5, 1.);
    if (length(V) < 0.99) { ucol = vec4(0,0,1,1); return 0.; }
    if (length(N) < 0.99) { ucol = vec4(1,0,0,1); return 0.; }
    if (length(L) < 0.99) { ucol = vec4(0,1,0,1); return 0.; }
    if (length(L+V) < 0.0001) { ucol = vec4(1,1,0,1);  return 0.; }
    if ((length(L) > 0.99)
    && (length(N) > 0.99)
    && (length(V) > 0.99)) { ucol = vec4(0,1,1,1); return 0.; }
    **********/
    //N = vec3(-0.99,0,0.0001);
    //N.x -= 0.000001;
    //ucol = vec4((N + 1.) * 0.5, 1.);
    //ucol = vec4((N + vec3(1,0,0)) * 20., 1);
        float NdotH = dot(N, H);
        float VdotH = dot(V, H);
        float NdotV = dot(N, V);
        float NdotL = clamp(dot(N, L), 0.0, 1.0);
        float NdotH_2 = NdotH * NdotH;

        float roughness_r = 5./shininess;  //<<< temp
        //float roughness_g = 5./shininess;  //<<< temp
        //float roughness_r = roughness == 0. ? 5./shininess : roughness;
        roughness_r = clamp(roughness_r, 0.05, 0.95);
        float R_2 = roughness_r * roughness_r;

        /* Compute the geometric term for specularity */
        float G1 = (2.0 * NdotH * NdotV) / VdotH;
        float G2 = (2.0 * NdotH * NdotL) / VdotH;
        float G = clamp(min(G1, G2), 0.0, 1.0);

        /* Compute the roughness term for specularity */
        float A = 1.0 / (4.0 * R_2 * NdotH_2 * NdotH_2);
        float B = exp((NdotH_2 - 1.0) / (R_2 * NdotH_2));
        float R = A * B;

        /* Compute the fresnel term for specularity using Schlick's approximation*/
        // float F = roughness_g + (1.0 - roughness_g) * pow(1.0 - VdotH, 5.0);
        // float F = 1.; // no sensible roughness_g for now

        // simplified fresnel from http://ruh.li/GraphicsCookTorrance.html
        // Schlick approximation
        float fresnel = pow(max(0., 1.0 - VdotH), 5.0);  // max should not be necessary but sometimnes is, esepcially if we have the V.z + cheat above. Caused odd ghost darker discs
        fresnel *= (1.0 - fresnel0);
        fresnel += fresnel0;

        //specularColor = lightSource.specular.rgb * specular.rgb * roughness.b * NdotL * (F * R * G) / (NdotV * NdotL);
		// specular = NdotL * (fresnel * R * G) / (NdotV * NdotL); // Organic pre July
        specular = (fresnel * R * G) / max(0.0000000001, NdotV);

        // We have sometimes got funny values, especially when called form  NORMLOOP. This hides them
        if (0. <= specular && specular <= 1e20) {
            // ok values
        } else {
            specular = 0.;
        }
    }
    // for scaling allow experiment if speckgene is a gene, usually just use speckk as computed above
    float speckuse = speckgene >= 0. ? speckgene : speckk;
    return speckuse * specular;
}

/** Computes contribution of single light;
also allowing for complementary back light if required for surface pointing away from light.
Alternative lighting / coloring models can be implemented by overriding Light or LightN functions.
 */
vec3 PhongLight(in LightProperties L) {
    vec3 point2light;
	float lightfall;
	if (L.directional) {  // for directional lights
		point2light = normalize(L.lightPos);  // direction from point to light
		lightfall = 1.;
	} else {
		vec3 lightDir = normalize(L.lightDir);
		point2light = normalize(L.lightPos - L.trpos.xyz);  // direction from point to light
		float dot = -dot(point2light, L.lightDir);
		lightfall = max(0., (dot + L.lightSpread - 1.) / L.lightSpread);
		float dist = length(L.trpos.xyz  - L.lightPos);
		dist /= L.lightHalfDist;
		lightfall *= 1./(1. + dist*dist);
	}

	// if the normal light is pointing away from the light, the light can't see the surface
	// the opposite backlight can.
	// We can get rid of opposite backlight by setting to black, or by changing this code to return black here
	float normdotlight = dot(point2light, L.normal);
	if (normdotlight < 0.) {
		normdotlight *= -1.;
		point2light *= -1.;
		L.LightColor = L.BackLightColor;
	}


    //--------------------------------------------------------------------
    vec3 color = L.colsurf.col.xyz;
    vec4 surftype = L.colsurf.surftype;
    float shininess = surftype.x;
    float gloss = surftype.y;
    float subband = surftype.z;
    float plastic = surftype.w;

    float diffuse = normdotlight;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Various experimental versions below to compute specular factor.  Stephen, 12 March 2014
    // These have been hacked a little to conform to different coding names
    // (from our original code, Windowm code and different stolen code)
    //
    // We will probably finalize on just one fixed version (v3?) and remove the rest.
    //
    // Also the original parameter shininess has been modified to give VERY approximate similarity.
    // We will replace that with the appropriate 'raw' parameter if possible.

    float specular = 0.;

    #if (defined(NORMLOOP) && OPMODE == OPTSHAPEPOS2COL)
        float xxxd = 1.;

        vec4 tvp = textureget(rtnormal, (gl_FragCoord.xy + vec2(0.,0.)) * screen);
        /* diagonals * /
        vec4 tvp00 = textureget(rtnormal, (gl_FragCoord.xy + vec2(-xxxd,-xxxd)) * screen);
        vec4 tvp01 = textureget(rtnormal, (gl_FragCoord.xy + vec2(-xxxd,xxxd)) * screen);
        vec4 tvp10 = textureget(rtnormal, (gl_FragCoord.xy + vec2(xxxd,-xxxd)) * screen);
        vec4 tvp11 = textureget(rtnormal, (gl_FragCoord.xy + vec2(xxxd,xxxd)) * screen);
        /**/
        /* neighbours */
        vec4 tvp00 = textureget(rtnormal, (gl_FragCoord.xy + vec2(0.,-xxxd)) * screen);
        vec4 tvp01 = textureget(rtnormal, (gl_FragCoord.xy + vec2(0.,xxxd)) * screen);
        vec4 tvp10 = textureget(rtnormal, (gl_FragCoord.xy + vec2(-xxxd,0.)) * screen);
        vec4 tvp11 = textureget(rtnormal, (gl_FragCoord.xy + vec2(xxxd,0.)) * screen);
        /**/
        //vec4 tvp01 = tvp00;
        //vec4 tvp10 = tvp00;
        //vec4 tvp11 = tvp00;
        if (tvp.w != tvp00.w) tvp00 = tvp;
        if (tvp.w != tvp01.w) tvp01 = tvp;
        if (tvp.w != tvp10.w) tvp10 = tvp;
        if (tvp.w != tvp11.w) tvp11 = tvp;
        //tvp01 = tvp00;
        //tvp10 = tvp00;
        //tvp11 = tvp00;

        //if (tvp00.w != tvp01.w || tvp00.w != tvp10.w || tvp00.w != tvp11.w) { // use same normal for everything at edges TODO .w not set right yet ...TODO
        //    specular = getspecular(point2light, viewdir, normal, shininess);
        //} else {
            for (float i = 0.; i < NORMLOOP; i++) {
                for (float j = 0.; j < NORMLOOP; j++) {
                    float ip = i / NORMLOOP;
                    float jp = j / NORMLOOP;
                    vec3 vnormal = normalize((1.-ip) * (1.-jp) * tvp00.xyz + (ip) * (1.-jp) * tvp10.xyz
                        + (1.-ip) * (jp) * tvp01.xyz + (ip) * (jp) * tvp11.xyz);
                    specular += getspecular(point2light, L.viewdir, vnormal, shininess);
                }
            }
        //}
        specular /= NORMLOOP * NORMLOOP;
    #else
        specular = getspecular(point2light, L.viewdir, L.normal, shininess);
    #endif

    // approximate compensation for height of specular curve
    // integral of specular over dot product range 0..1 is 1/(shininess+1)
    // We want to normalize to 1 so same total light out regardless of shininess,
    // just more concentrated for shinier.
    // This should get rid of the need for separate speck, but ....
    // specular *= shininess+1.;

    return ( (1. - gloss) * diffuse * color +
           gloss * specular * (plastic + color * (1.-plastic)) )  * L.LightColor * lightfall;
}

/** Computes contribution of single light; default version just calls phong but may be overriden
to do otherwise... Individual lights can also be overriden separately with LightN */
virtual vec3 Light(in LightProperties L) {
    vec4 v = L.ShadowCookie;
    return PhongLight(L) * (1.0 - ambient) * L.strength * (v.a * v.rgb);
}

struct LightMixStruct {
    vec3 col0; vec3 col1; vec3 col2; Colsurf colsurf; float ambient;
};
virtual vec3 LightMix(const in LightMixStruct M) {
    return M.col0 + M.col1 + M.col2 + (M.ambient * M.colsurf.col.rgb);
}

//
// standard phong lighting, multiple lights + ambient
// (potentially overriden by other methods)
vec3 Phong( const in vec4 trpos,		// position on surface
			      in vec3 viewdir,    // direction from point to eye, pointing towards eye
                  in vec3 normal,   	// normal to the surface in this point
            const in Colsurf colsurf, // diffuse color and surf at this point
            const in CookieVis visibilityL // visibility for lights
			) {
    viewdir = normalize(viewdir);
    normal = normalize(normal);
    vec3 col = Zero;

    LightProperties L;
    L.trpos = trpos; L.viewdir = viewdir; L.normal = normal; L.colsurf = colsurf;
    LightMixStruct M;
    M.ambient = ambient; M.colsurf = colsurf;
    //TODO: pass down light cookie info, allow Light function to decide what to do with that?

    L.directional = light0dirx >= NODIR; L.lightDir = normalize(light0dir); L.lightPos = light0Pos, L.lightSpread = light0Spread; L.lightHalfDist = light0HalfDist; L.LightColor = Light0Color*vec3(light0r, light0g, light0b); L.BackLightColor = BackLight0Color; L.ShadowCookie = visibilityL.L0; L.strength = light0s;
    vec4 v = visibilityL.L0;
    M.col0 = Light(L);

    L.directional = light1dirx >= NODIR; L.lightDir = normalize(light1dir); L.lightPos = light1Pos, L.lightSpread = light1Spread; L.lightHalfDist = light1HalfDist; L.LightColor = Light1Color*vec3(light1r, light1g, light1b); L.BackLightColor = BackLight1Color; L.ShadowCookie = visibilityL.L1; L.strength = light1s;
    v = visibilityL.L1;
    M.col1 = Light(L);

    L.directional = light2dirx >= NODIR; L.lightDir = normalize(light2dir); L.lightPos = light2Pos, L.lightSpread = light2Spread; L.lightHalfDist = light2HalfDist; L.LightColor = Light2Color*vec3(light2r, light2g, light2b); L.BackLightColor = BackLight2Color; L.ShadowCookie = visibilityL.L2; L.strength = light2s;
    v = visibilityL.L2;
    M.col2 = Light(L);
    //col += ambient * colsurf.col.xyz;
    return LightMix(M);
}

/** get the bumped normal: also do some other useful calculations and apply normal checking
xmnormal:   normal BEFORE rotation, camera or bumping.  model space
trpos:      position AFTER rotation     world space
texpos:     position to use for texture model space
viewdir:    direction of view,          view space
result:     bumped normal               view space
*/
vec3 getBumpedNormal(const vec3 xmnormal, const vec4 trpos, const vec3 texpos, out vec3 viewdir, out float viewdist) {
	vec3 rotpos;
    vec3 xbnorm = bump(texpos, xmnormal); // compute bumping in object space
    rotpos = (/**!!! NO viewMatrix * **/ trpos).xyz;  // rotpos will allow for rotation and camera position, model space
//    if (! (ymin <= rotpos.y && rotpos.y <= ymax) ) dis card; // do not show reflection above water ??? rotpos.y = NaN
    if (rotpos.y < ymin || rotpos.y > ymax) discard; // do not show reflection above water

    mat3 rotNormal = mat3(rot4wx(colourid));    // rotation for normals. not necessarily unit size, scaled by _uScale
// opposition values are stored inconsistently, they use pre-rotation values for form,
//if (colourid == 2.) rotNormal = mat3(1.365967365967366,0,0, 0,1,0, 0,0,1);  // NOTR test uses different rot4
//if (colourid == 2.) rotNormal = mat3(1,0,0, 0,1,0, 0,0,1);  // NOTR test uses different rot4

    // compute two tangents, do not use u,v directly because of singularities at ends
    // todo: correct this code suspect for 4d objects
    // float dd = oposx.x < 0.5 ? 1. : -1.;  // + or - 1 to stop distortion at extreme ends
    vec3 mnormal = -xbnorm * rotNormal * reflnorm;  // bumped normal in world space
    mnormal = normalize(mnormal);                   // allow for rot4wx(colourid) not unit

    // normals may get backwards because of twisting in the tranrule application
    // or becuase of bump mapping
    // todo sjpt 16/11/2014 handle those two cases a little differently, never negate normal wrong from bump mapping
    // if a surface is visible, the normal must be pointing towards the eye
    // mmnormal is in the correct direction towards eye.
    // vec3 campos1 = -modelViewMatrix[3].xyz; // vec3(0., 0., -viewMatrix[3][2]);

    // Original code was correct WITHOUT viewMatrix above, as lighting is in model spaceO
    // It may be (???) that the use of viewMatrix above was meant to move the lights with the camera????
    // Version with cameraPosition and no viewMatrix verified with frontlight.oag and camset(0,0,-1800), sjpt July 2017
	// also verified for fog distances
    viewdist = length(cameraPositionModel - rotpos); 				// distance from point to eye
    viewdir = normalize(cameraPositionModel - rotpos); 			// direction from point to eye
    // !!! NO viewdist = length(rotpos); 				// distance from point to eye
    // !!! NO viewdir = normalize(- rotpos); 			// direction from point to eye, view space

    #if (defined(NORMLOOP) && OPMODE == OPTSHAPEPOS2COL)
        // we've computed rotpos and viewdir as needed, and can do the rest by looklup
        return textureget(rtnormal, (gl_FragCoord.xy) * screen).xyz;
    #endif

    // handle bad normals
    // There are two kinds of bad normals.
    // One is where the late normal could not be computed because of very thin objects.
    // That has beed detected in
    // The other is where the normal is found to be pointing away from the camera.

    vec3 mmnormal = -mnormal;               // mmnormal will end up as corrected normal
    if (xmnormal.z == BADNORM) {
        // mmnormal = vec3(0., 0., 1.);
        mmnormal = -viewdir;
        //postxcol = vec4(9.,0.,0., 1.);
    } else {
        float dotvn = dot(viewdir, mmnormal);
        if (dotvn < 0.) {
            // bad normal: 0=yellow, 1=ignore, 2=coerce, 3=flip, 4=coerce/flip
            if (badnormals == 0.) {          // yellow, highlight problem areas
                postxcol = vec4(1.,1.,0., 1.);      // for debug, will not get seen for normloop != 0 as not passsed through rtnormal texture
            } else if (badnormals == 1.) {          //ignore
            } else if (badnormals == 2.) {          // coerce
                mmnormal -= dotvn * viewdir;
            } else if (badnormals < 0.) {           // variable coerce
                mmnormal -= -badnormals * dotvn * viewdir;
            } else if (badnormals == 3.) {          // flip
                mmnormal = mnormal;
            } else if (badnormals == 4.) {          // flip/coerce
                if (dotvn < -0.2)
                    mmnormal = mnormal;             // really bad, flip
                else
                    mmnormal -= dotvn * viewdir;    // bit bad, coerce
            }
        }       // is badnormal
    }           // check badnormal
    return mmnormal;
}

/** cookie functions being virtual allows things like gradual falloff to be applied,
or kaleidoscope effects etc, because that never gets old. */
#ifdef COOKIE0
virtual vec4 cookie0(const in vec2 uv) {
    return textureget(cookieTexture0, uv);
}
#endif
#ifdef COOKIE1
virtual vec4 cookie1(const in vec2 uv) {
    return textureget(cookieTexture1, uv);
}
#endif
#ifdef COOKIE2
virtual vec4 cookie2(const in vec2 uv) {
    return textureget(cookieTexture2, uv);
}
#endif

/** perform the lighting and shadow computation */
virtual vec4 lighting(const vec3 xmnormal, const vec4 trpos, const vec3 texpos, inout float feeddepth) {
    feeddepth = 0.;
    #ifdef SIMPLESHADE
        return vec4(fract(texpos * 0.1), 1.); // p.s. red1 rtc may involve lookup in COL table
        return vec4(red1, green1, blue1, 1.);
    #endif
	vec3 viewdir; // set by getBumpedNormal
	float viewdist;

    vec3 mmnormal = getBumpedNormal(xmnormal, trpos, texpos, OUT viewdir, OUT viewdist);   /// texpos for bump
//    if (! (ymin <= rotpos.y && rotpos.y <= ymax) ) dis card; // do not show reflection above water
    //if (xxopos.z < 0.) dis card;
    Colsurf colsurf = iridescentTexcol(texpos, viewdir, mmnormal);//standardTexcol(texpos);  // contains colour and gloss etc
    //colsurf.col = vec4(0.7,0.7,1.,1.);
    // vertex proj from light's POV then nudged. into 0 - 1 space
    CookieVis visibilityL;// = vec3(1.,1.,1.);
    visibilityL.L0 = visibilityL.L1 = visibilityL.L2 = vec4(1.);
    #ifdef SHADOWS
    {
        vec4 vPosition;	// position as seen from light, light/shadow
        visibilityL.L0.a = getShadowA(trpos, lightProjectionMatrix0 * lightViewMatrix0, depthTexture0, light_camd0, vPosition);
        //TODO allow projecting cookie even without shadow.  Also make this more virtual
        //(eg, allow inline kaleidoscope on projected texture here)
        //Make it so that more full light orientation is passed down...
        #ifdef COOKIE0
            visibilityL.L0.rgb = cookie0(vPosition.xy).rgb;
        #endif
    }
    #endif

    #ifdef SHADOWS1
    {
        vec4 vPosition;	// position as seen from light, light/shadow
        visibilityL.L1.a = getShadowA(trpos, lightProjectionMatrix1 * lightViewMatrix1, depthTexture1, light_camd1, vPosition);
        #ifdef COOKIE1
            visibilityL.L1.rgb = cookie1(vPosition.xy).rgb;
        #endif
    }
    #endif

    #ifdef SHADOWS2
    {
        vec4 vPosition;	// position as seen from light, light/shadow
        visibilityL.L2.a = getShadowA(trpos, lightProjectionMatrix2 * lightViewMatrix2, depthTexture2, light_camd2, vPosition);
        #ifdef COOKIE2
            visibilityL.L2.rgb = cookie2(vPosition.xy).rgb;
        #endif
    }
    #endif

    vec4 col = vec4( Phong(trpos, viewdir, mmnormal, colsurf, visibilityL), 1.);
    col.w = 1.0;
    #ifdef REFLECTION
    //PJT: reflection way too strong as soon as CubeMap exists.  Mixing with main colour should be virtual,
    // but even in general case should be based on some configurable fresnel term.
		// note, GetReflection taked out of conditional
        // maybe should use NONU
        vec4 rrr = GetReflection(viewdir, mmnormal, texpos, OUT feeddepth) * vec4(reflred, reflgreen, reflblue, 1.);
        vec4 refl = colsurf.col.w == 0. ? vec4(0.0,0.0,0.0,1.0) : rrr;
        // make feedback part of wall (and other objects) have shadows ... approx method
        refl.rgb *= (visibilityL.L0.a * light0s + visibilityL.L1.a * light1s + visibilityL.L2.a * light2s + ambient) / (light0s + light1s + light2s + ambient);
    #else
        vec4 refl = vec4(0.0,0.0,0.0,1.0);
    #endif

    vec4 res;
    if (useProjectionImage != 0. && colourid != WALLID) {
        // w.i.p. use image from Kinect; registration very hard wired to view and Kinect details for now
        vec2 pp = gl_FragCoord.xy * screen;
        pp.y = 1. - pp.y;
        pp.x = (pp.x - 0.5) * (screen.y / screen.x) / (32. / 26.) + 0.5;    // nb screen values are inverse of #pixels
        float rrr = (sqrt(texture2D(projectionImage, pp).x) -0.5) * useProjectionImage; // lots of tuning todo here
        // rrr = sqrt(rrr);
        res = vec4(col.xyz * (1. + rrr), 1);
    } else {
        res = mix(col, refl, colsurf.col.w);
    }

    #ifdef FLUORESC
	if (fluwidth != 0.) {
        if (fluwidth < 0.) {
            res.rgb += hsv2rgb(colsurf.fluoresc.rgb);
        } else {
            float fluwidthx = fluwidth / texscale;
            float fmin = flulow, fmax = flulow+fluwidthx;
            #if (OPMODE == OPTSHAPEPOS2COL)
                // antialias by computing how much of this pixel has texture within the flu band range.
                // fmin..fmax is the range of the flu band
                // tmin..tmax gives the total range of texture within the pixel
                // xmin..xmax gives the hit range of texture within the band, e.g. intersection of the two.
                //
                // We assume for now (not quite right) that the texture value is evenly distributed over the pixel.
                // This the proportion of the pixel in the flu band is (xmax-xmin)/(tmax-tmin)
                //
                // float tp00 = tpxx; // must look it up again as we need w as well as the texture
                // get full texture value.  .x is the texture value, and .w says which object it is value for
                vec4 tvp00 = textureget(rttexture, (gl_FragCoord.xy + vec2(0.,0.)) * screen);
                vec4 tvp01 = textureget(rttexture, (gl_FragCoord.xy + vec2(0.,xxd)) * screen);
                vec4 tvp10 = textureget(rttexture, (gl_FragCoord.xy + vec2(xxd,0.)) * screen);
                vec4 tvp11 = textureget(rttexture, (gl_FragCoord.xy + vec2(xxd,xxd)) * screen);

                if (tvp00.w != tvp01.w || tvp00.w != tvp10.w || tvp00.w != tvp11.w) { // do not process edges, cross object
                } else {

                    // extract the texture values
                    float tp00 = tvp00.x;
                    float tp01 = tvp01.x;
                    float tp10 = tvp10.x;
                    float tp11 = tvp11.x;

                    // compute the range
                    float tmin = min(tp00, min(tp01, min(tp10, tp11)));
                    float tmax = max(tp00, max(tp01, max(tp10, tp11)));

                    // do the work
                    if (tmin > fmax || tmax < fmin) {                       // completely out of range
                    //} else if (false && fmin < tmin && tmax < fmax ) {    // completely in range, handled by general case below
                    //    res.rgb += hsv2rgb(colsurf.fluoresc.rgb);
                    } else {                                                // interesting intersection
                        float xmin = max(tmin, fmin);                       // xmin..xmax is intersection of tmin..tmax and fmin..fmax
                        float xmax = min(tmax, fmax);
                        float v = (tmax == tmin) ? 1. : (xmax-xmin) /(tmax-tmin);   // proportion of texture range in flu band

                        // add one soft edge
                        float strengthmin = ((xmin-fmin)/fluwidthx);                 // strength at xmin end
                        float strengthmax = ((xmax-fmin)/fluwidthx);                 // strength at xmax end
                        v *= (strengthmin + strengthmax) * 0.5;                     // average strength
                        res.rgb += hsv2rgb(colsurf.fluoresc.rgb) * v;               // apply flu band effect
                    }
                }


            #else  // not OPTSHAPEPOS2COL
                //vec4 xp = texpos / max(texscale, 0.0001);
                float tp = tpxx; // textval(xp.yzx, texrepeat) * 0.5 + 0.5; // + texoffset;  to range approx 0 .. 1
                if (fmin < tp && tp < fmax) {
                    // colsurf.fluoresc.r += oposx.x * flurange;  // disabled, xxopos not available

                    float v = ((tp-fmin)/fluwidthx);  // basic stripe gives output range 0..1

                    //v = 16.0 * (v*v*v*v - 2.*v*v*v + v*v);  // map to give 0..1..0 output
                    //v *= v;                                 // shape more extreme
                    //v *= v;                                 // shape more extreme
                    //// v *= v;                                 // shape more extreme
                    //// damp by distance
                    ////float viewlen = 1. + length(campos - rotpos.xyz)*2./campos.z;
                    ////v *= viewlen;
                    //v *= dotvn*dotvn;                       // damp by normal pointing at eye

                    res.rgb += hsv2rgb(colsurf.fluoresc.rgb) * v;
                }
            #endif // not OPTSHAPEPOS2COL
        }  // end fluorescent bands
	} // if (fluwidth != 0.)
    #endif // FLUORESC

	if (foghalfdepth != 0.) {
        float d = max(0., viewdist - fogstartdist);
		float k = pow(0.5, d/foghalfdepth);
		res.rgb = mix(vec3(fogr, fogg, fogb), res.rgb, k);
	}

    #ifdef DEBUG
        if (ggout.w != 9999.) res = ggout;
    #endif
    res += postxcol;			// add in special effects colour, usually 0 or for debug, can be set in horn definition
    if (ucol.x != -999.) {
        res = ucol;
    }
	//if (postxcol.r != 0.)  // hide areas with bad normals
    //	res = vec4(0,0,0,1);
    // if (isNaN(res)) res=vec4(1,1,0,1);
    // if (res.x+res.y+res.z < 0.001) res=vec4(1,1,0,1);

    res.w = opacity;
    return res;

    // for debugging twists and flipover points of radii, etc
    //if (xxopos.y < 0.02) gl_FragColor.x = 1.;
    //if (0.49 < xxopos.y  && xxopos.y < 0.51) gl_FragColor.z = 1.;

}  // lighting(

/**** tfetch and ttest from edge.fs, varied becuase edge.fs uses special format for rtopos ****/
/* tfetchx reads the pixel and extracts txx (tadpole number) and dxx (z value) */
// void tfetchx(sampler2D tex, ivec2 ij, int m, out float txx, out float dxx) {
//     vec4 v = texelFetch(tex, clamp(ij, ivec2(0,0), textureSize(tex, 0)-1), m);
//     txx = floor(v.w), dxx = v.z;
// }

/** extended lighting
mainly used for edges
also for debug: adds position and normal as possible colours
NOTE output A channel used for feedback depth
main (four.fs) => lightingX() => lighting() => GetReflection() => texcentre() => trifeed()
                              => screenfeed() => trifeed
*/
virtual vec4 lightingx(/*const NO, for EDGES*/ vec3 xmnormal, const vec4 trpos, const vec3 texpos, inout float feeddepth) {
    #ifdef SETCOL
        colourid = xhornid;	// unless overwritten elsewhere
        //if (1.8 < colourid && colourid < 2.)
        //    colourid = 2.;
	#endif
    feeddepth = 0.;  // unless proven otherwise
        // NOTE: 15/1/20 line below involves 3 tex lookups into colbuff; based on colourid; colribs is gene
    NONU(if (texalong != 0. || texaround != 0. || texribs != 0. || colribs != 0.) {)
		// #ifdef OPOSOK // (OPMODE == OPREGULAR)
			colpos = opos;
		//### #else
		// 	£££££ colpos = textureget(rtopos, gl_FragCoord.xy * screen);
		// #endif
		if (colourid != WALLID && colourid != 0.) colourid += colribs * colpos.z;
		colourid = (mod(colourid, 32.));    // <<< COL.NUM
        NONU(})


    bool dofulllights = edgeprop != 1. || fillprop != 1. || flatwallreflp != 1.;
	vec3 r = vec3(0);
    if (dofulllights) {
        vec4 licol = lighting(xmnormal, trpos, texpos, OUT feeddepth);
        float liprop = 1. - xxposprop - xxnormprop;
        r = licol.xyz * liprop +
            (xmnormal+1.)*0.5 * xxnormprop +
            (texpos+300.)/600. * xxposprop;
    }

    if (edgeprop != 0. || fillprop != 0.) {
        bool alt; int etype;
        vec4 edger4 = edgeColour(OUT alt, OUT etype);        // edger is 'suggested' colour from edge code
        vec3 edger = edger4.xyz;
        // todo, check feeddepth
        switch (etype) {
            case edgefill: r = mix(r, edger, fillprop); break;
            case edgeedge: r = mix(r, edger, edgeprop); break;
            // case edgeprofile: r = profcol; break;
            // case edgeocclude: r = occcol; break;
            // case edgeunk: r = unkcol; break;
            case edgewall: {
                if (!dofulllights) {
                    r = texcentre(texpos.xy, feedtexture, OUT feeddepth).xyz; // oversimplified wall
                }
            } break; // if we've got a wall the correct work, including wall based feedback, should already have been done
            // case edgeback: r = screenfeed(backcol, OUT feeddepth); break;
            default: r = edger;
        }
       if (alt) r = 1. - r;
    }

    if (lightoutpower != 1.) r = pow(r, vec3(lightoutpower));

    return vec4(r, 1.);
}


/** ??? towards better specular antialias
aek     bfl
cgm     dhn      qrs

integrate
  (a x y + b (1-x) y + c x (1-y) + d (1-x) (1-y) - q)^2
+ (e x y + f (1-x) y + g x (1-y) + h (1-x) (1-y) - r)^2
+ (k x y + l (1-x) y + m x (1-y) + n (1-x) (1-y) - s)^2
, x=0 to 1, y=0 to 1
**/
#endif

/**
colourid
 = xhornid+colribs        bumps          irid            uses texscale

lightingx             -> lighting -> iridescentTexcol -> standardTexcol -> textvalmix

reflection ...
lightingx -> lighting -> GetReflection


**/
