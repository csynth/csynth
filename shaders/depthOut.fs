precision highp float;
 
/// Pack a floating point value into an RGBA (32bpp).
/// Note that video cards apply some sort of bias (error?) to pixels,
/// so we must correct for that by subtracting the next component's
/// value from the previous component.
highp vec4 pack( const in highp float depth ) 
{
  const vec4 c_bias = vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
 
  float r = depth;
  float g = fract(r * 255.0);
  float b = fract(g * 255.0);
  float a = fract(b * 255.0);
  vec4 color = vec4(r, g, b, a);
 
  return color - (color.yzww * c_bias);
}

/// Fragment shader entry.
void main()
{
	// Classic shadow mapping algorithm.
	//gl_FragColor = pack(gl_FragCoord.z);
	
	///////////////////////////////////////////////////////////////////////////////
	// If someone could explain how the following is possible, I could die happy :|
	// found by simple trial and error
	gl_FragColor = vec4(gl_FragCoord.z,gl_FragCoord.z,gl_FragCoord.z,1.0);
}

