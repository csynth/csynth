// trivial fragment shader for smoothing scale
precision highp float;
attribute vec3 position;
void main()
{
    gl_Position = vec4(position, 1.);
}