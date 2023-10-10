const {springdemo, CSynth, G, onframe, W, THREE, GX, S} = window;

springdemo( {
	contacts: [
        {filename: 'matrix_ery_3col.contacts', shortname: '1eryA', expand: 1},
        {filename: 'matrix_esc_3col.contacts', shortname: '4escB', expand: 1}
    ],
	etc: ''
});


W.customSettings = async () => {
    // G.backbone Scale = 6;
    G.springforce = 0.01;
    await S.waitVal(()=>GX.getgui(/vis4.*redmat.*color/));
    GX.getgui(/vis4.*redmat.*color/).setValue( new THREE.Color(0,1,0));
    GX.getgui(/vis4.*greenmat.*color/).setValue( new THREE.Color(1,0,0));
}

// this will be called once when everything set up, so can add to the gui
W.customLoadDone = () => {
}
