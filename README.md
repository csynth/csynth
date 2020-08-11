# CSynth
## Summary
CSynth is a tool to allow interactive exploration of bioological structures.
It incldues realtime modelling and visualization/

### about
The 3D structure of chromatin in the nucleus is important for gene expression and regulation.  Chromosome conformation capture techniques, such as Hi-C, generate large amounts of data showing interaction points on the genome but these are hard to interpret using standard tools.
Results: We have developed CSynth, an interactive 3D genome browser and real-time chromatin restraint-based modeller to visualise models of any chromosome conformation capture (3C) data. Unlike other modelling systems CSynth allows dynamic interaction with the modelling parameters to allow experimentation and effects on the model. It also allows comparison of models generated from data in different tissues / cell states and the results of third-party 3D modelling outputs. In addition, we include an option to view and manipulate these complicated structures using Virtual Reality (VR) so scientists can immerse themselves in the models for further understanding. This VR component has also proven to be a valuable teaching and public engagement tool.

## build
This codebase has been uploaded in its 'native' structure, which does not follow modern conventions. This allowed us quickly to make it easily accessible.
There are two aspects to building. This assumes that node.js and npm are already available.
### initial install to allow builds
`npm run install`
### typescript build
`npm run tsc`
Typescript source is in the TS directory, and the build javascript in the JSTS directory.
### server build
`npm run webpack`
This allows a node.js webserver for CSynth to be run locally.
`node dist\organserver.js`
and use CSynth with e.g.
`http://localhost:8800/csynth.html?startscript=rsse/loadrsse.js`


