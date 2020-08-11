precision highp float;
precision highp float;
precision highp sampler2D;
varying vec4 objpos;
void main ()
{
  gl_FragColor = objpos;
}

