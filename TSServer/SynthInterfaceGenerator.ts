/**
 * Itch had to be scratched. Generating Typescript from SynthDef metadata.
 * TypeScript compiler API may be subject to change...
 *
 * This may be invoked from separate launch in package.json or something, at least for initial testing
 *
 */
import * as ts from 'typescript'
import {promises as fs, watchFile} from 'fs'
import * as config from './scconfig'
import * as yaml from 'js-yaml'
import {sclogS} from "./sclog";

//////////---------- thinking about what I want as input & output:::

//--these defined elsewhere...
//[sclang]
/*
SynthDef(\DummySynth, { arg bus = 0;
    Out.ar(bus, In.ar(bus));
}, metadata: (specs: (bus: \bus))).store;
//note::: metadata. 'specs' is reserved, other arbitrary key / value pairs can be added.
//https://doc.sccode.org/Classes/SynthDesc.html#Metadata%2520Examples
//bus above may well be wrong, \freq and \amp given as examples of things "in the global ControlSpec collection -- Spec.specs"
//They are converted to real ControlSpecs using .asSpec.  Something like 'bus' should not be a ControlSpec, but another kind of Spec
//http://doc.sccode.org/Classes/ControlSpec.html
//ControlSpec.new(minval: 0.0, maxval: 1.0, warp: 'lin', step: 0.0, default, units, grid)
//--- Useful thing: Spec.add(name, args) adds a spec to the global spec dictionary.  I should certainly have global specs for things like 'bus'
// -- I should have a startup.scd or something with stuff like that in.  I'd have thought 'bus' would not be a ControlSpec, but some other subclass?
//Ideally, I could use ControlSpec metadata to generate genedefs, GUI elements...
//I previously had a separate json file for this, and had been considering attempting to parse comments, which would be messy.
//only downside of this method is that it produces quite a lot of metadata file noise.
//--> I believe this is all sclang side, so anything interfacing it would have to be in an environment where that was present.
//    **that is true of all of this code anyway.**  It will mean different lifecycle & style of interaction with lang.
//    I should really use SuperColliderJS for this.
//    and it may be more at home in a vscode plugin than organic art server.

//One possibility to consider re file noise is rather than having .scsyndef & associated metadata files, to have a key / value store
//with bytecode, metadata - (maybe also the source, as well as documentation, all wrapped up in a VSCode frontend? Or better yet, Elm?)
//Loaded to scsynth server with /d_recv rather than /d_load.
//Potentially, if this was brought in via import maybe we could even end up with a very slim webpack build?

//Practically, in the short-term... I've forgotten how I was going to end this sentence and should make music.

*/
//[ts]
/**
 * may be a number, a map to a bus, a callback function...
 * there is also metadata for whether it's audio / control / other rate,
 * which should be queriable from the server.
 * I'm tempted to add formatted comments for annotating ranges etc,
 * but should resist getting carried away.
 **/
type SynthIn = {}
class Synth {
    //id, etc...
}
// SynthBus, ...
//---

let dummyMetaMap: Map<string, string[]> = new Map();
dummyMetaMap.set('DummySynth', ['bus']);

let dummyMetaObj = {
    DummySynth: ['bus']
}
// --->
//named with 'I' to avoid clash with class below.
//NOTE: Maybe this interface doesn't necessarily imply the seemingly obvious OO interpretation
//these types are *only* concerned with the input data and should remain that way.
//This may (I hope) lend itself to functional paradigm, streams... profit?
interface IDummySynth {
    bus?: SynthIn | any; //strongly typed?
}

//maybe parameterise type, where T extends SynthIn or something...
//something should be capable of returning a value of a kind appropriate to be sent to scsynth:
//most often a number, but also "a42" etc for bus mapping, maybe other edge cases?
interface ISynthRecord<T> {} //naming this 'record' because I heard about upcoming java data class feature.
interface iDummySynth<T> extends ISynthRecord<T> {
    bus?: T;
}
type SynthBuildFunction<T_Parm=SynthIn, T_IN=ISynthRecord<T_Parm>> = (inArgs?: T_IN, outArgs?: any) => XSynthBus;
interface XSynthBus {
    DummySynth: SynthBuildFunction<iDummySynth<SynthIn>>
}
type ScalarGene = {number, min, max, warp, step};
interface MSynthBus {
    DummySynth: SynthBuildFunction<iDummySynth<ScalarGene>>
}

/////or maybe even
function ParmDecorator() {
    return function(target) {

    }
}
class DummySynth extends Synth {
    //@ParmDecorator() //?
    _bus?: SynthIn;
    // get bus() {
    //     // a number, a stream... an abstraction... always with abstractions.
    //     return this._bus;
    // }
    // set bus(v) {
    //     //set the value of this._bus;
    // }
}
type _SBfn<T_IN=any> = (inArgs?:T_IN, outArgs?: any) => TSynthBus;
interface TSynthBus {
    DummySynth: _SBfn<DummySynth>
}

class TSCSynth<T> {

}
//using interface at runtime with something like this doesn't make sense
//const SynthInterfaceFromString = new Map<string, interface>()
//so how do we write the mutsynth addSynth() function...
const SynthInterfaceFromString = new Map<string, TSCSynth<any>>();
//Needs thought: For now, TSCSynth should not be parameterised,
//(or the parameterised version should be a subclass)



//////////----------------------

const strongType = true; //TODO: different strokes for different types (SynthBus interface vs Synth interface).
const synthInTypeNode: ts.TypeNode = ts.createTypeReferenceNode("TSynIn", /*typeArguments*/ undefined);
const anyTypeNode: ts.TypeNode = ts.createTypeReferenceNode("any", undefined);
const questionToken = ts.createToken(ts.SyntaxKind.QuestionToken);
//createInterfaceDeclaration expects members: ts.TypeElement[]
function createParmDecl(name: string): ts.TypeElement {
    //ts.createProperty vs ... ?
    return ts.createPropertySignature(
        /* modifiers */ undefined,
        name,
        questionToken,
        synthInTypeNode,
        /* initializer */ undefined
    );
}

function makeSynthInterface(synthName: string, parmNames: string[], asModule = false) {
    const parms = parmNames.map(createParmDecl);

    const decorators: ts.Decorator[] = undefined;
    //    /*modifiers*/ [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    const modifiers: ts.Modifier[] = asModule ? [ts.createToken(ts.SyntaxKind.ExportKeyword)] : undefined;
    const typeParams: ts.TypeParameterDeclaration[] = undefined;
    const heritageClauses: ts.HeritageClause[] = undefined; //ts.SyntaxKind.ImplementsKeyword | ts.SyntaxKind.ExtendsKeyword

    return ts.createInterfaceDeclaration(decorators, modifiers, synthName, typeParams, heritageClauses, parms);
}
type SynthSpec = Map<string, string[]>; //value type may later change to reflect sclang Spec, see notes on SynthDef metadata above.
function makeSynthInterfacesFromMap(metadata: SynthSpec, asModule = false) {
    for (const synthName in metadata.entries) {
        //maybe have a cache of existing interfaces and compare...
        const def = makeSynthInterface(synthName, metadata[synthName]);
    }
}
function makeSynthInterfacesFromAny(metadata, asModule = true) {
    const array = Object.getOwnPropertyNames(metadata).map(synthName => makeSynthInterface(synthName, metadata[synthName]));
    array.push(makeTSynthBusFactoryInterface(metadata));
    return ts.createNodeArray(array);
}

function makeTSynthBusFactoryInterface(metadata, asModule = false) {
    const members = Object.getOwnPropertyNames(metadata).map(synthName => {
        const typeArgs = strongType ? ts.createNodeArray([ts.createTypeReferenceNode(synthName, undefined)]) : undefined;
        const typeNode = ts.createTypeReferenceNode("_SBfn", typeArgs);
        return ts.createPropertySignature(
            /* modifiers */ undefined,
            synthName,
            questionToken,
            typeNode,
            /* initializer */ undefined
        );
    });
    const decorators: ts.Decorator[] = undefined;
    //    /*modifiers*/ [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    const modifiers: ts.Modifier[] = asModule ? [ts.createToken(ts.SyntaxKind.ExportKeyword)] : undefined;
    const typeParams: ts.TypeParameterDeclaration[] = undefined;
    const heritageClauses: ts.HeritageClause[] = undefined; //ts.SyntaxKind.ImplementsKeyword | ts.SyntaxKind.ExtendsKeyword

    return ts.createInterfaceDeclaration(decorators, modifiers, "TSynthBusGen", typeParams, heritageClauses, members);
}

export default async function main(ctrlNamesFile = config.synthCtrlNamesFile) {
    const t = Date.now();
    console.log('Generating TypeScript -> SynthDef bindings.');
    try {
        const specYaml = await fs.readFile(ctrlNamesFile, 'utf8');
        //may not be reading from file once running better, in which case I can use a more proper spec type.
        const spec = yaml.safeLoad(specYaml);
        const interfaces = makeSynthInterfacesFromAny(spec);
        //const synthBusInterface = makeTSynthBusFactoryInterface(spec); //do this inside makeSynthInterfaces

        //nb, sourceText with string comment looks as though it's overwritten.
        const resultPath = "./TS/mod/GeneratedSynthBindings.ts";
        const resultFile = ts.createSourceFile(resultPath, `//generated ${new Date().toLocaleString()}`, ts.ScriptTarget.Latest);
        const printer = ts.createPrinter();

        //const result = printer.printNode(ts.EmitHint.Unspecified, interfaces[0], resultFile);
        const result = printer.printList(ts.ListFormat.SourceFileStatements, interfaces, resultFile);


        //resultFile.update() //?
        //console.log(result);
        await fs.writeFile(resultPath, result); // (why) do I need this?
        console.log('finished in ' + (Date.now() - t) + 'ms');
    } catch (e) {
        console.log(`couldn't load synth spec, maybe running from wrong cwd`);
        return;
    }
}

export async function dumpCtrlNames(newCtrlNames) {
    //this should be in some other utility module or something.
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    //TODO: consider logic of this, try to do something less shit / more useful.
    await sleep(500); //pass some time so that we don't thrash too much when several change together.

    const oldYamlStr = await fs.readFile(config.synthCtrlNamesFile, 'utf8');
    //const oldYaml = yaml.safeLoad(oldYamlStr);
    //const newYaml = yaml.safeLoad(newCtrlNames);
    if (oldYamlStr !== newCtrlNames) {
        await fs.writeFile(config.synthCtrlNamesFile, newCtrlNames);
        sclogS('dumped ' + config.synthCtrlNamesFile);
        //sclog(newCtrlNames);
    }
}

// .sc changes => Electron watch picks it up, changes YAML => this regenerates binding.
// Middle bit should be able to happen without Electron running: we should eval some code in sclang if it's present.
export async function watchYaml(ctrlNamesFile = config.synthCtrlNamesFile) {
    console.log(`starting watch of '${ctrlNamesFile}'`);
    watchFile(ctrlNamesFile, {persistent: true, interval: 500}, () => {
        main(ctrlNamesFile);
    });
}
