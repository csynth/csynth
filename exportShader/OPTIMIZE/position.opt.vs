precision highp float;
precision highp float;
precision highp sampler2D;
attribute vec3 position;
uniform vec3 awayvec;
uniform vec3 clearposA0;
float ribs;
float radius;
uniform float time;
uniform float nstar;
uniform float stardepth;
uniform float ribdepth;
uniform float R_ribs;
uniform float R_radius;
uniform float cumcount3;
uniform float scaleFactor;
uniform mat4 rot4;
attribute float instanceID;
uniform float fakeinstanceID;
uniform float capres;
uniform float numSegs;
uniform float numInstancesP2;
uniform sampler2D posNewvals;
uniform float lennum;
uniform float radnum;
varying lowp float scaleVary;
uniform float NORMTYPE;
void main ()
{
  lowp float ll_1;
  lowp vec4 rr_2;
  lowp float l_3;
  vec4 p_4;
  vec4 tmpvar_5;
  tmpvar_5.w = 1.0;
  tmpvar_5.xy = position.xy;
  tmpvar_5.z = (instanceID + fakeinstanceID);
  p_4.zw = tmpvar_5.zw;
  p_4.xy = (position.xy + vec2(0.5, 0.5));
  if ((NORMTYPE >= 5.0)) {
    p_4.y = (p_4.y * 0.5);
  };
  if ((tmpvar_5.z < cumcount3)) {
    ribs = R_ribs;
  } else {
    ribs = 77.0;
  };
  lowp vec3 xmnormal_6;
  lowp vec3 surfpos_7;
  float fac_8;
  float lk_9;
  float xrscalea_10;
  float sss_11;
  float star1_12;
  if ((tmpvar_5.z < cumcount3)) {
    radius = R_radius;
    ribs = R_ribs;
  } else {
    radius = (max (0.2, (tmpvar_5.z - 20.0)) * fract((time * 0.25)));
  };
  float tmpvar_13;
  tmpvar_13 = floor(((lennum * capres) * 0.5));
  float tmpvar_14;
  tmpvar_14 = (lennum - (2.0 * tmpvar_13));
  float tmpvar_15;
  tmpvar_15 = -(tmpvar_13);
  float tmpvar_16;
  tmpvar_16 = (tmpvar_15 + (p_4.x * (
    (tmpvar_14 + tmpvar_13)
   - tmpvar_15)));
  float tmpvar_17;
  tmpvar_17 = clamp ((tmpvar_16 / tmpvar_14), 0.0, 1.0);
  lowp vec3 rad1a_18;
  vec2 tmpvar_19;
  tmpvar_19.x = 0.5;
  tmpvar_19.y = (((
    (tmpvar_17 + 0.01)
   * numSegs) + 0.5) / numInstancesP2);
  lowp vec4 tmpvar_20;
  tmpvar_20.xyz = (texture2D (posNewvals, tmpvar_19) * scaleFactor).xyz;
  tmpvar_20.w = 1.0;
  vec2 tmpvar_21;
  tmpvar_21.x = 0.5;
  tmpvar_21.y = (((tmpvar_17 * numSegs) + 0.5) / numInstancesP2);
  lowp vec4 tmpvar_22;
  tmpvar_22 = (texture2D (posNewvals, tmpvar_21) * scaleFactor);
  lowp vec4 tmpvar_23;
  tmpvar_23.xyz = tmpvar_22.xyz;
  tmpvar_23.w = 1.0;
  lowp vec3 tmpvar_24;
  tmpvar_24 = (tmpvar_20 - tmpvar_23).xyz;
  lowp float tmpvar_25;
  tmpvar_25 = sqrt(dot (tmpvar_24, tmpvar_24));
  lowp vec3 tmpvar_26;
  if ((tmpvar_25 == 0.0)) {
    tmpvar_26 = vec3(0.0, 1.0, 0.0);
  } else {
    tmpvar_26 = (tmpvar_24 / tmpvar_25);
  };
  if (((tmpvar_25 == 0.0) || (NORMTYPE == 0.0))) {
    rad1a_18 = vec3(1.0, 0.0, 0.0);
  } else {
    if ((NORMTYPE == 1.0)) {
      rad1a_18 = ((tmpvar_26.yzx * vec3(2.1, 1.0, 1.3)) - (tmpvar_26.zxy * vec3(1.3, 2.1, 1.0)));
    } else {
      if ((NORMTYPE == 2.0)) {
        vec2 tmpvar_27;
        tmpvar_27.x = 0.5;
        tmpvar_27.y = (((
          (tmpvar_17 - 0.09)
         * numSegs) + 0.5) / numInstancesP2);
        lowp vec3 b_28;
        b_28 = ((texture2D (posNewvals, tmpvar_27) * scaleFactor).xyz - tmpvar_22.xyz);
        rad1a_18 = ((tmpvar_26.yzx * b_28.zxy) - (tmpvar_26.zxy * b_28.yzx));
      } else {
        if ((NORMTYPE == 3.0)) {
          vec2 tmpvar_29;
          tmpvar_29.x = 0.5;
          tmpvar_29.y = (((
            (tmpvar_17 - 0.09)
           * numSegs) + 0.5) / numInstancesP2);
          lowp vec3 tmpvar_30;
          lowp vec3 b_31;
          b_31 = ((texture2D (posNewvals, tmpvar_29) * scaleFactor).xyz - tmpvar_22.xyz);
          tmpvar_30 = ((tmpvar_26.yzx * b_31.zxy) - (tmpvar_26.zxy * b_31.yzx));
          rad1a_18 = tmpvar_30;
          lowp float tmpvar_32;
          tmpvar_32 = dot (tmpvar_30, tmpvar_30);
          if ((tmpvar_32 < 1e-6)) {
            rad1a_18 = ((tmpvar_26.yzx * vec3(2.1, 1.0, 1.3)) - (tmpvar_26.zxy * vec3(1.3, 2.1, 1.0)));
          };
        } else {
          if ((NORMTYPE == 4.0)) {
            vec2 tmpvar_33;
            tmpvar_33.x = 0.5;
            tmpvar_33.y = (((tmpvar_17 * numSegs) + 0.5) / numInstancesP2);
            lowp vec4 tmpvar_34;
            tmpvar_34 = (texture2D (posNewvals, tmpvar_33) * scaleFactor);
            lowp vec4 tmpvar_35;
            tmpvar_35.x = (0.013 + tmpvar_34.x);
            tmpvar_35.y = tmpvar_34.y;
            tmpvar_35.z = (0.017 + tmpvar_34.z);
            tmpvar_35.w = 1.0;
            lowp vec3 b_36;
            b_36 = (tmpvar_35.xyz - tmpvar_22.xyz);
            rad1a_18 = ((tmpvar_26.yzx * b_36.zxy) - (tmpvar_26.zxy * b_36.yzx));
          } else {
            if ((NORMTYPE == 5.0)) {
              mat3 tmpvar_37;
              tmpvar_37[0] = rot4[0].xyz;
              tmpvar_37[1] = rot4[1].xyz;
              tmpvar_37[2] = rot4[2].xyz;
              lowp vec3 tmpvar_38;
              tmpvar_38 = normalize((tmpvar_37 * (clearposA0 - 
                (tmpvar_23 * rot4)
              .xyz)));
              rad1a_18 = ((tmpvar_38.yzx * tmpvar_26.zxy) - (tmpvar_38.zxy * tmpvar_26.yzx));
            } else {
              if ((NORMTYPE == 6.0)) {
                rad1a_18 = ((awayvec.yzx * tmpvar_26.zxy) - (awayvec.zxy * tmpvar_26.yzx));
              } else {
                rad1a_18 = vec3(0.0, 0.0, 1.0);
              };
            };
          };
        };
      };
    };
  };
  float tmpvar_39;
  tmpvar_39 = (p_4.y * nstar);
  star1_12 = tmpvar_39;
  sss_11 = 1.0;
  float tmpvar_40;
  tmpvar_40 = floor(nstar);
  if ((tmpvar_39 > tmpvar_40)) {
    float tmpvar_41;
    tmpvar_41 = fract(nstar);
    sss_11 = tmpvar_41;
    float tmpvar_42;
    tmpvar_42 = floor(nstar);
    star1_12 = (tmpvar_42 + ((tmpvar_39 - tmpvar_42) / tmpvar_41));
  };
  float tmpvar_43;
  tmpvar_43 = (radius * (1.0 - (
    (1.0 - (((1.0 - 
      cos((6.28318 * star1_12))
    ) * sss_11) * sss_11))
   * stardepth)));
  xrscalea_10 = tmpvar_43;
  lk_9 = 0.0;
  fac_8 = 1.0;
  if (((0.0 < tmpvar_16) && (tmpvar_16 < tmpvar_14))) {
    lk_9 = ((p_4.x * ribs) + 0.5);
    float tmpvar_44;
    tmpvar_44 = abs((fract(lk_9) - 0.5));
    lk_9 = tmpvar_44;
    float tmpvar_45;
    tmpvar_45 = sqrt((1.0 - (
      (ribdepth * tmpvar_44)
     * tmpvar_44)));
    fac_8 = tmpvar_45;
    xrscalea_10 = (tmpvar_43 * tmpvar_45);
  };
  lowp vec3 tmpvar_46;
  tmpvar_46 = normalize(rad1a_18);
  xmnormal_6 = ((-(
    sin((6.28318 * p_4.y))
  ) * -(
    normalize(((tmpvar_26.yzx * tmpvar_46.zxy) - (tmpvar_26.zxy * tmpvar_46.yzx)))
  )) + (cos(
    (6.28318 * p_4.y)
  ) * tmpvar_46));
  surfpos_7 = (tmpvar_22.xyz + (xrscalea_10 * xmnormal_6));
  xmnormal_6 = (xmnormal_6 + (tmpvar_26 * (
    (ribdepth * lk_9)
   / fac_8)));
  lowp vec3 tmpvar_47;
  tmpvar_47 = normalize(xmnormal_6);
  xmnormal_6 = tmpvar_47;
  if ((tmpvar_16 > tmpvar_14)) {
    float tmpvar_48;
    tmpvar_48 = (((
      (tmpvar_16 - tmpvar_14)
     / tmpvar_13) * 3.14159) / 2.0);
    surfpos_7 = (tmpvar_22.xyz + (xrscalea_10 * (
      (sin(tmpvar_48) * tmpvar_26)
     + 
      (cos(tmpvar_48) * tmpvar_47)
    )));
  };
  if ((tmpvar_16 < 0.0)) {
    float tmpvar_49;
    tmpvar_49 = (((tmpvar_16 / tmpvar_13) * 3.14159) / 2.0);
    surfpos_7 = (tmpvar_22.xyz + (xrscalea_10 * (
      (sin(tmpvar_49) * tmpvar_26)
     + 
      (cos(tmpvar_49) * tmpvar_47)
    )));
  };
  xmnormal_6 = tmpvar_47;
  lowp vec4 tmpvar_50;
  tmpvar_50.xyz = surfpos_7;
  tmpvar_50.w = tmpvar_23.w;
  gl_PointSize = 1.0;
  float tmpvar_51;
  tmpvar_51 = (float(mod (((p_4.x * lennum) + (p_4.y * radnum)), 8.0)));
  if ((tmpvar_51 < 1.0)) {
    l_3 = -(surfpos_7.x);
    rr_2.x = -0.875;
  } else {
    if ((tmpvar_51 < 2.0)) {
      l_3 = tmpvar_50.x;
      rr_2.x = -0.625;
    } else {
      if ((tmpvar_51 < 3.0)) {
        l_3 = -(surfpos_7.y);
        rr_2.x = -0.375;
      } else {
        if ((tmpvar_51 < 4.0)) {
          l_3 = tmpvar_50.y;
          rr_2.x = -0.125;
        } else {
          if ((tmpvar_51 < 5.0)) {
            l_3 = -(surfpos_7.z);
            rr_2.x = 0.125;
          } else {
            if ((tmpvar_51 < 6.0)) {
              l_3 = tmpvar_50.z;
              rr_2.x = 0.375;
            } else {
              if ((tmpvar_51 < 7.0)) {
                l_3 = -1.0;
                rr_2.x = 0.625;
              } else {
                l_3 = tmpvar_50.w;
                rr_2.x = 0.875;
              };
            };
          };
        };
      };
    };
  };
  rr_2.y = 0.0;
  lowp float tmpvar_52;
  tmpvar_52 = (l_3 * 128.0);
  ll_1 = 0.0;
  if ((tmpvar_52 > 1.0)) {
    ll_1 = (-(log(tmpvar_52)) / 20.0);
  };
  if ((tmpvar_52 < -1.0)) {
    ll_1 = (log(-(tmpvar_52)) / 20.0);
  };
  if (((ll_1 < -1.0) || (ll_1 > 1.0))) {
    rr_2.x = 999.0;
  };
  if ((ll_1 != ll_1)) {
    rr_2.x = 999.0;
  };
  rr_2.z = ll_1;
  rr_2.w = 1.0;
  gl_Position = rr_2;
  scaleVary = l_3;
}

