/**
 * 'pickedness' buffers to represent how 'picked' each particle is.
 * Unlike pickRenderTarget which is addressed by an index relating to UI device (pick source)
 * and has index of currently associated particle, here we address by
 * particle index and have a value for how selected it currently is.
 */

var CSynth, pickRenderTarget, springs;

CSynth.initPickedness = (springsp = springs) => {
    ////PJT notes from initial implementation sketch 19/03/19
    //shaders for passes to fill pickedness buffer.
    //using particleRange implies that we are referring to the pickedness of e.g. a given BED
    //we could have another so we address x->particle, y->BED...
    //...but then we might still want to do something like y->pick source instead
    //...or have history using destWorkHistTime... (could be interesting for trace visualisation)...
    //too ambiguous, so going to start with simplest version where:
    //it's not aware of range from BED
    //accumulates all pick sources (mouse, vive, etc) into one value.
    //doesn't save history (but will soon have damped version)
    //... the thing to do after that is try to use this (damped) weight in annotation springs
    //(maybe the damping not so important there as springs themselves damp)
    const getPickednessChunk = `
        ${CSynth.CommonFragmentShaderCode()}

        uniform float selWidth;

        float pickedness(float particleIndex, vec3 particleRange) {
            float s = 0.;
            //referring to annotationDisplay shader for now...
            for (int i=0; i<PICKNUM; i++) {
                float p = getPick(i); // / Normalised ToTexCo;
                if (p > 99.) continue;
                vec3 r = particleRange;
                //are we within the range, or how far above or below it?
                float dp;
                bool inRange = r.y < p && r.z > p;
                if (inRange) {
                    dp = 0.;
                } else {
                    vec3 dr = abs(particleRange - p);
                    dr = abs(dr);
                    dp = min(dr.y, dr.z);
                    //dp = min(abs(r.y-p), abs(r.z-p));
                }
                //dp = abs(r.x - p); //this was just looking at centre.


                float sw = selWidth + 1e-10;
                float inv = 1./sw;
                float s2 = dp <= sw ? 1.-(dp*inv) : 0.;
                s2 = VALID_PICK_INDEX ? s2 : 0.;
                //s2 *= 10.;
                s = max(s, s2);
            }
            return s;
        }
        float pickedness(float particleIndex) {
            float s = 0.;
            //referring to annotationDisplay shader for now...
            for (int i=0; i<PICKNUM; i++) {
                float p = getPick(i); // / Normalised ToTexCo;
                if (p > 99.9) continue;
                float dp = abs(particleIndex - p);

                float sw = selWidth + 1e-10;
                float inv = 1./sw;
                float s2 = dp <= sw ? 1.-(dp*inv) : 0.;
                s2 = VALID_PICK_INDEX ? s2 : 0.;
                //s2 *= 10.;
                s = max(s, s2);
            }
            return s;
        }
    `;
}
