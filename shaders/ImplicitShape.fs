#include common.vfs;
gene(thresh,  1, 0, 1, 0.01, 0.001, impl, fixed) //

float eval(vec3 pointa);
#include implicit.fs;
#include bodyShape.fs;

float eval(vec3 point) {
	return body(point) - thresh;
}
