varying vec4 UV;
varying  vec3 vNormal; 
varying	vec3 vPos;
const float pi = 3.14159;
const int numWaves = 4;

uniform float time;
uniform mat4 projInverse;
uniform float useProj;  // 0 for regular data space grid, 1 for regular screen space grid
uniform float waterAmplitude;
uniform float waterBend;
uniform float gBend;

varying mat4 MV;
varying vec3 nmNormal;


uniform float amplitude[numWaves];
uniform float wavelength[numWaves];
uniform float speed[numWaves];
vec2 direction[numWaves];

//#define  amplitude  12.0
//#define  wavelength 33.5
//#define  speed      22.8
// This rather horrid step made necessary by compiler used by Chrome 30
// failing to unwrap wave() call and thus compaining that [index] was not a constant.

#define wave(ind, p) wavex(p, direction[ind], amplitude[ind], wavelength[ind], speed[ind])
vec3 wavex(vec3 pos, vec2 direction_index, float amplitude_index, float wavelength_index, float speed_index)
{

 	// W1 = Ai * sin( Diri dot pos.xy) * frequency + time * (speed * frequencY) )

	float frequency = 2.0*pi/wavelength_index;
	
	vec3 wave;
	wave.x = 0.0;
	wave.y = 0.0;
    float base = dot(direction_index, pos.xy) * frequency + time * (speed_index * frequency);
	wave.z	= waterAmplitude * amplitude_index * sin( base );
    // approximate differential
    float dwave = waterAmplitude * amplitude_index * cos(base) * waterBend;
	
	// 1, 0, cos(x))/sqrt(1+(cos(x))^2
	vec3 biNormal;
	biNormal.x = 1.0;
	biNormal.y = 0.0;
	biNormal.z = frequency * direction_index.x * dwave;
	vec3 _tangent;
	_tangent.x = 0.0;
	_tangent.y = 1.0;
	_tangent.z = frequency * direction_index.y * dwave;

    // work out delta normal
	vec3 _dnormal = vec3(biNormal.z, _tangent.z, 0.0);
	vNormal += _dnormal;//normalize(normalMatrix * _normal);

  return wave;
}

void main() 
{

	direction[0]	= vec2(0.5,0.5);
	direction[1]	= vec2(-0.5,0.2);
	direction[2]	= vec2(0.2,0.9);

    // prepare to generate water based on regular screen space sampling
    // rather then regular

    // normalize screenpos from raw input
    // assume that the plane has been made 40000 wide/deep
    vec3 screenpos = position/20000. ;  // -1 .. 1
    // map to bottom half of screen, with a little extra for big waves near 0
    screenpos.y = screenpos.y * 0.7 - 0.7;  /* -1.4 .. 0 */

    // find the corresponding position in world space
    vec4 wpos = projInverse * vec4(screenpos, 1.);
    wpos /= wpos.w;

    // find the target y position and camera z position
    float targy = modelViewMatrix[3][1];
    float camz = -viewMatrix[3][2];

    // now find where the ray from camera (0,0,camz) via wpos hits water (?, targy, ?)
    float surfz = (wpos.z - camz) * targy / wpos.y + camz;

    // now use that
    //float surfx = wpos.x * (surfz - camz) / (wpos.z - camz);
    float surfx = wpos.x * targy / wpos.y;
    //surfz = position.z;

    // now map onto the x,y plane that would have been the original bit plane
    vec3 xpos = vec3(surfx, -surfz, 0.);

    // and choose position (space grid) or xpos (screen grid)
    vec3 mxpos = mix(position, xpos, useProj);

    vec3 posWave = vPos = mxpos; // position;
    if (waterAmplitude * waterBend != 0.) {
        for(int i = 0; i< 3; i++)	{
            posWave  += wave(i, posWave);
        }
	}

    mat4 projMatrix = mat4(
      0.5,   0,      0,   0.0,
      0,     0.5,    0,  0.0,
      0,     0,      0.5, 0,
      0.5,   0.5,    0.5, 1 
    );

    vec4 pos =  projectionMatrix * modelViewMatrix  * vec4(posWave,1.0);
	MV = modelViewMatrix;
    UV = projMatrix * pos;
	nmNormal = normalize(normalMatrix * vNormal);
    gl_Position = pos;
}