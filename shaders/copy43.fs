// 'copy' shader used to change rgba to bgr
uniform vec2 res;           // resolution in input space
uniform sampler2D intex;    // input texture
varying vec2 tpos;          // input position
/*
r0g0b0a r1g1b1a r2g2b2a r3g3b3a   <<< input

b0g0r0b1 g1r1b2g2 r2b3g3r3        <<< output
*/

void main(void) {                   // comment based on res.x = 16, output width 12

    float x = gl_FragCoord.x - 0.5;     // 0..11
    float lp = floor(x * 4. / 3.);      // 0..14
    float lp1 = (lp + 0.5) / res.x;     // 0.5 .. 14.5  ->  0..1
    float hp1 = (lp + 1.5) / res.x;     // 1.5 .. 15.5  ->  0..1
    vec4 lin = texture2D(intex, vec2(lp1,tpos.y));
    vec4 hin = texture2D(intex, vec2(hp1,tpos.y));

    float mm = mod(x, 3.);
    if (mm < 0.5)
        gl_FragColor = vec4(lin.b, lin.g, lin.r, hin.b);
    else if (mm < 1.5)
        gl_FragColor = vec4(lin.g, lin.r, hin.b, hin.g);
    else
        gl_FragColor = vec4(lin.r, hin.b, hin.g, hin.r);

}
