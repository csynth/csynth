/** Any Node based stuff from nw_sc should be moved to here...
 *
 * Core stuff is WebSocket proxy, which should be extended to communicate about SynthDef watches etc.
 *
 * Some stuff doesn't really need to run all the time during exhibitions etc.
 *
 * Things to check for in nw_sc: require(), isNode(), runcommandphp()...
*/


import * as scLang from './sclangProcess'
import * as interfaceGen from './SynthInterfaceGenerator'
import { startWatchingSynthDefBinFiles, startWatchingSynthDefSourceFiles, addSynthdefReloadListener } from './synthdefWatch';
import { spawnSCSynth } from './scsynthProcess';
import { startProxyServer } from './scWebsocketProxy';
import {startIPCServer} from "./scInterProcessCommunication";
import { sclogS } from './sclog';
export { spawnSCSynth };//, startProxyServer, startIPCServer };

export const start = async () => {
    startProxyServer();
    startIPCServer();
    //may want to not do this when usingSCLang, as I could hook it up differently
    //but meh.
    //Yaml only gets updated when client is running, which is not ideal.
    // To do otherwise would mean spinning up an scsynth instance to load & query synths
    // Which would also mean moving more of that code to server side.
    interfaceGen.watchYaml();
    startWatchingSynthDefBinFiles();
    const usingSCLang = await scLang.maybeSpawnSCLang();
    //this will watch both source and bytecode and hopefully make use of them...
    if (usingSCLang) {
        //may consider keeping synthdef bytecode in key-value store.
        startWatchingSynthDefSourceFiles();
        //addSynthdefReloadListener() will be called in proxy...
        //Be careful about not mixing the streams
        //(literally, adding things to the same TCP stream used by proxy will break everything)
        //Either separate scsynth instance for introspection, or maybe use a different port?
        //or maybe for now different logic to spin up a temporary scsynth when client not running??
        //addSynthdefReloadListener(arg => {
            // if the client is not active, do something.
        //});
    } else sclogS('Not using SCLang');
}
