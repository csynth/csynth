gene(enhwidth, 200, 0, 1000, 10,1, enhancer, free) // width of enhancer arm
gene(enhheadup, 70, 0, 1000, 10,1, enhancer, free) // head above arms
gene(enhheadrad, 20, 0, 1000, 10,1, enhancer, free) // head radius
gene(enhfootdown, 180, 0, 1000, 10,1, enhancer, free) // foot below arms
gene(enhbodyrad, 180, 0, 1000, 10,1, enhancer, free) // body radius

gene(enhrad, 2, 0, 1000, 10,1, enhancer, free)  //  radius of enhancer
gene(enhcut, 0.1, 0, 1, 0.01, 0.1,enhancer, free) // cutoff radius
gene(enhblob, 0.06, 0, 1, 0.001, 0.01,enhancer, free) // blobby for enh
gene(enhpushaway, 0, -1000, 1000, 10, 1,enhancer, fixed) // push object away from head (for debug)

gene(enhleft, 1, 0,1, 1, 0.1,enhancer, fixed) // amount of left enhancer to use
gene(enhright, 1, 0,1, 1, 0.1,enhancer, fixed) // amount of right enhancer to use

#define pblob(p) fhull1(enhheadrad, enhblob, p) /* blob at point p */
#define pblob2(p,q) fhull2(enhbodyrad, enhblob, p, q) /* blob at pointa p,q */

float body(vec3 point) {
	//point += row3(camMatrixWorld, z) * enhpushaway;
	//point += camMatrixWorld[2].xyz * enhpushaway;

	float x = point.x, y = point.y, z = point.z;
	vec4 gpRpos = gpRmat[3];
	float fhrarms=fhull2(enhwidth+enhrad, enhblob,  gpRmat * vec4(-enhwidth*0.5,0,0,1), gpRmat * vec4(enhwidth*0.5,0,0, 1));  // >1 .. 0
	float fhrhead=fhull1(enhheadrad, enhblob,  gpRmat * vec4(0,enhheadup,0,1));
	vec4 fhrfoot = gpRmat * vec4(0,-enhfootdown,0,1);  // foot position
	vec4 fhrfootx = fhrfoot; fhrfootx.x = gpRpos.x; // spread out feet as body tilts
	vec4 fhrfootz = fhrfoot; fhrfootz.z = gpRpos.z;
	float fhrbody = fhull4(enhbodyrad, enhblob, gpRpos, fhrfoot, fhrfootx, fhrfootz);  // one big blob
	fhrbody = pblob2(gpRpos, fhrfoot) + pblob2(gpRpos, fhrfootx) + pblob2(gpRpos, fhrfootz);  // three separate combined blobs
	fhrbody = max3(pblob2(gpRpos, fhrfoot), pblob2(gpRpos, fhrfootx), pblob2(gpRpos, fhrfootz));  // three separate blobs

	float fhr = fhrarms + fhrhead + fhrbody;
	//fhr = pblob(gpRpos) + pblob(fhrfoot) + pblob(fhrfootx) + pblob(fhrfootz);
	//fhr = max4(pblob(gpRpos), pblob(fhrfoot), pblob(fhrfootx), pblob(fhrfootz)); // debug to see the 4 points

	float fhl=fhull2(enhwidth+enhrad, enhblob,  gpLmat * vec4(0,0,0,1), gpLmat * vec4(0,0,-enhwidth, 1));  // ellipse from pointer

	float fhlhead = 0.; // fhull2(enhwidth+enhrad, enhblob,  gpLmat[3], camMatrixWorld[3]);

	//float r  = max(fhl,fhr);  	// >> 1 .. 0
	float r  = fhl*enhleft + fhr*enhright + fhlhead;  	// >> 1 .. 0

	// r = fhull1(enhrad, enhblob, gpRmat[3]); // trivial test sphere
	return r;
}

JAVASCRIPT(  // warning: repeated several times, different passes, vertex and fragment, and at once and onframe 2 don't put anything complicated here
	G.raystartd = 1;
	G.rayendd = 1000;
	G.raysizer = 1;
	G.steprange = 5;
	G.intervals = 100;
	G.STEP = 1;

	V.alwaysShowRender = true;
	userset(0,0,0,0,0,0,1);
	G.iridescence1 = G.iridescence2 = G.iridescence3 = 0;
	VH.orgGUI('bodyshape', 'enh | thresh');
)//JAVASCRIPT


