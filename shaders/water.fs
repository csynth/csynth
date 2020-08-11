#include noiseGLSL.fs;

varying vec4 UV;
varying  vec3 vNormal;
varying	vec3 vPos;
varying vec3 nmNormal;
varying mat4 MV;
uniform sampler2D tDiffuse;
uniform vec4 waterColor;
uniform float reflStrength;  

vec3 lightDirection_ = vec3(0.7,0.5,0.8);
vec4 emissive_color = vec4(0.4,0.4,0.4,1.0);
vec4 light_diffuse = vec4(1, 1, 1, 1);
vec4 light_ambient = vec4(0.35, 0.35, 0.35, 1);

float shininess = 80.0;

void main() 
{
/**
	vec3 NN = mat3(MV) * vNormal;
    lightDirection_ = normalize(lightDirection_);
    float diffuse_factor = max(dot(vNormal, lightDirection_), 0.0);
	vec3 eyeDir = normalize(cameraPosition - vPos);
	vec3 half_direction = normalize(lightDirection_ + vec3(0, 0, 1));
	float specular_factor = pow(max(dot(half_direction, nmNormal), 0.0), shininess);
	vec4 shadeColor = emissive_color * light_diffuse * diffuse_factor + emissive_color * specular_factor;
   //shadeColor.a = 1.0;
   //gl_FragColor = texColor * 0.3 + shadeColor * 0.9;
	//float fresnelTerm = dot(eyeDir, vNormal);
**/
//if (vPos.y > MV[3][1] + 1000.) { gl_FragColor = vec4(1.,0.,0.,1.); return; }
	vec3 NN = mat3(MV) * vNormal;
	vec3 eyeDir = normalize(cameraPosition - vPos);
    vec3 projN = reflect(eyeDir, NN);
    vec4 texColor = texturegetProj( tDiffuse, UV-vec4(projN*7.0,1.0));
    texColor = mix(vec4(1.,1.,1.,1.), texColor, reflStrength);
    texColor.a = 1.0;
   //gl_FragColor = texColor;
  //gl_FragColor.a =1.0;
  
  float n = snoise(projN);
	gl_FragColor = texColor * waterColor + vec4(0.5 + 0.4 * vec3(n, n, n), 1.0) * 0.2;
	gl_FragColor.a = waterColor.w;
    gl_FragColor = sqrt(gl_FragColor);
  //gl_FragColor = texColor;// *0.85 + vec4(0.5 + 0.4 * vec3(n, n, n), 1.0) * 0.5 ;
}