/**
 * GPU Particle system following spring positions (and hands...)
 *
 * see https://threejs.org/examples/webgl_gpu_particle_system.html
 *
 * The approach they use there appears to involve putting an initial position
 * and velocity into *vertex attributes* (frequently spawning particles and
 * writing new things),
 * then integrating from original position every frame,
 * NOT writing updated positions to a buffer...
 * This allows it to be quite simple single pass render.
 * Maybe a similar approach could work here.
 * Indeed since the data is kept in geometry buffer rather than texture, that would rather
 * change how updating state would work.  Might look at transform feedback for this.
 */

var CSynth, V, THREE, addscript, dat, requestAnimationFrame;

CSynth.Stars = function() {
    // first experiment with using mostly untouched version of GPUParticleSystem
    addscript("JSdeps/GPUParticleSystem.js", ()=>{
        var options = {
            position: new THREE.Vector3(),
            positionRandomness: 0.3,
            velocity: new THREE.Vector3(),
            velocityRandomness: 0.5,
            color: 0xaa88ff,
            colorRandomness: 0.2,
            turbulence: 0.5,
            lifetime: 2,
            size: 5,
            sizeRandomness: 1
		};
        var spawnerOptions = {
            spawnRate: 15000,
            horizontalSpeed: 1.5,
            verticalSpeed: 1.33,
            timeScale: 1
        };

        var particleSystem = this.particleSystem = new THREE.GPUParticleSystem();
        particleSystem.name = 'particleSystem';
        V.rawscene.add(particleSystem);

        const gui = dat.GUIVR.createX("Particle System");
        gui.name = 'Particle System gui';
        //TODO: add image buttons for debugging / fun.
        const folder = dat.GUIVR.createX("buffer view...")
        gui.add(options, "velocityRandomness", 0, 3);
        gui.add(options, "positionRandomness", 0, 3);
        gui.add(options, "size", 1, 20);
        gui.add(options, "sizeRandomness", 0, 25);
        gui.add(options, "colorRandomness", 0, 1);
        gui.add(options, "lifetime", 0.1, 10);
        gui.add(options, "turbulence", 0, 1);
        gui.add({scale: 1}, "scale", 1, 1000).onChange((v)=>particleSystem.scale.set(v, v, v));

        gui.add(spawnerOptions, "spawnRate", 10, 30000);
        gui.add(spawnerOptions, "timeScale", -1, 1);

        //particleSystem.scale.set(300,300,300);
        if (V.gui) V.gui.addFolder(gui);
        else {
            gui.scale.set(300,300,300);
            V.rawscene.add(gui);
        }


        var tick = 0, clock = new THREE.Clock(true);
        function animate() {
            requestAnimationFrame(animate);
            var delta = clock.getDelta();
            tick += delta;
            if (tick < 0) tick = 0;
            // might have thought that the particle system would be responsible for
            // tracking delta and spawning its own particles based on some option...
            // not that this is a great hardship.
            if (delta > 0) {
                //I don't see any particles... but I also often don't in a simpler example,
                //so debugging there first...
                if (V.gpRok) options.position.set(V.gpR.pose.position);
                for (var x=0; x < spawnerOptions.spawnRate * delta; x++) {
                    particleSystem.spawnParticle(options);
                }
            }
            particleSystem.update(tick);
        }
    });


    // function spawnParticle({
    //     springIndex,
    //     position,
    //     index,
    //     velocity
    // } = {}) {

    // }

};
