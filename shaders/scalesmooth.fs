uniform sampler2D scaleRenderTarget;  // contains coord ranges for target
uniform sampler2D scaleDampTarget;  // contains current values to take part in smoothing, scaleDampTarget and output flipflop
uniform float basescale;	// expected size of object based on camera
uniform float dampval;		// 1 - exponential damping constant

/** get a value from the scale texture */
float gv(float px, float py) {
    vec4 t = texture2D(scaleRenderTarget, vec2(px, py), 0.);
    //if (t.w == 0.) return 1500.;
    if (t.x + t.y + t.z != t.x + t.y + t.z) return 0.;  // NaN?,  not sure why this happens
    float r = t.x;
    return r;
}

void main() 
{
    // collect the various values from the last real scale pass
    float lx = -gv(1./16. ,0.5);
    float hx = gv(3./16. ,0.5);
    float ly = -gv(5./16. ,0.5);
    float hy = gv(7./16. ,0.5);
    float lz = -gv(9./16. ,0.5);
    float hz = gv(11./16. ,0.5);
    float lw = -gv(13./16. ,0.5);
    float hw = gv(15./16. ,0.5);

    // process them to find centre and scale
    float cx = (lx+hx)*0.5;
    float cy = (ly+hy)*0.5;
    float cz = (lz+hz)*0.5;
    float cw = (lw+hw)*0.5;
    float mmax = max(max(hx-lx, hy-ly), max(hz-lz, hw-lw));
    float len = mmax/2.;
    float isc = len == 0. ? 1.0 : basescale/len;

    // and save the result in the output for use by the real shaders later
	// << todo, decide how to multiplex to get 4 pos + scale
    vec4 targ = (basescale == 0. || len == 0.) ? vec4(0.,0.,0.,1.) : vec4(cx,cy,cz, basescale/len);  
    if (dampval == 1.) { gl_FragColor = targ; return; }
    vec4 now = texture2D(scaleDampTarget, vec2(0.5, 0.5), 0.);
    if (now != now) now = targ;    // repair any polluted value

    gl_FragColor = dampval == 1. ? targ : mix(now, targ, dampval);
}