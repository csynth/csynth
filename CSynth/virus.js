'use strict';
var THREE, processFile, CSynth;

/** helper functions for virus analysis */
function Virus() {
    const dir = 'CSynth\\data\\YorkStudents\\';
    let virus = this;
    let vvvv, hhhh;

    virus.load = function(thresh = 2) {
        CSynth.current = { fullDir: '' };
        
        const vv = processFile(dir + '1aq3_full.vdb');
        const vvv = vv.realcoords;
        const centre = vvv.reduce( (c,v) => c = c.add(v), new THREE.Vector3());
        vvvv = vvv.map(x => x.sub(centre));

        CSynth.current = { fullDir: '' };
        const hh = processFile(dir + 'Hong_2017_fullRNA.vdb');
        hhhh = hh.coords.map(x => x.sub(centre));

        return virus.pairs(thresh);
    }

    virus.pairs = function(thresh = 2) {

        const pairs = [];
        for (let i=0; i < vvvv.length; i++) {
            for (let j=0; j < hhhh.length; j++) {
                const l = vvvv[i].distanceTo(hhhh[j]);
                if (l < thresh) pairs.push({i, j, l});
            }
        }
        return pairs;
    }
}
var virus = new Virus();
