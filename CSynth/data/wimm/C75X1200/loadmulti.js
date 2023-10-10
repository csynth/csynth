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
        {filename: ['matrix_ery_3col.contacts'], shortname: '1eryA', expand: 2}
    ],

	beds: [
        {shortname: 'groups', description: 'show 16 particle groups', step: 4000}
    ],
	etc: ''
});

