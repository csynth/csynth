// This loads the data as provided around June 2017.
// We do not have contact data at the resolution corresponding to the xyz data.
// Therefore we generate dummy data for the range, and the contacts buttons become irrelevant.
// This version averages the 1200 data points over groups of 16 to give 75 particles.
springdemo( {
	dir: 'longxyz',
	redcontacts: {num: 1200/16, low: 32001350, step: 4000},
	whitecontacts: {num: 1200/16, low: 32001350, step: 4000},
	redxyz: {filename: 'alfa_ery_Structure_Boundary_Corrected.xyz', average:16},
	whitexyz: {filename: 'alfa_mESC_Structure_Boundary_Corrected.xyz', average:16},
	bed: 'genes.bed',
	//wig: 'debug.wig',
	wig: '../polymer/Ter119_CTCF_DH_Minus_Contam_proper_pairsCut.wig',
	annot: 'genes.bed',
	etc: ''
});

