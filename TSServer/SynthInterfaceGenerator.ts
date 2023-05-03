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

//TODO: make sure no TS is invoked at runtime in dist.
const factory = ts.factory;

const strongType = true; //TODO: different strokes for different types (SynthBus interface vs Synth interface).
const synthInTypeNode = factory.createTypeReferenceNode("TSynIn", /*typeArguments*/ undefined);
const anyTypeNode = factory.createTypeReferenceNode("any", undefined);
const questionToken = factory.createToken(ts.SyntaxKind.QuestionToken);
//createInterfaceDeclaration expects members: ts.TypeElement[]
function createParmDecl(name: string) {
    //ts.createProperty vs ... ?
    return factory.createPropertySignature(
        /* modifiers */ undefined,
        name,
        questionToken,
        synthInTypeNode,
    );
}

function makeSynthInterface(synthName: string, parmNames: string[], asModule = false) {
    const parms = parmNames.map(createParmDecl);

    const modifiers: ts.Modifier[] = asModule ? [factory.createToken(ts.SyntaxKind.ExportKeyword)] : undefined;
    const typeParams: ts.TypeParameterDeclaration[] = undefined;
    const heritageClauses: ts.HeritageClause[] = undefined; //ts.SyntaxKind.ImplementsKeyword | ts.SyntaxKind.ExtendsKeyword

    return factory.createInterfaceDeclaration(modifiers, synthName, typeParams, heritageClauses, parms);
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
    return factory.createNodeArray(array);
}

function makeTSynthBusFactoryInterface(metadata, asModule = false) {
    const members = Object.getOwnPropertyNames(metadata).map(synthName => {
        const typeArgs = strongType ? factory.createNodeArray([factory.createTypeReferenceNode(synthName, undefined)]) : undefined;
        const typeNode = factory.createTypeReferenceNode("_SBfn", typeArgs);
        return factory.createPropertySignature(
            /* modifiers */ undefined,
            synthName,
            questionToken,
            typeNode,
        );
    });
    //    /*modifiers*/ [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    const modifiers: ts.Modifier[] = asModule ? [factory.createToken(ts.SyntaxKind.ExportKeyword)] : undefined;
    const typeParams: ts.TypeParameterDeclaration[] = undefined;
    const heritageClauses: ts.HeritageClause[] = undefined; //ts.SyntaxKind.ImplementsKeyword | ts.SyntaxKind.ExtendsKeyword

    return factory.createInterfaceDeclaration(modifiers, "TSynthBusGen", typeParams, heritageClauses, members);
}

export default async function generateTypesFromCtrlNamesFile(ctrlNamesFile = config.synthCtrlNamesFile) {
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
        generateTypesFromCtrlNamesFile(ctrlNamesFile);
    });
}
