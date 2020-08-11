precision highp float;
precision highp float;
precision highp sampler2D;
attribute vec3 position;
uniform vec3 clearposA0;
uniform vec3 clearposA1;
uniform vec3 clearposB0;
uniform vec3 clearposB1;
float radius;
uniform float time;
uniform float R_radius;
uniform float cumcount3;
uniform float scaleFactor;
uniform mat4 rot4;
uniform mat4 rot44d;
attribute float instanceID;
uniform float fakeinstanceID;
uniform float numSegs;
uniform float numInstancesP2;
uniform sampler2D posNewvals;
uniform float skelnum;
uniform float skelends;
uniform vec2 skelbufferRes;
uniform float shrinkfactor;
uniform float shrinkradiusA;
uniform float shrinkradiusB;
varying lowp vec4 objpos;
uniform float NORMTYPE;
void main ()
{
  vec4 p_1;
  vec4 tmpvar_2;
  tmpvar_2.w = 1.0;
  tmpvar_2.xy = position.xy;
  tmpvar_2.z = (instanceID + fakeinstanceID);
  p_1.zw = tmpvar_2.zw;
  p_1.xy = (position.xy + vec2(0.5, 0.5));
  if ((NORMTYPE >= 5.0)) {
    p_1.y = (p_1.y * 0.5);
  };
  lowp vec4 skelpos_3;
  lowp float xrscale_4;
  if ((tmpvar_2.z < cumcount3)) {
    radius = R_radius;
  } else {
    radius = (max (0.2, (tmpvar_2.z - 20.0)) * fract((time * 0.25)));
  };
  vec2 tmpvar_5;
  tmpvar_5.x = 0.5;
  tmpvar_5.y = (((p_1.x * numSegs) + 0.5) / numInstancesP2);
  lowp vec4 tmpvar_6;
  tmpvar_6.xyz = (texture2D (posNewvals, tmpvar_5) * scaleFactor).xyz;
  tmpvar_6.w = 1.0;
  xrscale_4 = radius;
  skelpos_3.xyz = (tmpvar_6 * rot44d).xyz;
  skelpos_3.w = 1.0;
  lowp vec3 tmpvar_7;
  tmpvar_7 = (skelpos_3 * rot4).xyz;
  if ((shrinkradiusA > 0.0)) {
    lowp float tmpvar_8;
    tmpvar_8 = (shrinkradiusA + radius);
    lowp vec3 x_9;
    x_9 = (clearposA0 - tmpvar_7);
    lowp vec3 x_10;
    x_10 = (clearposA1 - tmpvar_7);
    vec3 x_11;
    x_11 = (clearposA1 - clearposA0);
    xrscale_4 = (radius * sqrt(clamp (
      ((((
        (sqrt(dot (x_9, x_9)) + sqrt(dot (x_10, x_10)))
       - 
        sqrt(dot (x_11, x_11))
      ) * 0.5) - tmpvar_8) / ((tmpvar_8 * shrinkfactor) - tmpvar_8))
    , 0.0, 1.0)));
  };
  if ((shrinkradiusB > 0.0)) {
    lowp float tmpvar_12;
    tmpvar_12 = (shrinkradiusB + xrscale_4);
    lowp vec3 x_13;
    x_13 = (clearposB0 - tmpvar_7);
    lowp vec3 x_14;
    x_14 = (clearposB1 - tmpvar_7);
    vec3 x_15;
    x_15 = (clearposB1 - clearposB0);
    xrscale_4 = (xrscale_4 * sqrt(clamp (
      ((((
        (sqrt(dot (x_13, x_13)) + sqrt(dot (x_14, x_14)))
       - 
        sqrt(dot (x_15, x_15))
      ) * 0.5) - tmpvar_12) / ((tmpvar_12 * shrinkfactor) - tmpvar_12))
    , 0.0, 1.0)));
  };
  skelpos_3.w = xrscale_4;
  objpos = skelpos_3;
  gl_PointSize = 1.0;
  vec2 tmpvar_16;
  tmpvar_16.x = (floor((
    ((p_1.x * skelnum) + skelends)
   + 0.5)) + 0.5);
  tmpvar_16.y = (tmpvar_2.z + 0.5);
  highp vec4 tmpvar_17;
  tmpvar_17.zw = vec2(0.0, 1.0);
  tmpvar_17.xy = (((tmpvar_16 / skelbufferRes) * 2.0) - 1.0);
  gl_Position = tmpvar_17;
}

