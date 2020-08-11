precision highp float;
precision highp float;
precision highp sampler2D;
uniform sampler2D matrixbed;
uniform float matskipdiag;
uniform float matpow;
uniform float matC00r;
uniform float matC00g;
uniform float matC00b;
uniform float matC01r;
uniform float matC01g;
uniform float matC01b;
uniform float matC10r;
uniform float matC10g;
uniform float matC10b;
uniform float matC11r;
uniform float matC11g;
uniform float matC11b;
uniform float matDistFar;
uniform float matDistNear;
uniform float matrixbedtint;
uniform float matrixgridres;
uniform float matrixgridwidth;
uniform float matrixgridsoftw;
uniform float matrixcontactmin;
uniform float matrixcontactmult;
uniform float matgamma;
uniform sampler2D matrix2dtexA;
uniform sampler2D matrix2dtexB;
uniform float matintypeA;
uniform float matintypeB;
uniform float matcoltypeA;
uniform float matcoltypeB;
uniform float matrixTintStrength;
uniform float minActive;
uniform float maxActive;
uniform float maxBackboneDist;
uniform float nonBackboneLen;
uniform float representativeContact;
uniform float m_k;
uniform float m_alpha;
uniform float pushapartforce;
uniform float pushapartpow;
uniform float contactforcesc;
uniform float powBaseDist;
uniform sampler2D rtopos;
uniform sampler2D rtshapepos;
uniform sampler2D colbuff;
uniform sampler2D pickrt;
uniform float multifact;
uniform float multiquatfact;
uniform float latenormals;
uniform float latenormalsred;
uniform float cutx;
uniform float cuty;
uniform float cutfall;
uniform vec2 screen;
uniform mat4 rot4;
lowp float colourid;
uniform float userPicks[16];
uniform float numSegs;
uniform float numInstancesP2;
uniform sampler2D posNewvals;
lowp float xhornid;
uniform sampler2D rttexture;
uniform vec3 cameraPositionModel;
uniform float ymin;
uniform float ymax;
vec4 postxcol;
uniform float flulow;
uniform float opacity;
uniform float badnormals;
uniform float colribs;
uniform float fogr;
uniform float fogg;
uniform float fogb;
uniform float fogstartdist;
uniform float foghalfdepth;
uniform float xxposprop;
uniform float xxnormprop;
uniform float ambient;
uniform float light0s;
uniform float light1s;
uniform float light2s;
uniform float light0r;
uniform float light0g;
uniform float light0b;
uniform float light1r;
uniform float light1g;
uniform float light1b;
uniform float light2r;
uniform float light2g;
uniform float light2b;
uniform float light0x;
uniform float light0y;
uniform float light0z;
uniform float light1x;
uniform float light1y;
uniform float light1z;
uniform float light2x;
uniform float light2y;
uniform float light2z;
uniform float light0dirx;
uniform float light0diry;
uniform float light0dirz;
uniform float light1dirx;
uniform float light1diry;
uniform float light1dirz;
uniform float light2dirx;
uniform float light2diry;
uniform float light2dirz;
uniform float light0Spread;
uniform float light1Spread;
uniform float light2Spread;
uniform float light0HalfDist;
uniform float light1HalfDist;
uniform float light2HalfDist;
uniform float fresnel0;
void main ()
{
  postxcol = vec4(0.0, 0.0, 0.0, 0.0);
  lowp vec3 texpos_1;
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
  colourid = xhornid;
  lowp vec3 xmnormal_5;
  lowp vec4 shapepos_6;
  lowp vec4 tmpvar_7;
  highp vec2 P_8;
  P_8 = (gl_FragCoord.xy * screen);
  tmpvar_7 = texture2D (rtshapepos, P_8);
  if ((tmpvar_7.w == 0.0)) {
    discard;
  };
  lowp float tmpvar_9;
  tmpvar_9 = floor((tmpvar_7.w / 16384.0));
  if ((latenormals != 0.0)) {
    lowp vec3 uBb_10;
    lowp vec3 uBa_11;
    lowp vec3 uAb_12;
    lowp vec3 uAa_13;
    shapepos_6 = tmpvar_7;
    vec2 tmpvar_14;
    tmpvar_14.y = 0.0;
    tmpvar_14.x = latenormals;
    lowp vec4 tmpvar_15;
    highp vec2 P_16;
    P_16 = ((gl_FragCoord.xy + tmpvar_14) * screen);
    tmpvar_15 = texture2D (rtshapepos, P_16);
    vec2 tmpvar_17;
    tmpvar_17.y = 0.0;
    float tmpvar_18;
    tmpvar_18 = -(latenormals);
    tmpvar_17.x = tmpvar_18;
    lowp vec4 tmpvar_19;
    highp vec2 P_20;
    P_20 = ((gl_FragCoord.xy + tmpvar_17) * screen);
    tmpvar_19 = texture2D (rtshapepos, P_20);
    vec2 tmpvar_21;
    tmpvar_21.x = 0.0;
    tmpvar_21.y = tmpvar_18;
    lowp vec4 tmpvar_22;
    highp vec2 P_23;
    P_23 = ((gl_FragCoord.xy + tmpvar_21) * screen);
    tmpvar_22 = texture2D (rtshapepos, P_23);
    vec2 tmpvar_24;
    tmpvar_24.x = 0.0;
    tmpvar_24.y = latenormals;
    lowp vec4 tmpvar_25;
    highp vec2 P_26;
    P_26 = ((gl_FragCoord.xy + tmpvar_24) * screen);
    tmpvar_25 = texture2D (rtshapepos, P_26);
    if ((tmpvar_15.w == tmpvar_7.w)) {
      uAa_13 = tmpvar_15.xyz;
      uAb_12 = tmpvar_7.xyz;
    } else {
      if ((tmpvar_19.w == tmpvar_7.w)) {
        uAa_13 = tmpvar_7.xyz;
        uAb_12 = tmpvar_19.xyz;
      } else {
        lowp vec3 tmpvar_27;
        if ((floor((tmpvar_7.w / 16384.0)) == floor((tmpvar_15.w / 16384.0)))) {
          tmpvar_27 = tmpvar_15.xyz;
        } else {
          tmpvar_27 = tmpvar_7.xyz;
        };
        uAa_13 = tmpvar_27;
        lowp vec3 tmpvar_28;
        if ((floor((tmpvar_7.w / 16384.0)) == floor((tmpvar_19.w / 16384.0)))) {
          tmpvar_28 = tmpvar_19.xyz;
        } else {
          tmpvar_28 = tmpvar_7.xyz;
        };
        uAb_12 = tmpvar_28;
      };
    };
    if ((tmpvar_22.w == tmpvar_7.w)) {
      uBa_11 = tmpvar_22.xyz;
      uBb_10 = tmpvar_7.xyz;
    } else {
      if ((tmpvar_19.w == tmpvar_7.w)) {
        uBa_11 = tmpvar_7.xyz;
        uBb_10 = tmpvar_25.xyz;
      } else {
        lowp vec3 tmpvar_29;
        if ((floor((tmpvar_7.w / 16384.0)) == floor((tmpvar_22.w / 16384.0)))) {
          tmpvar_29 = tmpvar_22.xyz;
        } else {
          tmpvar_29 = tmpvar_7.xyz;
        };
        uBa_11 = tmpvar_29;
        lowp vec3 tmpvar_30;
        if ((floor((tmpvar_7.w / 16384.0)) == floor((tmpvar_25.w / 16384.0)))) {
          tmpvar_30 = tmpvar_25.xyz;
        } else {
          tmpvar_30 = tmpvar_7.xyz;
        };
        uBb_10 = tmpvar_30;
      };
    };
    lowp vec3 tmpvar_31;
    lowp vec3 a_32;
    a_32 = (uBa_11 - uBb_10);
    lowp vec3 b_33;
    b_33 = (uAa_13 - uAb_12);
    tmpvar_31 = ((a_32.yzx * b_33.zxy) - (a_32.zxy * b_33.yzx));
    lowp float tmpvar_34;
    tmpvar_34 = sqrt(dot (tmpvar_31, tmpvar_31));
    if ((tmpvar_34 < 1e-9)) {
      vec4 tmpvar_35;
      tmpvar_35.yzw = vec3(0.0, 0.0, 0.0);
      tmpvar_35.x = latenormalsred;
      postxcol = tmpvar_35;
      xmnormal_5 = vec3(0.0, 0.0, 1.09);
    } else {
      lowp vec3 tmpvar_36;
      tmpvar_36 = normalize(tmpvar_31);
      xmnormal_5.xz = tmpvar_36.xz;
      xmnormal_5.y = (tmpvar_36.y + 1e-15);
    };
  } else {
    shapepos_6 = (floor(tmpvar_7) / multifact);
    xmnormal_5 = ((fract(tmpvar_7) / multiquatfact) - 1.0).xyz;
  };
  shapepos_6.w = 1.0;
  colourid = tmpvar_9;
  xhornid = tmpvar_9;
  texpos_1 = shapepos_6.xyz;
  mat4 tmpvar_37;
  if ((tmpvar_9 == 2.0)) {
    tmpvar_37 = mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
  } else {
    tmpvar_37 = rot4;
  };
  lowp vec4 tmpvar_38;
  tmpvar_38 = (shapepos_6 * tmpvar_37);
  mediump vec4 tmpvar_39;
  colourid = tmpvar_9;
  lowp vec2 tmpvar_40;
  tmpvar_40.x = 0.34375;
  tmpvar_40.y = ((tmpvar_9 + 0.5) / 32.0);
  lowp vec4 tmpvar_41;
  tmpvar_41 = texture2D (colbuff, tmpvar_40);
  bool tmpvar_42;
  if ((tmpvar_41.w != 0.0)) {
    tmpvar_42 = bool(1);
  } else {
    lowp vec2 tmpvar_43;
    tmpvar_43.x = 0.40625;
    tmpvar_43.y = ((tmpvar_9 + 0.5) / 32.0);
    tmpvar_42 = (texture2D (colbuff, tmpvar_43).x != 0.0);
  };
  bool tmpvar_44;
  if (tmpvar_42) {
    tmpvar_44 = bool(1);
  } else {
    lowp vec2 tmpvar_45;
    tmpvar_45.x = 0.40625;
    tmpvar_45.y = ((tmpvar_9 + 0.5) / 32.0);
    tmpvar_44 = (texture2D (colbuff, tmpvar_45).y != 0.0);
  };
  if ((tmpvar_44 || (colribs != 0.0))) {
    lowp vec4 tmpvar_46;
    highp vec2 P_47;
    P_47 = (gl_FragCoord.xy * screen);
    tmpvar_46 = texture2D (rtopos, P_47);
    if ((tmpvar_9 != 2.0)) {
      colourid = (tmpvar_9 + (colribs * tmpvar_46.z));
    };
    colourid = (float(mod (colourid, 32.0)));
  };
  lowp vec4 res_48;
  lowp vec4 col_49;
  lowp vec3 mmnormal_50;
  lowp vec3 tmpvar_51;
  tmpvar_51 = normalize(xmnormal_5);
  if (!(((ymin <= tmpvar_38.y) && (tmpvar_38.y <= ymax)))) {
    discard;
  };
  mat4 tmpvar_52;
  if ((colourid == 2.0)) {
    tmpvar_52 = mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
  } else {
    tmpvar_52 = rot4;
  };
  mat3 tmpvar_53;
  tmpvar_53[0] = tmpvar_52[0].xyz;
  tmpvar_53[1] = tmpvar_52[1].xyz;
  tmpvar_53[2] = tmpvar_52[2].xyz;
  lowp vec3 tmpvar_54;
  tmpvar_54 = (-(tmpvar_51) * tmpvar_53);
  lowp float tmpvar_55;
  lowp vec3 x_56;
  x_56 = (cameraPositionModel - tmpvar_38.xyz);
  tmpvar_55 = sqrt(dot (x_56, x_56));
  lowp vec3 tmpvar_57;
  tmpvar_57 = normalize((cameraPositionModel - tmpvar_38.xyz));
  mmnormal_50 = -(tmpvar_54);
  if ((xmnormal_5.z == 1.09)) {
    mmnormal_50 = -(tmpvar_57);
  } else {
    lowp float tmpvar_58;
    tmpvar_58 = dot (tmpvar_57, mmnormal_50);
    if ((tmpvar_58 < 0.0)) {
      if ((badnormals == 0.0)) {
        postxcol = vec4(1.0, 1.0, 0.0, 1.0);
      } else {
        if ((badnormals != 1.0)) {
          if ((badnormals == 2.0)) {
            mmnormal_50 = (mmnormal_50 - (tmpvar_58 * tmpvar_57));
          } else {
            if ((badnormals < 0.0)) {
              mmnormal_50 = (mmnormal_50 - ((
                -(badnormals)
               * tmpvar_58) * tmpvar_57));
            } else {
              if ((badnormals == 3.0)) {
                mmnormal_50 = tmpvar_54;
              } else {
                if ((badnormals == 4.0)) {
                  if ((tmpvar_58 < -0.2)) {
                    mmnormal_50 = tmpvar_54;
                  } else {
                    mmnormal_50 = (mmnormal_50 - (tmpvar_58 * tmpvar_57));
                  };
                };
              };
            };
          };
        };
      };
    };
  };
  lowp vec3 texpos_59;
  texpos_59.z = texpos_1.z;
  highp int i_60;
  lowp vec4 tmpvar_61;
  lowp vec4 tmpvar_62;
  lowp vec2 p_63;
  lowp float d_64;
  lowp float tmpvar_65;
  tmpvar_65 = (shapepos_6.y - shapepos_6.x);
  lowp float tmpvar_66;
  tmpvar_66 = ((shapepos_6.x + shapepos_6.y) * 0.5);
  lowp float tmpvar_67;
  tmpvar_67 = sign(tmpvar_65);
  d_64 = (tmpvar_67 * pow ((tmpvar_67 * tmpvar_65), matpow));
  d_64 = (d_64 * 0.5);
  p_63.x = (tmpvar_66 - d_64);
  p_63.y = (tmpvar_66 + d_64);
  texpos_59.xy = p_63;
  if (((p_63.x - p_63.y) > (-(matskipdiag) / numSegs))) {
    discard;
  };
  tmpvar_61 = vec4(0.5, 0.5, 0.5, 0.0);
  tmpvar_62 = vec4(0.0, 0.0, 0.0, 0.0);
  float tmpvar_68;
  tmpvar_68 = (numSegs + 1.0);
  lowp vec3 tmpvar_69;
  tmpvar_69 = floor(((texpos_59 * numSegs) + 0.5));
  lowp vec2 tmpvar_70;
  tmpvar_70.x = 0.0;
  tmpvar_70.y = ((tmpvar_69.x + 0.5) / numInstancesP2);
  lowp vec2 tmpvar_71;
  tmpvar_71.x = 0.0;
  tmpvar_71.y = ((tmpvar_69.y + 0.5) / numInstancesP2);
  lowp float tmpvar_72;
  lowp vec3 x_73;
  x_73 = (texture2D (posNewvals, tmpvar_71).xyz - texture2D (posNewvals, tmpvar_70).xyz);
  tmpvar_72 = sqrt(dot (x_73, x_73));
  vec3 tmpvar_74;
  tmpvar_74.x = matC00r;
  tmpvar_74.y = matC00g;
  tmpvar_74.z = matC00b;
  vec3 tmpvar_75;
  tmpvar_75.x = matC11r;
  tmpvar_75.y = matC11g;
  tmpvar_75.z = matC11b;
  lowp vec2 tmpvar_76;
  tmpvar_76 = (((p_63 * numSegs) + 0.5) / tmpvar_68);
  lowp float tmpvar_77;
  if ((matintypeA < 1.5)) {
    tmpvar_77 = matintypeA;
  } else {
    if ((matintypeA < 2.5)) {
      tmpvar_77 = tmpvar_76.x;
    } else {
      if ((matintypeA < 3.5)) {
        tmpvar_77 = tmpvar_76.y;
      } else {
        if ((matintypeA < 4.5)) {
          lowp float tmpvar_78;
          tmpvar_78 = clamp (((
            (tmpvar_72 / nonBackboneLen)
           - matDistNear) / (matDistFar - matDistNear)), 0.0, 1.0);
          tmpvar_77 = (1.0 - (tmpvar_78 * (tmpvar_78 * 
            (3.0 - (2.0 * tmpvar_78))
          )));
        } else {
          if ((matintypeA < 5.5)) {
            lowp float tmpvar_79;
            tmpvar_79 = clamp (((
              (texture2D (matrix2dtexA, tmpvar_76).x / nonBackboneLen)
             - matDistNear) / (matDistFar - matDistNear)), 0.0, 1.0);
            tmpvar_77 = (1.0 - (tmpvar_79 * (tmpvar_79 * 
              (3.0 - (2.0 * tmpvar_79))
            )));
          } else {
            if ((matintypeA < 6.5)) {
              lowp float dist_80;
              lowp float tmpvar_81;
              tmpvar_81 = max (0.0, texture2D (matrix2dtexA, tmpvar_76).x);
              if ((contactforcesc != 0.0)) {
                dist_80 = pow (((
                  (tmpvar_81 * contactforcesc)
                 / pushapartforce) * pow (powBaseDist, pushapartpow)), (1.0/((pushapartpow - 1.0))));
              } else {
                dist_80 = (m_k * pow ((tmpvar_81 / representativeContact), -(m_alpha)));
              };
              lowp float tmpvar_82;
              tmpvar_82 = clamp (((dist_80 - matDistNear) / (matDistFar - matDistNear)), 0.0, 1.0);
              tmpvar_77 = (1.0 - (tmpvar_82 * (tmpvar_82 * 
                (3.0 - (2.0 * tmpvar_82))
              )));
            } else {
              tmpvar_77 = ((texture2D (matrix2dtexA, tmpvar_76).x - matrixcontactmin) * matrixcontactmult);
            };
          };
        };
      };
    };
  };
  lowp float tmpvar_83;
  tmpvar_83 = clamp (tmpvar_77, 0.0, 1.0);
  if (((matintypeA + matintypeB) != 0.0)) {
    if ((matcoltypeA == matcoltypeB)) {
      tmpvar_61.xyz = mix (tmpvar_74, tmpvar_75, tmpvar_83);
    } else {
      lowp float tmpvar_84;
      if ((matintypeB < 1.5)) {
        tmpvar_84 = matintypeB;
      } else {
        if ((matintypeB < 2.5)) {
          tmpvar_84 = tmpvar_76.x;
        } else {
          if ((matintypeB < 3.5)) {
            tmpvar_84 = tmpvar_76.y;
          } else {
            if ((matintypeB < 4.5)) {
              lowp float tmpvar_85;
              tmpvar_85 = clamp (((
                (tmpvar_72 / nonBackboneLen)
               - matDistNear) / (matDistFar - matDistNear)), 0.0, 1.0);
              tmpvar_84 = (1.0 - (tmpvar_85 * (tmpvar_85 * 
                (3.0 - (2.0 * tmpvar_85))
              )));
            } else {
              if ((matintypeB < 5.5)) {
                lowp float tmpvar_86;
                tmpvar_86 = clamp (((
                  (texture2D (matrix2dtexB, tmpvar_76).x / nonBackboneLen)
                 - matDistNear) / (matDistFar - matDistNear)), 0.0, 1.0);
                tmpvar_84 = (1.0 - (tmpvar_86 * (tmpvar_86 * 
                  (3.0 - (2.0 * tmpvar_86))
                )));
              } else {
                if ((matintypeB < 6.5)) {
                  lowp float dist_87;
                  lowp float tmpvar_88;
                  tmpvar_88 = max (0.0, texture2D (matrix2dtexB, tmpvar_76).x);
                  if ((contactforcesc != 0.0)) {
                    dist_87 = pow (((
                      (tmpvar_88 * contactforcesc)
                     / pushapartforce) * pow (powBaseDist, pushapartpow)), (1.0/((pushapartpow - 1.0))));
                  } else {
                    dist_87 = (m_k * pow ((tmpvar_88 / representativeContact), -(m_alpha)));
                  };
                  lowp float tmpvar_89;
                  tmpvar_89 = clamp (((dist_87 - matDistNear) / (matDistFar - matDistNear)), 0.0, 1.0);
                  tmpvar_84 = (1.0 - (tmpvar_89 * (tmpvar_89 * 
                    (3.0 - (2.0 * tmpvar_89))
                  )));
                } else {
                  tmpvar_84 = ((texture2D (matrix2dtexB, tmpvar_76).x - matrixcontactmin) * matrixcontactmult);
                };
              };
            };
          };
        };
      };
      lowp float tmpvar_90;
      tmpvar_90 = clamp (tmpvar_84, 0.0, 1.0);
      vec3 tmpvar_91;
      tmpvar_91.x = matC00r;
      tmpvar_91.y = matC00g;
      tmpvar_91.z = matC00b;
      vec3 tmpvar_92;
      tmpvar_92.x = matC11r;
      tmpvar_92.y = matC11g;
      tmpvar_92.z = matC11b;
      lowp vec3 tmpvar_93;
      tmpvar_93 = mix (tmpvar_91, tmpvar_92, max (tmpvar_83, tmpvar_90));
      vec3 tmpvar_94;
      if ((tmpvar_83 > tmpvar_90)) {
        vec3 tmpvar_95;
        tmpvar_95.x = matC10r;
        tmpvar_95.y = matC10g;
        tmpvar_95.z = matC10b;
        tmpvar_94 = tmpvar_95;
      } else {
        vec3 tmpvar_96;
        tmpvar_96.x = matC01r;
        tmpvar_96.y = matC01g;
        tmpvar_96.z = matC01b;
        tmpvar_94 = tmpvar_96;
      };
      tmpvar_61.xyz = mix (tmpvar_93, tmpvar_94, clamp ((matrixTintStrength * 
        abs((tmpvar_83 - tmpvar_90))
      ), 0.0, 1.0));
    };
  };
  tmpvar_61.xyz = pow (tmpvar_61.xyz, vec3(matgamma));
  lowp vec3 c_97;
  c_97 = tmpvar_61.xyz;
  lowp vec4 tmpvar_98;
  tmpvar_98.xy = c_97.zy;
  tmpvar_98.zw = vec2(-1.0, 0.6666667);
  lowp vec4 tmpvar_99;
  tmpvar_99.xy = c_97.yz;
  tmpvar_99.zw = vec2(0.0, -0.3333333);
  lowp vec4 tmpvar_100;
  tmpvar_100 = mix (tmpvar_98, tmpvar_99, float((tmpvar_61.y >= tmpvar_61.z)));
  lowp vec4 tmpvar_101;
  tmpvar_101.xyz = tmpvar_100.xyw;
  tmpvar_101.w = c_97.x;
  lowp vec4 tmpvar_102;
  tmpvar_102.x = c_97.x;
  tmpvar_102.yzw = tmpvar_100.yzx;
  lowp vec4 tmpvar_103;
  tmpvar_103 = mix (tmpvar_101, tmpvar_102, float((tmpvar_61.x >= tmpvar_100.x)));
  lowp float tmpvar_104;
  tmpvar_104 = (tmpvar_103.x - min (tmpvar_103.w, tmpvar_103.y));
  lowp vec3 tmpvar_105;
  tmpvar_105.x = abs((tmpvar_103.z + (
    (tmpvar_103.w - tmpvar_103.y)
   / 
    ((6.0 * tmpvar_104) + 1e-10)
  )));
  tmpvar_105.y = (tmpvar_104 / (tmpvar_103.x + 1e-10));
  tmpvar_105.z = tmpvar_103.x;
  tmpvar_62.xyz = tmpvar_105;
  if ((matrixgridres != 0.0)) {
    float tmpvar_106;
    tmpvar_106 = (1.0/(matrixgridsoftw));
    lowp float tmpvar_107;
    tmpvar_107 = min (((1.0 - 
      (clamp ((abs(
        fract((((p_63.x * 
          (tmpvar_68 - 1.0)
        ) / matrixgridres) + 0.5))
      ) - matrixgridwidth), 0.0, matrixgridsoftw) * tmpvar_106)
    ) + (1.0 - 
      (clamp ((abs(
        fract((((p_63.y * 
          (tmpvar_68 - 1.0)
        ) / matrixgridres) + 0.5))
      ) - matrixgridwidth), 0.0, matrixgridsoftw) * tmpvar_106)
    )), 1.0);
    tmpvar_61.xyz = (tmpvar_61.xyz + (vec3(0.0, 0.7, 0.7) * tmpvar_107));
    if ((tmpvar_107 > 0.0)) {
      lowp vec3 tmpvar_108;
      tmpvar_108.xy = vec2(0.5, 1.0);
      tmpvar_108.z = (0.1 * tmpvar_107);
      tmpvar_62.xyz = tmpvar_108;
    };
  };
  lowp vec2 tmpvar_109;
  tmpvar_109 = texpos_59.xy;
  if ((matrixbedtint != 0.0)) {
    lowp vec2 tmpvar_110;
    tmpvar_110.y = 0.5;
    tmpvar_110.x = tmpvar_109.x;
    lowp vec4 tmpvar_111;
    tmpvar_111 = texture2D (matrixbed, tmpvar_110);
    lowp float tmpvar_112;
    tmpvar_112 = (tmpvar_111.w * 255.0);
    lowp vec3 tmpvar_113;
    if (((tmpvar_111.x != tmpvar_111.w) || (tmpvar_111.y != tmpvar_111.w))) {
      tmpvar_113 = tmpvar_111.xyz;
    } else {
      lowp vec3 tmpvar_114;
      if ((tmpvar_111.w == 0.0)) {
        tmpvar_114 = vec3(0.0, 0.0, 0.0);
      } else {
        vec3 col_115;
        lowp float tmpvar_116;
        tmpvar_116 = (float(mod (tmpvar_112, 7.0)));
        if ((tmpvar_116 < 0.0)) {
          col_115 = vec3(9.5, 0.5, 0.5);
        } else {
          if ((tmpvar_116 < 0.5)) {
            col_115 = vec3(0.5, 0.5, 0.5);
          } else {
            if ((tmpvar_116 < 1.5)) {
              col_115 = vec3(1.0, 0.0, 0.0);
            } else {
              if ((tmpvar_116 < 2.5)) {
                col_115 = vec3(0.0, 1.0, 0.0);
              } else {
                if ((tmpvar_116 < 3.5)) {
                  col_115 = vec3(0.0, 0.0, 1.0);
                } else {
                  if ((tmpvar_116 < 4.5)) {
                    col_115 = vec3(0.0, 1.0, 1.0);
                  } else {
                    if ((tmpvar_116 < 5.5)) {
                      col_115 = vec3(1.0, 0.0, 1.0);
                    } else {
                      if ((tmpvar_116 < 6.5)) {
                        col_115 = vec3(1.0, 1.0, 0.0);
                      } else {
                        col_115 = vec3(1.0, 1.0, 1.0);
                      };
                    };
                  };
                };
              };
            };
          };
        };
        tmpvar_114 = col_115;
      };
      tmpvar_113 = tmpvar_114;
    };
    tmpvar_61.xyz = (tmpvar_61.xyz + (tmpvar_113 * matrixbedtint));
    lowp vec2 tmpvar_117;
    tmpvar_117.y = 0.5;
    tmpvar_117.x = tmpvar_109.y;
    lowp vec4 tmpvar_118;
    tmpvar_118 = texture2D (matrixbed, tmpvar_117);
    lowp float tmpvar_119;
    tmpvar_119 = (tmpvar_118.w * 255.0);
    lowp vec3 tmpvar_120;
    if (((tmpvar_118.x != tmpvar_118.w) || (tmpvar_118.y != tmpvar_118.w))) {
      tmpvar_120 = tmpvar_118.xyz;
    } else {
      lowp vec3 tmpvar_121;
      if ((tmpvar_118.w == 0.0)) {
        tmpvar_121 = vec3(0.0, 0.0, 0.0);
      } else {
        vec3 col_122;
        lowp float tmpvar_123;
        tmpvar_123 = (float(mod (tmpvar_119, 7.0)));
        if ((tmpvar_123 < 0.0)) {
          col_122 = vec3(9.5, 0.5, 0.5);
        } else {
          if ((tmpvar_123 < 0.5)) {
            col_122 = vec3(0.5, 0.5, 0.5);
          } else {
            if ((tmpvar_123 < 1.5)) {
              col_122 = vec3(1.0, 0.0, 0.0);
            } else {
              if ((tmpvar_123 < 2.5)) {
                col_122 = vec3(0.0, 1.0, 0.0);
              } else {
                if ((tmpvar_123 < 3.5)) {
                  col_122 = vec3(0.0, 0.0, 1.0);
                } else {
                  if ((tmpvar_123 < 4.5)) {
                    col_122 = vec3(0.0, 1.0, 1.0);
                  } else {
                    if ((tmpvar_123 < 5.5)) {
                      col_122 = vec3(1.0, 0.0, 1.0);
                    } else {
                      if ((tmpvar_123 < 6.5)) {
                        col_122 = vec3(1.0, 1.0, 0.0);
                      } else {
                        col_122 = vec3(1.0, 1.0, 1.0);
                      };
                    };
                  };
                };
              };
            };
          };
        };
        tmpvar_121 = col_122;
      };
      tmpvar_120 = tmpvar_121;
    };
    tmpvar_61.xyz = (tmpvar_61.xyz + (tmpvar_120 * matrixbedtint));
  };
  if (!(((
    ((minActive <= p_63.x) && (p_63.x <= maxActive))
   && 
    ((minActive <= p_63.y) && (p_63.y <= maxActive))
  ) && (
    (p_63.y - p_63.x)
   < maxBackboneDist)))) {
    tmpvar_61.xyz = (tmpvar_61.xyz * 0.5);
    tmpvar_62.z = (tmpvar_62.z * 0.5);
  };
  i_60 = 0;
  while (true) {
    if ((i_60 >= 32)) {
      break;
    };
    if (!(((
      ((((
        (i_60 == 0)
       || 
        (i_60 == 4)
      ) || (i_60 == 5)) || (i_60 == 8)) || (i_60 == 12))
     || 
      (i_60 == 13)
    ) || (i_60 >= 16)))) {
      i_60++;
      continue;
    };
    lowp float tmpvar_124;
    if ((i_60 == 16)) {
      tmpvar_124 = userPicks[0];
    } else {
      if ((i_60 == 17)) {
        tmpvar_124 = userPicks[1];
      } else {
        if ((i_60 == 18)) {
          tmpvar_124 = userPicks[2];
        } else {
          if ((i_60 == 19)) {
            tmpvar_124 = userPicks[3];
          } else {
            if ((i_60 == 20)) {
              tmpvar_124 = userPicks[4];
            } else {
              if ((i_60 == 21)) {
                tmpvar_124 = userPicks[5];
              } else {
                if ((i_60 == 22)) {
                  tmpvar_124 = userPicks[6];
                } else {
                  if ((i_60 == 23)) {
                    tmpvar_124 = userPicks[7];
                  } else {
                    if ((i_60 == 24)) {
                      tmpvar_124 = userPicks[8];
                    } else {
                      if ((i_60 == 25)) {
                        tmpvar_124 = userPicks[9];
                      } else {
                        if ((i_60 == 26)) {
                          tmpvar_124 = userPicks[10];
                        } else {
                          if ((i_60 == 27)) {
                            tmpvar_124 = userPicks[11];
                          } else {
                            if ((i_60 == 28)) {
                              tmpvar_124 = userPicks[12];
                            } else {
                              if ((i_60 == 29)) {
                                tmpvar_124 = userPicks[13];
                              } else {
                                if ((i_60 == 30)) {
                                  tmpvar_124 = userPicks[14];
                                } else {
                                  if ((i_60 == 31)) {
                                    tmpvar_124 = userPicks[15];
                                  } else {
                                    float tmpvar_125;
                                    tmpvar_125 = (float(i_60) / 4.0);
                                    float tmpvar_126;
                                    tmpvar_126 = floor(tmpvar_125);
                                    vec2 tmpvar_127;
                                    tmpvar_127.y = 0.5;
                                    tmpvar_127.x = (tmpvar_126 / 4.0);
                                    lowp vec4 tmpvar_128;
                                    tmpvar_128 = texture2D (pickrt, tmpvar_127);
                                    highp int tmpvar_129;
                                    tmpvar_129 = int(floor((
                                      (tmpvar_125 - tmpvar_126)
                                     * 4.0)));
                                    lowp float tmpvar_130;
                                    if ((tmpvar_129 == 0)) {
                                      tmpvar_130 = tmpvar_128.x;
                                    } else {
                                      lowp float tmpvar_131;
                                      if ((tmpvar_129 == 1)) {
                                        tmpvar_131 = tmpvar_128.y;
                                      } else {
                                        lowp float tmpvar_132;
                                        if ((tmpvar_129 == 2)) {
                                          tmpvar_132 = tmpvar_128.z;
                                        } else {
                                          lowp float tmpvar_133;
                                          if ((tmpvar_129 == 3)) {
                                            tmpvar_133 = tmpvar_128.w;
                                          } else {
                                            tmpvar_133 = 999.0;
                                          };
                                          tmpvar_132 = tmpvar_133;
                                        };
                                        tmpvar_131 = tmpvar_132;
                                      };
                                      tmpvar_130 = tmpvar_131;
                                    };
                                    tmpvar_124 = tmpvar_130;
                                  };
                                };
                              };
                            };
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
    highp vec2 P_134;
    P_134 = (gl_FragCoord.xy * screen);
    lowp float tmpvar_135;
    tmpvar_135 = abs((texture2D (rtopos, P_134).x - tmpvar_124));
    bool tmpvar_136;
    if ((tmpvar_135 < 0.001)) {
      tmpvar_136 = bool(1);
    } else {
      highp vec2 P_137;
      P_137 = (gl_FragCoord.xy * screen);
      tmpvar_136 = (abs((texture2D (rtopos, P_137).y - tmpvar_124)) < 0.001);
    };
    if (tmpvar_136) {
      vec3 tmpvar_138;
      if ((i_60 < 8)) {
        tmpvar_138 = vec3(1.0, 0.0, 0.0);
      } else {
        if ((i_60 < 16)) {
          tmpvar_138 = vec3(0.0, 1.0, 0.0);
        } else {
          if ((i_60 == 16)) {
            tmpvar_138 = vec3(0.0, 1.0, 1.0);
          } else {
            if ((i_60 == 17)) {
              tmpvar_138 = vec3(1.0, 0.0, 1.0);
            } else {
              if ((i_60 == 18)) {
                tmpvar_138 = vec3(1.0, 1.0, 0.0);
              } else {
                if ((i_60 == 19)) {
                  tmpvar_138 = vec3(1.0, 1.0, 1.0);
                } else {
                  if ((i_60 == 20)) {
                    tmpvar_138 = vec3(0.5, 1.0, 1.0);
                  } else {
                    if ((i_60 == 21)) {
                      tmpvar_138 = vec3(1.0, 0.5, 1.0);
                    } else {
                      if ((i_60 == 22)) {
                        tmpvar_138 = vec3(1.0, 1.0, 0.5);
                      } else {
                        if ((i_60 == 23)) {
                          tmpvar_138 = vec3(1.0, 1.0, 1.0);
                        } else {
                          tmpvar_138 = vec3(1.0, 1.0, 1.0);
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
      tmpvar_61.xyz = (tmpvar_61.xyz + tmpvar_138);
      vec4 tmpvar_139;
      tmpvar_139.xy = tmpvar_138.zy;
      tmpvar_139.zw = vec2(-1.0, 0.6666667);
      vec4 tmpvar_140;
      tmpvar_140.xy = tmpvar_138.yz;
      tmpvar_140.zw = vec2(0.0, -0.3333333);
      vec4 tmpvar_141;
      tmpvar_141 = mix (tmpvar_139, tmpvar_140, float((tmpvar_138.y >= tmpvar_138.z)));
      vec4 tmpvar_142;
      tmpvar_142.xyz = tmpvar_141.xyw;
      tmpvar_142.w = tmpvar_138.x;
      vec4 tmpvar_143;
      tmpvar_143.x = tmpvar_138.x;
      tmpvar_143.yzw = tmpvar_141.yzx;
      vec4 tmpvar_144;
      tmpvar_144 = mix (tmpvar_142, tmpvar_143, float((tmpvar_138.x >= tmpvar_141.x)));
      float tmpvar_145;
      tmpvar_145 = (tmpvar_144.x - min (tmpvar_144.w, tmpvar_144.y));
      lowp vec3 tmpvar_146;
      tmpvar_146.x = abs((tmpvar_144.z + (
        (tmpvar_144.w - tmpvar_144.y)
       / 
        ((6.0 * tmpvar_145) + 1e-10)
      )));
      tmpvar_146.y = (tmpvar_145 / (tmpvar_144.x + 1e-10));
      tmpvar_146.z = tmpvar_144.x;
      tmpvar_62.xyz = tmpvar_146;
    };
    i_60++;
  };
  vec3 tmpvar_147;
  bool tmpvar_148;
  lowp vec3 tmpvar_149;
  tmpvar_149 = normalize(tmpvar_57);
  lowp vec3 tmpvar_150;
  tmpvar_150 = normalize(mmnormal_50);
  tmpvar_148 = (light0dirx >= 490.0);
  vec3 tmpvar_151;
  tmpvar_151.x = light0dirx;
  tmpvar_151.y = light0diry;
  tmpvar_151.z = light0dirz;
  vec3 tmpvar_152;
  tmpvar_152 = normalize(tmpvar_151);
  vec3 tmpvar_153;
  tmpvar_153.x = light0x;
  tmpvar_153.y = light0y;
  tmpvar_153.z = light0z;
  vec3 tmpvar_154;
  tmpvar_154.x = light0r;
  tmpvar_154.y = light0g;
  tmpvar_154.z = light0b;
  tmpvar_147 = (vec3(0.6, 0.6, 0.6) * tmpvar_154);
  lowp vec3 tmpvar_155;
  vec3 tmpvar_156;
  tmpvar_156 = tmpvar_147;
  lowp float normdotlight_157;
  lowp float lightfall_158;
  lowp vec3 point2light_159;
  if (tmpvar_148) {
    point2light_159 = normalize(tmpvar_153);
    lightfall_158 = 1.0;
  } else {
    lowp float dist_160;
    lowp vec3 tmpvar_161;
    tmpvar_161 = normalize((tmpvar_153 - tmpvar_38.xyz));
    point2light_159 = tmpvar_161;
    lowp vec3 x_162;
    x_162 = (tmpvar_38.xyz - tmpvar_153);
    dist_160 = (sqrt(dot (x_162, x_162)) / light0HalfDist);
    lightfall_158 = (max (0.0, (
      ((-(dot (tmpvar_161, tmpvar_152)) + light0Spread) - 1.0)
     / light0Spread)) * (1.0/((1.0 + 
      (dist_160 * dist_160)
    ))));
  };
  lowp float tmpvar_163;
  tmpvar_163 = dot (point2light_159, tmpvar_150);
  normdotlight_157 = tmpvar_163;
  if ((tmpvar_163 < 0.0)) {
    normdotlight_157 = -(tmpvar_163);
    point2light_159 = -(point2light_159);
    tmpvar_156 = vec3(0.0, 0.0, 0.0);
  };
  lowp float specular_164;
  lowp float fresnel_165;
  lowp vec3 V_166;
  V_166.xy = tmpvar_149.xy;
  V_166.z = (tmpvar_149.z + 0.0001);
  lowp vec3 tmpvar_167;
  tmpvar_167 = normalize((point2light_159 + V_166));
  lowp float tmpvar_168;
  tmpvar_168 = dot (tmpvar_150, tmpvar_167);
  lowp float tmpvar_169;
  tmpvar_169 = dot (V_166, tmpvar_167);
  lowp float tmpvar_170;
  tmpvar_170 = dot (tmpvar_150, V_166);
  lowp float tmpvar_171;
  tmpvar_171 = (tmpvar_168 * tmpvar_168);
  float tmpvar_172;
  tmpvar_172 = clamp (0.2, 0.05, 0.95);
  float tmpvar_173;
  tmpvar_173 = (tmpvar_172 * tmpvar_172);
  fresnel_165 = (pow (max (0.0, 
    (1.0 - tmpvar_169)
  ), 5.0) * (1.0 - fresnel0));
  fresnel_165 = (fresnel_165 + fresnel0);
  specular_164 = (((fresnel_165 * 
    ((1.0/(((4.0 * tmpvar_173) * (tmpvar_171 * tmpvar_171)))) * exp(((tmpvar_171 - 1.0) / (tmpvar_173 * tmpvar_171))))
  ) * clamp (
    min ((((2.0 * tmpvar_168) * tmpvar_170) / tmpvar_169), (((2.0 * tmpvar_168) * clamp (
      dot (tmpvar_150, point2light_159)
    , 0.0, 1.0)) / tmpvar_169))
  , 0.0, 1.0)) / max (1e-10, tmpvar_170));
  if (!(((0.0 <= specular_164) && (specular_164 <= 1e+20)))) {
    specular_164 = 0.0;
  };
  tmpvar_155 = (((
    (normdotlight_157 * tmpvar_61.xyz)
   * 
    (tmpvar_156 * lightfall_158)
  ) * (1.0 - ambient)) * light0s);
  tmpvar_148 = (light1dirx >= 490.0);
  vec3 tmpvar_174;
  tmpvar_174.x = light1dirx;
  tmpvar_174.y = light1diry;
  tmpvar_174.z = light1dirz;
  vec3 tmpvar_175;
  tmpvar_175 = normalize(tmpvar_174);
  vec3 tmpvar_176;
  tmpvar_176.x = light1x;
  tmpvar_176.y = light1y;
  tmpvar_176.z = light1z;
  vec3 tmpvar_177;
  tmpvar_177.x = light1r;
  tmpvar_177.y = light1g;
  tmpvar_177.z = light1b;
  tmpvar_147 = (vec3(0.6, 0.6, 0.6) * tmpvar_177);
  lowp vec3 tmpvar_178;
  vec3 tmpvar_179;
  tmpvar_179 = tmpvar_147;
  lowp float normdotlight_180;
  lowp float lightfall_181;
  lowp vec3 point2light_182;
  if (tmpvar_148) {
    point2light_182 = normalize(tmpvar_176);
    lightfall_181 = 1.0;
  } else {
    lowp float dist_183;
    lowp vec3 tmpvar_184;
    tmpvar_184 = normalize((tmpvar_176 - tmpvar_38.xyz));
    point2light_182 = tmpvar_184;
    lowp vec3 x_185;
    x_185 = (tmpvar_38.xyz - tmpvar_176);
    dist_183 = (sqrt(dot (x_185, x_185)) / light1HalfDist);
    lightfall_181 = (max (0.0, (
      ((-(dot (tmpvar_184, tmpvar_175)) + light1Spread) - 1.0)
     / light1Spread)) * (1.0/((1.0 + 
      (dist_183 * dist_183)
    ))));
  };
  lowp float tmpvar_186;
  tmpvar_186 = dot (point2light_182, tmpvar_150);
  normdotlight_180 = tmpvar_186;
  if ((tmpvar_186 < 0.0)) {
    normdotlight_180 = -(tmpvar_186);
    point2light_182 = -(point2light_182);
    tmpvar_179 = vec3(0.0, 0.0, 0.0);
  };
  lowp float specular_187;
  lowp float fresnel_188;
  lowp vec3 V_189;
  V_189.xy = tmpvar_149.xy;
  V_189.z = (tmpvar_149.z + 0.0001);
  lowp vec3 tmpvar_190;
  tmpvar_190 = normalize((point2light_182 + V_189));
  lowp float tmpvar_191;
  tmpvar_191 = dot (tmpvar_150, tmpvar_190);
  lowp float tmpvar_192;
  tmpvar_192 = dot (V_189, tmpvar_190);
  lowp float tmpvar_193;
  tmpvar_193 = dot (tmpvar_150, V_189);
  lowp float tmpvar_194;
  tmpvar_194 = (tmpvar_191 * tmpvar_191);
  float tmpvar_195;
  tmpvar_195 = clamp (0.2, 0.05, 0.95);
  float tmpvar_196;
  tmpvar_196 = (tmpvar_195 * tmpvar_195);
  fresnel_188 = (pow (max (0.0, 
    (1.0 - tmpvar_192)
  ), 5.0) * (1.0 - fresnel0));
  fresnel_188 = (fresnel_188 + fresnel0);
  specular_187 = (((fresnel_188 * 
    ((1.0/(((4.0 * tmpvar_196) * (tmpvar_194 * tmpvar_194)))) * exp(((tmpvar_194 - 1.0) / (tmpvar_196 * tmpvar_194))))
  ) * clamp (
    min ((((2.0 * tmpvar_191) * tmpvar_193) / tmpvar_192), (((2.0 * tmpvar_191) * clamp (
      dot (tmpvar_150, point2light_182)
    , 0.0, 1.0)) / tmpvar_192))
  , 0.0, 1.0)) / max (1e-10, tmpvar_193));
  if (!(((0.0 <= specular_187) && (specular_187 <= 1e+20)))) {
    specular_187 = 0.0;
  };
  tmpvar_178 = (((
    (normdotlight_180 * tmpvar_61.xyz)
   * 
    (tmpvar_179 * lightfall_181)
  ) * (1.0 - ambient)) * light1s);
  tmpvar_148 = (light2dirx >= 490.0);
  vec3 tmpvar_197;
  tmpvar_197.x = light2dirx;
  tmpvar_197.y = light2diry;
  tmpvar_197.z = light2dirz;
  vec3 tmpvar_198;
  tmpvar_198 = normalize(tmpvar_197);
  vec3 tmpvar_199;
  tmpvar_199.x = light2x;
  tmpvar_199.y = light2y;
  tmpvar_199.z = light2z;
  vec3 tmpvar_200;
  tmpvar_200.x = light2r;
  tmpvar_200.y = light2g;
  tmpvar_200.z = light2b;
  tmpvar_147 = (vec3(0.6, 0.6, 0.6) * tmpvar_200);
  vec3 tmpvar_201;
  tmpvar_201 = tmpvar_147;
  lowp float normdotlight_202;
  lowp float lightfall_203;
  lowp vec3 point2light_204;
  if (tmpvar_148) {
    point2light_204 = normalize(tmpvar_199);
    lightfall_203 = 1.0;
  } else {
    lowp float dist_205;
    lowp vec3 tmpvar_206;
    tmpvar_206 = normalize((tmpvar_199 - tmpvar_38.xyz));
    point2light_204 = tmpvar_206;
    lowp vec3 x_207;
    x_207 = (tmpvar_38.xyz - tmpvar_199);
    dist_205 = (sqrt(dot (x_207, x_207)) / light2HalfDist);
    lightfall_203 = (max (0.0, (
      ((-(dot (tmpvar_206, tmpvar_198)) + light2Spread) - 1.0)
     / light2Spread)) * (1.0/((1.0 + 
      (dist_205 * dist_205)
    ))));
  };
  lowp float tmpvar_208;
  tmpvar_208 = dot (point2light_204, tmpvar_150);
  normdotlight_202 = tmpvar_208;
  if ((tmpvar_208 < 0.0)) {
    normdotlight_202 = -(tmpvar_208);
    point2light_204 = -(point2light_204);
    tmpvar_201 = vec3(0.0, 0.0, 0.0);
  };
  lowp float specular_209;
  lowp float fresnel_210;
  lowp vec3 V_211;
  V_211.xy = tmpvar_149.xy;
  V_211.z = (tmpvar_149.z + 0.0001);
  lowp vec3 tmpvar_212;
  tmpvar_212 = normalize((point2light_204 + V_211));
  lowp float tmpvar_213;
  tmpvar_213 = dot (tmpvar_150, tmpvar_212);
  lowp float tmpvar_214;
  tmpvar_214 = dot (V_211, tmpvar_212);
  lowp float tmpvar_215;
  tmpvar_215 = dot (tmpvar_150, V_211);
  lowp float tmpvar_216;
  tmpvar_216 = (tmpvar_213 * tmpvar_213);
  float tmpvar_217;
  tmpvar_217 = clamp (0.2, 0.05, 0.95);
  float tmpvar_218;
  tmpvar_218 = (tmpvar_217 * tmpvar_217);
  fresnel_210 = (pow (max (0.0, 
    (1.0 - tmpvar_214)
  ), 5.0) * (1.0 - fresnel0));
  fresnel_210 = (fresnel_210 + fresnel0);
  specular_209 = (((fresnel_210 * 
    ((1.0/(((4.0 * tmpvar_218) * (tmpvar_216 * tmpvar_216)))) * exp(((tmpvar_216 - 1.0) / (tmpvar_218 * tmpvar_216))))
  ) * clamp (
    min ((((2.0 * tmpvar_213) * tmpvar_215) / tmpvar_214), (((2.0 * tmpvar_213) * clamp (
      dot (tmpvar_150, point2light_204)
    , 0.0, 1.0)) / tmpvar_214))
  , 0.0, 1.0)) / max (1e-10, tmpvar_215));
  if (!(((0.0 <= specular_209) && (specular_209 <= 1e+20)))) {
    specular_209 = 0.0;
  };
  lowp vec4 tmpvar_219;
  tmpvar_219.w = 1.0;
  tmpvar_219.xyz = (((tmpvar_155 + tmpvar_178) + (
    (((normdotlight_202 * tmpvar_61.xyz) * (tmpvar_201 * lightfall_203)) * (1.0 - ambient))
   * light2s)) + (ambient * tmpvar_61.xyz));
  col_49.xyz = tmpvar_219.xyz;
  col_49.w = 1.0;
  res_48 = col_49;
  lowp vec2 tmpvar_220;
  tmpvar_220.x = 0.96875;
  tmpvar_220.y = ((colourid + 0.5) / 32.0);
  lowp vec4 tmpvar_221;
  tmpvar_221 = texture2D (colbuff, tmpvar_220);
  if ((tmpvar_221.z != 0.0)) {
    lowp vec2 tmpvar_222;
    tmpvar_222.x = 0.96875;
    tmpvar_222.y = ((colourid + 0.5) / 32.0);
    lowp vec4 tmpvar_223;
    tmpvar_223 = texture2D (colbuff, tmpvar_222);
    if ((tmpvar_223.z < 0.0)) {
      res_48.xyz = (tmpvar_219.xyz + clamp ((tmpvar_62.z * 
        mix (vec3(1.0, 1.0, 1.0), clamp ((abs(
          ((fract((tmpvar_62.xxx + vec3(1.0, 0.6666667, 0.3333333))) * 6.0) - vec3(3.0, 3.0, 3.0))
        ) - vec3(1.0, 1.0, 1.0)), 0.0, 1.0), tmpvar_62.y)
      ), 0.0, 1.0));
    } else {
      lowp vec2 tmpvar_224;
      tmpvar_224.x = 0.96875;
      tmpvar_224.y = ((colourid + 0.5) / 32.0);
      lowp vec2 tmpvar_225;
      tmpvar_225.x = 0.21875;
      tmpvar_225.y = ((colourid + 0.5) / 32.0);
      lowp float tmpvar_226;
      tmpvar_226 = (texture2D (colbuff, tmpvar_224).z / texture2D (colbuff, tmpvar_225).w);
      lowp float tmpvar_227;
      tmpvar_227 = (flulow + tmpvar_226);
      lowp vec4 tmpvar_228;
      highp vec2 P_229;
      P_229 = (gl_FragCoord.xy * screen);
      tmpvar_228 = texture2D (rttexture, P_229);
      lowp vec4 tmpvar_230;
      highp vec2 P_231;
      P_231 = ((gl_FragCoord.xy + vec2(0.0, 1.0)) * screen);
      tmpvar_230 = texture2D (rttexture, P_231);
      lowp vec4 tmpvar_232;
      highp vec2 P_233;
      P_233 = ((gl_FragCoord.xy + vec2(1.0, 0.0)) * screen);
      tmpvar_232 = texture2D (rttexture, P_233);
      lowp vec4 tmpvar_234;
      highp vec2 P_235;
      P_235 = ((gl_FragCoord.xy + vec2(1.0, 1.0)) * screen);
      tmpvar_234 = texture2D (rttexture, P_235);
      if (!(((
        (tmpvar_228.w != tmpvar_230.w)
       || 
        (tmpvar_228.w != tmpvar_232.w)
      ) || (tmpvar_228.w != tmpvar_234.w)))) {
        lowp float tmpvar_236;
        tmpvar_236 = min (min (tmpvar_228.x, tmpvar_230.x), min (tmpvar_232.x, tmpvar_234.x));
        lowp float tmpvar_237;
        tmpvar_237 = max (max (tmpvar_228.x, tmpvar_230.x), max (tmpvar_232.x, tmpvar_234.x));
        if (!(((tmpvar_236 > tmpvar_227) || (tmpvar_237 < flulow)))) {
          lowp float tmpvar_238;
          tmpvar_238 = max (tmpvar_236, flulow);
          lowp float tmpvar_239;
          tmpvar_239 = min (tmpvar_237, tmpvar_227);
          lowp float tmpvar_240;
          if ((tmpvar_237 == tmpvar_236)) {
            tmpvar_240 = 1.0;
          } else {
            tmpvar_240 = ((tmpvar_239 - tmpvar_238) / (tmpvar_237 - tmpvar_236));
          };
          res_48.xyz = (res_48.xyz + (clamp (
            (tmpvar_62.z * mix (vec3(1.0, 1.0, 1.0), clamp ((
              abs(((fract(
                (tmpvar_62.xxx + vec3(1.0, 0.6666667, 0.3333333))
              ) * 6.0) - vec3(3.0, 3.0, 3.0)))
             - vec3(1.0, 1.0, 1.0)), 0.0, 1.0), tmpvar_62.y))
          , 0.0, 1.0) * (tmpvar_240 * 
            ((((tmpvar_238 - flulow) / tmpvar_226) + ((tmpvar_239 - flulow) / tmpvar_226)) * 0.5)
          )));
        };
      };
    };
  };
  if ((foghalfdepth != 0.0)) {
    vec3 tmpvar_241;
    tmpvar_241.x = fogr;
    tmpvar_241.y = fogg;
    tmpvar_241.z = fogb;
    res_48.xyz = mix (tmpvar_241, res_48.xyz, pow (0.5, (
      max (0.0, (tmpvar_55 - fogstartdist))
     / foghalfdepth)));
  };
  res_48.xyz = (res_48 + postxcol).xyz;
  res_48.w = opacity;
  lowp vec4 tmpvar_242;
  tmpvar_242.w = 1.0;
  tmpvar_242.xyz = ((xmnormal_5 + 1.0) * 0.5);
  lowp vec4 tmpvar_243;
  tmpvar_243.w = 1.0;
  tmpvar_243.xyz = ((shapepos_6.xyz + 300.0) / 600.0);
  lowp vec4 tmpvar_244;
  tmpvar_244 = (((res_48 * 
    ((1.0 - xxposprop) - xxnormprop)
  ) + (tmpvar_242 * xxnormprop)) + (tmpvar_243 * xxposprop));
  tmpvar_39 = tmpvar_244;
  gl_FragColor = tmpvar_39;
  if ((tmpvar_4 > 1.0)) {
    highp float tmpvar_245;
    tmpvar_245 = ((cutfall - tmpvar_4) / (cutfall - 0.99999));
    gl_FragColor.xyz = (tmpvar_39.xyz * ((tmpvar_245 * tmpvar_245) * (3.0 - 
      (2.0 * tmpvar_245)
    )));
  };
}

