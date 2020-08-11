precision highp float;
precision highp float;
precision highp sampler2D;
attribute vec3 position;
uniform sampler2D t_ribbonrad;
uniform float killrads[16];
uniform vec3 awayvec;
uniform vec4 _camd;
uniform vec3 clearposA0;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
float ribs;
uniform float nstar;
uniform float stardepth;
uniform float ribdepth;
uniform float R_ribs;
uniform float R_radius;
uniform float cumcount3;
uniform float wigmult;
uniform float scaleFactor;
uniform float ribbonPickWidth;
uniform float ribbonPickExtra;
uniform float endblobs;
uniform float endbloblen;
uniform float killradwidth;
uniform float ribbonStart;
uniform float ribbonEnd;
uniform mat4 rot4;
uniform float pointSize;
attribute float instanceID;
uniform float fakeinstanceID;
varying vec4 opos;
float xhornid;
uniform sampler2D pickrt;
uniform float capres;
uniform float numSegs;
uniform float numInstancesP2;
uniform sampler2D posNewvals;
uniform float lennum;
uniform float skelnum;
uniform float skelends;
uniform vec2 skelbufferRes;
uniform sampler2D skelbuffer;
uniform float killbplength;
uniform float NORMTYPE;
uniform float USELOGDEPTH;
void main ()
{
  xhornid = -99.0;
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
  if ((tmpvar_3.z < cumcount3)) {
    xhornid = 3.0;
    ribs = R_ribs;
  } else {
    xhornid = -1.0;
    ribs = 77.0;
  };
  lowp vec3 xmnormal_4;
  lowp vec3 surfpos_5;
  float fac_6;
  float lk_7;
  lowp float xrscalea_8;
  float sss_9;
  float star1_10;
  float tmpvar_11;
  tmpvar_11 = floor(((lennum * capres) * 0.5));
  float tmpvar_12;
  tmpvar_12 = (lennum - (2.0 * tmpvar_11));
  float tmpvar_13;
  tmpvar_13 = -(tmpvar_11);
  float tmpvar_14;
  tmpvar_14 = (tmpvar_13 + (p_2.x * (
    (tmpvar_12 + tmpvar_11)
   - tmpvar_13)));
  float tmpvar_15;
  tmpvar_15 = clamp ((tmpvar_14 / tmpvar_12), 0.0, 1.0);
  lowp vec3 rad1a_16;
  lowp vec3 skela3_17;
  lowp vec3 step_18;
  lowp vec4 p1_19;
  float tmpvar_20;
  tmpvar_20 = floor((tmpvar_15 * skelnum));
  float tmpvar_21;
  tmpvar_21 = ((tmpvar_15 * skelnum) - tmpvar_20);
  float tmpvar_22;
  tmpvar_22 = (skelnum + (2.0 * skelends));
  vec2 tmpvar_23;
  tmpvar_23.x = (floor((
    (min (tmpvar_22, (tmpvar_20 - 1.0)) + skelends)
   + 0.5)) + 0.5);
  tmpvar_23.y = (tmpvar_3.z + 0.5);
  lowp vec4 tmpvar_24;
  tmpvar_24 = texture2D (skelbuffer, (tmpvar_23 / skelbufferRes));
  vec2 tmpvar_25;
  tmpvar_25.x = (floor((
    (min (tmpvar_22, tmpvar_20) + skelends)
   + 0.5)) + 0.5);
  tmpvar_25.y = (tmpvar_3.z + 0.5);
  lowp vec4 tmpvar_26;
  tmpvar_26 = texture2D (skelbuffer, (tmpvar_25 / skelbufferRes));
  p1_19 = tmpvar_26;
  vec2 tmpvar_27;
  tmpvar_27.x = (floor((
    (min (tmpvar_22, (tmpvar_20 + 1.0)) + skelends)
   + 0.5)) + 0.5);
  tmpvar_27.y = (tmpvar_3.z + 0.5);
  lowp vec4 tmpvar_28;
  tmpvar_28 = texture2D (skelbuffer, (tmpvar_27 / skelbufferRes));
  vec2 tmpvar_29;
  tmpvar_29.x = (floor((
    (min (tmpvar_22, (tmpvar_20 + 2.0)) + skelends)
   + 0.5)) + 0.5);
  tmpvar_29.y = (tmpvar_3.z + 0.5);
  lowp vec4 tmpvar_30;
  tmpvar_30 = texture2D (skelbuffer, (tmpvar_29 / skelbufferRes));
  lowp vec3 tmpvar_31;
  tmpvar_31 = (tmpvar_26 - tmpvar_28).xyz;
  lowp float tmpvar_32;
  tmpvar_32 = sqrt(dot (tmpvar_31, tmpvar_31));
  if ((tmpvar_32 > killbplength)) {
    p1_19 = vec4(sqrt((killbplength - tmpvar_32)));
  };
  lowp vec4 tmpvar_33;
  tmpvar_33 = (((
    (-0.5 * tmpvar_24)
   + 
    (1.5 * p1_19)
  ) - (1.5 * tmpvar_28)) + (0.5 * tmpvar_30));
  lowp vec4 tmpvar_34;
  tmpvar_34 = (((tmpvar_24 - 
    (2.5 * p1_19)
  ) + (2.0 * tmpvar_28)) - (0.5 * tmpvar_30));
  lowp vec4 tmpvar_35;
  tmpvar_35 = ((-0.5 * tmpvar_24) + (0.5 * tmpvar_28));
  step_18 = (((
    (3.0 * tmpvar_33)
   * 
    (tmpvar_21 * tmpvar_21)
  ) + (
    (2.0 * tmpvar_34)
   * tmpvar_21)) + tmpvar_35).xyz;
  skela3_17 = (((
    ((tmpvar_33 * tmpvar_21) * (tmpvar_21 * tmpvar_21))
   + 
    ((tmpvar_34 * tmpvar_21) * tmpvar_21)
  ) + (tmpvar_35 * tmpvar_21)) + p1_19).xyz;
  lowp float r_36;
  float rp_37;
  rp_37 = tmpvar_15;
  vec2 tmpvar_39;
  tmpvar_39.y = 0.5;
  tmpvar_39.x = tmpvar_15;
  lowp vec4 tmpvar_40;
  tmpvar_40 = texture2D (t_ribbonrad, tmpvar_39);
  r_36 = (scaleFactor * (R_radius + (tmpvar_40.x * wigmult)));
  if (((wigmult < 0.0) && (tmpvar_40.x != 0.0))) {
    r_36 = -0.1;
  };
  if ((ribbonPickExtra != 0.0)) {
    lowp float rx_41;
    rx_41 = max (0.0, (1.0 - (
      abs((texture2D (pickrt, vec2(0.0, 0.5)).x - tmpvar_15))
     / ribbonPickWidth)));
    lowp vec4 tmpvar_42;
    tmpvar_42 = texture2D (pickrt, vec2(0.25, 0.5));
    rx_41 = max (rx_41, (1.0 - (
      abs((tmpvar_42.x - tmpvar_15))
     / ribbonPickWidth)));
    rx_41 = max (rx_41, (1.0 - (
      abs((tmpvar_42.y - tmpvar_15))
     / ribbonPickWidth)));
    rx_41 = max (rx_41, (1.0 - (
      abs((texture2D (pickrt, vec2(0.5, 0.5)).x - tmpvar_15))
     / ribbonPickWidth)));
    lowp vec4 tmpvar_43;
    tmpvar_43 = texture2D (pickrt, vec2(0.75, 0.5));
    rx_41 = max (rx_41, (1.0 - (
      abs((tmpvar_43.x - tmpvar_15))
     / ribbonPickWidth)));
    lowp float tmpvar_44;
    tmpvar_44 = max (rx_41, (1.0 - (
      abs((tmpvar_43.y - tmpvar_15))
     / ribbonPickWidth)));
    rx_41 = tmpvar_44;
    r_36 = (r_36 + (ribbonPickExtra * tmpvar_44));
  };
  for (highp int i_38 = 0; i_38 < 16; i_38++) {
    float tmpvar_45;
    tmpvar_45 = abs(((rp_37 * numSegs) - killrads[i_38]));
    if ((tmpvar_45 <= killradwidth)) {
      r_36 = -0.1;
    };
  };
  float tmpvar_46;
  tmpvar_46 = (max ((endbloblen - tmpvar_15), (
    (-1.0 + endbloblen)
   + tmpvar_15)) / endbloblen);
  if ((tmpvar_46 > 0.0)) {
    r_36 = (r_36 * sqrt(max (0.0, 
      (((1.0 + cos(
        (((1.0 - tmpvar_46) * 6.28318) * endblobs)
      )) * 0.5) * (1.0 - tmpvar_46))
    )));
  };
  if (((tmpvar_15 < ribbonStart) || (tmpvar_15 > ribbonEnd))) {
    r_36 = -0.1;
  };
  lowp float tmpvar_47;
  tmpvar_47 = sqrt(dot (step_18, step_18));
  lowp vec3 tmpvar_48;
  if ((tmpvar_47 == 0.0)) {
    tmpvar_48 = vec3(0.0, 1.0, 0.0);
  } else {
    tmpvar_48 = (step_18 / tmpvar_47);
  };
  lowp vec4 tmpvar_49;
  tmpvar_49.w = 1.0;
  tmpvar_49.xyz = skela3_17;
  if (((tmpvar_47 == 0.0) || (NORMTYPE == 0.0))) {
    rad1a_16 = vec3(1.0, 0.0, 0.0);
  } else {
    if ((NORMTYPE == 1.0)) {
      rad1a_16 = ((tmpvar_48.yzx * vec3(2.1, 1.0, 1.3)) - (tmpvar_48.zxy * vec3(1.3, 2.1, 1.0)));
    } else {
      if ((NORMTYPE == 2.0)) {
        vec2 tmpvar_50;
        tmpvar_50.x = 0.5;
        tmpvar_50.y = (((
          (tmpvar_15 - 0.09)
         * numSegs) + 0.5) / numInstancesP2);
        lowp vec3 b_51;
        b_51 = ((texture2D (posNewvals, tmpvar_50) * scaleFactor).xyz - skela3_17);
        rad1a_16 = ((tmpvar_48.yzx * b_51.zxy) - (tmpvar_48.zxy * b_51.yzx));
      } else {
        if ((NORMTYPE == 3.0)) {
          vec2 tmpvar_52;
          tmpvar_52.x = 0.5;
          tmpvar_52.y = (((
            (tmpvar_15 - 0.09)
           * numSegs) + 0.5) / numInstancesP2);
          lowp vec3 tmpvar_53;
          lowp vec3 b_54;
          b_54 = ((texture2D (posNewvals, tmpvar_52) * scaleFactor).xyz - skela3_17);
          tmpvar_53 = ((tmpvar_48.yzx * b_54.zxy) - (tmpvar_48.zxy * b_54.yzx));
          rad1a_16 = tmpvar_53;
          lowp float tmpvar_55;
          tmpvar_55 = dot (tmpvar_53, tmpvar_53);
          if ((tmpvar_55 < 1e-6)) {
            rad1a_16 = ((tmpvar_48.yzx * vec3(2.1, 1.0, 1.3)) - (tmpvar_48.zxy * vec3(1.3, 2.1, 1.0)));
          };
        } else {
          if ((NORMTYPE == 4.0)) {
            vec2 tmpvar_56;
            tmpvar_56.x = 0.5;
            tmpvar_56.y = (((tmpvar_15 * numSegs) + 0.5) / numInstancesP2);
            lowp vec4 tmpvar_57;
            tmpvar_57 = (texture2D (posNewvals, tmpvar_56) * scaleFactor);
            lowp vec4 tmpvar_58;
            tmpvar_58.x = (0.013 + tmpvar_57.x);
            tmpvar_58.y = tmpvar_57.y;
            tmpvar_58.z = (0.017 + tmpvar_57.z);
            tmpvar_58.w = 1.0;
            lowp vec3 b_59;
            b_59 = (tmpvar_58.xyz - skela3_17);
            rad1a_16 = ((tmpvar_48.yzx * b_59.zxy) - (tmpvar_48.zxy * b_59.yzx));
          } else {
            if ((NORMTYPE == 5.0)) {
              mat3 tmpvar_60;
              tmpvar_60[0] = rot4[0].xyz;
              tmpvar_60[1] = rot4[1].xyz;
              tmpvar_60[2] = rot4[2].xyz;
              lowp vec3 tmpvar_61;
              tmpvar_61 = normalize((tmpvar_60 * (clearposA0 - 
                (tmpvar_49 * rot4)
              .xyz)));
              rad1a_16 = ((tmpvar_61.yzx * tmpvar_48.zxy) - (tmpvar_61.zxy * tmpvar_48.yzx));
            } else {
              if ((NORMTYPE == 6.0)) {
                rad1a_16 = ((awayvec.yzx * tmpvar_48.zxy) - (awayvec.zxy * tmpvar_48.yzx));
              } else {
                rad1a_16 = vec3(0.0, 0.0, 1.0);
              };
            };
          };
        };
      };
    };
  };
  float tmpvar_62;
  tmpvar_62 = (p_2.y * nstar);
  star1_10 = tmpvar_62;
  sss_9 = 1.0;
  float tmpvar_63;
  tmpvar_63 = floor(nstar);
  if ((tmpvar_62 > tmpvar_63)) {
    float tmpvar_64;
    tmpvar_64 = fract(nstar);
    sss_9 = tmpvar_64;
    float tmpvar_65;
    tmpvar_65 = floor(nstar);
    star1_10 = (tmpvar_65 + ((tmpvar_62 - tmpvar_65) / tmpvar_64));
  };
  lowp float tmpvar_66;
  tmpvar_66 = (r_36 * (1.0 - (
    (1.0 - (((1.0 - 
      cos((6.28318 * star1_10))
    ) * sss_9) * sss_9))
   * stardepth)));
  xrscalea_8 = tmpvar_66;
  lk_7 = 0.0;
  fac_6 = 1.0;
  if (((0.0 < tmpvar_14) && (tmpvar_14 < tmpvar_12))) {
    lk_7 = ((p_2.x * ribs) + 0.5);
    float tmpvar_67;
    tmpvar_67 = abs((fract(lk_7) - 0.5));
    lk_7 = tmpvar_67;
    float tmpvar_68;
    tmpvar_68 = sqrt((1.0 - (
      (ribdepth * tmpvar_67)
     * tmpvar_67)));
    fac_6 = tmpvar_68;
    xrscalea_8 = (tmpvar_66 * tmpvar_68);
  };
  lowp vec3 tmpvar_69;
  tmpvar_69 = normalize(rad1a_16);
  xmnormal_4 = ((-(
    sin((6.28318 * p_2.y))
  ) * -(
    normalize(((tmpvar_48.yzx * tmpvar_69.zxy) - (tmpvar_48.zxy * tmpvar_69.yzx)))
  )) + (cos(
    (6.28318 * p_2.y)
  ) * tmpvar_69));
  surfpos_5 = (skela3_17 + (xrscalea_8 * xmnormal_4));
  xmnormal_4 = (xmnormal_4 + (tmpvar_48 * (
    (ribdepth * lk_7)
   / fac_6)));
  lowp vec3 tmpvar_70;
  tmpvar_70 = normalize(xmnormal_4);
  xmnormal_4 = tmpvar_70;
  if ((tmpvar_14 > tmpvar_12)) {
    float tmpvar_71;
    tmpvar_71 = (((
      (tmpvar_14 - tmpvar_12)
     / tmpvar_11) * 3.14159) / 2.0);
    surfpos_5 = (skela3_17 + (xrscalea_8 * (
      (sin(tmpvar_71) * tmpvar_48)
     + 
      (cos(tmpvar_71) * tmpvar_70)
    )));
  };
  if ((tmpvar_14 < 0.0)) {
    float tmpvar_72;
    tmpvar_72 = (((tmpvar_14 / tmpvar_11) * 3.14159) / 2.0);
    surfpos_5 = (skela3_17 + (xrscalea_8 * (
      (sin(tmpvar_72) * tmpvar_48)
     + 
      (cos(tmpvar_72) * tmpvar_70)
    )));
  };
  xmnormal_4 = tmpvar_70;
  lowp vec4 tmpvar_73;
  tmpvar_73.xyz = surfpos_5;
  tmpvar_73.w = 1.0;
  gl_PointSize = pointSize;
  lowp vec4 tmpvar_74;
  tmpvar_74.w = 1.0;
  tmpvar_74.xyz = (tmpvar_73 * rot4).xyz;
  ooo_1 = (projectionMatrix * (modelViewMatrix * tmpvar_74));
  lowp vec4 ooo_75;
  ooo_75 = ooo_1;
  if ((USELOGDEPTH > 0.0)) {
    ooo_75.xy = (ooo_1.xy / ooo_1.w);
    ooo_75.w = 1.0;
    ooo_75.z = (((
      (log(ooo_1.w) - _camd.z)
     * _camd.w) * 2.0) - 1.0);
  } else {
    if ((USELOGDEPTH < 0.0)) {
      ooo_75.z = (log2(max (1e-6, 
        (ooo_75.w + 1.0)
      )) * 0.15);
      ooo_75.z = ((ooo_75.z - 1.0) * ooo_75.w);
    };
  };
  ooo_1 = ooo_75;
  gl_Position = ooo_75;
  opos.xyz = p_2.xyz;
  opos.w = xhornid;
}

