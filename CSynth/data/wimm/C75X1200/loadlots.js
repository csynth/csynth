// This loads the polymer data, as provided around May 2017.
// All the different kinds of data should tie up appropriately.
// Range (in contacts file) is 29902001 ... 33182001
// at a resolution of 20k to give 165 particles
// which matches the xyz files of 2640 lines averaged over 16; also giving 165 particles.
//
// This is the only experiment where we can use both real xyz and real contacts data.
// and even there the experiment is confused by the resolution mix.
const {springdemo} = window;
springdemo( {
	contacts: [
        {filename: 'matrix_ery_3col.contacts', shortname: '1eryA'},
        {filename: 'matrix_esc_3col.contacts', shortname: '4escB'}
    ],
    xyzs: [
        {filename: 'orient_red.xyz', shortname: '1R avg1', average:16},
        {filename: 'orient_red.xyz', shortname: '2R sk st 2', skip:15, start:0},
        {filename: 'orient_red.xyz', shortname: '3R sk cen 3', skip:15, start:8},
        {filename: 'orient_white.xyz', shortname: '4W avg2 4', average:16},
        {filename: 'orient_white.xyz', shortname: '5W sk st 5', skip:15, start:0},
        {filename: 'orient_white.xyz', shortname: '6W sk cen 6', skip:15, start:8}
    ],

	beds: [
        {filename: 'extrude.bed', shortname: 'extrude', description: 'extrude'},
        {filename: 'genes.bed', shortname: 'genes', description: 'genes'},
        {filename: 'prom_enh.bed', shortname: 'prom_enh', description: 'prom_enh'},
        {filename: 'ctcf.bed', shortname: 'ctcf', description: 'ctcf'},
        {shortname: 'groups', description: 'show 16 particle groups', step: 4000}
    ],
	wig: 'Ter119_CTCF_DH_Minus_Contam_proper_pairsCut.wig',
	annot: 'genes.bed',
	etc: ''
});

