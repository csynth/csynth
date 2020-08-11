precision highp float;
precision highp float;
precision highp sampler2D;
attribute vec3 position;
uniform float matskipdiag;
uniform float matX;
uniform float matY;
uniform float matZ;
uniform float matpow;
uniform float matMinD;
uniform float matMaxD;
uniform float minActive;
uniform float maxActive;
uniform vec4 _camd;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 rot4;
uniform float pointSize;
attribute float instanceID;
uniform float fakeinstanceID;
varying vec4 opos;
uniform float numSegs;
uniform float numInstancesP2;
uniform sampler2D posNewvals;
uniform float NORMTYPE;
uniform float USELOGDEPTH;
void main ()
{
  lowp vec4 ooo_1;
  vec4 p_2;
  vec4 tmpvar_3;
  tmpvar_3.w = 1.0;
  tmpvar_3.xy = position.xy;
  tmpvar_3.z = (instanceID + fakeinstanceID);
  p_2.zw = tmpvar_3.zw;
  p_2.xy = (position.xy + vec2(0.5, 0.5));
  if ((NORMTYPE >= 5.0)) {
    p_2.y = (p_2.y * 0.5);
  };
  opos = p_2;
  lowp float id_4;
  lowp vec4 p_5;
  p_5 = p_2;
  float tmpvar_6;
  tmpvar_6 = (numSegs + 1.0);
  lowp vec2 tmpvar_7;
  tmpvar_7.x = 0.0;
  tmpvar_7.y = (((p_2.x * tmpvar_6) + 0.5) / numInstancesP2);
  lowp vec2 tmpvar_8;
  tmpvar_8.x = 0.0;
  tmpvar_8.y = (((p_2.y * tmpvar_6) + 0.5) / numInstancesP2);
  lowp vec3 x_9;
  x_9 = (texture2D (posNewvals, tmpvar_8).xyz - texture2D (posNewvals, tmpvar_7).xyz);
  id_4 = (1.0/(clamp ((10.0 + 
    (((sqrt(
      dot (x_9, x_9)
    ) - matMinD) * 290.0) / (matMaxD - matMinD))
  ), 10.0, 300.0)));
  if (((p_2.x - p_2.y) > ((
    -(matskipdiag)
   - 2.0) / numSegs))) {
    id_4 = 0.0;
  };
  if (!(((
    (minActive <= p_2.x)
   && 
    (p_2.x <= maxActive)
  ) && (
    (minActive <= p_2.y)
   && 
    (p_2.y <= maxActive)
  )))) {
    id_4 = 0.0;
  };
  lowp vec2 p_10;
  lowp float d_11;
  lowp float tmpvar_12;
  tmpvar_12 = (p_2.y - p_2.x);
  lowp float tmpvar_13;
  tmpvar_13 = ((p_2.x + p_2.y) * 0.5);
  lowp float tmpvar_14;
  tmpvar_14 = sign(tmpvar_12);
  d_11 = (tmpvar_14 * pow ((tmpvar_14 * tmpvar_12), (1.0/(matpow))));
  d_11 = (d_11 * 0.5);
  p_10.x = (tmpvar_13 - d_11);
  p_10.y = (tmpvar_13 + d_11);
  p_5.xy = p_10;
  lowp float tmpvar_15;
  if ((matMaxD == 0.0)) {
    tmpvar_15 = 0.0;
  } else {
    tmpvar_15 = id_4;
  };
  p_5.x = (p_10.x + matX);
  p_5.y = (p_10.y + matY);
  p_5.z = (tmpvar_15 + matZ);
  gl_PointSize = pointSize;
  lowp vec4 tmpvar_16;
  tmpvar_16.w = 1.0;
  tmpvar_16.xyz = (p_5 * rot4).xyz;
  ooo_1 = (projectionMatrix * (modelViewMatrix * tmpvar_16));
  lowp vec4 ooo_17;
  ooo_17 = ooo_1;
  if ((USELOGDEPTH > 0.0)) {
    ooo_17.xy = (ooo_1.xy / ooo_1.w);
    ooo_17.w = 1.0;
    ooo_17.z = (((
      (log(ooo_1.w) - _camd.z)
     * _camd.w) * 2.0) - 1.0);
  } else {
    if ((USELOGDEPTH < 0.0)) {
      ooo_17.z = (log2(max (1e-6, 
        (ooo_17.w + 1.0)
      )) * 0.15);
      ooo_17.z = ((ooo_17.z - 1.0) * ooo_17.w);
    };
  };
  ooo_1 = ooo_17;
  gl_Position = ooo_17;
  opos.xyz = p_2.xyz;
  opos.w = -99.0;
}

