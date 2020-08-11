precision highp float;
precision highp float;
precision highp sampler2D;
uniform float matskipdiag;
uniform float matX;
uniform float matY;
uniform float matZ;
uniform float matpow;
uniform float matMinD;
uniform float matMaxD;
uniform float minActive;
uniform float maxActive;
uniform sampler2D rtopos;
uniform float multifact;
uniform float multiquatfact;
uniform float latenormals;
uniform float cutx;
uniform float cuty;
uniform float cutfall;
uniform vec2 screen;
uniform float numSegs;
uniform float numInstancesP2;
uniform sampler2D posNewvals;
uniform float hornid;
void main ()
{
  lowp vec4 multi_1;
  vec2 tmpvar_2;
  tmpvar_2.x = cutx;
  tmpvar_2.y = cuty;
  highp vec2 tmpvar_3;
  tmpvar_3 = (((gl_FragCoord.xy * screen) - 0.5) * tmpvar_2);
  highp float tmpvar_4;
  tmpvar_4 = ((tmpvar_3.x * tmpvar_3.x) + (tmpvar_3.y * tmpvar_3.y));
  if ((tmpvar_4 > cutfall)) {
    discard;
  };
  lowp vec4 tmpvar_5;
  highp vec2 P_6;
  P_6 = (gl_FragCoord.xy * screen);
  tmpvar_5 = texture2D (rtopos, P_6);
  if ((tmpvar_5.w == 0.0)) {
    discard;
  };
  if ((tmpvar_5.w == 2.0)) {
    discard;
  };
  lowp float tmpvar_7;
  if ((tmpvar_5.w == 99.0)) {
    tmpvar_7 = 1.0;
  } else {
    tmpvar_7 = hornid;
  };
  vec3 xmnormal_8;
  float ribnum_9;
  lowp float id_10;
  lowp vec4 p_11;
  p_11 = tmpvar_5;
  float tmpvar_12;
  tmpvar_12 = (numSegs + 1.0);
  lowp vec2 tmpvar_13;
  tmpvar_13.x = 0.0;
  tmpvar_13.y = (((tmpvar_5.x * tmpvar_12) + 0.5) / numInstancesP2);
  lowp vec2 tmpvar_14;
  tmpvar_14.x = 0.0;
  tmpvar_14.y = (((tmpvar_5.y * tmpvar_12) + 0.5) / numInstancesP2);
  lowp vec3 x_15;
  x_15 = (texture2D (posNewvals, tmpvar_14).xyz - texture2D (posNewvals, tmpvar_13).xyz);
  id_10 = (1.0/(clamp ((10.0 + 
    (((sqrt(
      dot (x_15, x_15)
    ) - matMinD) * 290.0) / (matMaxD - matMinD))
  ), 10.0, 300.0)));
  if (((tmpvar_5.x - tmpvar_5.y) > ((
    -(matskipdiag)
   - 2.0) / numSegs))) {
    id_10 = 0.0;
  };
  if (!(((
    (minActive <= tmpvar_5.x)
   && 
    (tmpvar_5.x <= maxActive)
  ) && (
    (minActive <= tmpvar_5.y)
   && 
    (tmpvar_5.y <= maxActive)
  )))) {
    id_10 = 0.0;
  };
  lowp vec2 p_16;
  lowp float d_17;
  lowp float tmpvar_18;
  tmpvar_18 = (tmpvar_5.y - tmpvar_5.x);
  lowp float tmpvar_19;
  tmpvar_19 = ((tmpvar_5.x + tmpvar_5.y) * 0.5);
  lowp float tmpvar_20;
  tmpvar_20 = sign(tmpvar_18);
  d_17 = (tmpvar_20 * pow ((tmpvar_20 * tmpvar_18), (1.0/(matpow))));
  d_17 = (d_17 * 0.5);
  p_16.x = (tmpvar_19 - d_17);
  p_16.y = (tmpvar_19 + d_17);
  p_11.xy = p_16;
  lowp float tmpvar_21;
  if ((matMaxD == 0.0)) {
    tmpvar_21 = 0.0;
  } else {
    tmpvar_21 = id_10;
  };
  p_11.x = (p_16.x + matX);
  p_11.y = (p_16.y + matY);
  p_11.z = (tmpvar_21 + matZ);
  multi_1.xyz = (floor((p_11.xyz * multifact)) + ((xmnormal_8 + 1.0) * multiquatfact));
  if ((latenormals != 0.0)) {
    multi_1 = p_11;
  };
  multi_1.w = (((16384.0 * tmpvar_7) + tmpvar_5.z) + ((float(mod (ribnum_9, 2.0))) * 0.5));
  if ((tmpvar_7 == 2.0)) {
    multi_1.w = ((16384.0 * tmpvar_7) + ribnum_9);
  };
  gl_FragColor = multi_1;
}

