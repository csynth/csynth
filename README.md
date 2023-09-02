# CSynth
## Summary
CSynth is a tool to allow interactive exploration of bioological structures.
It incldues realtime modelling and visualization.

For more information see [https://csynth.org/](https://csynth.org/), which also has more information about examples.
To go straight to the examples:

[Example 1. Comparison of the alpha-globin locus in different cell types:](https://csynth.github.io/csynth/csynth.html?cexample1)

[Example 2. Yeast, demonstration dataset (Crick model):](https://csynth.github.io/csynth/csynth.html?cexample2)

[Example 3. Human structural variant on chromosome 13 in K562 cells compared with GM12878:](https://csynth.github.io/csynth/csynth.html?cexample3)

### about
The 3D structure of chromatin in the nucleus is important for gene expression and regulation.  Chromosome conformation capture techniques, such as Hi-C, generate large amounts of data showing interaction points on the genome but these are hard to interpret using standard tools.
Results: We have developed CSynth, an interactive 3D genome browser and real-time chromatin restraint-based modeller to visualise models of any chromosome conformation capture (3C) data. Unlike other modelling systems CSynth allows dynamic interaction with the modelling parameters to allow experimentation and effects on the model. It also allows comparison of models generated from data in different tissues / cell states and the results of third-party 3D modelling outputs. In addition, we include an option to view and manipulate these complicated structures using Virtual Reality (VR) so scientists can immerse themselves in the models for further understanding. This VR component has also proven to be a valuable teaching and public engagement tool.

Csynth is published: CSynth: an interactive modelling and visualization tool for 3D chromatin structure
[(Bioinformatics 2021, 37(7):951-955)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8128456)

CSynth has been exhibited at the Royal Society, schools and various public festivals and is fantastic tool for getting across concepts about the complexities of genome structure.

[There is a user guide for CSynth.](https://docs.google.com/document/d/13Z8-SL9d2mDIjpoA3T59vdrogJDKKVoXqFJBu15Mbn0)
This is sadly not complete but should give some more ideas on the user of CSynth.

## using your own data
To use your own data with CSynth:

[Launch CSynth:](https://csynth.github.io/csynth/csynth.html)

Drag-drop or copy/paste files from Explorer onto the running CSynth.

or: ctrl-O to CSynth will open a file dialog: select your files to run.

More details about this to follow.

## build
The purpose of the githib.io vesion of CSynth is that end users can run it directly from the web with no need to build anything.
However, below is a quick summary of building and other ways to run CSynth.

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


