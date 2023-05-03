// This loads the polymer data, as provided around May 2017.
// The xyz data is used at full resolution without averaging to give 2640 particles.
// There is no contact data at this resolution so we generate dummy contact data
// and the contact datqa buttons become irrelevant
window.springdemo( {
	dir: 'polymer',
	redcontacts: {num: 2640, low: 29902001, step: 4000},
	whitecontacts: {num: 2640, low: 29902001, step: 4000},
	redxyz: {filename: 'Ery_Alfa_Structure_Boundary_Corrected.xyz', average: 1},
	whitexyz: {filename: 'mESC_Alfa_Structure_Boundary_Corrected.xyz', average: 1},
	bed: 'extrude.bed',
	wig: 'Ter119_CTCF_DH_Minus_Contam_proper_pairsCut.wig',
	annot: 'extrude.bed',
	etc: ''
});

