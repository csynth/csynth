const {springdemo, W, S, CSynth, GX} = window;

springdemo( {
	contacts: [
		{filename: 'contacts_red.contacts', shortname: 'Red'}, // num: 1200, minid: 32001350, maxid: 32301100, step: 250},
		{filename: 'contacts_white.contacts', shortname: 'White'} // , num: 1200, minid: 32001350, maxid: 32301100, step: 250}
	],
	beds: ['extrude.bed','genes.bed','prom_enh.bed','ctcf.bed'],
    imagetiff: 'STED_example_mouse.tif',
	etc: ''
});


W.customSettings = () => {
}

// this will be called once when everything set up, so can add to the gui
W.customLoadDone = async () => {
	await S.waitVal(() => CSynth.imagevis4);
    GX.getgui('simulationsettings/useimage').setValue(true)
}
