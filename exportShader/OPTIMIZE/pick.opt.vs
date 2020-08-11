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
float R_active;
float R_rpbase;
vec4 R_para;
vec4 R_parb;
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
uniform float capres;
uniform float numSegs;
uniform float numInstancesP2;
uniform sampler2D posNewvals;
varying vec4 pickVary0;
varying vec4 pickVary1;
varying vec4 pickVary2;
varying vec4 pickVary3;
uniform highp int pickxslot;
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
  if ((tmpvar_3.z < cumcount3)) {
    ribs = R_ribs;
  } else {
    ribs = 77.0;
  };
  pickVary0 = vec4(999.0, 999.0, 999.0, 999.0);
  pickVary1 = vec4(999.0, 999.0, 999.0, 999.0);
  pickVary2 = vec4(999.0, 999.0, 999.0, 999.0);
  pickVary3 = vec4(999.0, 999.0, 999.0, 999.0);
  float v_4;
  v_4 = p_2.x;
  if ((pickxslot == 0)) {
    pickVary0.x = v_4;
  };
  if ((pickxslot == 1)) {
    pickVary0.y = v_4;
  };
  if ((pickxslot == 2)) {
    pickVary0.z = v_4;
  };
  if ((pickxslot == 3)) {
    pickVary0.w = v_4;
  };
  if ((pickxslot == 4)) {
    pickVary1.x = v_4;
  };
  if ((pickxslot == 5)) {
    pickVary1.y = v_4;
  };
  if ((pickxslot == 6)) {
    pickVary1.z = v_4;
  };
  if ((pickxslot == 7)) {
    pickVary1.w = v_4;
  };
  if ((pickxslot == 8)) {
    pickVary2.x = v_4;
  };
  if ((pickxslot == 9)) {
    pickVary2.y = v_4;
  };
  if ((pickxslot == 10)) {
    pickVary2.z = v_4;
  };
  if ((pickxslot == 11)) {
    pickVary2.w = v_4;
  };
  if ((pickxslot == 12)) {
    pickVary3.x = v_4;
  };
  if ((pickxslot == 13)) {
    pickVary3.y = v_4;
  };
  if ((pickxslot == 14)) {
    pickVary3.z = v_4;
  };
  if ((pickxslot == 15)) {
    pickVary3.w = v_4;
  };
  highp int num_5;
  float v_6;
  v_6 = p_2.y;
  num_5 = (1 + pickxslot);
  if ((num_5 == 0)) {
    pickVary0.x = v_6;
  };
  if ((num_5 == 1)) {
    pickVary0.y = v_6;
  };
  if ((num_5 == 2)) {
    pickVary0.z = v_6;
  };
  if ((num_5 == 3)) {
    pickVary0.w = v_6;
  };
  if ((num_5 == 4)) {
    pickVary1.x = v_6;
  };
  if ((num_5 == 5)) {
    pickVary1.y = v_6;
  };
  if ((num_5 == 6)) {
    pickVary1.z = v_6;
  };
  if ((num_5 == 7)) {
    pickVary1.w = v_6;
  };
  if ((num_5 == 8)) {
    pickVary2.x = v_6;
  };
  if ((num_5 == 9)) {
    pickVary2.y = v_6;
  };
  if ((num_5 == 10)) {
    pickVary2.z = v_6;
  };
  if ((num_5 == 11)) {
    pickVary2.w = v_6;
  };
  if ((num_5 == 12)) {
    pickVary3.x = v_6;
  };
  if ((num_5 == 13)) {
    pickVary3.y = v_6;
  };
  if ((num_5 == 14)) {
    pickVary3.z = v_6;
  };
  if ((num_5 == 15)) {
    pickVary3.w = v_6;
  };
  lowp vec3 xmnormal_7;
  lowp vec3 surfpos_8;
  float fac_9;
  float lk_10;
  lowp float xrscalea_11;
  float sss_12;
  float star1_13;
  vec4 tmpvar_14;
  vec4 tmpvar_15;
  tmpvar_14.x = p_2.z;
  float tmpvar_16;
  tmpvar_16 = floor(((lennum * capres) * 0.5));
  float tmpvar_17;
  tmpvar_17 = (lennum - (2.0 * tmpvar_16));
  float tmpvar_18;
  tmpvar_18 = -(tmpvar_16);
  float tmpvar_19;
  tmpvar_19 = (tmpvar_18 + (p_2.x * (
    (tmpvar_17 + tmpvar_16)
   - tmpvar_18)));
  float tmpvar_20;
  tmpvar_20 = clamp ((tmpvar_19 / tmpvar_17), 0.0, 1.0);
  lowp vec3 rad1a_21;
  lowp vec3 skela3_22;
  lowp vec3 step_23;
  lowp vec4 p1_24;
  float tmpvar_25;
  tmpvar_25 = floor((tmpvar_20 * skelnum));
  float tmpvar_26;
  tmpvar_26 = ((tmpvar_20 * skelnum) - tmpvar_25);
  float tmpvar_27;
  tmpvar_27 = (skelnum + (2.0 * skelends));
  vec2 tmpvar_28;
  tmpvar_28.x = (floor((
    (min (tmpvar_27, (tmpvar_25 - 1.0)) + skelends)
   + 0.5)) + 0.5);
  tmpvar_28.y = (tmpvar_3.z + 0.5);
  lowp vec4 tmpvar_29;
  tmpvar_29 = texture2D (skelbuffer, (tmpvar_28 / skelbufferRes));
  vec2 tmpvar_30;
  tmpvar_30.x = (floor((
    (min (tmpvar_27, tmpvar_25) + skelends)
   + 0.5)) + 0.5);
  tmpvar_30.y = (tmpvar_3.z + 0.5);
  lowp vec4 tmpvar_31;
  tmpvar_31 = texture2D (skelbuffer, (tmpvar_30 / skelbufferRes));
  p1_24 = tmpvar_31;
  vec2 tmpvar_32;
  tmpvar_32.x = (floor((
    (min (tmpvar_27, (tmpvar_25 + 1.0)) + skelends)
   + 0.5)) + 0.5);
  tmpvar_32.y = (tmpvar_3.z + 0.5);
  lowp vec4 tmpvar_33;
  tmpvar_33 = texture2D (skelbuffer, (tmpvar_32 / skelbufferRes));
  vec2 tmpvar_34;
  tmpvar_34.x = (floor((
    (min (tmpvar_27, (tmpvar_25 + 2.0)) + skelends)
   + 0.5)) + 0.5);
  tmpvar_34.y = (tmpvar_3.z + 0.5);
  lowp vec4 tmpvar_35;
  tmpvar_35 = texture2D (skelbuffer, (tmpvar_34 / skelbufferRes));
  lowp vec3 tmpvar_36;
  tmpvar_36 = (tmpvar_31 - tmpvar_33).xyz;
  lowp float tmpvar_37;
  tmpvar_37 = sqrt(dot (tmpvar_36, tmpvar_36));
  if ((tmpvar_37 > killbplength)) {
    p1_24 = vec4(sqrt((killbplength - tmpvar_37)));
  };
  lowp vec4 tmpvar_38;
  tmpvar_38 = (((
    (-0.5 * tmpvar_29)
   + 
    (1.5 * p1_24)
  ) - (1.5 * tmpvar_33)) + (0.5 * tmpvar_35));
  lowp vec4 tmpvar_39;
  tmpvar_39 = (((tmpvar_29 - 
    (2.5 * p1_24)
  ) + (2.0 * tmpvar_33)) - (0.5 * tmpvar_35));
  lowp vec4 tmpvar_40;
  tmpvar_40 = ((-0.5 * tmpvar_29) + (0.5 * tmpvar_33));
  step_23 = (((
    (3.0 * tmpvar_38)
   * 
    (tmpvar_26 * tmpvar_26)
  ) + (
    (2.0 * tmpvar_39)
   * tmpvar_26)) + tmpvar_40).xyz;
  skela3_22 = (((
    ((tmpvar_38 * tmpvar_26) * (tmpvar_26 * tmpvar_26))
   + 
    ((tmpvar_39 * tmpvar_26) * tmpvar_26)
  ) + (tmpvar_40 * tmpvar_26)) + p1_24).xyz;
  lowp float r_41;
  float rp_42;
  rp_42 = tmpvar_20;
  vec2 tmpvar_44;
  tmpvar_44.y = 0.5;
  tmpvar_44.x = tmpvar_20;
  lowp vec4 tmpvar_45;
  tmpvar_45 = texture2D (t_ribbonrad, tmpvar_44);
  r_41 = (scaleFactor * (R_radius + (tmpvar_45.x * wigmult)));
  if (((wigmult < 0.0) && (tmpvar_45.x != 0.0))) {
    r_41 = -0.1;
  };
  if ((ribbonPickExtra != 0.0)) {
    r_41 = (r_41 + (ribbonPickExtra * max (
      max (max (max (max (
        max (0.0, (1.0 - (abs(
          (-999.0 - tmpvar_20)
        ) / ribbonPickWidth)))
      , 
        (1.0 - (abs((-999.0 - tmpvar_20)) / ribbonPickWidth))
      ), (1.0 - 
        (abs((-999.0 - tmpvar_20)) / ribbonPickWidth)
      )), (1.0 - (
        abs((-999.0 - tmpvar_20))
       / ribbonPickWidth))), (1.0 - (abs(
        (-999.0 - tmpvar_20)
      ) / ribbonPickWidth)))
    , 
      (1.0 - (abs((-999.0 - tmpvar_20)) / ribbonPickWidth))
    )));
  };
  for (highp int i_43 = 0; i_43 < 16; i_43++) {
    float tmpvar_46;
    tmpvar_46 = abs(((rp_42 * numSegs) - killrads[i_43]));
    if ((tmpvar_46 <= killradwidth)) {
      r_41 = -0.1;
    };
  };
  float tmpvar_47;
  tmpvar_47 = (max ((endbloblen - tmpvar_20), (
    (-1.0 + endbloblen)
   + tmpvar_20)) / endbloblen);
  if ((tmpvar_47 > 0.0)) {
    r_41 = (r_41 * sqrt(max (0.0, 
      (((1.0 + cos(
        (((1.0 - tmpvar_47) * 6.28318) * endblobs)
      )) * 0.5) * (1.0 - tmpvar_47))
    )));
  };
  if (((tmpvar_20 < ribbonStart) || (tmpvar_20 > ribbonEnd))) {
    r_41 = -0.1;
  };
  lowp float tmpvar_48;
  tmpvar_48 = sqrt(dot (step_23, step_23));
  lowp vec3 tmpvar_49;
  if ((tmpvar_48 == 0.0)) {
    tmpvar_49 = vec3(0.0, 1.0, 0.0);
  } else {
    tmpvar_49 = (step_23 / tmpvar_48);
  };
  lowp vec4 tmpvar_50;
  tmpvar_50.w = 1.0;
  tmpvar_50.xyz = skela3_22;
  if (((tmpvar_48 == 0.0) || (NORMTYPE == 0.0))) {
    rad1a_21 = vec3(1.0, 0.0, 0.0);
  } else {
    if ((NORMTYPE == 1.0)) {
      rad1a_21 = ((tmpvar_49.yzx * vec3(2.1, 1.0, 1.3)) - (tmpvar_49.zxy * vec3(1.3, 2.1, 1.0)));
    } else {
      if ((NORMTYPE == 2.0)) {
        float ppx_51;
        ppx_51 = (tmpvar_20 - 0.09);
        lowp float z_52;
        lowp float y_53;
        lowp float x_54;
        float tmpvar_55;
        tmpvar_55 = (((R_active * ppx_51) + R_rpbase) + (dot (R_para, tmpvar_14) + dot (R_parb, tmpvar_15)));
        vec2 tmpvar_56;
        tmpvar_56.x = 0.5;
        tmpvar_56.y = (((ppx_51 * numSegs) + 0.5) / numInstancesP2);
        lowp vec4 tmpvar_57;
        tmpvar_57 = (texture2D (posNewvals, tmpvar_56) * scaleFactor);
        x_54 = tmpvar_57.x;
        y_53 = tmpvar_57.y;
        z_52 = tmpvar_57.z;
        highp int num_58;
        num_58 = (2 + pickxslot);
        if ((num_58 == 0)) {
          pickVary0.x = tmpvar_55;
        };
        if ((num_58 == 1)) {
          pickVary0.y = tmpvar_55;
        };
        if ((num_58 == 2)) {
          pickVary0.z = tmpvar_55;
        };
        if ((num_58 == 3)) {
          pickVary0.w = tmpvar_55;
        };
        if ((num_58 == 4)) {
          pickVary1.x = tmpvar_55;
        };
        if ((num_58 == 5)) {
          pickVary1.y = tmpvar_55;
        };
        if ((num_58 == 6)) {
          pickVary1.z = tmpvar_55;
        };
        if ((num_58 == 7)) {
          pickVary1.w = tmpvar_55;
        };
        if ((num_58 == 8)) {
          pickVary2.x = tmpvar_55;
        };
        if ((num_58 == 9)) {
          pickVary2.y = tmpvar_55;
        };
        if ((num_58 == 10)) {
          pickVary2.z = tmpvar_55;
        };
        if ((num_58 == 11)) {
          pickVary2.w = tmpvar_55;
        };
        if ((num_58 == 12)) {
          pickVary3.x = tmpvar_55;
        };
        if ((num_58 == 13)) {
          pickVary3.y = tmpvar_55;
        };
        if ((num_58 == 14)) {
          pickVary3.z = tmpvar_55;
        };
        if ((num_58 == 15)) {
          pickVary3.w = tmpvar_55;
        };
        lowp vec4 tmpvar_59;
        tmpvar_59.x = x_54;
        tmpvar_59.y = y_53;
        tmpvar_59.z = z_52;
        tmpvar_59.w = 1.0;
        lowp vec3 b_60;
        b_60 = (tmpvar_59.xyz - skela3_22);
        rad1a_21 = ((tmpvar_49.yzx * b_60.zxy) - (tmpvar_49.zxy * b_60.yzx));
      } else {
        if ((NORMTYPE == 3.0)) {
          float ppx_61;
          ppx_61 = (tmpvar_20 - 0.09);
          lowp float z_62;
          lowp float y_63;
          lowp float x_64;
          float tmpvar_65;
          tmpvar_65 = (((R_active * ppx_61) + R_rpbase) + (dot (R_para, tmpvar_14) + dot (R_parb, tmpvar_15)));
          vec2 tmpvar_66;
          tmpvar_66.x = 0.5;
          tmpvar_66.y = (((ppx_61 * numSegs) + 0.5) / numInstancesP2);
          lowp vec4 tmpvar_67;
          tmpvar_67 = (texture2D (posNewvals, tmpvar_66) * scaleFactor);
          x_64 = tmpvar_67.x;
          y_63 = tmpvar_67.y;
          z_62 = tmpvar_67.z;
          highp int num_68;
          num_68 = (2 + pickxslot);
          if ((num_68 == 0)) {
            pickVary0.x = tmpvar_65;
          };
          if ((num_68 == 1)) {
            pickVary0.y = tmpvar_65;
          };
          if ((num_68 == 2)) {
            pickVary0.z = tmpvar_65;
          };
          if ((num_68 == 3)) {
            pickVary0.w = tmpvar_65;
          };
          if ((num_68 == 4)) {
            pickVary1.x = tmpvar_65;
          };
          if ((num_68 == 5)) {
            pickVary1.y = tmpvar_65;
          };
          if ((num_68 == 6)) {
            pickVary1.z = tmpvar_65;
          };
          if ((num_68 == 7)) {
            pickVary1.w = tmpvar_65;
          };
          if ((num_68 == 8)) {
            pickVary2.x = tmpvar_65;
          };
          if ((num_68 == 9)) {
            pickVary2.y = tmpvar_65;
          };
          if ((num_68 == 10)) {
            pickVary2.z = tmpvar_65;
          };
          if ((num_68 == 11)) {
            pickVary2.w = tmpvar_65;
          };
          if ((num_68 == 12)) {
            pickVary3.x = tmpvar_65;
          };
          if ((num_68 == 13)) {
            pickVary3.y = tmpvar_65;
          };
          if ((num_68 == 14)) {
            pickVary3.z = tmpvar_65;
          };
          if ((num_68 == 15)) {
            pickVary3.w = tmpvar_65;
          };
          lowp vec4 tmpvar_69;
          tmpvar_69.x = x_64;
          tmpvar_69.y = y_63;
          tmpvar_69.z = z_62;
          tmpvar_69.w = 1.0;
          lowp vec3 tmpvar_70;
          lowp vec3 b_71;
          b_71 = (tmpvar_69.xyz - skela3_22);
          tmpvar_70 = ((tmpvar_49.yzx * b_71.zxy) - (tmpvar_49.zxy * b_71.yzx));
          rad1a_21 = tmpvar_70;
          lowp float tmpvar_72;
          tmpvar_72 = dot (tmpvar_70, tmpvar_70);
          if ((tmpvar_72 < 1e-6)) {
            rad1a_21 = ((tmpvar_49.yzx * vec3(2.1, 1.0, 1.3)) - (tmpvar_49.zxy * vec3(1.3, 2.1, 1.0)));
          };
        } else {
          if ((NORMTYPE == 4.0)) {
            lowp float z_73;
            lowp float y_74;
            lowp float x_75;
            float tmpvar_76;
            tmpvar_76 = (((R_active * tmpvar_20) + R_rpbase) + (dot (R_para, tmpvar_14) + dot (R_parb, tmpvar_15)));
            vec2 tmpvar_77;
            tmpvar_77.x = 0.5;
            tmpvar_77.y = (((tmpvar_20 * numSegs) + 0.5) / numInstancesP2);
            lowp vec4 tmpvar_78;
            tmpvar_78 = (texture2D (posNewvals, tmpvar_77) * scaleFactor);
            x_75 = (0.013 + tmpvar_78.x);
            y_74 = tmpvar_78.y;
            z_73 = (0.017 + tmpvar_78.z);
            highp int num_79;
            num_79 = (2 + pickxslot);
            if ((num_79 == 0)) {
              pickVary0.x = tmpvar_76;
            };
            if ((num_79 == 1)) {
              pickVary0.y = tmpvar_76;
            };
            if ((num_79 == 2)) {
              pickVary0.z = tmpvar_76;
            };
            if ((num_79 == 3)) {
              pickVary0.w = tmpvar_76;
            };
            if ((num_79 == 4)) {
              pickVary1.x = tmpvar_76;
            };
            if ((num_79 == 5)) {
              pickVary1.y = tmpvar_76;
            };
            if ((num_79 == 6)) {
              pickVary1.z = tmpvar_76;
            };
            if ((num_79 == 7)) {
              pickVary1.w = tmpvar_76;
            };
            if ((num_79 == 8)) {
              pickVary2.x = tmpvar_76;
            };
            if ((num_79 == 9)) {
              pickVary2.y = tmpvar_76;
            };
            if ((num_79 == 10)) {
              pickVary2.z = tmpvar_76;
            };
            if ((num_79 == 11)) {
              pickVary2.w = tmpvar_76;
            };
            if ((num_79 == 12)) {
              pickVary3.x = tmpvar_76;
            };
            if ((num_79 == 13)) {
              pickVary3.y = tmpvar_76;
            };
            if ((num_79 == 14)) {
              pickVary3.z = tmpvar_76;
            };
            if ((num_79 == 15)) {
              pickVary3.w = tmpvar_76;
            };
            lowp vec4 tmpvar_80;
            tmpvar_80.x = x_75;
            tmpvar_80.y = y_74;
            tmpvar_80.z = z_73;
            tmpvar_80.w = 1.0;
            lowp vec3 b_81;
            b_81 = (tmpvar_80.xyz - skela3_22);
            rad1a_21 = ((tmpvar_49.yzx * b_81.zxy) - (tmpvar_49.zxy * b_81.yzx));
          } else {
            if ((NORMTYPE == 5.0)) {
              mat3 tmpvar_82;
              tmpvar_82[0] = rot4[0].xyz;
              tmpvar_82[1] = rot4[1].xyz;
              tmpvar_82[2] = rot4[2].xyz;
              lowp vec3 tmpvar_83;
              tmpvar_83 = normalize((tmpvar_82 * (clearposA0 - 
                (tmpvar_50 * rot4)
              .xyz)));
              rad1a_21 = ((tmpvar_83.yzx * tmpvar_49.zxy) - (tmpvar_83.zxy * tmpvar_49.yzx));
            } else {
              if ((NORMTYPE == 6.0)) {
                rad1a_21 = ((awayvec.yzx * tmpvar_49.zxy) - (awayvec.zxy * tmpvar_49.yzx));
              } else {
                rad1a_21 = vec3(0.0, 0.0, 1.0);
              };
            };
          };
        };
      };
    };
  };
  float tmpvar_84;
  tmpvar_84 = (p_2.y * nstar);
  star1_13 = tmpvar_84;
  sss_12 = 1.0;
  float tmpvar_85;
  tmpvar_85 = floor(nstar);
  if ((tmpvar_84 > tmpvar_85)) {
    float tmpvar_86;
    tmpvar_86 = fract(nstar);
    sss_12 = tmpvar_86;
    float tmpvar_87;
    tmpvar_87 = floor(nstar);
    star1_13 = (tmpvar_87 + ((tmpvar_84 - tmpvar_87) / tmpvar_86));
  };
  lowp float tmpvar_88;
  tmpvar_88 = (r_41 * (1.0 - (
    (1.0 - (((1.0 - 
      cos((6.28318 * star1_13))
    ) * sss_12) * sss_12))
   * stardepth)));
  xrscalea_11 = tmpvar_88;
  lk_10 = 0.0;
  fac_9 = 1.0;
  if (((0.0 < tmpvar_19) && (tmpvar_19 < tmpvar_17))) {
    lk_10 = ((p_2.x * ribs) + 0.5);
    float tmpvar_89;
    tmpvar_89 = abs((fract(lk_10) - 0.5));
    lk_10 = tmpvar_89;
    float tmpvar_90;
    tmpvar_90 = sqrt((1.0 - (
      (ribdepth * tmpvar_89)
     * tmpvar_89)));
    fac_9 = tmpvar_90;
    xrscalea_11 = (tmpvar_88 * tmpvar_90);
  };
  lowp vec3 tmpvar_91;
  tmpvar_91 = normalize(rad1a_21);
  xmnormal_7 = ((-(
    sin((6.28318 * p_2.y))
  ) * -(
    normalize(((tmpvar_49.yzx * tmpvar_91.zxy) - (tmpvar_49.zxy * tmpvar_91.yzx)))
  )) + (cos(
    (6.28318 * p_2.y)
  ) * tmpvar_91));
  surfpos_8 = (skela3_22 + (xrscalea_11 * xmnormal_7));
  xmnormal_7 = (xmnormal_7 + (tmpvar_49 * (
    (ribdepth * lk_10)
   / fac_9)));
  lowp vec3 tmpvar_92;
  tmpvar_92 = normalize(xmnormal_7);
  xmnormal_7 = tmpvar_92;
  if ((tmpvar_19 > tmpvar_17)) {
    float tmpvar_93;
    tmpvar_93 = (((
      (tmpvar_19 - tmpvar_17)
     / tmpvar_16) * 3.14159) / 2.0);
    surfpos_8 = (skela3_22 + (xrscalea_11 * (
      (sin(tmpvar_93) * tmpvar_49)
     + 
      (cos(tmpvar_93) * tmpvar_92)
    )));
  };
  if ((tmpvar_19 < 0.0)) {
    float tmpvar_94;
    tmpvar_94 = (((tmpvar_19 / tmpvar_16) * 3.14159) / 2.0);
    surfpos_8 = (skela3_22 + (xrscalea_11 * (
      (sin(tmpvar_94) * tmpvar_49)
     + 
      (cos(tmpvar_94) * tmpvar_92)
    )));
  };
  xmnormal_7 = tmpvar_92;
  lowp vec4 tmpvar_95;
  tmpvar_95.xyz = surfpos_8;
  tmpvar_95.w = 1.0;
  gl_PointSize = pointSize;
  lowp vec4 tmpvar_96;
  tmpvar_96.w = 1.0;
  tmpvar_96.xyz = (tmpvar_95 * rot4).xyz;
  ooo_1 = (projectionMatrix * (modelViewMatrix * tmpvar_96));
  lowp vec4 ooo_97;
  ooo_97 = ooo_1;
  if ((USELOGDEPTH > 0.0)) {
    ooo_97.xy = (ooo_1.xy / ooo_1.w);
    ooo_97.w = 1.0;
    ooo_97.z = (((
      (log(ooo_1.w) - _camd.z)
     * _camd.w) * 2.0) - 1.0);
  } else {
    if ((USELOGDEPTH < 0.0)) {
      ooo_97.z = (log2(max (1e-6, 
        (ooo_97.w + 1.0)
      )) * 0.15);
      ooo_97.z = ((ooo_97.z - 1.0) * ooo_97.w);
    };
  };
  ooo_1 = ooo_97;
  gl_Position = ooo_97;
}

