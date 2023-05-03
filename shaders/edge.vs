#version 300 es 
precision highp float;
in vec3 position;

void main() {
    float id = float(gl_InstanceID); // used for instancing version
    gl_Position = vec4(position.xy, id, 1.); // input range for x,y  -0.5 .. 0.5, usually mapped to 0..1 below
    }
