precision highp float;
precision highp float;
precision highp sampler2D;
varying vec4 pickVary0;
varying vec4 pickVary1;
varying vec4 pickVary2;
varying vec4 pickVary3;
void main ()
{
  highp int tmpvar_1;
  tmpvar_1 = int(floor(gl_FragCoord.x));
  mediump vec4 tmpvar_2;
  if ((tmpvar_1 == 0)) {
    tmpvar_2 = pickVary0;
  } else {
    mediump vec4 tmpvar_3;
    if ((tmpvar_1 == 1)) {
      tmpvar_3 = pickVary1;
    } else {
      mediump vec4 tmpvar_4;
      if ((tmpvar_1 == 2)) {
        tmpvar_4 = pickVary2;
      } else {
        tmpvar_4 = pickVary3;
      };
      tmpvar_3 = tmpvar_4;
    };
    tmpvar_2 = tmpvar_3;
  };
  gl_FragColor = tmpvar_2;
}

