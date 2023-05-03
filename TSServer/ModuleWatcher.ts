import * as path from 'path'
import * as chokidar from 'chokidar'

import * as esbuild from 'esbuild'
import * as fs from 'fs';

//for now: one watcher for all files in 'sketch' for lifetime of server
//watchModule (& related functions) can subscribe (& unsubscribe) to events.
let watcher: chokidar.FSWatcher;

let sketchPath = path.resolve(__dirname, "../TS/mod/sketch/"); //TODO: allow this to be a project folder, potentially outside organicart
const buildPath = path.resolve(__dirname);

// assuming that 'WA' is declared as "window as any", and that THREE is a global object,
// makes any imported reference to three proxy to that instead.
// This still leads to ~22kb of extra code (unminified)... not sure why more dead code isn't elliminated.
const threeShim = Object.keys(require("three")).map(k=>`export const ${k} = WA.THREE.${k}`).join('\n');

//https://esbuild.github.io/plugins/#using-plugins
const externaliseThreePlugin: esbuild.Plugin = {
    name: 'three',
    setup(build) {
        build.onResolve({filter: /^three$/}, args => ({
            path: args.path,
            // external: true,
            namespace: 'three-ns'
        }));
        build.onLoad({filter: /.*/, namespace: 'three-ns'}, (args)=>({
            contents: threeShim,
            loader: 'js'
        }));
    }
}

function getBuiltName(name: string) {
    return path.resolve(buildPath, name + ".esbuild.js");
}

function getSourceName(name: string) {
    return path.resolve(sketchPath, name + ".ts");
}

const templateCode = `
let {Sphere, onUpdate, seq, EffectBus, mutNode} = W.msynthScope; //TODO: clean up this mechanism
let FXBus = EffectBus as FSynthBus, TSBus = SynthBus as FSynthBus;
let sclog = window.sclog;

export default () => {
    sclog('--- file <file> made from template in ModuleWatcher ---');
}
`;

async function initSource(source: string) {
    const exists = fs.existsSync(source);
    if (!exists) {
        const name = source.replace(/\\/g, '\\\\');
        console.log(`creating new source file '${name}'`);
        await fs.promises.writeFile(source, templateCode.replace('<file>', name));
    }
}

async function build(name: string) {
    console.log(`########### building '${name}' #############`);
    //if the source code itself doesn't exist, we can make a new file automatically?
    const source = getSourceName(name);
    initSource(source);
    const result = await esbuild.build({
        bundle: true,
        format: "esm",
        minify: false,  // was tru, changed to false to help debug
        sourcemap: true,
        // external: ['three'] //need to let it know how to get global THREE (or allow THREE to be imported?)
        // nb, plugin API liable to change
        plugins: [externaliseThreePlugin],
        entryPoints: [source],
        outfile: getBuiltName(name),
    });
    result.warnings.map(console.log);
    return result;
}

function init() {
    if (!watcher) {
        console.log("Initializing ModuleWatcher...");
        // watcher = fs.watch(sketchPath, {persistent: true});
        watcher = chokidar.watch(sketchPath, {persistent: true});
    }
}

function shouldBuild(name: string) {
    const exists = fs.existsSync(getBuiltName(name));
    if (!exists)  return true;
    const buildStats = fs.statSync(getBuiltName(name));
    // we should not just check the source file, but also all the files it imports
    // since we don't have a dependency graph, we'll check all files in the sketch folder
    // and rebuild if any of them are newer than the build
    const sourceFiles = fs.readdirSync(sketchPath);
    for (const file of sourceFiles) {
        const sourceStats = fs.statSync(path.resolve(sketchPath, file));
        if (sourceStats.mtime > buildStats.mtime) {
            console.log(`module '${name}' will be updated because '${file}' is newer than the build file`);
            return true;
        }
    }
    console.log(`module '${name}' already built, ready to load`);
    return false;
}

export async function loadModule(name: string) {
    if (!shouldBuild(name)) return true;
    const r = await build(name);
    console.log(`done building '${name}'...`);
    return true; //TODO: exceptions
}

export async function watchModule(name: string, callback: ()=>void) {
    console.log('-+++++++++++++++++++ watch module ' + name);
    init();
    watcher.removeAllListeners(); //quick&dirty hack
    watcher.on('change', async (filename) => {
        // 'chnage event ...ritualUnion' ... 'building fubu'???
        console.log(`ModuleWatcher change event: ${filename} (listener count: ${watcher.listenerCount("change")})`);
        const result = await build(name);
        if (result.warnings.length || result.errors.length) {
            console.error(`------------- build problems for '${name}' -------------: \n${JSON.stringify(result, null, 2)}`);
        }
        callback();
    })
}
