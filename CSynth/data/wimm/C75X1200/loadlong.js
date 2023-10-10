// This shows the Italy xyz data full resolution, but cannot use any contacts files
const {springdemo} = window;
springdemo( {
    numInstances: 1200, minid: 31998000, res: 250, // needed as no metadata held in xyz files
    // low computed from minid - res/2 on contacts
    xyzs: [
        {filename: 'orient_red.xyz', shortname: 'R'},
        {filename: 'orient_white.xyz', shortname: 'W'}
    ],

	beds: [
        {shortname: 'groups', description: 'show 16 particle groups', step: 4000},
        {filename: 'extrude.bed', shortname: 'extrude', description: 'extrude'},
        {filename: 'genes.bed', shortname: 'genes', description: 'genes'},
        {filename: 'prom_enh.bed', shortname: 'prom_enh', description: 'prom_enh'},
        {filename: 'ctcf.bed', shortname: 'ctcf', description: 'ctcf'}
    ],
	wig: 'Ter119_CTCF_DH_Minus_Contam_proper_pairsCut.wig',
	annot: 'genes.bed',
	etc: ''
});

