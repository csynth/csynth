# TextureMaterial
3d texture material for use with three.js

This project provides a threeD texture based material for use in three.js. It derives from the work of Stephen Todd and William Latham with more recent contribution from Peter Todd. The code (in Pascal) was originally 'Evolutionary Art and Computers' (published 1992). This version has been used recently in various 'Organic Mutator' public exhibitions. It is primarily implemented in GLSL, orchestrated from Javascript.

Sample at https://sjpt.github.io/TextureMaterial/texturetest.html

## usage
Define a material `material = new TextureMaterial()` and use as other three.js materials. The mterial is effectively a subclass of `THREE.MeshPhysicalMaterial`

Some material properties (such as sheen) are set on the material in the standard three.js manner. Others are set using `COL.set` and `COL.setx` functions. (details to follow)

## technique
The underlying three dimensional texture uses code derived from MichaelPohoreski, 2016-Feb-26 pohnoise. (Our original texture function was tuned for 1990s CPU hardware and not appropriate for todays's GPUs.)

The texture value is used to divide the surface into three bands of variable width. Each band has separate properties for basic colour, shininess etc. The bands may be sharply divided or with a smoothly interpolated joining region.