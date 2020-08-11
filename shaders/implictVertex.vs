void main () {
	float r = 2.0;  // position is -0.5 .. 0.5
    gl_Position = vec4(r*position.x, r*position.y, 0., 1.); // -1..1
}
