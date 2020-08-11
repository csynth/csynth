precision highp float;
precision highp float;
precision highp sampler2D;
uniform sampler2D t_ribboncol;
uniform float colmix;
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
uniform float capres;
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
  vec2 tmpvar_1;
  tmpvar_1.x = cutx;
  tmpvar_1.y = cuty;
  highp vec2 tmpvar_2;
  tmpvar_2 = (((gl_FragCoord.xy * screen) - 0.5) * tmpvar_1);
  highp float tmpvar_3;
  tmpvar_3 = ((tmpvar_2.x * tmpvar_2.x) + (tmpvar_2.y * tmpvar_2.y));
  if ((tmpvar_3 > cutfall)) {
    discard;
  };
  colourid = xhornid;
  lowp vec3 xmnormal_4;
  lowp vec4 shapepos_5;
  lowp vec4 tmpvar_6;
  highp vec2 P_7;
  P_7 = (gl_FragCoord.xy * screen);
  tmpvar_6 = texture2D (rtshapepos, P_7);
  if ((tmpvar_6.w == 0.0)) {
    discard;
  };
  lowp float tmpvar_8;
  tmpvar_8 = floor((tmpvar_6.w / 16384.0));
  if ((latenormals != 0.0)) {
    lowp vec3 uBb_9;
    lowp vec3 uBa_10;
    lowp vec3 uAb_11;
    lowp vec3 uAa_12;
    shapepos_5 = tmpvar_6;
    vec2 tmpvar_13;
    tmpvar_13.y = 0.0;
    tmpvar_13.x = latenormals;
    lowp vec4 tmpvar_14;
    highp vec2 P_15;
    P_15 = ((gl_FragCoord.xy + tmpvar_13) * screen);
    tmpvar_14 = texture2D (rtshapepos, P_15);
    vec2 tmpvar_16;
    tmpvar_16.y = 0.0;
    float tmpvar_17;
    tmpvar_17 = -(latenormals);
    tmpvar_16.x = tmpvar_17;
    lowp vec4 tmpvar_18;
    highp vec2 P_19;
    P_19 = ((gl_FragCoord.xy + tmpvar_16) * screen);
    tmpvar_18 = texture2D (rtshapepos, P_19);
    vec2 tmpvar_20;
    tmpvar_20.x = 0.0;
    tmpvar_20.y = tmpvar_17;
    lowp vec4 tmpvar_21;
    highp vec2 P_22;
    P_22 = ((gl_FragCoord.xy + tmpvar_20) * screen);
    tmpvar_21 = texture2D (rtshapepos, P_22);
    vec2 tmpvar_23;
    tmpvar_23.x = 0.0;
    tmpvar_23.y = latenormals;
    lowp vec4 tmpvar_24;
    highp vec2 P_25;
    P_25 = ((gl_FragCoord.xy + tmpvar_23) * screen);
    tmpvar_24 = texture2D (rtshapepos, P_25);
    if ((tmpvar_14.w == tmpvar_6.w)) {
      uAa_12 = tmpvar_14.xyz;
      uAb_11 = tmpvar_6.xyz;
    } else {
      if ((tmpvar_18.w == tmpvar_6.w)) {
        uAa_12 = tmpvar_6.xyz;
        uAb_11 = tmpvar_18.xyz;
      } else {
        lowp vec3 tmpvar_26;
        if ((floor((tmpvar_6.w / 16384.0)) == floor((tmpvar_14.w / 16384.0)))) {
          tmpvar_26 = tmpvar_14.xyz;
        } else {
          tmpvar_26 = tmpvar_6.xyz;
        };
        uAa_12 = tmpvar_26;
        lowp vec3 tmpvar_27;
        if ((floor((tmpvar_6.w / 16384.0)) == floor((tmpvar_18.w / 16384.0)))) {
          tmpvar_27 = tmpvar_18.xyz;
        } else {
          tmpvar_27 = tmpvar_6.xyz;
        };
        uAb_11 = tmpvar_27;
      };
    };
    if ((tmpvar_21.w == tmpvar_6.w)) {
      uBa_10 = tmpvar_21.xyz;
      uBb_9 = tmpvar_6.xyz;
    } else {
      if ((tmpvar_18.w == tmpvar_6.w)) {
        uBa_10 = tmpvar_6.xyz;
        uBb_9 = tmpvar_24.xyz;
      } else {
        lowp vec3 tmpvar_28;
        if ((floor((tmpvar_6.w / 16384.0)) == floor((tmpvar_21.w / 16384.0)))) {
          tmpvar_28 = tmpvar_21.xyz;
        } else {
          tmpvar_28 = tmpvar_6.xyz;
        };
        uBa_10 = tmpvar_28;
        lowp vec3 tmpvar_29;
        if ((floor((tmpvar_6.w / 16384.0)) == floor((tmpvar_24.w / 16384.0)))) {
          tmpvar_29 = tmpvar_24.xyz;
        } else {
          tmpvar_29 = tmpvar_6.xyz;
        };
        uBb_9 = tmpvar_29;
      };
    };
    lowp vec3 tmpvar_30;
    lowp vec3 a_31;
    a_31 = (uBa_10 - uBb_9);
    lowp vec3 b_32;
    b_32 = (uAa_12 - uAb_11);
    tmpvar_30 = ((a_31.yzx * b_32.zxy) - (a_31.zxy * b_32.yzx));
    lowp float tmpvar_33;
    tmpvar_33 = sqrt(dot (tmpvar_30, tmpvar_30));
    if ((tmpvar_33 < 1e-9)) {
      vec4 tmpvar_34;
      tmpvar_34.yzw = vec3(0.0, 0.0, 0.0);
      tmpvar_34.x = latenormalsred;
      postxcol = tmpvar_34;
      xmnormal_4 = vec3(0.0, 0.0, 1.09);
    } else {
      lowp vec3 tmpvar_35;
      tmpvar_35 = normalize(tmpvar_30);
      xmnormal_4.xz = tmpvar_35.xz;
      xmnormal_4.y = (tmpvar_35.y + 1e-15);
    };
  } else {
    shapepos_5 = (floor(tmpvar_6) / multifact);
    xmnormal_4 = ((fract(tmpvar_6) / multiquatfact) - 1.0).xyz;
  };
  shapepos_5.w = 1.0;
  colourid = tmpvar_8;
  xhornid = tmpvar_8;
  mat4 tmpvar_36;
  if ((tmpvar_8 == 2.0)) {
    tmpvar_36 = mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
  } else {
    tmpvar_36 = rot4;
  };
  lowp vec4 tmpvar_37;
  tmpvar_37 = (shapepos_5 * tmpvar_36);
  mediump vec4 tmpvar_38;
  colourid = tmpvar_8;
  lowp vec2 tmpvar_39;
  tmpvar_39.x = 0.34375;
  tmpvar_39.y = ((tmpvar_8 + 0.5) / 32.0);
  lowp vec4 tmpvar_40;
  tmpvar_40 = texture2D (colbuff, tmpvar_39);
  bool tmpvar_41;
  if ((tmpvar_40.w != 0.0)) {
    tmpvar_41 = bool(1);
  } else {
    lowp vec2 tmpvar_42;
    tmpvar_42.x = 0.40625;
    tmpvar_42.y = ((tmpvar_8 + 0.5) / 32.0);
    tmpvar_41 = (texture2D (colbuff, tmpvar_42).x != 0.0);
  };
  bool tmpvar_43;
  if (tmpvar_41) {
    tmpvar_43 = bool(1);
  } else {
    lowp vec2 tmpvar_44;
    tmpvar_44.x = 0.40625;
    tmpvar_44.y = ((tmpvar_8 + 0.5) / 32.0);
    tmpvar_43 = (texture2D (colbuff, tmpvar_44).y != 0.0);
  };
  if ((tmpvar_43 || (colribs != 0.0))) {
    lowp vec4 tmpvar_45;
    highp vec2 P_46;
    P_46 = (gl_FragCoord.xy * screen);
    tmpvar_45 = texture2D (rtopos, P_46);
    if ((tmpvar_8 != 2.0)) {
      colourid = (tmpvar_8 + (colribs * tmpvar_45.z));
    };
    colourid = (float(mod (colourid, 32.0)));
  };
  lowp vec4 res_47;
  lowp vec4 col_48;
  lowp vec3 mmnormal_49;
  lowp vec3 tmpvar_50;
  tmpvar_50 = normalize(xmnormal_4);
  if (!(((ymin <= tmpvar_37.y) && (tmpvar_37.y <= ymax)))) {
    discard;
  };
  mat4 tmpvar_51;
  if ((colourid == 2.0)) {
    tmpvar_51 = mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
  } else {
    tmpvar_51 = rot4;
  };
  mat3 tmpvar_52;
  tmpvar_52[0] = tmpvar_51[0].xyz;
  tmpvar_52[1] = tmpvar_51[1].xyz;
  tmpvar_52[2] = tmpvar_51[2].xyz;
  lowp vec3 tmpvar_53;
  tmpvar_53 = (-(tmpvar_50) * tmpvar_52);
  lowp float tmpvar_54;
  lowp vec3 x_55;
  x_55 = (cameraPositionModel - tmpvar_37.xyz);
  tmpvar_54 = sqrt(dot (x_55, x_55));
  lowp vec3 tmpvar_56;
  tmpvar_56 = normalize((cameraPositionModel - tmpvar_37.xyz));
  mmnormal_49 = -(tmpvar_53);
  if ((xmnormal_4.z == 1.09)) {
    mmnormal_49 = -(tmpvar_56);
  } else {
    lowp float tmpvar_57;
    tmpvar_57 = dot (tmpvar_56, mmnormal_49);
    if ((tmpvar_57 < 0.0)) {
      if ((badnormals == 0.0)) {
        postxcol = vec4(1.0, 1.0, 0.0, 1.0);
      } else {
        if ((badnormals != 1.0)) {
          if ((badnormals == 2.0)) {
            mmnormal_49 = (mmnormal_49 - (tmpvar_57 * tmpvar_56));
          } else {
            if ((badnormals < 0.0)) {
              mmnormal_49 = (mmnormal_49 - ((
                -(badnormals)
               * tmpvar_57) * tmpvar_56));
            } else {
              if ((badnormals == 3.0)) {
                mmnormal_49 = tmpvar_53;
              } else {
                if ((badnormals == 4.0)) {
                  if ((tmpvar_57 < -0.2)) {
                    mmnormal_49 = tmpvar_53;
                  } else {
                    mmnormal_49 = (mmnormal_49 - (tmpvar_57 * tmpvar_56));
                  };
                };
              };
            };
          };
        };
      };
    };
  };
  highp int i_58;
  lowp float op_59;
  lowp vec3 col_60;
  highp vec2 P_61;
  P_61 = (gl_FragCoord.xy * screen);
  lowp float tmpvar_62;
  tmpvar_62 = texture2D (rtopos, P_61).x;
  lowp vec3 tmpvar_63;
  tmpvar_63 = clamp (clamp ((
    abs(((fract(
      (vec3(tmpvar_62) + vec3(1.0, 0.6666667, 0.3333333))
    ) * 6.0) - vec3(3.0, 3.0, 3.0)))
   - vec3(1.0, 1.0, 1.0)), 0.0, 1.0), 0.0, 1.0);
  lowp vec2 tmpvar_64;
  tmpvar_64.y = 0.5;
  tmpvar_64.x = tmpvar_62;
  lowp vec4 tmpvar_65;
  tmpvar_65 = texture2D (t_ribboncol, tmpvar_64);
  lowp float tmpvar_66;
  tmpvar_66 = (tmpvar_65.w * 255.0);
  lowp vec3 tmpvar_67;
  if (((tmpvar_65.x != tmpvar_65.w) || (tmpvar_65.y != tmpvar_65.w))) {
    tmpvar_67 = tmpvar_65.xyz;
  } else {
    vec3 col_68;
    lowp float tmpvar_69;
    tmpvar_69 = (float(mod (tmpvar_66, 7.0)));
    if ((tmpvar_69 < 0.0)) {
      col_68 = vec3(9.5, 0.5, 0.5);
    } else {
      if ((tmpvar_69 < 0.5)) {
        col_68 = vec3(0.5, 0.5, 0.5);
      } else {
        if ((tmpvar_69 < 1.5)) {
          col_68 = vec3(1.0, 0.0, 0.0);
        } else {
          if ((tmpvar_69 < 2.5)) {
            col_68 = vec3(0.0, 1.0, 0.0);
          } else {
            if ((tmpvar_69 < 3.5)) {
              col_68 = vec3(0.0, 0.0, 1.0);
            } else {
              if ((tmpvar_69 < 4.5)) {
                col_68 = vec3(0.0, 1.0, 1.0);
              } else {
                if ((tmpvar_69 < 5.5)) {
                  col_68 = vec3(1.0, 0.0, 1.0);
                } else {
                  if ((tmpvar_69 < 6.5)) {
                    col_68 = vec3(1.0, 1.0, 0.0);
                  } else {
                    col_68 = vec3(1.0, 1.0, 1.0);
                  };
                };
              };
            };
          };
        };
      };
    };
    tmpvar_67 = col_68;
  };
  col_60 = mix (tmpvar_67, tmpvar_63, colmix);
  highp vec2 P_70;
  P_70 = (gl_FragCoord.xy * screen);
  op_59 = ((texture2D (rtopos, P_70).x - (capres * 0.5)) / (1.0 - capres));
  i_58 = 0;
  while (true) {
    if ((i_58 >= 16)) {
      break;
    };
    if (!(((
      ((((i_58 == 0) || (i_58 == 4)) || (i_58 == 5)) || (i_58 == 8))
     || 
      (i_58 == 12)
    ) || (i_58 == 13)))) {
      i_58++;
      continue;
    };
    lowp float tmpvar_71;
    if ((i_58 == 16)) {
      tmpvar_71 = userPicks[0];
    } else {
      if ((i_58 == 17)) {
        tmpvar_71 = userPicks[1];
      } else {
        if ((i_58 == 18)) {
          tmpvar_71 = userPicks[2];
        } else {
          if ((i_58 == 19)) {
            tmpvar_71 = userPicks[3];
          } else {
            if ((i_58 == 20)) {
              tmpvar_71 = userPicks[4];
            } else {
              if ((i_58 == 21)) {
                tmpvar_71 = userPicks[5];
              } else {
                if ((i_58 == 22)) {
                  tmpvar_71 = userPicks[6];
                } else {
                  if ((i_58 == 23)) {
                    tmpvar_71 = userPicks[7];
                  } else {
                    if ((i_58 == 24)) {
                      tmpvar_71 = userPicks[8];
                    } else {
                      if ((i_58 == 25)) {
                        tmpvar_71 = userPicks[9];
                      } else {
                        if ((i_58 == 26)) {
                          tmpvar_71 = userPicks[10];
                        } else {
                          if ((i_58 == 27)) {
                            tmpvar_71 = userPicks[11];
                          } else {
                            if ((i_58 == 28)) {
                              tmpvar_71 = userPicks[12];
                            } else {
                              if ((i_58 == 29)) {
                                tmpvar_71 = userPicks[13];
                              } else {
                                if ((i_58 == 30)) {
                                  tmpvar_71 = userPicks[14];
                                } else {
                                  if ((i_58 == 31)) {
                                    tmpvar_71 = userPicks[15];
                                  } else {
                                    float tmpvar_72;
                                    tmpvar_72 = (float(i_58) / 4.0);
                                    float tmpvar_73;
                                    tmpvar_73 = floor(tmpvar_72);
                                    vec2 tmpvar_74;
                                    tmpvar_74.y = 0.5;
                                    tmpvar_74.x = (tmpvar_73 / 4.0);
                                    lowp vec4 tmpvar_75;
                                    tmpvar_75 = texture2D (pickrt, tmpvar_74);
                                    highp int tmpvar_76;
                                    tmpvar_76 = int(floor((
                                      (tmpvar_72 - tmpvar_73)
                                     * 4.0)));
                                    lowp float tmpvar_77;
                                    if ((tmpvar_76 == 0)) {
                                      tmpvar_77 = tmpvar_75.x;
                                    } else {
                                      lowp float tmpvar_78;
                                      if ((tmpvar_76 == 1)) {
                                        tmpvar_78 = tmpvar_75.y;
                                      } else {
                                        lowp float tmpvar_79;
                                        if ((tmpvar_76 == 2)) {
                                          tmpvar_79 = tmpvar_75.z;
                                        } else {
                                          lowp float tmpvar_80;
                                          if ((tmpvar_76 == 3)) {
                                            tmpvar_80 = tmpvar_75.w;
                                          } else {
                                            tmpvar_80 = 999.0;
                                          };
                                          tmpvar_79 = tmpvar_80;
                                        };
                                        tmpvar_78 = tmpvar_79;
                                      };
                                      tmpvar_77 = tmpvar_78;
                                    };
                                    tmpvar_71 = tmpvar_77;
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
    lowp float tmpvar_81;
    tmpvar_81 = (10.0 * (1.0 - clamp (
      (abs((op_59 - tmpvar_71)) * 400.0)
    , 0.0, 1.0)));
    lowp float tmpvar_82;
    tmpvar_82 = abs((op_59 - tmpvar_71));
    lowp float tmpvar_83;
    if (((tmpvar_82 * 14000.0) < 1.0)) {
      tmpvar_83 = 0.0;
    } else {
      tmpvar_83 = tmpvar_81;
    };
    lowp vec3 tmpvar_84;
    tmpvar_84.x = tmpvar_81;
    tmpvar_84.y = tmpvar_83;
    tmpvar_84.z = tmpvar_83;
    vec3 tmpvar_85;
    if ((i_58 < 8)) {
      tmpvar_85 = vec3(1.0, 0.0, 0.0);
    } else {
      if ((i_58 < 16)) {
        tmpvar_85 = vec3(0.0, 1.0, 0.0);
      } else {
        if ((i_58 == 16)) {
          tmpvar_85 = vec3(0.0, 1.0, 1.0);
        } else {
          if ((i_58 == 17)) {
            tmpvar_85 = vec3(1.0, 0.0, 1.0);
          } else {
            if ((i_58 == 18)) {
              tmpvar_85 = vec3(1.0, 1.0, 0.0);
            } else {
              if ((i_58 == 19)) {
                tmpvar_85 = vec3(1.0, 1.0, 1.0);
              } else {
                if ((i_58 == 20)) {
                  tmpvar_85 = vec3(0.5, 1.0, 1.0);
                } else {
                  if ((i_58 == 21)) {
                    tmpvar_85 = vec3(1.0, 0.5, 1.0);
                  } else {
                    if ((i_58 == 22)) {
                      tmpvar_85 = vec3(1.0, 1.0, 0.5);
                    } else {
                      if ((i_58 == 23)) {
                        tmpvar_85 = vec3(1.0, 1.0, 1.0);
                      } else {
                        tmpvar_85 = vec3(1.0, 1.0, 1.0);
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
    col_60 = (col_60 + ((tmpvar_84 * tmpvar_85) * 0.1));
    i_58++;
  };
  vec3 tmpvar_86;
  bool tmpvar_87;
  lowp vec3 tmpvar_88;
  tmpvar_88 = normalize(tmpvar_56);
  lowp vec3 tmpvar_89;
  tmpvar_89 = normalize(mmnormal_49);
  tmpvar_87 = (light0dirx >= 490.0);
  vec3 tmpvar_90;
  tmpvar_90.x = light0dirx;
  tmpvar_90.y = light0diry;
  tmpvar_90.z = light0dirz;
  vec3 tmpvar_91;
  tmpvar_91 = normalize(tmpvar_90);
  vec3 tmpvar_92;
  tmpvar_92.x = light0x;
  tmpvar_92.y = light0y;
  tmpvar_92.z = light0z;
  vec3 tmpvar_93;
  tmpvar_93.x = light0r;
  tmpvar_93.y = light0g;
  tmpvar_93.z = light0b;
  tmpvar_86 = (vec3(0.6, 0.6, 0.6) * tmpvar_93);
  lowp vec3 tmpvar_94;
  vec3 tmpvar_95;
  tmpvar_95 = tmpvar_86;
  lowp float normdotlight_96;
  lowp float lightfall_97;
  lowp vec3 point2light_98;
  if (tmpvar_87) {
    point2light_98 = normalize(tmpvar_92);
    lightfall_97 = 1.0;
  } else {
    lowp float dist_99;
    lowp vec3 tmpvar_100;
    tmpvar_100 = normalize((tmpvar_92 - tmpvar_37.xyz));
    point2light_98 = tmpvar_100;
    lowp vec3 x_101;
    x_101 = (tmpvar_37.xyz - tmpvar_92);
    dist_99 = (sqrt(dot (x_101, x_101)) / light0HalfDist);
    lightfall_97 = (max (0.0, (
      ((-(dot (tmpvar_100, tmpvar_91)) + light0Spread) - 1.0)
     / light0Spread)) * (1.0/((1.0 + 
      (dist_99 * dist_99)
    ))));
  };
  lowp float tmpvar_102;
  tmpvar_102 = dot (point2light_98, tmpvar_89);
  normdotlight_96 = tmpvar_102;
  if ((tmpvar_102 < 0.0)) {
    normdotlight_96 = -(tmpvar_102);
    point2light_98 = -(point2light_98);
    tmpvar_95 = vec3(0.0, 0.0, 0.0);
  };
  lowp float specular_103;
  lowp float fresnel_104;
  lowp vec3 V_105;
  V_105.xy = tmpvar_88.xy;
  V_105.z = (tmpvar_88.z + 0.0001);
  lowp vec3 tmpvar_106;
  tmpvar_106 = normalize((point2light_98 + V_105));
  lowp float tmpvar_107;
  tmpvar_107 = dot (tmpvar_89, tmpvar_106);
  lowp float tmpvar_108;
  tmpvar_108 = dot (V_105, tmpvar_106);
  lowp float tmpvar_109;
  tmpvar_109 = dot (tmpvar_89, V_105);
  lowp float tmpvar_110;
  tmpvar_110 = (tmpvar_107 * tmpvar_107);
  float tmpvar_111;
  tmpvar_111 = clamp (0.2, 0.05, 0.95);
  float tmpvar_112;
  tmpvar_112 = (tmpvar_111 * tmpvar_111);
  fresnel_104 = (pow (max (0.0, 
    (1.0 - tmpvar_108)
  ), 5.0) * (1.0 - fresnel0));
  fresnel_104 = (fresnel_104 + fresnel0);
  specular_103 = (((fresnel_104 * 
    ((1.0/(((4.0 * tmpvar_112) * (tmpvar_110 * tmpvar_110)))) * exp(((tmpvar_110 - 1.0) / (tmpvar_112 * tmpvar_110))))
  ) * clamp (
    min ((((2.0 * tmpvar_107) * tmpvar_109) / tmpvar_108), (((2.0 * tmpvar_107) * clamp (
      dot (tmpvar_89, point2light_98)
    , 0.0, 1.0)) / tmpvar_108))
  , 0.0, 1.0)) / max (1e-10, tmpvar_109));
  if (!(((0.0 <= specular_103) && (specular_103 <= 1e+20)))) {
    specular_103 = 0.0;
  };
  tmpvar_94 = (((
    ((((0.4 * normdotlight_96) * col_60) + ((specular_103 * 0.3461539) * (0.5 + 
      (col_60 * 0.5)
    ))) * tmpvar_95)
   * lightfall_97) * (1.0 - ambient)) * light0s);
  tmpvar_87 = (light1dirx >= 490.0);
  vec3 tmpvar_113;
  tmpvar_113.x = light1dirx;
  tmpvar_113.y = light1diry;
  tmpvar_113.z = light1dirz;
  vec3 tmpvar_114;
  tmpvar_114 = normalize(tmpvar_113);
  vec3 tmpvar_115;
  tmpvar_115.x = light1x;
  tmpvar_115.y = light1y;
  tmpvar_115.z = light1z;
  vec3 tmpvar_116;
  tmpvar_116.x = light1r;
  tmpvar_116.y = light1g;
  tmpvar_116.z = light1b;
  tmpvar_86 = (vec3(0.6, 0.6, 0.6) * tmpvar_116);
  lowp vec3 tmpvar_117;
  vec3 tmpvar_118;
  tmpvar_118 = tmpvar_86;
  lowp float normdotlight_119;
  lowp float lightfall_120;
  lowp vec3 point2light_121;
  if (tmpvar_87) {
    point2light_121 = normalize(tmpvar_115);
    lightfall_120 = 1.0;
  } else {
    lowp float dist_122;
    lowp vec3 tmpvar_123;
    tmpvar_123 = normalize((tmpvar_115 - tmpvar_37.xyz));
    point2light_121 = tmpvar_123;
    lowp vec3 x_124;
    x_124 = (tmpvar_37.xyz - tmpvar_115);
    dist_122 = (sqrt(dot (x_124, x_124)) / light1HalfDist);
    lightfall_120 = (max (0.0, (
      ((-(dot (tmpvar_123, tmpvar_114)) + light1Spread) - 1.0)
     / light1Spread)) * (1.0/((1.0 + 
      (dist_122 * dist_122)
    ))));
  };
  lowp float tmpvar_125;
  tmpvar_125 = dot (point2light_121, tmpvar_89);
  normdotlight_119 = tmpvar_125;
  if ((tmpvar_125 < 0.0)) {
    normdotlight_119 = -(tmpvar_125);
    point2light_121 = -(point2light_121);
    tmpvar_118 = vec3(0.0, 0.0, 0.0);
  };
  lowp float specular_126;
  lowp float fresnel_127;
  lowp vec3 V_128;
  V_128.xy = tmpvar_88.xy;
  V_128.z = (tmpvar_88.z + 0.0001);
  lowp vec3 tmpvar_129;
  tmpvar_129 = normalize((point2light_121 + V_128));
  lowp float tmpvar_130;
  tmpvar_130 = dot (tmpvar_89, tmpvar_129);
  lowp float tmpvar_131;
  tmpvar_131 = dot (V_128, tmpvar_129);
  lowp float tmpvar_132;
  tmpvar_132 = dot (tmpvar_89, V_128);
  lowp float tmpvar_133;
  tmpvar_133 = (tmpvar_130 * tmpvar_130);
  float tmpvar_134;
  tmpvar_134 = clamp (0.2, 0.05, 0.95);
  float tmpvar_135;
  tmpvar_135 = (tmpvar_134 * tmpvar_134);
  fresnel_127 = (pow (max (0.0, 
    (1.0 - tmpvar_131)
  ), 5.0) * (1.0 - fresnel0));
  fresnel_127 = (fresnel_127 + fresnel0);
  specular_126 = (((fresnel_127 * 
    ((1.0/(((4.0 * tmpvar_135) * (tmpvar_133 * tmpvar_133)))) * exp(((tmpvar_133 - 1.0) / (tmpvar_135 * tmpvar_133))))
  ) * clamp (
    min ((((2.0 * tmpvar_130) * tmpvar_132) / tmpvar_131), (((2.0 * tmpvar_130) * clamp (
      dot (tmpvar_89, point2light_121)
    , 0.0, 1.0)) / tmpvar_131))
  , 0.0, 1.0)) / max (1e-10, tmpvar_132));
  if (!(((0.0 <= specular_126) && (specular_126 <= 1e+20)))) {
    specular_126 = 0.0;
  };
  tmpvar_117 = (((
    ((((0.4 * normdotlight_119) * col_60) + ((specular_126 * 0.3461539) * (0.5 + 
      (col_60 * 0.5)
    ))) * tmpvar_118)
   * lightfall_120) * (1.0 - ambient)) * light1s);
  tmpvar_87 = (light2dirx >= 490.0);
  vec3 tmpvar_136;
  tmpvar_136.x = light2dirx;
  tmpvar_136.y = light2diry;
  tmpvar_136.z = light2dirz;
  vec3 tmpvar_137;
  tmpvar_137 = normalize(tmpvar_136);
  vec3 tmpvar_138;
  tmpvar_138.x = light2x;
  tmpvar_138.y = light2y;
  tmpvar_138.z = light2z;
  vec3 tmpvar_139;
  tmpvar_139.x = light2r;
  tmpvar_139.y = light2g;
  tmpvar_139.z = light2b;
  tmpvar_86 = (vec3(0.6, 0.6, 0.6) * tmpvar_139);
  vec3 tmpvar_140;
  tmpvar_140 = tmpvar_86;
  lowp float normdotlight_141;
  lowp float lightfall_142;
  lowp vec3 point2light_143;
  if (tmpvar_87) {
    point2light_143 = normalize(tmpvar_138);
    lightfall_142 = 1.0;
  } else {
    lowp float dist_144;
    lowp vec3 tmpvar_145;
    tmpvar_145 = normalize((tmpvar_138 - tmpvar_37.xyz));
    point2light_143 = tmpvar_145;
    lowp vec3 x_146;
    x_146 = (tmpvar_37.xyz - tmpvar_138);
    dist_144 = (sqrt(dot (x_146, x_146)) / light2HalfDist);
    lightfall_142 = (max (0.0, (
      ((-(dot (tmpvar_145, tmpvar_137)) + light2Spread) - 1.0)
     / light2Spread)) * (1.0/((1.0 + 
      (dist_144 * dist_144)
    ))));
  };
  lowp float tmpvar_147;
  tmpvar_147 = dot (point2light_143, tmpvar_89);
  normdotlight_141 = tmpvar_147;
  if ((tmpvar_147 < 0.0)) {
    normdotlight_141 = -(tmpvar_147);
    point2light_143 = -(point2light_143);
    tmpvar_140 = vec3(0.0, 0.0, 0.0);
  };
  lowp float specular_148;
  lowp float fresnel_149;
  lowp vec3 V_150;
  V_150.xy = tmpvar_88.xy;
  V_150.z = (tmpvar_88.z + 0.0001);
  lowp vec3 tmpvar_151;
  tmpvar_151 = normalize((point2light_143 + V_150));
  lowp float tmpvar_152;
  tmpvar_152 = dot (tmpvar_89, tmpvar_151);
  lowp float tmpvar_153;
  tmpvar_153 = dot (V_150, tmpvar_151);
  lowp float tmpvar_154;
  tmpvar_154 = dot (tmpvar_89, V_150);
  lowp float tmpvar_155;
  tmpvar_155 = (tmpvar_152 * tmpvar_152);
  float tmpvar_156;
  tmpvar_156 = clamp (0.2, 0.05, 0.95);
  float tmpvar_157;
  tmpvar_157 = (tmpvar_156 * tmpvar_156);
  fresnel_149 = (pow (max (0.0, 
    (1.0 - tmpvar_153)
  ), 5.0) * (1.0 - fresnel0));
  fresnel_149 = (fresnel_149 + fresnel0);
  specular_148 = (((fresnel_149 * 
    ((1.0/(((4.0 * tmpvar_157) * (tmpvar_155 * tmpvar_155)))) * exp(((tmpvar_155 - 1.0) / (tmpvar_157 * tmpvar_155))))
  ) * clamp (
    min ((((2.0 * tmpvar_152) * tmpvar_154) / tmpvar_153), (((2.0 * tmpvar_152) * clamp (
      dot (tmpvar_89, point2light_143)
    , 0.0, 1.0)) / tmpvar_153))
  , 0.0, 1.0)) / max (1e-10, tmpvar_154));
  if (!(((0.0 <= specular_148) && (specular_148 <= 1e+20)))) {
    specular_148 = 0.0;
  };
  lowp vec4 tmpvar_158;
  tmpvar_158.w = 1.0;
  tmpvar_158.xyz = (((tmpvar_94 + tmpvar_117) + (
    ((((
      ((0.4 * normdotlight_141) * col_60)
     + 
      ((specular_148 * 0.3461539) * (0.5 + (col_60 * 0.5)))
    ) * tmpvar_140) * lightfall_142) * (1.0 - ambient))
   * light2s)) + (ambient * col_60));
  col_48.xyz = tmpvar_158.xyz;
  col_48.w = 1.0;
  res_47 = col_48;
  lowp vec2 tmpvar_159;
  tmpvar_159.x = 0.96875;
  tmpvar_159.y = ((colourid + 0.5) / 32.0);
  lowp vec4 tmpvar_160;
  tmpvar_160 = texture2D (colbuff, tmpvar_159);
  if ((tmpvar_160.z != 0.0)) {
    lowp vec2 tmpvar_161;
    tmpvar_161.x = 0.96875;
    tmpvar_161.y = ((colourid + 0.5) / 32.0);
    lowp vec4 tmpvar_162;
    tmpvar_162 = texture2D (colbuff, tmpvar_161);
    if ((tmpvar_162.z < 0.0)) {
      res_47.xyz = (tmpvar_158.xyz + clamp (vec3(0.0, 0.0, 0.0), 0.0, 1.0));
    } else {
      lowp vec2 tmpvar_163;
      tmpvar_163.x = 0.96875;
      tmpvar_163.y = ((colourid + 0.5) / 32.0);
      lowp vec2 tmpvar_164;
      tmpvar_164.x = 0.21875;
      tmpvar_164.y = ((colourid + 0.5) / 32.0);
      lowp float tmpvar_165;
      tmpvar_165 = (texture2D (colbuff, tmpvar_163).z / texture2D (colbuff, tmpvar_164).w);
      lowp float tmpvar_166;
      tmpvar_166 = (flulow + tmpvar_165);
      lowp vec4 tmpvar_167;
      highp vec2 P_168;
      P_168 = (gl_FragCoord.xy * screen);
      tmpvar_167 = texture2D (rttexture, P_168);
      lowp vec4 tmpvar_169;
      highp vec2 P_170;
      P_170 = ((gl_FragCoord.xy + vec2(0.0, 1.0)) * screen);
      tmpvar_169 = texture2D (rttexture, P_170);
      lowp vec4 tmpvar_171;
      highp vec2 P_172;
      P_172 = ((gl_FragCoord.xy + vec2(1.0, 0.0)) * screen);
      tmpvar_171 = texture2D (rttexture, P_172);
      lowp vec4 tmpvar_173;
      highp vec2 P_174;
      P_174 = ((gl_FragCoord.xy + vec2(1.0, 1.0)) * screen);
      tmpvar_173 = texture2D (rttexture, P_174);
      if (!(((
        (tmpvar_167.w != tmpvar_169.w)
       || 
        (tmpvar_167.w != tmpvar_171.w)
      ) || (tmpvar_167.w != tmpvar_173.w)))) {
        lowp float tmpvar_175;
        tmpvar_175 = min (min (tmpvar_167.x, tmpvar_169.x), min (tmpvar_171.x, tmpvar_173.x));
        lowp float tmpvar_176;
        tmpvar_176 = max (max (tmpvar_167.x, tmpvar_169.x), max (tmpvar_171.x, tmpvar_173.x));
        if (!(((tmpvar_175 > tmpvar_166) || (tmpvar_176 < flulow)))) {
          lowp float tmpvar_177;
          tmpvar_177 = max (tmpvar_175, flulow);
          lowp float tmpvar_178;
          tmpvar_178 = min (tmpvar_176, tmpvar_166);
          lowp float tmpvar_179;
          if ((tmpvar_176 == tmpvar_175)) {
            tmpvar_179 = 1.0;
          } else {
            tmpvar_179 = ((tmpvar_178 - tmpvar_177) / (tmpvar_176 - tmpvar_175));
          };
          res_47.xyz = (res_47.xyz + (clamp (vec3(0.0, 0.0, 0.0), 0.0, 1.0) * (tmpvar_179 * 
            ((((tmpvar_177 - flulow) / tmpvar_165) + ((tmpvar_178 - flulow) / tmpvar_165)) * 0.5)
          )));
        };
      };
    };
  };
  if ((foghalfdepth != 0.0)) {
    vec3 tmpvar_180;
    tmpvar_180.x = fogr;
    tmpvar_180.y = fogg;
    tmpvar_180.z = fogb;
    res_47.xyz = mix (tmpvar_180, res_47.xyz, pow (0.5, (
      max (0.0, (tmpvar_54 - fogstartdist))
     / foghalfdepth)));
  };
  res_47.xyz = (res_47 + postxcol).xyz;
  res_47.w = opacity;
  lowp vec4 tmpvar_181;
  tmpvar_181.w = 1.0;
  tmpvar_181.xyz = ((xmnormal_4 + 1.0) * 0.5);
  lowp vec4 tmpvar_182;
  tmpvar_182.w = 1.0;
  tmpvar_182.xyz = ((shapepos_5.xyz + 300.0) / 600.0);
  lowp vec4 tmpvar_183;
  tmpvar_183 = (((res_47 * 
    ((1.0 - xxposprop) - xxnormprop)
  ) + (tmpvar_181 * xxnormprop)) + (tmpvar_182 * xxposprop));
  tmpvar_38 = tmpvar_183;
  gl_FragColor = tmpvar_38;
  if ((tmpvar_3 > 1.0)) {
    highp float tmpvar_184;
    tmpvar_184 = ((cutfall - tmpvar_3) / (cutfall - 0.99999));
    gl_FragColor.xyz = (tmpvar_38.xyz * ((tmpvar_184 * tmpvar_184) * (3.0 - 
      (2.0 * tmpvar_184)
    )));
  };
}

