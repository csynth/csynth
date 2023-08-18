// http://localhost:8800/csynth.html?startscript=CSynth/data/Yorkstudents/newtest_v5.js&startscript=CSynth/data/chr13multires/load_5kb.js

const {springdemo} = window;
springdemo( {
	project_name: 'GSE63525 - compare K562 chr 13',
    check: false,
    numInstances: 500,
	beds: [],
	contacts: [
        {filename: 'chr13_5kb.contacts', shortname: '5kbR2', description: 'chr13_5kb', reduce: 2}
    ],

	pdbs: [],
	wigs: [],
	xyzs: []
});









