///////////// DEAD ???????????????????
// taken from Lorenzo's shader with very minor differences
//     iResolution replaced by use of opos
//     genes for t0 etc
//     iGlobalTime defined

varying vec2 opos;  // original position x,y
const int SHAPE_MODE = 1;
gene(iGlobalTime, 0, 0, 1, 0.01, 0.001, system, frozen) // set iGlobalTime


gene(t0, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t1, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t2, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t3, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t4, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t5, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t6, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t7, 0, 0, 1, 0.1, 0.01, geom, free) // t
gene(t8, 0, 0, 1, 0.1, 0.01, geom, free) // t


		vec4 CC0 = vec4(-0.1,0.001,0.3,-0.3) + 0.1*sin( vec4(3.0,0.0,1.0,2.0) + 0.5*vec4(1.0,1.3,1.7,2.1)*iGlobalTime);
		vec4 CC1 = vec4(-0.1,0.6,0.9,-0.3) + 0.1*sin( vec4(3.0,0.0,1.0,2.0) + 0.5*vec4(1.0,1.3,1.7,2.1)*iGlobalTime);

		//const vec4	CC 			= vec4(0.0, 0.0, 0.0, 0.0); 
		const float	EPSILON 	= 0.0002;
		const int	ITERATIONS 	= 300; 
		const int	RECURSIONS 	= 5;
		const int	TWICKERS 	= 9; 


		/*
		uniform float	t0; 
		uniform float	t1; 
		uniform float	t2;
		uniform float	t3;
		uniform float	t4;
		uniform float	t5;
		uniform float	t6;
		uniform float	t7;
		uniform float	t8;
		*/

		/**
        const float	t0 = 0.0;
		const float	t1 = 0.0; 
		const float	t2 = 0.0;
		const float	t3 = 0.0;
		const float	t4 = 0.0;
		const float	t5 = 0.0;
		const float	t6 = 0.0;
		const float	t7 = 0.0;
		const float	t8 = 0.0;
        **/



		vec4 quatSquare( vec4 a ) {
			return vec4( a.x*a.x - dot(a.yzw,a.yzw), 2.0*a.x*(a.yzw) );
		}

		
		vec4 quatCube( vec4 a ) {
			return a * ( 4.0*a.x*a.x - dot(a,a)*vec4(3.0,1.0,1.0,1.0) );
		}


		float map_julia0(in vec3 p, out vec4 trap, out bool isHit) {
			vec4 zz = vec4( p, 0.2 );
			float mod = 0.0;
			float dzz = 1.0;
	
			trap = vec4(abs(zz.xzy), length(zz)); 
			vec4 trapOut = trap; 
			for( int i=0; i<RECURSIONS; i++ ) {
				float x = zz.x; float x2 = x*x;
				float y = zz.y; float y2 = y*y;
				float z = zz.z; float z2 = z*z; 
				float w = zz.w; float w2 = w*w;

				float newx = x2-y2-z2+w2; 
				float newy = 2.0*((x+t0)*(y+t1)-(z+t2)*(w+t3));
				float newz = 2.0*((x+t4)*(z+t5)-(y+t6)*(w+t7)); 
				float neww = 2.0*((x+t8)*w+y*z); 

				zz = vec4(newx, newy, newz, neww) + CC0; 

				dzz *= 2.0 * length(zz);
		
				trapOut = min (trap, vec4(abs(zz.xyz), length(zz)) ); 
		
	
				mod = length(zz);		
				if( mod > 4.0 )
					break;				 
			}

			// float d = 0.25 * log(mod) * sqrt(mod/dzz );
			float d = 0.5 * log(mod) * mod/dzz; 
			if (d<EPSILON) {
				isHit = true;
				trap = trapOut; 
			} else {
				isHit = false; 
			}

			return d;
		}


		float map_julia1(in vec3 p, out vec4 trap, out bool isHit) {
			vec4 zz = vec4( p, 0.2 );

			float mod = 0.0;
			float dzz = 1.0;
	
			trap = vec4(abs(zz.xzy), length(zz)); 
			vec4 trapOut = trap;

			for( int i=0; i<RECURSIONS; i++ ) {
				float x = zz.x; float x2 = x*x;
				float y = zz.y; float y2 = y*y;
				float z = zz.z; float z2 = z*z; 
				float w = zz.w; float w2 = w*w;

				float newx = x2-y2-z2+w2; 
				float newy = 2.0*( (x+t0)*(-y+t1) - (z+t2)*(w+t3) );  // -y
				float newz = 2.0*( (x+t4)*(-z+t5) - (y+t6)*(w+t7) ); // -z
				float neww = 2.0*( (x+t8)*w+y*z); 
		
		
		
				zz = vec4(newx, newy, newz, neww) + CC0; 
		
				dzz *= 2.0 * length(zz);
		
		
				trapOut = min (trap, vec4(abs(zz.xyz), length(zz)) ); 
		
	
				mod = length(zz);		
				if( mod > 4.0 )
					break;				 
			}

			float d = 0.5 * log(mod) * mod/dzz;
			if (d < EPSILON) {
				isHit = true;
				trap = trapOut; 
			} else {
				isHit = false; 
			}

			return d;
		}


		float map_julia2(in vec3 p, out vec4 trap, out bool isHit) {
			vec4 zz = vec4( p, 0.2 );

			float mod = 0.0;
			float dzz = 1.0;
	
			trap = vec4(abs(zz.xzy), length(zz)); 
			vec4 trapOut = trap;

			for( int i=0; i<RECURSIONS; i++ ) 
			{
				dzz *= 2.0 * length(zz);
        
				zz = quatSquare( zz ) + CC1;

				trapOut = min (trap, vec4(abs(zz.xyz), length(zz)) ); 
		
	
				mod = length(zz);		
				if( mod > 4.0 )
					break;		
			}

			float d = 0.25 * log(mod) * sqrt(mod/dzz);

			if (d < EPSILON) {
				isHit = true;
				trap = trapOut; 
			} else {
				isHit = false; 
			}

			return d;	
		}

		float map_julia3(in vec3 p, out vec4 trap, out bool isHit) {
			vec4 zz = vec4( p, 0.2 );

			float mod = 0.0;
			float dzz = 1.0;
	
			trap = vec4(abs(zz.xzy), length(zz)); 
			vec4 trapOut = trap;

			for( int i=0; i<RECURSIONS; i++ ) 
			{
				dzz *= 3.0 * length(quatSquare(zz) );
        
				zz = quatCube( zz ) + CC1;

				trapOut = min (trap, vec4(abs(zz.xyz), length(zz)) ); 
		
	
				mod = length(zz);		
				if( mod > 4.0 )
					break;		
			}

			float d = 0.25 * log(mod) * sqrt(mod/dzz);

			if (d < EPSILON) {
				isHit = true;
				trap = trapOut; 
			} else {
				isHit = false; 
			}

			return d;
		
		}

		float map(in int mode, in vec3 p, out vec4 trap, out bool isHit ) {
			float dist; 

			if(SHAPE_MODE == 0) {
				dist = map_julia0(p, trap, isHit); 
			} 
			else if (SHAPE_MODE == 1)
			{
				dist = map_julia1(p, trap, isHit); 
			}
			else if (SHAPE_MODE == 2)
			{
				dist = map_julia2(p, trap, isHit);  
			}
			else if (SHAPE_MODE == 3)
			{
				dist = map_julia3(p, trap, isHit); 	
			}
			
			return dist; 
		}

		float intersect( in vec3 ro, in vec3 rd, out vec4 trap, out bool isHit ) {
			float maxd = 50.0;


	
			float stepp = 0.1;
			float dist = 0.0;
	
			isHit = false; 

			for( int i=0; i<ITERATIONS; i++ )
			{
			   if(stepp<EPSILON || dist>maxd ) break;
        
				dist += stepp;
				stepp = map(SHAPE_MODE, ro+rd*dist, trap, isHit );
			}
			return dist;
		}

		vec3 calcNormal( in vec3 pos, float e ) {
			vec3 eps = vec3(e,0.0,0.0);
			bool hit; 
			vec4 trap;

			return normalize( vec3(
				   map(SHAPE_MODE, pos+eps.xyy, trap, hit) - map(SHAPE_MODE, pos-eps.xyy, trap, hit),
				   map(SHAPE_MODE, pos+eps.yxy, trap, hit) - map(SHAPE_MODE, pos-eps.yxy, trap, hit),
				   map(SHAPE_MODE, pos+eps.yyx, trap, hit) - map(SHAPE_MODE, pos-eps.yyx, trap, hit) ) );
		}

		vec3 fractProgram( in vec2 p, in float time )
		{
	
			// camera
			float an = -2.4 + 0.2*time;
			vec3 ro = vec3( 3.0*cos(time), 0.0, 3.0*sin(time)) * 4.0;
			vec3 ta = vec3( 0.0, 0.0, 0.0 );
			vec3 ww = normalize( ta - ro );
			vec3 uu = normalize( cross(ww,vec3(0.0,1.0,0.0) ) );
			vec3 vv = normalize( cross(uu,ww));
			vec3 rd = normalize( p.x*uu + p.y*vv + 4.0*ww );
	
			//light
			vec3 light = vec3(  0.577, 0.577,  0.577 );

			// raymarch
			bool isHit; 
			vec4 trap;
			float dist = intersect(ro,rd, trap, isHit);
	
			// shade

			vec3 rgb = vec3(0.0);
			if( isHit )
			{
				if (1==0) {
        			rgb = vec3(1.0);
				} else {
					vec3 z = ro + rd*dist;
					vec3 norm = calcNormal(z, 0.0001);
			
					float dif1 = clamp(dot(light, norm), 0.0, 1.0); 
			
					rgb = vec3(0.3); 
			
					float ao = clamp(2.5*trap.x-0.15, 0.0, 1.0); 
			
					if (dif1>0.01) {
						vec4 trapp;
						intersect(ro, rd, trapp, isHit);
						if (isHit) {
							dif1 = 0.0; 	
						}
					}
			
					// color shades
					//rgb = mix( rgb, vec3(1.0,0.5,0.2), 2.0*trap.x );
					//rgb = mix( rgb, vec3(0.7,0.4,0.2), 2.0*trap.y );
					//rgb = mix( rgb, vec3(0.2,0.4,0.5), 3.0*trap.z );
					//rgb = mix (rgb, vec3(1.0, 1.0, 1.0), 8.0 *norm.y);
                    
                   // rgb = mix( rgb, vec3(0.0, 0.0, 0.0), 2.0*trap.x );
                   // rgb = mix( rgb, vec3(0.0, 0.0, 0.0), 4.0*trap.y );
                   // rgb = mix( rgb, vec3(0.0, 0.0, 0.0), 3.0*trap.z );
                   // rgb *= mix( rgb, vec3(1.0, 1.0, 1.0), 2.0*norm.y); 
                   // rgb *= mix( rgb, vec3(0.5, 0.5, 0.5), 4.0*trap.x);
                    rgb = mix( rgb, vec3(1.0, 1.0, 1.0), 0.2*norm.y); 
			
					// Bidirectional reflectance distribution function
					vec3 brdf  =  vec3(0.17, 0.19, 0.20) * (0.6 + 4.0*norm.y)*(0.1+0.3*ao);
						 brdf += 2.0 * vec3(1.00, 0.95, 0.80)*dif1*(0.5+0.5*ao); 
								   
					rgb *= brdf;
			
				}
			} else {
				// background		
				rgb = vec3(1.0) * (0.7+0.8*rd.y);
				rgb += vec3(0.8, 0.7, 0.8) *pow( clamp( dot(rd, vec3(0.577, 0.577,  0.577)), 0.0, 1.0), 48.0); 
			}

			// gamma
			rgb = pow( clamp( rgb, 0.0, 1.0 ), vec3(0.45) );
			rgb = sqrt(rgb);
	 
	
			return rgb;
		}



		void main(void) {
			gl_FragColor = vec4( fractProgram( opos, iGlobalTime ), 1.0 );
		}
