precision highp float;
precision highp float;
precision highp sampler2D;
varying float scaleVary;
void main ()
{
  mediump vec4 tmpvar_1;
  tmpvar_1.w = 1.0;
  tmpvar_1.x = scaleVary;
  tmpvar_1.y = -(scaleVary);
  tmpvar_1.z = (scaleVary + 10000.0);
  gl_FragColor = tmpvar_1;
}

