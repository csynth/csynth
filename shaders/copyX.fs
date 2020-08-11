// 'copy' shader used to compose final canvas from separate rendertargets
// trivial version for IE
varying vec2 tpos;          // original position x,y
uniform sampler2D intex;    // input texture

void main(void) {
    vec4 vxx = texture2D(intex, tpos);
    if (vxx.w < 0.) discard;
    gl_FragColor = sqrt(vxx);
}
