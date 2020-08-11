// trivial fragment shader for smoothing scale
void main() 
{
    gl_Position = vec4(position, 1.);
}