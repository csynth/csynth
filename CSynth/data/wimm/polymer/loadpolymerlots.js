// This loads the polymer data, as provided around May 2017.
// All the different kinds of data should tie up appropriately.
// Range (in contacts file) is 29902001 ... 33182001
// at a resolution of 20k to give 165 particles
// which matches the xyz files of 2640 lines averaged over 16; also giving 165 particles.
//
// This is the only experiment where we can use both real xyz and real contacts data.
// and even there the experiment is confused by the resolution mix.
window.springdemo( {
	contacts: ['contacts_red.contacts', 'contacts_white.contacts'],
    xyzs: [
        {filename: '../rsse/orient_red.xyz', shortname: '1R avg', average:16},
        {filename: '../rsse/orient_white.xyz', shortname: '2W avg', average:16},
        {filename: '../rsse/orient_red.xyz', shortname: '3R sk st 0', skip:16, start:0},
        {filename: '../rsse/orient_white.xyz', shortname: '4W sk st 0', skip:16, start:0},
        {filename: '../rsse/orient_red.xyz', shortname: '5R sk st 8', skip:16, start:8},
        {filename: '../rsse/orient_white.xyz', shortname: '6W sk st 8', skip:16, start:8}
    ],

	bed: 'genes.bed',
	wig: 'Ter119_CTCF_DH_Minus_Contam_proper_pairsCut.wig',
	annot: 'genes.bed',
	etc: ''
});

