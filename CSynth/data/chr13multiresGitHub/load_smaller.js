const {springdemo} = window;
springdemo( {
	project_name: 'GSE63525 - compare K562 chr 13',
    check: false,
    numInstances: 500,
	beds: [],
contacts: [
        {filename: 'chr13_50kb.contacts.zip', shortname: 'c13 50kb', description: 'chr13_50kb'},
        // {filename: 'chr13_5kb.contacts.zip', shortname: '5kbR10', description: 'chr13_5kb', reduce: 10},
        {filename: 'chr13_500kb.contacts.zip', shortname: '500kb', description: 'chr13_500kb'},
        {filename: 'chr13_50kb.contacts.zip', shortname: '50kbR10', description: 'chr13_50kbR4', reduce: 10},
        // {filename: 'chr13_5kb.contacts.zip', shortname: '5kbR2', description: 'chr13_5kb', reduce: 2},
        {filename: 'chr13_50kb.contacts.zip', shortname: '50kbR4', description: 'chr13_50kbR4', reduce: 4},
        {filename: 'chr13_50kb_GM12878.contacts.zip', shortname: '50kb GM12878', description: 'chr13_50kb_GM12878'}
    ],

	pdbs: [],
	wigs: [],
	xyzs: []
});









