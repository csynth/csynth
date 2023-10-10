// This loads the polymer data, as provided around May 2017.
// All the different kinds of data should tie up appropriately.
// Range (in contacts file) is 29902001 ... 33182001
// at a resolution of 20k to give 165 particles
// which matches the xyz files of 2640 lines averaged over 16; also giving 165 particles.
//
// This is the only experiment where we can use both real xyz and real contacts data.
// and even there the experiment is confused by the resolution mix.
window.springdemo( {
	redcontacts: 'contacts_red.contacts',
	whitecontacts: 'contacts_white.contacts',
	redxyz: {filename: 'Ery_Alfa_Structure_Boundary_Corrected.xyz', shortname: 'ery', average:16},
	whitexyz: {filename: 'mESC_Alfa_Structure_Boundary_Corrected.xyz', shortname: 'mesc', average:16},

	bed: 'genes.bed',
	wig: 'Ter119_CTCF_DH_Minus_Contam_proper_pairsCut.wig',
	annot: 'genes.bed',
	etc: ''
});

