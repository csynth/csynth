/**
 * Revisit for server building...
 * "npx webpack" builds the new 'organserver.ts' with any dependencies included.
 *
 * XXX: This was an experiment in using webpack for bundling ES modules dependencies,
 * along with some other percieved benefits. Webpack can't (easily currently) output ESM
 * for some bizarre reason AFAIK ---
 * I now believe rollup.js will cover our current use-case better
 * (and that if we manage to take it far enough, webpack might have a roll later)
 * **need to also be sure how to leak globals with rollup**
 *
 * for now, run "aaorganicart\organicart>npx webpack --config webpack.config.js"
 * (needs a wpdist folder which I might not commit for now)
 *
 * Webpack vs other (not necessarily equivalent) things:::
 * some guy on hackernoon seems to like rollup. https://hackernoon.com/7-different-ways-to-use-es-modules-today-fc552254ebf4
 * browserify seems to have little reason to exist now that es6 modules have been settled on.
 * electron-forge ---
 * seemed to have an odd dependency on some electron-prebuilt that looks deprecated, using some old chromium
 * Also didn't work properly for a simple "hello world" example.
 *
 *
 * tests with webpack... our case is a little different in that we are doing lots of (generally considered evil) eval.
 * So although a lot of things probably can be minified, that's not what we're in this for at least in the foreseeable future.
 * It *might* even be possible to use map files to translate code written in 'tranrule' etc to be converted... but never mind.
 * We want to be able to use modules, from node_modules, and live in sanity.
 *
 * For exhibition / distribution, it's not too much of a stretch to imagine that we have a 'main' js (or other) file
 * which uses all of it's dependencies via import
 * and allows us to build in the sort of way webpack wants
 * --- 13/11/20 --- looking at this again...
 *
 * In the shorter term, I should experiment with making a new version of the HTML, with a single <script src="main.js">#
 * and make that main.js simply pull in everything from JS & JSTS,
 * exposing a load of global variables allowing access to everything
 * if it goes smoothly we can then gradually chip away at getting rid of global vars etc, dealing with any issues as we find them.
 * This gives us a central place to refer to for that...
 * Probably makes sense for it to be ts rather than js so it can directly refer to all of that stuff.
 *
 * https://stackoverflow.com/questions/48998102/webpack-how-to-load-non-module-scripts-into-global-scope-window
 * suggested script-loader plugin, but the github page warns that it's deprecated and strongly advises not to use it.
 * Instead, they suggest raw-loader &
 * "import('raw-loader!someScript.js').then(rawModule => eval.call(null, rawModule.default))"
 * ---- Stephen rightly pointed out above will end up compromising debugging map to original file.
 *
 * Considerations:
 * **Any Node dependencies that were not invoked at runtime get pulled in by webpack and cause bloat**
 * Looks like we can set browser config in package.json to not use certain modules.
 * https://stackoverflow.com/questions/38908382/in-our-library-how-to-tell-webpack-to-skip-dependencies
 *
 * May want to use Node API rather than config file.
 */

const path = require('path');

module.exports = {
    entry: './TSServer/organserver.ts',
    //will refer to package.json browser section to decide how to resole, we could have another configuration for node.
    //"- configuration.target should be one of these:"
    //"web" | "webworker" | "node" | "async-node" | "node-webkit" | "electron-main" | "electron-renderer" | "electron-preload" | function
    target: 'node',
    // devtool: 'cheap-source-map', //https://webpack.js.org/configuration/devtool/
    // devtool: 'eval-source-map', //https://webpack.js.org/configuration/devtool/ // ?? gave exception loading things up
    devtool: 'source-map', //https://webpack.js.org/configuration/devtool/
    module: {
        rules: [
            {
                //got really weird results without test, pulling in some completely irrelevant stuff but not the actual code...
                test: /\.tsx?$/,
                use: 'ts-loader'
            }
        ]
    },
    externals: [
        "fsevents", //rollup tries to load this, which causes a build error
        //maybe getting rid of rollup, but fsevents can remain "external" in case similar happens later.

        "bufferutil", "utf-8-validate", //warnings about these from ws
        //some suggest using "webpack-node-externals" plugin, and calling nodeExternals() here
        //but we are not distributing a library - we want node_modules to be bundled,
        //including ones that are a basic part of node.
        //"webpack" //when webpack tries to bundle itself it gets lots of warnings
        //and an error about pnpapi.
        //"typescript"
        // {
        //     webpack: "commonjs2 webpack",
        //     typescript: "commonjs2 typescript",
        //     bufferutil: "commonjs2 bufferutil",
        //     "utf-8-validate": "commonjs2 utf-8-validate",
        //     esbuild: "commonjs2 esbuild"
        // }
    ],
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ]
    },
    //watch: true,
    mode: 'development',
    output: {
        filename: 'organserver.js',
        library: '[name]',
        devtoolModuleFilenameTemplate: '[absolute-resource-path]', //https://github.com/kube/vscode-ts-webpack-node-debug-example
        //libraryTarget: 'commonjs',
        path: path.resolve(__dirname, 'dist')
    }
};
