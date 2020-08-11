precision highp float;
precision highp float;
precision highp sampler2D;
uniform float cutx;
uniform float cuty;
uniform float cutfall;
uniform vec2 screen;
varying vec4 opos;
void main ()
{
  vec2 tmpvar_1;
  tmpvar_1.x = cutx;
  tmpvar_1.y = cuty;
  highp vec2 tmpvar_2;
  tmpvar_2 = (((gl_FragCoord.xy * screen) - 0.5) * tmpvar_1);
  highp float tmpvar_3;
  tmpvar_3 = ((tmpvar_2.x * tmpvar_2.x) + (tmpvar_2.y * tmpvar_2.y));
  if ((tmpvar_3 > cutfall)) {
    discard;
  };
  gl_FragColor.xyw = opos.xyw;
  gl_FragColor.z = floor((opos.z + 0.1));
  mediump float tmpvar_4;
  if (gl_FrontFacing) {
    tmpvar_4 = floor((opos.w + 0.5));
  } else {
    tmpvar_4 = 99.0;
  };
  gl_FragColor.w = tmpvar_4;
}

