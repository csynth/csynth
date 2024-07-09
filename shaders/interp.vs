// interp.vs may be used as part of vertex or fragment shader
// uniform vec2 code[100]; will give too many uniforms
/**
todos:
extra parameters (eg twistoff)
stack mechanism
control structure
generate from current horns, getting there
change skelbuffer for more horns
? fragment functions
**/

uniform sampler2D bytecode;
uniform float vgenes[100];

#define MAXHORNS 40
#define horns interphorns
uniform vec4 horns[MAXHORNS];
#define endid x
#define num y
#define label z
#define headflag w
vec4 curh;  // current horn

vec2 code(int i) {
    return texelFetch(bytecode, ivec2(i,0), 0).xy;
}

float vstack[100];

#define gflag 256
#define kflag 512

void getkv(int i, float rp, out int k, out float v, out float rawv) {
    vec2 p = code(i); k = int(p.x); v = p.y; // key value pair
    rawv = v;
    if ((k & kflag) == 0) v *= rp;
}

interpsig {
    int i = 0;  // current position in bytecode
    float xhornnum = hornnum;
    float depth = 0.;
    float ribs = 1.;
    // rp = 0.;
    for (int w = 0; w < 300; w++) { // # bytecodes walked
        int k; float v, rawv;
        getkv(i, rp, k, v, rawv);
        if (k == 0) break;
        float rawv2, v2; int k2;
        float rawv3, v3; int k3;
        switch(k & 255) {
            case 1: break; // noop
            case 2: break; // mark used to help complier/converter
            case 3: i = int(rawv); break; // goto
            case 4: x += v; break; // stackx
            case 5: y += v; break; // stacky
            case 6: z += v; break; // stackz
            case 7: tw(y, z, v, 0.); break; // bend1x
            case 8: tw(x, z, v, 0.); break; // bend1y
            case 9: tw(x, y, v, 0.); break; // bend1z
            case 27: getkv(++i, rp, k2, v2, rawv2); tw(y, z, v, v2); break; // bend2x
            case 28: getkv(++i, rp, k2, v2, rawv2); tw(x, z, v, v2); break; // bend2y
            case 29: getkv(++i, rp, k2, v2, rawv2); tw(x, y, v, v2); break; // bend2z
            case 17: x *= v; if (v < 0.) reflnorm *= 1.; break;    // scalex
            case 18: y *= v; if (v < 0.) reflnorm *= 1.; break;    // scaley
            case 19: z *= v; if (v < 0.) reflnorm *= 1.; break;    // scalez
            case 10: r = v; break; // setrad
            case 11: {float kk = 1. - (1. - rawv) * rp;  // scale
                x *= kk; y *= kk; z *= kk;
                xscale *= kk;
                // r *= kk; //?? not in hornmaker
            } break;
            case 12: {float kk = rawv;  // scalek !! nb special case overwrites k modifier of scale
                x *= kk; y *= kk; z *= kk;
                xscale *= kk;
                // r *= kk; //?? not in hornmaker
            } break;

            case 13: if (xhornnum > 0.) { // loop used for recursion, similar to parent 0
                i = -1;
                rp = (mod((xhornnum - 1.) , v) + 1.) / v;
                xhornnum = floor((xhornnum - 1.)/v);
                depth++;
            } break;

            case 14: { //  route ? usually at start of code
                if (rawv < 0.) break;  // test
                xhornnum = hornnum;  // TODO to make more flexible
                for (int hi = 0; hi < MAXHORNS; hi++) {
                    curh = horns[hi];
                    if (xhornnum < curh.endid) {
                        hornid = float(hi + 3);
                        i = int(curh.label + rawv) - 1;    // -1 compensates for i++ below, so hits label point which is radius
                        if (hi != 0) xhornnum -= horns[hi-1].endid;
                        break;
                    }
                }
            } break;

            case 15: { // parent
                // rp = (curh.endid - xhornnum) / curh.num;
                // xhornnum = floor((xhornnum - 1.)/curh.num);
                float n = ribs = curh.num;
                // rp = (mod((xhornnum - 1.) , n) + 1.) / n; // eg for n=3 use 1/3, 2/3, 1 ?? neater
                rp = n == 1. ? 1. : (mod((xhornnum - 1.) , n)) / (n - 1.);  // eg for n=3 use 0, 1/2, 1   ?? to match old
                if (curh.headflag == 1.) rp = 0.;  // for head
                xhornnum = floor((xhornnum - 1.)/n);

                curh = horns[int(rawv)];
                i = int(curh.label);    // i will get 1 added at i++, which will skip radius
                depth++;
                // incomplete
            } break;

            case 16: { // branch
                // #define branchspiralX(s, p, rpb, rribs, rrref) { vec3 o = branchspiral( vec3(x,y,z), rribs, rrref, s, p, rpb); x=o.x; y=o.y; z=o.z; }
                // #define branchanimX(s, p, grownum, rpb, rribs, rrref) { vec3 o = branchanim( vec3(x,y,z), rribs, rrref, s, p, grownum, rpb); x=o.x; y=o.y; z=o.z; }
                branchanimX(v, 3.0, 10., rp, ribs, ribs)
                //branchspiralX(v, 3.0, rp, 99., 1.)
            } break;
            case 26: { // branch2
                getkv(++i, rp, k2, v2, rawv2);
                branchanimX(v, v2, 10., rp, ribs-1., ribs-1.)
                //branchspiralX(v, v2, rp, 199., 1.)
            } break;
            case 25: { // branch3
                getkv(++i, rp, k2, v2, rawv2);
                getkv(++i, rp, k3, v3, rawv3);
                branchanimX(v, v2, v3, rp, ribs, ribs)
                //branchspiralX(v, v2, rp, 199., 1.)
            } break;

            // y += xhornnum*v; break; // offsubs
            //c ase 14: y += xhornnum*v; break; // off subs
        }
        i++;
    }
    colourid = hornid;  // only change hornid during main pass
    // colourid = hornid = depth + 3.;
    // colourid = hornid = mod(hornnum, 10.) + 3.;
}
