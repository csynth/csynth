// 'copy' shader used to compose final canvas from separate rendertargets
varying vec2 tpos;
void main()
{
  // map from position    -1..1 to 0..1 (three plane(2))
  tpos =  position.xy * 0.5 + 0.5;
  gl_Position = vec4( position, 1.0 ); 
}
