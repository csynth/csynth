// http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter26.html
// altermative perlin noise
// gives too obvious repeats ???
// not actually used 20/08/2013

uniform sampler2D permSampler;
uniform sampler2D gradSampler;
vec3 fade(vec3 t) {
  return t * t * t * (t * (t * 6. - 15.) + 10.); // new curve
}

vec4 tex1D(sampler2D samp, float x) { return textureget(samp, vec2(x, 0.)); }

float perm(float v) {
  return tex1D(permSampler, v / 256.0 + 1./512.).x * 256.;
}
float grad(float v, vec3 p) {
  return dot(tex1D(gradSampler, v).xyz *2. * 255. - 1., p);
}

#define lerp mix

// 3D version
float inoise1(vec3 p) {
  vec3 P = mod(floor(p), 256.0);  // integer 0..255
  p -= floor(p);
  vec3 f = fade(p);

  // HASH COORDINATES FOR 6 OF THE 8 CUBE CORNERS
  float A = perm(P.x) + P.y;
  float AA = perm(A) + P.z;
  float AB = perm(A + 1.) + P.z;
  float B =  perm(P.x + 1.) + P.y;
  float BA = perm(B) + P.z;
  float BB = perm(B + 1.) + P.z;

  // AND ADD BLENDED RESULTS FROM 8 CORNERS OF CUBE
  return lerp(
    lerp(lerp(grad(perm(AA), p),
              grad(perm(BA), p + vec3(-1., 0., 0.)), f.x),
         lerp(grad(perm(AB), p + vec3(0., -1., 0.)),
              grad(perm(BB), p + vec3(-1., -1., 0.)), f.x), f.y),
    lerp(lerp(grad(perm(AA + 1.), p + vec3(0., 0., -1.)),
              grad(perm(BA + 1.), p + vec3(-1., 0., -1.)), f.x),
         lerp(grad(perm(AB + 1.), p + vec3(0., -1., -1.)),
              grad(perm(BB + 1.), p + vec3(-1., -1., -1.)), f.x), f.y),
    f.z);
}

float inoise(vec3 p) {
    return inoise1(p);// + inoise1(1.7 * p.yxz);
}
