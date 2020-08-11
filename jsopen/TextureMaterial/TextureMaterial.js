import {} from './texture.fs.js';

var {COL, THREE} = window;

const patchBefore = (s, k, toadd) => s.replace(k, toadd + '\n' + k );
window.marchtexture = marchtexture;

/** patch a three standard material to add Organic textures */
function marchtexture(str, uniforms) {

    // set up COL so the details can be used for our textures
    // it has the side-effect of adding uniforms.colbuff
    COL.uniforms = uniforms;
    COL.randcols(undefined, {texscale: [0.1,0.25], texfract3d: 1, bumpstrength: [0,1], bumpscale: [0.04,0.2], plastic: [0,1], shininess: [0,1] });

    let text = marchtexture.defs + '\n#include <O_texture>\n'

    str = patchBefore(str, 'void main() {', text);

    const frag = /*glsl*/`
// // >>>>> we enter this code with some variables available from three.js
// and can modify these as outputs from our code segment
// diffuseColor (from mat.color=>diffuse and map=>texelColor)
// roughnessFactor (from roughness and roughnessMap)
// metalnessFactor (from metalness and metalnessMap)
// normal (from vNormal and their bumpmap)
// geometryNormal (from normal and normalMap)
// totalEmissveRadiance (from emissive and emissiveMap)
// emissiveColor (from emissiveMap)
//
// UNIFORMS: transparency, reflectivity, clearcoat, clearcoatRoughness, sheen

// also tangent, flatShaded, bitangent

// // test horrid way to intercept uniforms
// #ifdef USE_SHEEN
//     vec3 Usheen;
//     Usheen = sheen + vec3(1,0,0);
//     #define sheen Usheen
// #endif


if (colourid < 0.) {
    // use large 3d texture to make bands of our COLNUM (32)textures, or just some of them
    float tv = textval(_transformed, 0.7);
    colourid = floor(tv * -colourid * COLNUM);  // random global top level texture to use bands of all colourids
}

normal = bump(_transformed, normal);         // apply organic 3d bumping

// use our texture lookup to get a colour bundle Colsurf
// TODO: check that vViewPosition is really the right value
Colsurf csurf = iridescentTexcol(_transformed, normalize(vViewPosition), normal);
vec4 s = csurf.surftype;
float shininess = s.x, gloss = s.y, UNUSEDspeck = s.z, plastic = s.w; // convenience and clarity

// map our Colsurf onto three.js shader internal variables
// #if trackStyle == trackColor
//     diffuseColor.rgb += 0.2 * csurf.col.rgb;    // keep tracked colour with a hint of textured colours (and use other texture attributes)
// #else
//     diffuseColor.rgb = csurf.col.rgb;   // pick up colours from texture
// #endif
// diffuseColor.rgb *= csurf.col.rgb;
// TODO consider best colour mixing style here, and if we need an extra 'guide' parameter of some sort
diffuseColor.rgb = min(diffuseColor.rgb , csurf.col.rgb);
if (!gl_FrontFacing) diffuseColor.rgb = diffuseColor.bgr;

roughnessFactor = 1. - shininess;
metalnessFactor = 1. - plastic;

totalEmissiveRadiance = hsv2rgb(csurf.fluoresc.xyz);

// <<<<< we exit this code having updated some three.js variables it will use for lighting/shading

`
    str = patchBefore(str, '#include <lights_physical_fragment>', frag);

    return str;
}

marchtexture.onframe = function(opts) {
    if (!COL.uniforms) COL.uniforms = opts.uniforms;
    COL.send(); // no overhead unless COL has changed
}

COL.initnames();

// marchtexture.defs contains bits that would otherwise be provided by the Organic infrastructure
// and thus make a bridge from three.js shaders
marchtexture.defs = `
#define OPMODE 0 // ubershader variant: not too important for texture, but we must use it direct and not from lookup

#define OPTSHAPEPOS2COL 8
#define OPBUMPNORMAL 10

#define virtual         // used to flag some methods as overridable

#define RAND true
//#define PERLIN true
#define POHNOISE true
//#define FLUORESC true
#define BUMP true

#define NOTR

#define textureget(s,p) texture2D(s,p)
#define COLNUM float(${COL.NUM})       //<< used to define how many different coloured objects there are, depends on the horndef.
#define COLPARMS float(${COL.PARMS/4})  //<< used to give range of how many different genet definitiona are allowed (4 definitions for each entry as it is a vec4)
#define mixk(x,y,a) (a == 0. ? x : a == 1. ? y : mix(x,y,a)) /* mix with bug fix */

//<< NONU set from NONUNIFORMS to either include or not include associated code (x)
#define NONU(x) x

#define opos vec3(0)    // may eventially use vUv, used for 2d textures

float _boxsize = 1.0;

uniform sampler2D colbuff;		// sampler used to hold colours
vec4 xcol = vec4(0.,0.,0.,0.);  // extra colour, may be set in various places including tranrule or for debug

float colourid = -1.; // -COLNUM;
float g_hueshift = 0.; // gene(g_hueshift, 0, 0, 1, 0.1, 0.1, texturex, frozen) //global colour shift to rotate colour scheme
float pohnoisek = 0.5;
float pohnoisen = 3.0;

#define gene(name, value, min, max, step, delta, class, free)
#define genet(name, value, min, max, step, delta, class, free)

`
marchtexture.defs += COL.generateDefines();

function TextureMaterial(uniforms = {}) {
    let mat = new THREE.MeshPhysicalMaterial();
    mat.onBeforeCompile = shader => {
        mat.xshader = shader;  // for debug
        const patch = (s, k, toadd) => s.replace(k, toadd);
        // const patchBefore = (s, k, toadd) => s.replace(k, toadd + '\n' + k );
        const patchAfter = (s, k, toadd) => s.replace(k, k + '\n' + toadd);

        //make sure worldPosition saved and passed from vertex shader
        shader.vertexShader = patchAfter(shader.vertexShader, '#include <common>', `
            varying vec3 _transformed; // _worldPosition,
        `);
        shader.vertexShader = patchAfter(shader.vertexShader, '#include <fog_vertex>', `
            // _worldPosition = (modelMatrix * vec4( transformed, 1.0 )).xyz;
            _transformed = transformed;
        `);

        shader.fragmentShader = patchBefore(shader.fragmentShader, 'void main() {', /*glsl*/`
            varying vec3 _transformed; // _worldPosition,
        `);
        Object.assign(shader.uniforms, uniforms);
        shader.fragmentShader = marchtexture(shader.fragmentShader, shader.uniforms); // modifies shader code and adds to its uniforms
        if (mat.onBeforeCompileX)
            mat.onBeforeCompileX(shader);

    }
    return mat;
}
window.TextureMaterial = TextureMaterial;   // for non-module
