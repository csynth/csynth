precision highp float;
precision highp float;
precision highp sampler2D;
uniform sampler2D t_ribbonrad;
uniform float killrads[16];
uniform vec3 awayvec;
uniform vec3 clearposA0;
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
uniform sampler2D rtopos;
uniform sampler2D pickrt;
uniform float multifact;
uniform float multiquatfact;
uniform float latenormals;
uniform float cutx;
uniform float cuty;
uniform float cutfall;
uniform vec2 screen;
uniform mat4 rot4;
uniform float capres;
uniform float numSegs;
uniform float numInstancesP2;
uniform sampler2D posNewvals;
float xhornid;
uniform float hornid;
uniform float lennum;
uniform float skelnum;
uniform float skelends;
uniform vec2 skelbufferRes;
uniform sampler2D skelbuffer;
uniform float killbplength;
uniform float NORMTYPE;
void main ()
{
  lowp vec4 multi_1;
  xhornid = hornid;
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
  tmpvar_7 = (tmpvar_5.z + 0.5);
  if ((tmpvar_7 < cumcount3)) {
    xhornid = 3.0;
    ribs = R_ribs;
  } else {
    xhornid = -1.0;
    ribs = 77.0;
  };
  lowp float tmpvar_8;
  if ((tmpvar_5.w == 99.0)) {
    tmpvar_8 = 1.0;
  } else {
    tmpvar_8 = xhornid;
  };
  lowp vec3 xmnormal_9;
  lowp float ribnum_10;
  lowp vec3 surfpos_11;
  lowp float fac_12;
  lowp float lk_13;
  lowp float xrscalea_14;
  float sss_15;
  lowp float star1_16;
  lowp vec3 xmu_17;
  float tmpvar_18;
  tmpvar_18 = floor(((lennum * capres) * 0.5));
  float tmpvar_19;
  tmpvar_19 = (lennum - (2.0 * tmpvar_18));
  float tmpvar_20;
  tmpvar_20 = -(tmpvar_18);
  lowp float tmpvar_21;
  tmpvar_21 = (tmpvar_20 + (tmpvar_5.x * (
    (tmpvar_19 + tmpvar_18)
   - tmpvar_20)));
  lowp float tmpvar_22;
  tmpvar_22 = clamp ((tmpvar_21 / tmpvar_19), 0.0, 1.0);
  lowp vec3 rad1a_23;
  lowp vec3 skela3_24;
  lowp vec3 step_25;
  lowp vec4 p1_26;
  lowp float tmpvar_27;
  tmpvar_27 = floor((tmpvar_22 * skelnum));
  lowp float tmpvar_28;
  tmpvar_28 = ((tmpvar_22 * skelnum) - tmpvar_27);
  float tmpvar_29;
  tmpvar_29 = (skelnum + (2.0 * skelends));
  lowp vec2 tmpvar_30;
  tmpvar_30.x = (floor((
    (min (tmpvar_29, (tmpvar_27 - 1.0)) + skelends)
   + 0.5)) + 0.5);
  tmpvar_30.y = (tmpvar_5.z + 0.5);
  lowp vec4 tmpvar_31;
  tmpvar_31 = texture2D (skelbuffer, (tmpvar_30 / skelbufferRes));
  lowp vec2 tmpvar_32;
  tmpvar_32.x = (floor((
    (min (tmpvar_29, tmpvar_27) + skelends)
   + 0.5)) + 0.5);
  tmpvar_32.y = (tmpvar_5.z + 0.5);
  lowp vec4 tmpvar_33;
  tmpvar_33 = texture2D (skelbuffer, (tmpvar_32 / skelbufferRes));
  p1_26 = tmpvar_33;
  lowp vec2 tmpvar_34;
  tmpvar_34.x = (floor((
    (min (tmpvar_29, (tmpvar_27 + 1.0)) + skelends)
   + 0.5)) + 0.5);
  tmpvar_34.y = (tmpvar_5.z + 0.5);
  lowp vec4 tmpvar_35;
  tmpvar_35 = texture2D (skelbuffer, (tmpvar_34 / skelbufferRes));
  lowp vec2 tmpvar_36;
  tmpvar_36.x = (floor((
    (min (tmpvar_29, (tmpvar_27 + 2.0)) + skelends)
   + 0.5)) + 0.5);
  tmpvar_36.y = (tmpvar_5.z + 0.5);
  lowp vec4 tmpvar_37;
  tmpvar_37 = texture2D (skelbuffer, (tmpvar_36 / skelbufferRes));
  lowp vec3 tmpvar_38;
  tmpvar_38 = (tmpvar_33 - tmpvar_35).xyz;
  lowp float tmpvar_39;
  tmpvar_39 = sqrt(dot (tmpvar_38, tmpvar_38));
  if ((tmpvar_39 > killbplength)) {
    p1_26 = vec4(sqrt((killbplength - tmpvar_39)));
  };
  lowp vec4 tmpvar_40;
  tmpvar_40 = (((
    (-0.5 * tmpvar_31)
   + 
    (1.5 * p1_26)
  ) - (1.5 * tmpvar_35)) + (0.5 * tmpvar_37));
  lowp vec4 tmpvar_41;
  tmpvar_41 = (((tmpvar_31 - 
    (2.5 * p1_26)
  ) + (2.0 * tmpvar_35)) - (0.5 * tmpvar_37));
  lowp vec4 tmpvar_42;
  tmpvar_42 = ((-0.5 * tmpvar_31) + (0.5 * tmpvar_35));
  step_25 = (((
    (3.0 * tmpvar_40)
   * 
    (tmpvar_28 * tmpvar_28)
  ) + (
    (2.0 * tmpvar_41)
   * tmpvar_28)) + tmpvar_42).xyz;
  skela3_24 = (((
    ((tmpvar_40 * tmpvar_28) * (tmpvar_28 * tmpvar_28))
   + 
    ((tmpvar_41 * tmpvar_28) * tmpvar_28)
  ) + (tmpvar_42 * tmpvar_28)) + p1_26).xyz;
  lowp float r_43;
  lowp float rp_44;
  rp_44 = tmpvar_22;
  lowp vec2 tmpvar_46;
  tmpvar_46.y = 0.5;
  tmpvar_46.x = tmpvar_22;
  lowp vec4 tmpvar_47;
  tmpvar_47 = texture2D (t_ribbonrad, tmpvar_46);
  r_43 = (scaleFactor * (R_radius + (tmpvar_47.x * wigmult)));
  if (((wigmult < 0.0) && (tmpvar_47.x != 0.0))) {
    r_43 = -0.1;
  };
  if ((ribbonPickExtra != 0.0)) {
    lowp float rx_48;
    rx_48 = max (0.0, (1.0 - (
      abs((texture2D (pickrt, vec2(0.0, 0.5)).x - tmpvar_22))
     / ribbonPickWidth)));
    lowp vec4 tmpvar_49;
    tmpvar_49 = texture2D (pickrt, vec2(0.25, 0.5));
    rx_48 = max (rx_48, (1.0 - (
      abs((tmpvar_49.x - tmpvar_22))
     / ribbonPickWidth)));
    rx_48 = max (rx_48, (1.0 - (
      abs((tmpvar_49.y - tmpvar_22))
     / ribbonPickWidth)));
    rx_48 = max (rx_48, (1.0 - (
      abs((texture2D (pickrt, vec2(0.5, 0.5)).x - tmpvar_22))
     / ribbonPickWidth)));
    lowp vec4 tmpvar_50;
    tmpvar_50 = texture2D (pickrt, vec2(0.75, 0.5));
    rx_48 = max (rx_48, (1.0 - (
      abs((tmpvar_50.x - tmpvar_22))
     / ribbonPickWidth)));
    lowp float tmpvar_51;
    tmpvar_51 = max (rx_48, (1.0 - (
      abs((tmpvar_50.y - tmpvar_22))
     / ribbonPickWidth)));
    rx_48 = tmpvar_51;
    r_43 = (r_43 + (ribbonPickExtra * tmpvar_51));
  };
  for (highp int i_45 = 0; i_45 < 16; i_45++) {
    lowp float tmpvar_52;
    tmpvar_52 = abs(((rp_44 * numSegs) - killrads[i_45]));
    if ((tmpvar_52 <= killradwidth)) {
      r_43 = -0.1;
    };
  };
  lowp float tmpvar_53;
  tmpvar_53 = (max ((endbloblen - tmpvar_22), (
    (-1.0 + endbloblen)
   + tmpvar_22)) / endbloblen);
  if ((tmpvar_53 > 0.0)) {
    r_43 = (r_43 * sqrt(max (0.0, 
      (((1.0 + cos(
        (((1.0 - tmpvar_53) * 6.28318) * endblobs)
      )) * 0.5) * (1.0 - tmpvar_53))
    )));
  };
  if (((tmpvar_22 < ribbonStart) || (tmpvar_22 > ribbonEnd))) {
    r_43 = -0.1;
  };
  lowp float tmpvar_54;
  tmpvar_54 = sqrt(dot (step_25, step_25));
  lowp vec3 tmpvar_55;
  if ((tmpvar_54 == 0.0)) {
    tmpvar_55 = vec3(0.0, 1.0, 0.0);
  } else {
    tmpvar_55 = (step_25 / tmpvar_54);
  };
  lowp vec4 tmpvar_56;
  tmpvar_56.w = 1.0;
  tmpvar_56.xyz = skela3_24;
  if (((tmpvar_54 == 0.0) || (NORMTYPE == 0.0))) {
    rad1a_23 = vec3(1.0, 0.0, 0.0);
  } else {
    if ((NORMTYPE == 1.0)) {
      rad1a_23 = ((tmpvar_55.yzx * vec3(2.1, 1.0, 1.3)) - (tmpvar_55.zxy * vec3(1.3, 2.1, 1.0)));
    } else {
      if ((NORMTYPE == 2.0)) {
        lowp vec2 tmpvar_57;
        tmpvar_57.x = 0.5;
        tmpvar_57.y = (((
          (tmpvar_22 - 0.09)
         * numSegs) + 0.5) / numInstancesP2);
        lowp vec3 b_58;
        b_58 = ((texture2D (posNewvals, tmpvar_57) * scaleFactor).xyz - skela3_24);
        rad1a_23 = ((tmpvar_55.yzx * b_58.zxy) - (tmpvar_55.zxy * b_58.yzx));
      } else {
        if ((NORMTYPE == 3.0)) {
          lowp vec2 tmpvar_59;
          tmpvar_59.x = 0.5;
          tmpvar_59.y = (((
            (tmpvar_22 - 0.09)
           * numSegs) + 0.5) / numInstancesP2);
          lowp vec3 tmpvar_60;
          lowp vec3 b_61;
          b_61 = ((texture2D (posNewvals, tmpvar_59) * scaleFactor).xyz - skela3_24);
          tmpvar_60 = ((tmpvar_55.yzx * b_61.zxy) - (tmpvar_55.zxy * b_61.yzx));
          rad1a_23 = tmpvar_60;
          lowp float tmpvar_62;
          tmpvar_62 = dot (tmpvar_60, tmpvar_60);
          if ((tmpvar_62 < 1e-6)) {
            rad1a_23 = ((tmpvar_55.yzx * vec3(2.1, 1.0, 1.3)) - (tmpvar_55.zxy * vec3(1.3, 2.1, 1.0)));
          };
        } else {
          if ((NORMTYPE == 4.0)) {
            lowp vec2 tmpvar_63;
            tmpvar_63.x = 0.5;
            tmpvar_63.y = (((tmpvar_22 * numSegs) + 0.5) / numInstancesP2);
            lowp vec4 tmpvar_64;
            tmpvar_64 = (texture2D (posNewvals, tmpvar_63) * scaleFactor);
            lowp vec4 tmpvar_65;
            tmpvar_65.x = (0.013 + tmpvar_64.x);
            tmpvar_65.y = tmpvar_64.y;
            tmpvar_65.z = (0.017 + tmpvar_64.z);
            tmpvar_65.w = 1.0;
            lowp vec3 b_66;
            b_66 = (tmpvar_65.xyz - skela3_24);
            rad1a_23 = ((tmpvar_55.yzx * b_66.zxy) - (tmpvar_55.zxy * b_66.yzx));
          } else {
            if ((NORMTYPE == 5.0)) {
              mat3 tmpvar_67;
              tmpvar_67[0] = rot4[0].xyz;
              tmpvar_67[1] = rot4[1].xyz;
              tmpvar_67[2] = rot4[2].xyz;
              lowp vec3 tmpvar_68;
              tmpvar_68 = normalize((tmpvar_67 * (clearposA0 - 
                (tmpvar_56 * rot4)
              .xyz)));
              rad1a_23 = ((tmpvar_68.yzx * tmpvar_55.zxy) - (tmpvar_68.zxy * tmpvar_55.yzx));
            } else {
              if ((NORMTYPE == 6.0)) {
                rad1a_23 = ((awayvec.yzx * tmpvar_55.zxy) - (awayvec.zxy * tmpvar_55.yzx));
              } else {
                rad1a_23 = vec3(0.0, 0.0, 1.0);
              };
            };
          };
        };
      };
    };
  };
  xmu_17 = tmpvar_55;
  lowp float tmpvar_69;
  tmpvar_69 = (tmpvar_5.y * nstar);
  star1_16 = tmpvar_69;
  sss_15 = 1.0;
  float tmpvar_70;
  tmpvar_70 = floor(nstar);
  if ((tmpvar_69 > tmpvar_70)) {
    float tmpvar_71;
    tmpvar_71 = fract(nstar);
    sss_15 = tmpvar_71;
    float tmpvar_72;
    tmpvar_72 = floor(nstar);
    star1_16 = (tmpvar_72 + ((tmpvar_69 - tmpvar_72) / tmpvar_71));
  };
  lowp float tmpvar_73;
  tmpvar_73 = (r_43 * (1.0 - (
    (1.0 - (((1.0 - 
      cos((6.28318 * star1_16))
    ) * sss_15) * sss_15))
   * stardepth)));
  xrscalea_14 = tmpvar_73;
  lk_13 = 0.0;
  fac_12 = 1.0;
  ribnum_10 = 0.0;
  if (((0.0 < tmpvar_21) && (tmpvar_21 < tmpvar_19))) {
    lk_13 = ((tmpvar_5.x * ribs) + 0.5);
    ribnum_10 = floor(lk_13);
    lowp float tmpvar_74;
    tmpvar_74 = abs((fract(lk_13) - 0.5));
    lk_13 = tmpvar_74;
    lowp float tmpvar_75;
    tmpvar_75 = sqrt((1.0 - (
      (ribdepth * tmpvar_74)
     * tmpvar_74)));
    fac_12 = tmpvar_75;
    xrscalea_14 = (tmpvar_73 * tmpvar_75);
  };
  lowp vec3 tmpvar_76;
  tmpvar_76 = normalize(rad1a_23);
  xmnormal_9 = ((-(
    sin((6.28318 * tmpvar_5.y))
  ) * -(
    normalize(((tmpvar_55.yzx * tmpvar_76.zxy) - (tmpvar_55.zxy * tmpvar_76.yzx)))
  )) + (cos(
    (6.28318 * tmpvar_5.y)
  ) * tmpvar_76));
  surfpos_11 = (skela3_24 + (xrscalea_14 * xmnormal_9));
  xmnormal_9 = (xmnormal_9 + (tmpvar_55 * (
    (ribdepth * lk_13)
   / fac_12)));
  lowp vec3 tmpvar_77;
  tmpvar_77 = normalize(xmnormal_9);
  xmnormal_9 = tmpvar_77;
  if ((tmpvar_21 > tmpvar_19)) {
    lowp float tmpvar_78;
    tmpvar_78 = (((
      (tmpvar_21 - tmpvar_19)
     / tmpvar_18) * 3.14159) / 2.0);
    lowp vec3 tmpvar_79;
    tmpvar_79 = ((sin(tmpvar_78) * tmpvar_55) + (cos(tmpvar_78) * tmpvar_77));
    surfpos_11 = (skela3_24 + (xrscalea_14 * tmpvar_79));
    xmu_17 = ((cos(tmpvar_78) * tmpvar_55) - (sin(tmpvar_78) * tmpvar_77));
    xmnormal_9 = tmpvar_79;
  };
  if ((tmpvar_21 < 0.0)) {
    lowp float tmpvar_80;
    tmpvar_80 = (((tmpvar_21 / tmpvar_18) * 3.14159) / 2.0);
    lowp vec3 tmpvar_81;
    tmpvar_81 = ((sin(tmpvar_80) * xmu_17) + (cos(tmpvar_80) * xmnormal_9));
    surfpos_11 = (skela3_24 + (xrscalea_14 * tmpvar_81));
    xmu_17 = ((cos(tmpvar_80) * xmu_17) - (sin(tmpvar_80) * xmnormal_9));
    xmnormal_9 = tmpvar_81;
  };
  lowp vec4 tmpvar_82;
  tmpvar_82.xyz = surfpos_11;
  tmpvar_82.w = 1.0;
  multi_1.xyz = (floor((surfpos_11 * multifact)) + ((xmnormal_9 + 1.0) * multiquatfact));
  if ((latenormals != 0.0)) {
    multi_1 = tmpvar_82;
  };
  multi_1.w = (((16384.0 * tmpvar_8) + tmpvar_5.z) + ((float(mod (ribnum_10, 2.0))) * 0.5));
  if ((tmpvar_8 == 2.0)) {
    multi_1.w = ((16384.0 * tmpvar_8) + ribnum_10);
  };
  gl_FragColor = multi_1;
}

