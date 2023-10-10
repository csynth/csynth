// This loads the polymer data, as provided around May 2017.
// All the different kinds of data should tie up appropriately.
// Range (in contacts file) is 29902001 ... 33182001
// at a resolution of 20k to give 165 particles
// which matches the xyz files of 2640 lines averaged over 16; also giving 165 particles.
//
// This is the only experiment where we can use both real xyz and real contacts data.
// and even there the experiment is confused by the resolution mix.
const {springdemo, G, CSynth} = window;
springdemo( {
	contacts: [
        {filename: 'matrix_ery_3col.contacts', shortname: '1eryA', expand: 16},
        {filename: 'matrix_esc_3col.contacts', shortname: '4escB', expand: 16}
    ],
    xyzs: [
        {filename: 'orient_red.xyz', shortname: 'RED'},
        {filename: 'orient_white.xyz', shortname: 'WHITE'}
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
    showLorentzian: true,

	etc: ''
});

window.customLoadDone = () => {
    G.stepsPerStep = 2;
    G.damp = 0.9;
    G.endblobs = 0;
    G.powBaseDist = 5;
    // G.damp = 0.5;

    G.m_force = 1.5;
    G.m_alpha = 0.33;
    G.xyzforce = 0.13;
    G.m_k = 5.44;          // experiment to align sqrt(trace)
    G.m_c = 7.4;          // experimental

    G.matDistFar = 10;
    CSynth.alignModels('lor');
    G.m_force = 0.5;
    CSynth.alignForces('lor');
}

