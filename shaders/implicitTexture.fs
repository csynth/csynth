gene(thresh,  0.5, 0, 1, 0.01, 0.001, impl, free) // threshold for texture calculation

//gene(xdistortstrength, 0, -1, 1, 0.1, 0.01, impl, free)  // space distortion along x axis, strenght
//gene(xdistortsscale, 100, -100, 100, 10, 1, impl, free)  // space distortion along x axis, scale

float eval(vec3 pointa);
#include implicit.fs;

float eval(vec3 point) {
    // float textval(vec3 texpos, float texr) { 
    // could scale with texscale but then it can't be textured
    // could add another gene, but scaling can be done by zooming anyway
//	point *= (1. - xdistortstrength * sin(point.x / xdistortsscale));
    return textval(point, texrepeat) - thresh;
}

