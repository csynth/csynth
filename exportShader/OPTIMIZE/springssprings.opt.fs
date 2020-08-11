precision highp float;
uniform float roleforces[16];
uniform float time;
uniform float stepsSoFar;
uniform float WORKHISTLEN;
uniform float workhisttime;
uniform sampler2D posWorkhist;
uniform sampler2D topologybuff;
uniform sampler2D contactbuff;
uniform sampler2D distbuff;
uniform float maxv;
uniform float representativeContact;
uniform sampler2D gradField;
uniform vec3 gradnum;
uniform vec2 gradysplit;
uniform vec3 gradlow;
uniform vec3 gradhigh;
uniform mat4 gradtran;
uniform mat4 pullspringmat;
uniform float damp;
uniform float springrate;
uniform float springlen;
uniform float nonBackboneLen;
uniform float backboneStrength;
uniform float backboneScale;
uniform float springforce;
uniform float backboneforce;
uniform float contactforcesc;
uniform float pullspringforce;
uniform float xyzMaxDist;
uniform float xyzforce;
uniform float xyzpow;
uniform float contactthreshold;
uniform float springmaxvel;
uniform float springpow;
uniform float pushapartdelta;
uniform float pushapartforce;
uniform float pushapartpow;
uniform float powBaseDist;
uniform float ignoreBackbone;
uniform float pushapartlocalforce;
uniform float pushapartDensityFactor;
uniform float pushapartDensityPow;
uniform float noiseprob;
uniform float noiseforce;
uniform float gradforce;
uniform float fractforce;
uniform float fractpow;
uniform float boostx;
uniform float boosty;
uniform float boostrad;
uniform float boostfac;
uniform float springCentreDamp;
uniform float gravity;
uniform float regionBoundary;
uniform float nonRegionLen;
uniform float modelSphereForce;
uniform float modelSphereRadius;
uniform float m_alpha;
uniform float m_c;
uniform float m_k;
uniform float m_force;
uniform float maxBackboneDist;
uniform float minActive;
uniform float maxActive;
uniform float patchval;
uniform float patchwidth;
varying float part;
float currt;
void main ()
{
  lowp vec3 mypos_1;
  lowp vec3 vel_2;
  lowp float use_3;
  lowp float dirdensity_4;
  lowp float density_5;
  lowp vec3 velold_6;
  lowp vec3 force_7;
  lowp float olddensity_8;
  lowp vec3 old_9;
  currt = workhisttime;
  vec2 tmpvar_10;
  tmpvar_10.x = workhisttime;
  tmpvar_10.y = part;
  lowp vec4 tmpvar_11;
  tmpvar_11 = texture2D (posWorkhist, tmpvar_10);
  lowp vec3 tmpvar_12;
  tmpvar_12 = tmpvar_11.xyz;
  old_9 = tmpvar_12;
  olddensity_8 = tmpvar_11.w;
  force_7 = vec3(0.0, 0.0, 0.0);
  vec2 tmpvar_13;
  tmpvar_13.x = (workhisttime - (1.0/(WORKHISTLEN)));
  tmpvar_13.y = part;
  velold_6 = ((tmpvar_11.xyz - texture2D (posWorkhist, tmpvar_13).xyz) / springrate);
  lowp vec3 old_14;
  old_14 = tmpvar_12;
  lowp vec3 force_15;
  force_15 = vec3(0.0, 0.0, 0.0);
  for (float i_16 = 0.001953125; i_16 < 0.9882813; i_16 += 0.00390625) {
    vec2 tmpvar_17;
    tmpvar_17.x = i_16;
    tmpvar_17.y = part;
    lowp vec4 tmpvar_18;
    tmpvar_18 = texture2D (topologybuff, tmpvar_17);
    if ((tmpvar_18.x > 0.0)) {
      bool tmpvar_19;
      tmpvar_19 = bool(1);
      lowp vec3 tmpvar_20;
      lowp float sforce_21;
      lowp float lspringforce_22;
      lowp float backbonedist_23;
      float roleforce_24;
      roleforce_24 = 1.0;
      if ((tmpvar_18.x < 16.0)) {
        highp int i_25;
        lowp int type_26;
        type_26 = int(floor(tmpvar_18.x));
        i_25 = 0;
        while (true) {
          if ((i_25 >= 16)) {
            break;
          };
          if ((type_26 == i_25)) {
            roleforce_24 = roleforces[i_25];
            break;
          };
          i_25++;
        };
      };
      lowp float tmpvar_27;
      tmpvar_27 = fract(tmpvar_18.x);
      if ((part <= 0.7120361)) {
        lowp float tmpvar_28;
        tmpvar_28 = abs((part - tmpvar_27));
        backbonedist_23 = tmpvar_28;
        if (((tmpvar_28 > (0.7120361 * maxBackboneDist)) && (tmpvar_27 < 0.7120361))) {
          tmpvar_20 = vec3(0.0, 0.0, 0.0);
          tmpvar_19 = bool(0);
        } else {
          if (((tmpvar_27 > (0.7120361 * maxActive)) && (tmpvar_27 <= 0.7120361))) {
            tmpvar_20 = vec3(0.0, 0.0, 0.0);
            tmpvar_19 = bool(0);
          } else {
            if ((tmpvar_27 < (0.7120361 * minActive))) {
              tmpvar_20 = vec3(0.0, 0.0, 0.0);
              tmpvar_19 = bool(0);
            };
          };
        };
      } else {
        backbonedist_23 = 99999.0;
      };
      if (tmpvar_19) {
        lowp float tmpvar_29;
        tmpvar_29 = (tmpvar_18.y * springlen);
        lowp float tmpvar_30;
        tmpvar_30 = ((tmpvar_18.z * springforce) * roleforce_24);
        lspringforce_22 = tmpvar_30;
        lowp float tmpvar_31;
        tmpvar_31 = (tmpvar_18.w + springpow);
        lowp float b_32;
        b_32 = 1.0;
        if ((boostfac > 0.0)) {
          vec2 tmpvar_33;
          tmpvar_33.x = boostx;
          tmpvar_33.y = boosty;
          lowp vec2 tmpvar_34;
          tmpvar_34.x = part;
          tmpvar_34.y = tmpvar_27;
          lowp vec2 tmpvar_35;
          tmpvar_35.x = part;
          tmpvar_35.y = tmpvar_27;
          lowp vec2 tmpvar_36;
          tmpvar_36.x = tmpvar_27;
          tmpvar_36.y = part;
          lowp vec2 tmpvar_37;
          tmpvar_37.x = tmpvar_27;
          tmpvar_37.y = part;
          lowp float tmpvar_38;
          tmpvar_38 = min (dot ((tmpvar_33 - tmpvar_34), (tmpvar_33 - tmpvar_35)), dot ((tmpvar_33 - tmpvar_36), (tmpvar_33 - tmpvar_37)));
          float tmpvar_39;
          tmpvar_39 = (boostrad * boostrad);
          if ((tmpvar_38 < tmpvar_39)) {
            lowp float tmpvar_40;
            tmpvar_40 = (tmpvar_38 / tmpvar_39);
            b_32 = (1.0 + ((
              ((tmpvar_40 * tmpvar_40) - (2.0 * tmpvar_40))
             + 1.0) * boostfac));
          };
        };
        lspringforce_22 = (tmpvar_30 * b_32);
        lowp vec2 tmpvar_41;
        tmpvar_41.x = currt;
        tmpvar_41.y = tmpvar_27;
        lowp vec3 tmpvar_42;
        tmpvar_42 = (texture2D (posWorkhist, tmpvar_41).xyz - old_14);
        lowp float tmpvar_43;
        tmpvar_43 = sqrt(dot (tmpvar_42, tmpvar_42));
        if ((tmpvar_43 == 0.0)) {
          tmpvar_20 = vec3(0.0, 0.0, 0.0);
          tmpvar_19 = bool(0);
        } else {
          lowp float tmpvar_44;
          tmpvar_44 = (((tmpvar_43 - tmpvar_29) * lspringforce_22) * min (1.0, pow (
            (tmpvar_43 / powBaseDist)
          , tmpvar_31)));
          sforce_21 = tmpvar_44;
          float tmpvar_45;
          if ((backbonedist_23 < 0.0002685547)) {
            tmpvar_45 = backboneStrength;
          } else {
            tmpvar_45 = 1.0;
          };
          sforce_21 = (tmpvar_44 * tmpvar_45);
          tmpvar_20 = (tmpvar_42 * (sforce_21 / tmpvar_43));
          tmpvar_19 = bool(0);
        };
      };
      force_15 = (force_15 + tmpvar_20);
    };
  };
  force_7 = force_15;
  if ((pullspringforce != 0.0)) {
    vec2 tmpvar_46;
    tmpvar_46.x = 0.9980469;
    tmpvar_46.y = part;
    lowp vec4 tmpvar_47;
    tmpvar_47 = texture2D (topologybuff, tmpvar_46);
    if ((tmpvar_47.w != -1.0)) {
      lowp vec4 tmpvar_48;
      tmpvar_48.w = 1.0;
      tmpvar_48.xyz = tmpvar_47.xyz;
      force_7 = (force_15 + ((pullspringforce * tmpvar_47.w) * (
        (pullspringmat * tmpvar_48)
      .xyz - tmpvar_11.xyz)));
    };
  };
  density_5 = 0.0;
  dirdensity_4 = 0.0;
  if ((part <= 0.7120361)) {
    float ii_49;
    ii_49 = 0.0001220703;
    while (true) {
      if ((ii_49 >= 0.7120361)) {
        break;
      };
      if ((ii_49 > (0.7120361 * maxActive))) {
        break;
      };
      if ((ii_49 < (0.7120361 * minActive))) {
        ii_49 += 0.0002441406;
        continue;
      };
      lowp float density_50;
      density_50 = density_5;
      lowp float dirdensity_51;
      dirdensity_51 = dirdensity_4;
      lowp vec3 tmpvar_52;
      float pushapartuse_53;
      lowp float bforce_54;
      lowp float gforce_55;
      lowp float lforce_56;
      float tmpvar_57;
      tmpvar_57 = abs((part - ii_49));
      float tmpvar_58;
      tmpvar_58 = (tmpvar_57 * 4096.0);
      vec2 tmpvar_59;
      tmpvar_59.x = currt;
      tmpvar_59.y = ii_49;
      lowp vec4 tmpvar_60;
      tmpvar_60 = texture2D (posWorkhist, tmpvar_59);
      lowp float v_61;
      v_61 = (tmpvar_60.y + old_9.y);
      if (!(((v_61 <= 0.0) || (v_61 >= 0.0)))) {
        tmpvar_52 = vec3(0.0, 0.0, 0.0);
      } else {
        lowp vec3 tmpvar_62;
        tmpvar_62 = (tmpvar_60.xyz - old_9);
        lowp float tmpvar_63;
        tmpvar_63 = sqrt(dot (tmpvar_62, tmpvar_62));
        if ((tmpvar_63 == 0.0)) {
          tmpvar_52 = vec3(0.0, 0.0, 0.0);
        } else {
          lforce_56 = 0.0;
          gforce_55 = 0.0;
          bforce_54 = 0.0;
          bool tmpvar_64;
          tmpvar_64 = (((part - regionBoundary) * (ii_49 - regionBoundary)) > 0.0);
          density_50 = (density_5 + (1.0/((
            (tmpvar_63 * tmpvar_63)
           * tmpvar_63))));
          dirdensity_51 = (dirdensity_4 + ((
            max (0.0, (dot (tmpvar_62, velold_6) / tmpvar_63))
           / tmpvar_63) / tmpvar_63));
          pushapartuse_53 = ((min (tmpvar_58, nonBackboneLen) * backboneScale) + pushapartdelta);
          if (!(tmpvar_64)) {
            pushapartuse_53 = nonRegionLen;
          };
          lowp float tmpvar_65;
          tmpvar_65 = clamp (((
            (tmpvar_63 / pushapartuse_53)
           - 0.5) / 0.5), 0.0, 1.0);
          lforce_56 = (-(pushapartlocalforce) * (1.0 - (tmpvar_65 * 
            (tmpvar_65 * (3.0 - (2.0 * tmpvar_65)))
          )));
          gforce_55 = -(((
            (pushapartDensityFactor * olddensity_8)
           * tmpvar_60.w) * pow (
            (tmpvar_63 / powBaseDist)
          , pushapartDensityPow)));
          if (((tmpvar_64 && (tmpvar_58 > 1.5)) || (ignoreBackbone != 0.0))) {
            gforce_55 = (gforce_55 + (-(pushapartforce) * pow (
              (tmpvar_63 / powBaseDist)
            , pushapartpow)));
          };
          if ((tmpvar_57 < (0.7120361 * maxBackboneDist))) {
            gforce_55 = (gforce_55 + ((fractforce * 
              pow (tmpvar_58, fractpow)
            ) * tmpvar_63));
          };
          if (((xyzforce != 0.0) && (tmpvar_57 < (0.7120361 * maxBackboneDist)))) {
            vec2 tmpvar_66;
            tmpvar_66.x = part;
            tmpvar_66.y = ii_49;
            lowp vec4 tmpvar_67;
            tmpvar_67 = texture2D (distbuff, (tmpvar_66 / 0.7120361));
            if ((tmpvar_67.x < xyzMaxDist)) {
              gforce_55 = (gforce_55 + ((
                (tmpvar_63 - tmpvar_67.x)
               * xyzforce) / pow (tmpvar_67.x, xyzpow)));
            };
          };
          if (((backboneforce != 0.0) && (tmpvar_58 <= 1.5))) {
            bforce_54 = ((tmpvar_63 - backboneScale) * backboneforce);
          };
          if (((contactforcesc != 0.0) && (tmpvar_57 < (0.7120361 * maxBackboneDist)))) {
            lowp float contact_68;
            vec2 tmpvar_69;
            tmpvar_69.x = part;
            tmpvar_69.y = ii_49;
            lowp vec4 tmpvar_70;
            tmpvar_70 = texture2D (contactbuff, (tmpvar_69 / 0.7120361));
            contact_68 = tmpvar_70.x;
            if ((tmpvar_70.x <= -9.0)) {
              gforce_55 = 0.0;
              if ((tmpvar_58 <= patchwidth)) {
                contact_68 = patchval;
              };
            };
            if (((contact_68 == 0.0) && (tmpvar_58 == 1.0))) {
              bforce_54 = 0.0;
            };
            lowp float tmpvar_71;
            tmpvar_71 = max (0.0, (contact_68 - contactthreshold));
            contact_68 = tmpvar_71;
            float b_72;
            b_72 = 1.0;
            if ((boostfac > 0.0)) {
              vec2 tmpvar_73;
              tmpvar_73.x = boostx;
              tmpvar_73.y = boosty;
              vec2 tmpvar_74;
              tmpvar_74.x = part;
              tmpvar_74.y = ii_49;
              vec2 tmpvar_75;
              tmpvar_75.x = part;
              tmpvar_75.y = ii_49;
              vec2 tmpvar_76;
              tmpvar_76.x = ii_49;
              tmpvar_76.y = part;
              vec2 tmpvar_77;
              tmpvar_77.x = ii_49;
              tmpvar_77.y = part;
              float tmpvar_78;
              tmpvar_78 = min (dot ((tmpvar_73 - tmpvar_74), (tmpvar_73 - tmpvar_75)), dot ((tmpvar_73 - tmpvar_76), (tmpvar_73 - tmpvar_77)));
              float tmpvar_79;
              tmpvar_79 = (boostrad * boostrad);
              if ((tmpvar_78 < tmpvar_79)) {
                float tmpvar_80;
                tmpvar_80 = (tmpvar_78 / tmpvar_79);
                b_72 = (1.0 + ((
                  ((tmpvar_80 * tmpvar_80) - (2.0 * tmpvar_80))
                 + 1.0) * boostfac));
              };
            };
            gforce_55 = (gforce_55 + ((contactforcesc * tmpvar_71) * (tmpvar_63 * b_72)));
          };
          if ((m_force != 0.0)) {
            lowp float contact_81;
            vec2 tmpvar_82;
            tmpvar_82.x = part;
            tmpvar_82.y = ii_49;
            contact_81 = (texture2D (contactbuff, (tmpvar_82 / 0.7120361)).x / representativeContact);
            if ((contact_81 <= -9.0)) {
              gforce_55 = 0.0;
              if ((tmpvar_58 <= patchwidth)) {
                contact_81 = patchval;
              };
            };
            if ((tmpvar_58 < 1.5)) {
              contact_81 = (maxv / representativeContact);
            };
            if ((contact_81 > 0.0)) {
              lowp float tmpvar_83;
              tmpvar_83 = ((m_k * pow (contact_81, 
                -(m_alpha)
              )) - tmpvar_63);
              lowp float tmpvar_84;
              tmpvar_84 = ((m_c * m_c) + (tmpvar_83 * tmpvar_83));
              float b_85;
              b_85 = 1.0;
              if ((boostfac > 0.0)) {
                vec2 tmpvar_86;
                tmpvar_86.x = boostx;
                tmpvar_86.y = boosty;
                vec2 tmpvar_87;
                tmpvar_87.x = part;
                tmpvar_87.y = ii_49;
                vec2 tmpvar_88;
                tmpvar_88.x = part;
                tmpvar_88.y = ii_49;
                vec2 tmpvar_89;
                tmpvar_89.x = ii_49;
                tmpvar_89.y = part;
                vec2 tmpvar_90;
                tmpvar_90.x = ii_49;
                tmpvar_90.y = part;
                float tmpvar_91;
                tmpvar_91 = min (dot ((tmpvar_86 - tmpvar_87), (tmpvar_86 - tmpvar_88)), dot ((tmpvar_86 - tmpvar_89), (tmpvar_86 - tmpvar_90)));
                float tmpvar_92;
                tmpvar_92 = (boostrad * boostrad);
                if ((tmpvar_91 < tmpvar_92)) {
                  float tmpvar_93;
                  tmpvar_93 = (tmpvar_91 / tmpvar_92);
                  b_85 = (1.0 + ((
                    ((tmpvar_93 * tmpvar_93) - (2.0 * tmpvar_93))
                   + 1.0) * boostfac));
                };
              };
              gforce_55 = (gforce_55 + ((
                (((m_force * contact_81) * (-2.0 * m_c)) * (m_c * tmpvar_83))
               / 
                (tmpvar_84 * tmpvar_84)
              ) * b_85));
            };
          };
          gforce_55 = (gforce_55 * pow ((tmpvar_63 / powBaseDist), springpow));
          tmpvar_52 = (tmpvar_62 * ((
            (gforce_55 + lforce_56)
           + bforce_54) / tmpvar_63));
        };
      };
      density_5 = density_50;
      dirdensity_4 = dirdensity_51;
      force_7 = (force_7 + tmpvar_52);
      ii_49 += 0.0002441406;
    };
  };
  if ((gradforce != 0.0)) {
    lowp vec4 tmpvar_94;
    tmpvar_94.w = 1.0;
    tmpvar_94.xyz = tmpvar_12;
    lowp vec3 tmpvar_95;
    tmpvar_95 = floor(((
      ((tmpvar_94 * gradtran).xyz - gradlow)
     / 
      (gradhigh - gradlow)
    ) * gradnum));
    lowp vec2 tmpvar_96;
    tmpvar_96.x = (((tmpvar_95.x + 
      ((float(mod (tmpvar_95.y, gradysplit.x))) * gradnum.x)
    ) + 0.5) / (gradnum.x * gradysplit.x));
    tmpvar_96.y = (((
      floor((tmpvar_95.y / gradysplit.x))
     + 
      (tmpvar_95.z * gradysplit.y)
    ) + 0.5) / (gradysplit.y * gradnum.z));
    force_7 = (force_7 + (gradforce * texture2D (gradField, tmpvar_96).xyz));
  };
  float tmpvar_97;
  tmpvar_97 = (time + part);
  float tmpvar_98;
  tmpvar_98 = fract((42.1 * tmpvar_97));
  if ((tmpvar_98 < noiseprob)) {
    vec3 tmpvar_99;
    tmpvar_99.x = (17.9 * tmpvar_97);
    tmpvar_99.y = (19.2 * tmpvar_97);
    tmpvar_99.z = (11.3 * tmpvar_97);
    force_7 = (force_7 + ((
      fract(tmpvar_99)
     - 0.5) * noiseforce));
  };
  lowp float tmpvar_100;
  tmpvar_100 = max (1e-14, (sqrt(
    dot (velold_6, velold_6)
  ) * (1.0 + dirdensity_4)));
  use_3 = (pow ((
    pow ((tmpvar_100 * damp), -3.0)
   + 1.0), -0.3333333) / tmpvar_100);
  lowp float tmpvar_101;
  tmpvar_101 = clamp (use_3, 0.0, 1.0);
  use_3 = tmpvar_101;
  if ((modelSphereForce > 0.0)) {
    lowp float tmpvar_102;
    tmpvar_102 = (sqrt(dot (tmpvar_11.xyz, tmpvar_11.xyz)) - modelSphereRadius);
    if ((tmpvar_102 > 0.0)) {
      force_7 = (force_7 - ((modelSphereForce * 
        normalize(tmpvar_11.xyz)
      ) * tmpvar_102));
    };
  };
  vec3 tmpvar_103;
  tmpvar_103.xz = vec2(0.0, 0.0);
  tmpvar_103.y = -(gravity);
  vel_2 = (((velold_6 * tmpvar_101) + force_7) + tmpvar_103);
  lowp float tmpvar_104;
  tmpvar_104 = (sqrt(dot (vel_2, vel_2)) / springmaxvel);
  lowp float rat_105;
  rat_105 = 1.0;
  if ((tmpvar_104 > 0.7)) {
    rat_105 = ((1.0 - (0.09 / 
      ((tmpvar_104 + 1.0) - 1.4)
    )) / tmpvar_104);
  };
  vel_2 = (vel_2 * rat_105);
  lowp float v_106;
  v_106 = ((vel_2.x + vel_2.y) + vel_2.z);
  if (!(((v_106 <= 0.0) || (v_106 >= 0.0)))) {
    vel_2 = velold_6;
  };
  lowp vec3 tmpvar_107;
  tmpvar_107 = (tmpvar_11.xyz + (vel_2 * springrate));
  mypos_1 = tmpvar_107;
  vec2 tmpvar_108;
  tmpvar_108.x = 0.9902344;
  tmpvar_108.y = part;
  lowp vec4 tmpvar_109;
  tmpvar_109 = texture2D (topologybuff, tmpvar_108);
  if ((tmpvar_109.x > 0.0)) {
    lowp vec3 tmpvar_110;
    lowp float tmpvar_111;
    tmpvar_111 = (tmpvar_109.y * springlen);
    lowp vec2 tmpvar_112;
    tmpvar_112.x = workhisttime;
    tmpvar_112.y = tmpvar_109.x;
    lowp vec4 tmpvar_113;
    tmpvar_113 = texture2D (posWorkhist, tmpvar_112);
    lowp vec3 tmpvar_114;
    tmpvar_114 = (tmpvar_113.xyz - tmpvar_107);
    lowp float tmpvar_115;
    tmpvar_115 = sqrt(dot (tmpvar_114, tmpvar_114));
    if ((tmpvar_115 == 0.0)) {
      tmpvar_110 = tmpvar_107;
    } else {
      tmpvar_110 = (tmpvar_113.xyz - (tmpvar_114 * (tmpvar_111 / tmpvar_115)));
    };
    mypos_1 = tmpvar_110;
  };
  if ((stepsSoFar < 2.5)) {
    float tmpvar_116;
    tmpvar_116 = (part / 0.7120361);
    vec3 tmpvar_117;
    tmpvar_117.x = ((tmpvar_116 * 10.0) - 5.0);
    tmpvar_117.y = -(sin((tmpvar_116 * 31.42)));
    tmpvar_117.z = cos((tmpvar_116 * 31.42));
    mypos_1 = (((tmpvar_117 * springlen) / 31.42) * 2916.0);
  };
  if (((part > (maxActive * 0.7120361)) && (part <= 0.7120361))) {
    vec2 tmpvar_118;
    tmpvar_118.x = workhisttime;
    float tmpvar_119;
    tmpvar_119 = (maxActive * 0.7120361);
    tmpvar_118.y = (tmpvar_119 - 0.0002441406);
    lowp vec4 tmpvar_120;
    tmpvar_120 = texture2D (posWorkhist, tmpvar_118);
    vec2 tmpvar_121;
    tmpvar_121.x = workhisttime;
    tmpvar_121.y = tmpvar_119;
    vec3 tmpvar_122;
    tmpvar_122.x = fract((part * 1379.3));
    tmpvar_122.y = fract((part * 1795.3));
    tmpvar_122.z = fract((part * 1994.3));
    mypos_1 = ((tmpvar_120.xyz + (
      (texture2D (posWorkhist, tmpvar_121).xyz - tmpvar_120.xyz)
     * 
      ((part - tmpvar_119) + 0.0002441406)
    )) + (tmpvar_122 - 0.5));
  };
  if ((part < (minActive * 0.7120361))) {
    vec2 tmpvar_123;
    tmpvar_123.x = workhisttime;
    float tmpvar_124;
    tmpvar_124 = (minActive * 0.7120361);
    tmpvar_123.y = (tmpvar_124 + 0.0002441406);
    lowp vec4 tmpvar_125;
    tmpvar_125 = texture2D (posWorkhist, tmpvar_123);
    vec2 tmpvar_126;
    tmpvar_126.x = workhisttime;
    tmpvar_126.y = tmpvar_124;
    vec3 tmpvar_127;
    tmpvar_127.x = fract((part * 1379.3));
    tmpvar_127.y = fract((part * 1795.3));
    tmpvar_127.z = fract((part * 1994.3));
    mypos_1 = ((tmpvar_125.xyz + (
      (texture2D (posWorkhist, tmpvar_126).xyz - tmpvar_125.xyz)
     * 
      ((part - tmpvar_124) + 0.0002441406)
    )) + (tmpvar_127 - 0.5));
  };
  lowp float v_128;
  v_128 = ((mypos_1.x + mypos_1.y) + mypos_1.z);
  if (!(((v_128 <= 0.0) || (v_128 >= 0.0)))) {
    mypos_1 = (tmpvar_11.xyz + (normalize(vel_2) * springrate));
  };
  vec2 tmpvar_129;
  tmpvar_129.x = 0.9941406;
  tmpvar_129.y = part;
  lowp vec4 tmpvar_130;
  tmpvar_130 = texture2D (topologybuff, tmpvar_129);
  if ((tmpvar_130.x > 0.0)) {
    mypos_1 = tmpvar_130.yzw;
  };
  mypos_1 = (mypos_1 * springCentreDamp);
  lowp vec4 tmpvar_131;
  tmpvar_131.xyz = mypos_1;
  tmpvar_131.w = density_5;
  gl_FragColor = tmpvar_131;
}

