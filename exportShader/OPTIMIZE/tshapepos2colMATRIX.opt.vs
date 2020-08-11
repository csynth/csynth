precision highp float;
precision highp float;
precision highp sampler2D;
attribute vec3 position;
attribute float instanceID;
uniform float fakeinstanceID;
void main ()
{
  highp vec4 tmpvar_1;
  tmpvar_1.w = 1.0;
  tmpvar_1.xy = position.xy;
  tmpvar_1.z = (instanceID + fakeinstanceID);
  gl_Position = tmpvar_1;
}

