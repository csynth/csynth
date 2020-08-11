precision highp float;
precision highp float;
precision highp sampler2D;
uniform sampler2D rtopos;
uniform sampler2D rtshapepos;
uniform sampler2D colbuff;
uniform float multifact;
uniform float latenormals;
uniform float cutx;
uniform float cuty;
uniform float cutfall;
uniform vec2 screen;
void main ()
{
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
  lowp vec4 tmpvar_5;
  highp vec2 tmpvar_6;
  tmpvar_6 = (gl_FragCoord.xy * screen);
  tmpvar_5 = texture2D (rtopos, tmpvar_6);
  lowp vec4 shapepos_7;
  lowp vec4 tmpvar_8;
  tmpvar_8 = texture2D (rtshapepos, tmpvar_6);
  if ((tmpvar_8.w == 0.0)) {
    discard;
  };
  lowp float tmpvar_9;
  tmpvar_9 = floor((tmpvar_8.w / 16384.0));
  if ((latenormals != 0.0)) {
    shapepos_7 = tmpvar_8;
  } else {
    shapepos_7 = (floor(tmpvar_8) / multifact);
  };
  shapepos_7.w = 1.0;
  lowp vec2 tmpvar_10;
  tmpvar_10.x = 0.21875;
  tmpvar_10.y = ((tmpvar_9 + 0.5) / 32.0);
  texpos_1 = (shapepos_7.xyz / max (texture2D (colbuff, tmpvar_10).w, 0.0001));
  gl_FragColor.w = (16384.0 * tmpvar_9);
  lowp vec3 lopos_11;
  lopos_11.x = tmpvar_5.x;
  lopos_11.z = sin((6.28318 * tmpvar_5.y));
  lopos_11.y = cos((6.28318 * tmpvar_5.y));
  lowp vec2 tmpvar_12;
  tmpvar_12.x = 0.34375;
  tmpvar_12.y = ((tmpvar_9 + 0.5) / 32.0);
  lowp vec4 tmpvar_13;
  tmpvar_13 = texture2D (colbuff, tmpvar_12);
  lowp vec3 tmpvar_14;
  if ((tmpvar_13.z == 0.0)) {
    lowp vec2 tmpvar_15;
    tmpvar_15.x = 0.96875;
    tmpvar_15.y = ((tmpvar_9 + 0.5) / 32.0);
    lowp vec2 tmpvar_16;
    tmpvar_16.x = 0.96875;
    tmpvar_16.y = ((tmpvar_9 + 0.5) / 32.0);
    lowp vec2 tmpvar_17;
    tmpvar_17.x = 0.96875;
    tmpvar_17.y = ((tmpvar_9 + 0.5) / 32.0);
    lowp vec3 tmpvar_18;
    tmpvar_18.x = texture2D (colbuff, tmpvar_15).x;
    tmpvar_18.y = texture2D (colbuff, tmpvar_16).y;
    tmpvar_18.z = texture2D (colbuff, tmpvar_17).y;
    tmpvar_14 = (lopos_11 * tmpvar_18);
  } else {
    lowp vec2 tmpvar_19;
    tmpvar_19.x = 0.34375;
    tmpvar_19.y = ((tmpvar_9 + 0.5) / 32.0);
    lowp vec4 tmpvar_20;
    tmpvar_20 = texture2D (colbuff, tmpvar_19);
    lowp vec3 tmpvar_21;
    if ((tmpvar_20.z == 1.0)) {
      tmpvar_21 = texpos_1;
    } else {
      lowp vec2 tmpvar_22;
      tmpvar_22.x = 0.96875;
      tmpvar_22.y = ((tmpvar_9 + 0.5) / 32.0);
      lowp vec2 tmpvar_23;
      tmpvar_23.x = 0.96875;
      tmpvar_23.y = ((tmpvar_9 + 0.5) / 32.0);
      lowp vec2 tmpvar_24;
      tmpvar_24.x = 0.96875;
      tmpvar_24.y = ((tmpvar_9 + 0.5) / 32.0);
      lowp vec3 tmpvar_25;
      tmpvar_25.x = texture2D (colbuff, tmpvar_22).x;
      tmpvar_25.y = texture2D (colbuff, tmpvar_23).y;
      tmpvar_25.z = texture2D (colbuff, tmpvar_24).y;
      lowp vec2 tmpvar_26;
      tmpvar_26.x = 0.34375;
      tmpvar_26.y = ((tmpvar_9 + 0.5) / 32.0);
      tmpvar_21 = mix ((lopos_11 * tmpvar_25), texpos_1, texture2D (colbuff, tmpvar_26).z);
    };
    tmpvar_14 = tmpvar_21;
  };
  lowp float tmpvar_27;
  lowp float tmpvar_28;
  tmpvar_28 = (tmpvar_14.z * 0.01);
  tmpvar_27 = (((tmpvar_28 - 
    floor(tmpvar_28)
  ) * 0.5) + 0.5);
  gl_FragColor.z = tmpvar_27;
  gl_FragColor.y = tmpvar_27;
  gl_FragColor.x = tmpvar_27;
}

