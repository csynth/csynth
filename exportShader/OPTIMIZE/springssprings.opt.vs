varying float part;
attribute vec3 position;
void main ()
{
  part = position.y;
  highp vec4 tmpvar_1;
  tmpvar_1.xzw = vec3(0.0, 0.0, 1.0);
  tmpvar_1.y = ((position.y * 2.0) - 1.0);
  gl_Position = tmpvar_1;
}

