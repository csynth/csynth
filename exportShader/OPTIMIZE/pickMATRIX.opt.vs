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
uniform float numSegs;
uniform float numInstancesP2;
uniform sampler2D posNewvals;
varying vec4 pickVary0;
varying vec4 pickVary1;
varying vec4 pickVary2;
varying vec4 pickVary3;
uniform highp int pickxslot;
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
  lowp float id_4;
  lowp vec4 p_5;
  pickVary0 = vec4(999.0, 999.0, 999.0, 999.0);
  pickVary1 = vec4(999.0, 999.0, 999.0, 999.0);
  pickVary2 = vec4(999.0, 999.0, 999.0, 999.0);
  pickVary3 = vec4(999.0, 999.0, 999.0, 999.0);
  float v_6;
  v_6 = p_2.x;
  if ((pickxslot == 0)) {
    pickVary0.x = v_6;
  };
  if ((pickxslot == 1)) {
    pickVary0.y = v_6;
  };
  if ((pickxslot == 2)) {
    pickVary0.z = v_6;
  };
  if ((pickxslot == 3)) {
    pickVary0.w = v_6;
  };
  if ((pickxslot == 4)) {
    pickVary1.x = v_6;
  };
  if ((pickxslot == 5)) {
    pickVary1.y = v_6;
  };
  if ((pickxslot == 6)) {
    pickVary1.z = v_6;
  };
  if ((pickxslot == 7)) {
    pickVary1.w = v_6;
  };
  if ((pickxslot == 8)) {
    pickVary2.x = v_6;
  };
  if ((pickxslot == 9)) {
    pickVary2.y = v_6;
  };
  if ((pickxslot == 10)) {
    pickVary2.z = v_6;
  };
  if ((pickxslot == 11)) {
    pickVary2.w = v_6;
  };
  if ((pickxslot == 12)) {
    pickVary3.x = v_6;
  };
  if ((pickxslot == 13)) {
    pickVary3.y = v_6;
  };
  if ((pickxslot == 14)) {
    pickVary3.z = v_6;
  };
  if ((pickxslot == 15)) {
    pickVary3.w = v_6;
  };
  highp int num_7;
  float v_8;
  v_8 = p_2.y;
  num_7 = (1 + pickxslot);
  if ((num_7 == 0)) {
    pickVary0.x = v_8;
  };
  if ((num_7 == 1)) {
    pickVary0.y = v_8;
  };
  if ((num_7 == 2)) {
    pickVary0.z = v_8;
  };
  if ((num_7 == 3)) {
    pickVary0.w = v_8;
  };
  if ((num_7 == 4)) {
    pickVary1.x = v_8;
  };
  if ((num_7 == 5)) {
    pickVary1.y = v_8;
  };
  if ((num_7 == 6)) {
    pickVary1.z = v_8;
  };
  if ((num_7 == 7)) {
    pickVary1.w = v_8;
  };
  if ((num_7 == 8)) {
    pickVary2.x = v_8;
  };
  if ((num_7 == 9)) {
    pickVary2.y = v_8;
  };
  if ((num_7 == 10)) {
    pickVary2.z = v_8;
  };
  if ((num_7 == 11)) {
    pickVary2.w = v_8;
  };
  if ((num_7 == 12)) {
    pickVary3.x = v_8;
  };
  if ((num_7 == 13)) {
    pickVary3.y = v_8;
  };
  if ((num_7 == 14)) {
    pickVary3.z = v_8;
  };
  if ((num_7 == 15)) {
    pickVary3.w = v_8;
  };
  p_5 = p_2;
  float tmpvar_9;
  tmpvar_9 = (numSegs + 1.0);
  lowp vec2 tmpvar_10;
  tmpvar_10.x = 0.0;
  tmpvar_10.y = (((p_2.x * tmpvar_9) + 0.5) / numInstancesP2);
  lowp vec2 tmpvar_11;
  tmpvar_11.x = 0.0;
  tmpvar_11.y = (((p_2.y * tmpvar_9) + 0.5) / numInstancesP2);
  lowp vec3 x_12;
  x_12 = (texture2D (posNewvals, tmpvar_11).xyz - texture2D (posNewvals, tmpvar_10).xyz);
  id_4 = (1.0/(clamp ((10.0 + 
    (((sqrt(
      dot (x_12, x_12)
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
  lowp vec2 p_13;
  lowp float d_14;
  lowp float tmpvar_15;
  tmpvar_15 = (p_2.y - p_2.x);
  lowp float tmpvar_16;
  tmpvar_16 = ((p_2.x + p_2.y) * 0.5);
  lowp float tmpvar_17;
  tmpvar_17 = sign(tmpvar_15);
  d_14 = (tmpvar_17 * pow ((tmpvar_17 * tmpvar_15), (1.0/(matpow))));
  d_14 = (d_14 * 0.5);
  p_13.x = (tmpvar_16 - d_14);
  p_13.y = (tmpvar_16 + d_14);
  p_5.xy = p_13;
  lowp float tmpvar_18;
  if ((matMaxD == 0.0)) {
    tmpvar_18 = 0.0;
  } else {
    tmpvar_18 = id_4;
  };
  p_5.x = (p_13.x + matX);
  p_5.y = (p_13.y + matY);
  p_5.z = (tmpvar_18 + matZ);
  gl_PointSize = pointSize;
  lowp vec4 tmpvar_19;
  tmpvar_19.w = 1.0;
  tmpvar_19.xyz = (p_5 * rot4).xyz;
  ooo_1 = (projectionMatrix * (modelViewMatrix * tmpvar_19));
  lowp vec4 ooo_20;
  ooo_20 = ooo_1;
  if ((USELOGDEPTH > 0.0)) {
    ooo_20.xy = (ooo_1.xy / ooo_1.w);
    ooo_20.w = 1.0;
    ooo_20.z = (((
      (log(ooo_1.w) - _camd.z)
     * _camd.w) * 2.0) - 1.0);
  } else {
    if ((USELOGDEPTH < 0.0)) {
      ooo_20.z = (log2(max (1e-6, 
        (ooo_20.w + 1.0)
      )) * 0.15);
      ooo_20.z = ((ooo_20.z - 1.0) * ooo_20.w);
    };
  };
  ooo_1 = ooo_20;
  gl_Position = ooo_20;
}

