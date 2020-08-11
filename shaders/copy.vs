// 'copy' shader used to compose final canvas from separate rendertargets
varying vec2 tpos;
uniform vec2 textureToUse;  // usually 1x1, vary so only part of texture is used where aspect ratio must be jigged
uniform mat4 xmatrix;		// matrix to permit keystone compensation
void main()
{
  // map from position    -0.5..0.5 to 0..1 (three plane(1)
  tpos =  position.xy * textureToUse + 0.5;

  // overkill, but not significantly expensive and will work under many situations
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * xmatrix * vec4( position, 1.0 ); 
}
