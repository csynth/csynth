// This loads the data as provided around June 2017.
// We do not have contact data at the resolution corresponding to the xyz data.
// Therefore we generate dummy data for the range, and the contacts buttons become irrelevant.
// This version uses the full data without averaging to give 1200 particles.
springdemo( {
	dir: 'longxyz',
	redcontacts: {num: 1200, low: 32001350, step: 250},
	whitecontacts: {num: 1200, low: 32001350, step: 250},
	redxyz: {filename: 'orient_red.xyz' /* 'alfa_ery_Structure_Boundary_Corrected.xyz' */, average:1},
	whitexyz: {filename: 'orient_white.xyz' /* 'alfa_mESC_Structure_Boundary_Corrected.xyz' */, average:1},
	bed: 'genes.bed',
	wig: 'debug.wig',
	//wig: '',
	//wig: '../polymer/Ter119_CTCF_DH_Minus_Contam_proper_pairsCut.wig',
	annot: 'genes.bed',
	etc: ''
});
