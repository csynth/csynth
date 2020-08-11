float eval(vec3 pointa);
#include implicit.fs;


// const vec4	CC 			= vec4(0.0, 0.0, 0.0, 0.0);
//const  float  EPSILON 	= 0.0002;
//const  int	 ITERATIONS 	= 300;
const  int	 MAXRECURSIONS 	= 10;  // << MAX recursions

// taken from Lorenzo's shader with very minor differences
//     iResolution replaced by use of opos
//     genes for t0 etc
//     iGlobalTime defined

const int SHAPE_MODE = 1;
gene(iGlobalTime, 0, 0, 1, 0.01, 0.001, system, frozen) // set iGlobalTime


gene(K, 1, 0, 4, 0.1, 0.01, geom, free) // t
gene(t0, 0.2, 0, 1, 0.1, 0.01, geom, free) // t
gene(t1, 0.4, 0, 1, 0.1, 0.01, geom, free) // t
gene(t2, 0.6, 0, 1, 0.1, 0.01, geom, free) // t
gene(t3, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t4, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t5, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t6, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t7, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t8, 0, 0, 1, 0.1, 0.01, geom, free) // t

gene(Recursions, 5, 0, 10, 1, 1, geom, frozen) // recursions
#define recursions int(Recursions)

vec4 CC0; // = vec4(-0.1,0.001,0.3,-0.3) + 0.1*sin( vec4(3.0,0.0,1.0,2.0) + 0.5*vec4(1.0,1.3,1.7,2.1)*iGlobalTime);
vec4 CC1; // = vec4(-0.1,0.6,0.9,-0.3) + 0.1*sin( vec4(3.0,0.0,1.0,2.0) + 0.5*vec4(1.0,1.3,1.7,2.1)*iGlobalTime);



vec4 quatSquare( vec4 a ) {
    return vec4( a.x*a.x - dot(a.yzw,a.yzw), 2.0*a.x*(a.yzw) );
}

vec4 quatCube( vec4 a ) {
    return a * ( 4.0*a.x*a.x - dot(a,a)*vec4(3.0,1.0,1.0,1.0) );
}

float map(in vec3 p) {
    vec4 zz = vec4( p, 0.2 );

    //float mod = 0.0;
    //float dzz = 1.0;

    for( int i=0; i<MAXRECURSIONS; i++ ) {
        if (i >= recursions) break;
        float x = zz.x; float x2 = x*x;
        float y = zz.y; float y2 = y*y;
        float z = zz.z; float z2 = z*z;
        float w = zz.w; float w2 = w*w;

        if(SHAPE_MODE == 0) {
            float newx = x2-y2-z2+w2;
            float newy = 2.0*((x+t0)*(y+t1)-(z+t2)*(w+t3));
            float newz = 2.0*((x+t4)*(z+t5)-(y+t6)*(w+t7));
            float neww = 2.0*((x+t8)*w+y*z);
            zz = vec4(newx, newy, newz, neww) + CC0;
        } else if(SHAPE_MODE == 1) {
            float newx = x2-y2-z2+w2;
            float newy = 2.0*( (x+t0)*(-y+t1) - (z+t2)*(w+t3) );  // -y
            float newz = 2.0*( (x+t4)*(-z+t5) - (y+t6)*(w+t7) ); // -z
            float neww = 2.0*( (x+t8)*w+y*z);
            zz = vec4(newx, newy, newz, neww) + CC0;
        } else if(SHAPE_MODE == 2) {
            zz = quatSquare( zz ) + CC1;
        } else if(SHAPE_MODE == 3) {
            zz = quatCube( zz ) + CC1;
        }
    }

    return length(zz) - K;
    //return zz.x/zz.w;
}



float eval(vec3 pointa) {
    CC0 = vec4(-0.1,0.001,0.3,-0.3) + 0.1*sin( vec4(3.0,0.0,1.0,2.0) + 0.5*vec4(1.0,1.3,1.7,2.1)*iGlobalTime);
    CC1 = vec4(-0.1,0.6,0.9,-0.3) + 0.1*sin( vec4(3.0,0.0,1.0,2.0) + 0.5*vec4(1.0,1.3,1.7,2.1)*iGlobalTime);
	vec4 point = vec4(pointa, 1.0) ;
    return map(point.xyz );
}


