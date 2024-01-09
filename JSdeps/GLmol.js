
/*
 GLmol - Molecular Viewer on WebGL/Javascript (0.47)
  (C) Copyright 2011-2012, biochem_fan
      License: dual license of MIT or LGPL3

  Contributors:
    Robert Hanson for parseXYZ, deferred instantiation

  This program uses
      Three.js
         https://github.com/mrdoob/three.js
         Copyright (c) 2010-2012 three.js Authors. All rights reserved.
      jQuery
         http://jquery.org/
         Copyright (c) 2011 John Resig
 */
var THREE, $, hsv2rgb, col3, CSynth, objmap;

// Workaround for Intel GMA series (gl_FrontFacing causes compilation error)
THREE.ShaderLib.lambert.fragmentShader = THREE.ShaderLib.lambert.fragmentShader.replace("gl_FrontFacing", "true");
THREE.ShaderLib.lambert.vertexShader = THREE.ShaderLib.lambert.vertexShader.replace(/\}$/, "#ifdef DOUBLE_SIDED\n if (transformedNormal.z < 0.0) vLightFront = vLightBack;\n #endif\n }");

const TV3 = THREE.Vector3, TF3 = THREE.Face3, TCo = THREE.Color;

// if (THREE. Geometry)
// THREE. Geometry.prototype.colorAll = function (color) {
//    for (let i = 0; i < this.faces.length; i++) {
//       this.faces[i].color = color;
//    }
// };

THREE.Matrix4.prototype.isIdentity = function() {
   for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
         if (this.elements[i * 4 + j] !== ((i === j) ? 1 : 0)) return false; // sjpt fixed bracket bug
   return true;
};

var GLmolX = (function() {  // var to allow sharing, really const
   function GLmol(id, suppressAutoload, force2d) {
   if (id) this.create(id, suppressAutoload, force2d);
   return true;
}

GLmol.prototype.create = function(id, suppressAutoload, force2d) {
   this.Nucleotides = ['  G', '  A', '  T', '  C', '  U', ' DG', ' DA', ' DT', ' DC', ' DU'];
   this.ElementColors = {
      H: 0xCCCCCC, C: 0xAAAAAA, O: 0xCC0000, N: 0x0000CC, S: 0xCCCC00, P: 0x6622CC,
      F: 0x00CC00, CL: 0x00CC00, BR: 0x882200, I: 0x6600AA,
      FE: 0xCC6600, CA: 0x8888AA
   };
// Reference: A. Bondi, J. Phys. Chem., 1964, 68, 441.
   this.vdwRadii = {
         H: 1.2, Li: 1.82, Na: 2.27, K: 2.75, C: 1.7, N: 1.55, O: 1.52,
         F: 1.47, P: 1.80, S: 1.80, CL: 1.75, BR: 1.85, SE: 1.90,
         ZN: 1.39, CU: 1.4, NI: 1.63
      };

   this.id = id;
   this.aaScale = 1; // or 2

   this.container = $('#' + this.id);
   this.WIDTH = this.container.width() * this.aaScale; this.HEIGHT = this.container.height() * this.aaScale;
   this.ASPECT = this.WIDTH / this.HEIGHT;
   this.NEAR = 1; this.FAR = 800;
   this.CAMERA_Z = -150;
   this.webglFailed = true;
/******************************************* SJPT not for library use  * /
   try {
      if (force2d) throw new Error("WebGL disabled");
      this.renderer = new THREE.WebGLRenderer({antialias: true});
      this.renderer.sortObjects = false; // hopefully improve performance
   // 'antialias: true' now works in Firefox too!
   // setting this.aaScale = 2 will enable antialias in older Firefox but GPU load increases.
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.container.append(this.renderer.domElement);
      this.renderer.setSize(this.WIDTH, this.HEIGHT);
      this.webglFailed = false;
   } catch (e) {
      this.canvas2d = $('<canvas></canvas');
      this.container.append(this.canvas2d);
      this.canvas2d[0].height = this.HEIGHT;
      this.canvas2d[0].width = this.WIDTH;
   }

   this.camera = new THREE.PerspectiveCamera(20, this.ASPECT, 1, 800); // will be updated anyway
   // this.camera.position = new TV3(0, 0, this.CAMERA_Z);
   this.camera.position.set(0, 0, this.CAMERA_Z);
   this.camera.lookAt(new TV3(0, 0, 0));
   this.perspectiveCamera = this.camera;
   this.orthoscopicCamera = new THREE.OrthographicCamera();
   this.orthoscopicCamera.position.z = this.CAMERA_Z;
   this.orthoscopicCamera.lookAt(new TV3(0, 0, 0));

   const self = this;
   $(window).resize(function() { // only window can capture resize event
      self.WIDTH = self.container.width() * self.aaScale;
      self.HEIGHT = self.container.height() * self.aaScale;
      if (!self.webglFailed) {
         self.ASPECT = self.WIDTH / self.HEIGHT;
         self.renderer.setSize(self.WIDTH, self.HEIGHT);
         self.camera.aspect = self.ASPECT;
         self.camera.updateProjectionMatrix();
      } else {
         self.canvas2d[0].height = self.HEIGHT;
         self.canvas2d[0].width = self.WIDTH;
      }
      self.show();
   });
/***************************************** */

   this.scene = null;
   this.rotationGroup = null; // which contains modelGroup
   this.modelGroup = null;

   this.bgColor = 0x000000;
   this.fov = 20;
   this.fogStart = 0.4;
   this.slabNear = -50; // relative to the center of rotationGroup
   this.slabFar = +50;

   // Default values
   this.sphereRadius = 1.5;
   this.cylinderRadius = 0.4;
   this.lineWidth = 1.5 * this.aaScale;
   this.curveWidth = 3 * this.aaScale;
   this.defaultColor = 0xCCCCCC;
   this.sphereQuality = 16; //16;
   this.cylinderQuality = 16; //8;
   this.axisDIV = 5; // 3 still gives acceptable quality
   this.strandDIV = 6;
   this.nucleicAcidStrandDIV = 4;
   this.tubeDIV = 8;
   this.coilWidth = 0.3;
   this.helixSheetWidth = 1.3;
   this.nucleicAcidWidth = 0.8;
   this.thickness = 0.4;

   // UI variables
   this.cq = new THREE.Quaternion(1, 0, 0, 0);
   this.dq = new THREE.Quaternion(1, 0, 0, 0);
   this.isDragging = false;
   this.mouseStartX = 0;
   this.mouseStartY = 0;
   this.currentModelPos = 0;
   this.cz = 0;
   this.enableMouse();

   if (suppressAutoload) return;
   this.loadMolecule();
}

GLmol.prototype.setupLights = function(scene) {
   const directionalLight =  new THREE.DirectionalLight(0xFFFFFF);
   // directionalLight.position = new TV3(0.2, 0.2, -1).normalize();
   directionalLight.position.set(0.2, 0.2, -1).normalize();
   directionalLight.intensity = 1.2;
   scene.add(directionalLight);
   const ambientLight = new THREE.AmbientLight(0x202020);
   scene.add(ambientLight);
};

GLmol.prototype.parseSDF = function(str) {
   const atoms = this.atoms;
   const protein = this.protein;

   const lines = str.split("\n");
   if (lines.length < 4) return;
   const atomCount = parseInt(lines[3].substr(0, 3));
   if (isNaN(atomCount) || atomCount <= 0) return;
   const bondCount = parseInt(lines[3].substr(3, 3));
   let offset = 4;
   if (lines.length < 4 + atomCount + bondCount) return;
   for (let i = 1; i <= atomCount; i++) {
      const line = lines[offset];
      offset++;
      const atom = {};
      atom.serial = i;
      atom.x = parseFloat(line.substr(0, 10));
      atom.y = parseFloat(line.substr(10, 10));
      atom.z = parseFloat(line.substr(20, 10));
      atom.originDistance = Math.sqrt(atom.x**2 + atom.y**2 + atom.z**2);
      atom.hetflag = true;
      atom.atom = atom.elem = line.substr(31, 3).trim();
      atom.bonds = [];
      atom.bondOrder = [];
      atoms[i] = atom;
   }
   for (let i = 1; i <= bondCount; i++) {
      const line = lines[offset];
      offset++;
      const from = parseInt(line.substr(0, 3));
      const to = parseInt(line.substr(3, 3));
      const order = parseInt(line.substr(6, 3));
      atoms[from].bonds.push(to);
      atoms[from].bondOrder.push(order);
      atoms[to].bonds.push(from);
      atoms[to].bondOrder.push(order);
   }

   protein.smallMolecule = true;
   return true;
};

GLmol.prototype.parseXYZ = function(str) {
   const atoms = this.atoms;
   const protein = this.protein;

   const lines = str.split("\n");
   if (lines.length < 3) return;
   const atomCount = parseInt(lines[0].substr(0, 3));
   if (isNaN(atomCount) || atomCount <= 0) return;
   if (lines.length < atomCount + 2) return;
   let offset = 2;
   for (let i = 1; i <= atomCount; i++) {
      const line = lines[offset++];
      const tokens = line.replace(/^\s+/, "").replace(/\s+/g," ").split(" ");
      console.log(tokens);
      const atom = {};
      atom.serial = i;
      atom.atom = atom.elem = tokens[0];
      atom.x = parseFloat(tokens[1]);
      atom.y = parseFloat(tokens[2]);
      atom.z = parseFloat(tokens[3]);
      atom.originDistance = Math.sqrt(atom.x**2 + atom.y**2 + atom.z**2);
      atom.hetflag = true;
      atom.bonds = [];
      atom.bondOrder = [];
      atoms[i] = atom;
   }
   for (let i = 1; i < atomCount; i++) // hopefully XYZ is small enough
      for (let j = i + 1; j <= atomCount; j++)
         if (this.isConnected(atoms[i], atoms[j])) {
            atoms[i].bonds.push(j);
            atoms[i].bondOrder.push(1);
            atoms[j].bonds.push(i);
            atoms[j].bondOrder.push(1);
         }
   protein.smallMolecule = true;
   return true;
};

GLmol.prototype.parsePDB2 = function(str) {
   const atoms = this.atoms;
   const protein = this.protein;
   const residue = this.residue = {};  // keyed by chain+resi, for quicker location of residue
   this.chains = [];
   this.chaingroups = [0];
   this.models = [];
   let molID;

   const atoms_cnt = 0;
   const lines = str.split("\n");
   let chaingroup = 0;
   let model = 0;
   let serial = 0;
   let chainid = -1;    // will be set to 0 on first atom
   let lastChain = '', lastResi = '';
   const hy36Offset = [];
   for (let i=1; i<6; i++) {
      const aa = 'a00000000000000';
      hy36Offset[i] = - parseInt(aa.substring(0, i), 36) + 10**i;
   }
   function parseHy36(sstr) {
      const n = parseInt(sstr);
      if (!isNaN(n)) return n;
      return parseInt(sstr, 36) + hy36Offset[sstr.length];
   }

   let serialOffset = 0;

   for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/^\s*/, ''); // remove indent
      const recordName = line.substr(0, 6);
      if (recordName === 'ATOM  ' || recordName === 'HETATM' || line.substr(0, 5) === 'ATOM ') {
         let atom, resn, chain, resi, x, y, z, originDistance, hetflag, elem, fileserial, altLoc, b;
         altLoc = line.substr(16, 1);
         if (altLoc !== ' ' && altLoc !== 'A') continue; // FIXME: ad hoc
         if (line.substr(0, 5) === 'ATOM ' && recordName !== 'ATOM  ')
            fileserial = parseInt(line.substr(5, 6));      // special case for overflowing atom#
         else
            fileserial = parseHy36(line.substr(6, 5));
         if (isNaN(fileserial)) {
            console.error('bad serial in line', line);
            continue;
         }
         atom = line.substr(12, 4).trim();
         resn = line.substr(17, 3);
         chain = line.substr(21, 1);
         resi = parseInt(line.substr(22, 5));
         if (chain < lastChain || resi < lastResi) {  // warning: too many chaingroups if input onot in chaingroup order
            chaingroup++;
            this.chaingroups.push(serial);
         }
         if (chain !== lastChain || resi < lastResi) {
            chainid++;
            this.chains.push({chainid, chaingroup, chain, residues: []});
         }
         lastChain = chain;
         lastResi = resi;
         x = parseFloat(line.substr(30, 8));
         y = parseFloat(line.substr(38, 8));
         z = parseFloat(line.substr(46, 8));
         originDistance = Math.sqrt(x*x + y*y + z*z);

         b = parseFloat(line.substr(60, 8));
         elem = line.substr(76, 2).trim();
         if (elem === '') { // for some incorrect PDB files
            elem = line.substr(12, 4).replace(/ /g,"");
         }
         if (line[0] === 'H') hetflag = true;
         else hetflag = false;

         let k = chain + resi;      // key in usual case
         if (model !== 0) k = k + 'm' + model;
         if (residue[k] && residue[k].chaingroup !== chaingroup)
            k = k + '/' + chaingroup;  // special key for duplicated residues
         if (!residue[k]) {
            residue[k] = {startResi: serial, endResi: serial, chaingroup, k, chainid};
            this.chains[chainid].residues.push(residue[k]);
         } else {
            residue[k].endResi = serial;
         }

         // TO VERIFY, serialOffset is irrelevant with increaing serial and separate fileserial
         if (atoms[serial + serialOffset]) {
            console.log('repeated atom serial', serial, 'serialOffest increased from ', serialOffset, 'to', atoms.length)
            serialOffset = atoms.length;
         }
         atoms[serial + serialOffset] = {
            resn, x, y, z,  originDistance, elem, hetflag,
            chain, chaingroup, chainid, resi, serial, atom, glmol: this, model, fileserial,
            residue: residue[k], serialOffset,
            bonds: [], ss: 'c', color: 0xFFFFFF, bondOrder: [], b: b /*', altLoc': altLoc*/
         };
         serial++;
      } else if (recordName === 'SHEET ') {
         const s = {};
         // extra fields added to parse, sjpt 6 April, parsed as object with [0] etc for backward compatibility
         s.index = protein.sheet.length;
         s.name = line.substr(11,3);
         s[0] = s.startChain = line.substr(21, 1);
         s[1] = s.startResi = parseHy36(line.substr(22, 4));
         s[2] = s.endChain = line.substr(32, 1);
         s[3] = s.endResi = parseHy36(line.substr(33, 4));
         s.sense = parseInt(line.substr(38,2));
         s.kChainMe = line.substr(49,1);
         s.kResiMe = parseHy36(line.substr(50, 4));
         s.kChainPrev = line.substr(64,1);
         s.kResiPrev = parseHy36(line.substr(65, 4));
         protein.sheet.push(s);
     } else if (recordName === 'CONECT') {
// MEMO: We don't have to parse SSBOND, LINK because both are also
// described in CONECT. But what about 2JYT???
         const from = parseInt(line.substr(6, 5));
         for (let j = 0; j < 4; j++) {
            const to = parseInt(line.substr([11, 16, 21, 26][j], 5));
            if (isNaN(to)) continue;
            if (atoms[from] !== undefined) {
               atoms[from].bonds.push(to);
               atoms[from].bondOrder.push(1);
            }
         }
     } else if (recordName === 'HELIX ') {
         const s = {};
         s.startChain = s[0] = line.substr(19, 1);
         s.startResi = s[1] = parseHy36(line.substr(21, 4));
         s.endChain = s[3] = line.substr(31, 1);
         s.endResi = s[3] = parseHy36(line.substr(33, 4));
         protein.helix.push(s);
     } else if (recordName === 'CRYST1') {
         protein.a = parseFloat(line.substr(6, 9));
         protein.b = parseFloat(line.substr(15, 9));
         protein.c = parseFloat(line.substr(24, 9));
         protein.alpha = parseFloat(line.substr(33, 7));
         protein.beta = parseFloat(line.substr(40, 7));
         protein.gamma = parseFloat(line.substr(47, 7));
         protein.spacegroup = line.substr(55, 11);
         this.defineCell();
      } else if (recordName === 'REMARK') {
         const type = parseInt(line.substr(7, 3));
         if (type === 290 && line.substr(13, 5) === 'SMTRY') {
            const n = parseInt(line[18]) - 1;
            const vals = line.substr(20).split(' ').filter(x => x);
            const m = parseInt(vals[0]); // (line.substr(21, 2));
            if (protein.symMat[m] === undefined) protein.symMat[m] = new THREE.Matrix4().identity();
            protein.symMat[m].elements[n] = parseFloat(vals[1]); // parseFloat(line.substr(24, 9));
            protein.symMat[m].elements[n + 4] = parseFloat(vals[2]); // parseFloat(line.substr(34, 9));
            protein.symMat[m].elements[n + 8] = parseFloat(vals[3]); // parseFloat(line.substr(44, 9));
            protein.symMat[m].elements[n + 12] = parseFloat(vals[4]); // parseFloat(line.substr(54, 10));
         } else if (type === 350 && line.substr(13, 5) === 'BIOMT') {
            // nb, 1mx4.pdb let column positions to move with m >= 100
            const n = parseInt(line[18]) - 1;
            const vals = line.substr(20).split(' ').filter(x => x);
            const m = parseInt(vals[0]);  // (line.substr(21, 2));
            if (protein.biomtMatrices[m] === undefined) protein.biomtMatrices[m] = new THREE.Matrix4().identity();
            protein.biomtMatrices[m].elements[n] = parseFloat(vals[1]); // parseFloat(line.substr(24, 9));
            protein.biomtMatrices[m].elements[n + 4] = parseFloat(vals[2]); // parseFloat(line.substr(34, 9));
            protein.biomtMatrices[m].elements[n + 8] = parseFloat(vals[3]); // parseFloat(line.substr(44, 9));
            protein.biomtMatrices[m].elements[n + 12] = parseFloat(vals[4]); // parseFloat(line.substr(60, 10));
         } else if (type === 350 && line.substr(11, 11) === 'BIOMOLECULE') {
             protein.biomtMatrices = []; protein.biomtChains = '';
         } else if (type === 350 && line.substr(34, 6) === 'CHAINS') {
             protein.biomtChains += line.substr(41, 40);
         } else if (type === 285 && line.substr(11, 2) === 'X0') {
            if (protein.x0Mat === undefined) protein.x0Mat = new THREE.Matrix4().identity();
            const vals = line.substr(15).split(' ').filter(x => x);
            const n = parseInt(vals[0]) - 1;  //parseInt(line[15]) - 1;
            protein.x0Mat.elements[n] = parseFloat(vals[1]); // parseFloat(line.substr(19, 9));
            protein.x0Mat.elements[n + 4] = parseFloat(vals[2]); // parseFloat(line.substr(30, 9));
            protein.x0Mat.elements[n + 8] = parseFloat(vals[3]); // parseFloat(line.substr(41, 9));
            protein.x0Mat.elements[n + 12] = parseFloat(vals[4]); // parseFloat(line.substr(53, 10));
         }
      } else if (recordName === 'HEADER') {
         protein.pdbID = line.substr(62, 4);
      } else if (recordName === 'TITLE ') {
         if (protein.title === undefined) protein.title = "";
            protein.title += line.substr(10, 70) + "\n"; // CHECK: why 60 is not enough???
      } else if (recordName === 'MODEL ') {
            const dd = line.substr(6, 14).trim();
            if (dd === '+')
               model++;
            else
               model = parseInt(dd);
            this.models.push(model);
      } else if (recordName === 'COMPND') {
            // TODO: Implement me!
      }
   }
   this.chaingroups.push(serial);  // so we can find the last one

   // // Assign secondary structures
   // //PJT::: some extra /alternate assignment of SS. Augmenting rather than redefining existing glmol.
   // //maybe precompute structDir here even? Maybe better to do it later when we have smooth curvePoints
   // // Changed to extend existing glmol
   // const sheetObjects = protein.sheetObjects = protein.sheet.map(arr => {
   //    return { startChain: arr[0], startResi: arr[1], endChain: arr[2], endResi: arr[3] }
   // });
   // const helixObjects = protein.helixObjects = protein.helix.map(arr => {
   //    return { startChain: arr[0], startResi: arr[1], endChain: arr[2], endResi: arr[3] }
   // });
   const clog = (...a) => {}; // console.log(...a);  // conditional logging

   clog('sheet prepare sheets -----------------------------------------', this.id);
const models = this.models.length === 0 ? [0] : this.models;
for (let modi = 0; modi < models.length; modi++) {
   const mod = models[modi];
   const mkey = mod !== 0 ? 'm' + mod : '';
   for (let j = 0; j < protein.sheet.length; j++) {
      const sheet = protein.sheet[j];

      // fill in basic data
      for (let resi = sheet.startResi; resi < sheet.endResi; resi++) {
         let reskey = sheet.startChain + resi + mkey;
         const res = this.residue[reskey];
         for (let ati = res.startResi; ati <= res.endResi; ati++) {
            const atom = this.atoms[ati];
            atom.ss = 's';
            atom.sheet = sheet;
            if (atom.resi === res.startResi) atom.ssbegin = true;
            else if (atom.resi === res.endResi) atom.ssend = true;
         }
      }

      // sheet has index, startChain, startResi, endChain, endResi, sense, kChainMe, kResiMe, kChainPrev, kResiPrev
      // work out residue pairs
      // note that Hong_2017_15loops_5tc1.pdb has incorrect sheets, also 1aq3_full.pdb
      if (sheet.sense !== 0 && !isNaN(sheet.kResiPrev)) {               // will be 0 on first strand of each sheet
         const prev = protein.sheet[j-1];
         // making assumptions about input data here, some basic cheking
         if (prev.startChain !== sheet.kChainPrev || sheet.kResiPrev < prev.startResi || sheet.kResiPrev > prev.endResi) {
            console.error('unexpected sheet information', prev.startChain, '!=', sheet.kChainPrev, sheet.kResiPrev, '!in', prev.startResi, prev.endResi);
         }
         // now find matching pairs; could marginally optimize this but would make less clear?
         clog('sheet strand ----')
         for (let resi = sheet.startResi; resi < sheet.endResi; resi++) {
            const off = resi - sheet.kResiMe;                              // offset from reference pairs
            const presi = sheet.kResiPrev + off * sheet.sense;             // paired index in prev sheet
            if (presi < prev.startResi || presi > prev.endResi) continue;  // out of range on prev sheet
            clog('sheet pair', resi, presi);
            const res = this.residue[sheet.startChain + resi + mkey];      // find the matching residues
            const pres = this.residue[prev.startChain + presi + mkey];
            if (pres) {                                                     // if possible
               res.prevsheetres = pres;                                    // make residue level connections
               pres.nextsheetres = res;
            }
         }
      } else {
         clog('sheet new sheet -------' + sheet.name);
      }
   }

   for (let j = 0; j < protein.helix.length; j++) {
      const helix = protein.helix[j];
      for (let resi = helix.startResi; resi < helix.endResi; resi++) {
         const res = this.residue[helix.startChain + resi + mkey];
         for (let ati = res.startResi; ati <= res.endResi; ati++) {
            const atom = this.atoms[ati];
            atom.ss = 'h';
            atom.helix = helix;
            if (atom.resi === res.startResi) atom.ssbegin = true;
            else if (atom.resi === res.endResi) atom.ssend = true;
         }
      }
   }
} // over chaingroups

   protein.smallMolecule = false;
   return true;
};

GLmol.prototype.findCentre = function() {
   const atoms = this.atoms;
   let sx = 0, sy = 0, sz = 0, n = 0;
   for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i]; if (atom === undefined) continue;
      sx += atom.x;
      sy += atom.y;
      sz += atom.z;
      n++;
   }
   return this.centre  = new TV3(sx/n, sy/n, sz/n);
}

GLmol.prototype.useCentre = function(cen = this.findCentre()) {
   const atoms = this.atoms;
   for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i]; if (atom === undefined) continue;
      atom.x -= cen.x;
      atom.y -= cen.y;
      atom.z -= cen.z;
      atom.originDistance = Math.sqrt(atom.x*atom.x + atom.y*atom.y + atom.z*atom.z);
   }
   return cen;
}

GLmol.prototype.applyMatrix4 = function(m) {
   const atoms = this.atoms;
   const v = new TV3();
   for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i]; if (atom === undefined) continue;
      atom.rawxyz = new TV3(atom.x, atom.y, atom.z);
      v.set(atom.x, atom.y, atom.z).applyMatrix4(m);
      atom.x = v.x;
      atom.y = v.y;
      atom.z = v.z;
      atom.originDistance = Math.sqrt(atom.x*atom.x + atom.y*atom.y + atom.z*atom.z);
   }
   return m;
}


// Catmull-Rom subdivision
GLmol.prototype.subdivide = function(_points, DIV) { // points as Vector3
   const ret = [];
   let points = _points;
   points = []; // new Array(); // Smoothing test
   points.push(_points[0]);
   for (let i = 1, lim = _points.length - 1; i < lim; i++) {
      const p1 = _points[i], p2 = _points[i + 1];
      if (p1.smoothen) points.push(new TV3((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2));
      else points.push(p1);
   }
   points.push(_points[_points.length - 1]);

   for (let i = -1, size = points.length; i <= size - 3; i++) {
      const p0 = points[(i === -1) ? 0 : i];
      const p1 = points[i + 1], p2 = points[i + 2];
      const p3 = points[(i === size - 3) ? size - 1 : i + 3];
      const v0 = new TV3().subVectors(p2, p0).multiplyScalar(0.5);
      const v1 = new TV3().subVectors(p3, p1).multiplyScalar(0.5);
      for (let j = 0; j < DIV; j++) {
         const t = 1.0 / DIV * j;
         const x = p1.x + t * v0.x
                  + t * t * (-3 * p1.x + 3 * p2.x - 2 * v0.x - v1.x)
                  + t * t * t * (2 * p1.x - 2 * p2.x + v0.x + v1.x);
         const y = p1.y + t * v0.y
                  + t * t * (-3 * p1.y + 3 * p2.y - 2 * v0.y - v1.y)
                  + t * t * t * (2 * p1.y - 2 * p2.y + v0.y + v1.y);
         const z = p1.z + t * v0.z
                  + t * t * (-3 * p1.z + 3 * p2.z - 2 * v0.z - v1.z)
                  + t * t * t * (2 * p1.z - 2 * p2.z + v0.z + v1.z);
         ret.push(new TV3(x, y, z));
      }
   }
   ret.push(points[points.length - 1]);
   return ret;
};

// GLmol.prototype.drawAtomsAsSphere = function(group, atomlist, defaultRadius, forceDefault, scale) {
//    const sphereGeometry = new THREE.SphereGeometry(1, this.sphereQuality, this.sphereQuality); // r, seg, ring
//    for (let i = 0; i < atomlist.length; i++) {
//       const atom = this.atoms[atomlist[i]];
//       if (atom === undefined) continue;

//       const sphereMaterial = this.mat || new (THREE.MeshLambertMaterial)({color: atom.color});
//       const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
//       let r = (!forceDefault && this.vdwRadii[atom.elem] !== undefined) ? this.vdwRadii[atom.elem] : defaultRadius;
//       if (!forceDefault && scale) r *= scale;
//       sphere.scale.x = sphere.scale.y = sphere.scale.z = r;
//       sphere.position.x = atom.x;
//       sphere.position.y = atom.y;
//       sphere.position.z = atom.z;
//       if (group.mergeMesh)
//          group.mergeMesh(sphere);
//       else
//          group.add(sphere);
//    }
// };

// // about two times faster than sphere when div = 2
// GLmol.prototype.drawAtomsAsIcosahedron = function(group, atomlist, defaultRadius, forceDefault) {
//    const geo = this.IcosahedronGeometry();
//    for (let i = 0; i < atomlist.length; i++) {
//       const atom = this.atoms[atomlist[i]];
//       if (atom === undefined) continue;

//       const mat = new (this.mat || THREE.MeshLambertMaterial)({color: atom.color});
//       const sphere = new THREE.Mesh(geo, mat);
//       sphere.scale.x = sphere.scale.y = sphere.scale.z = (!forceDefault && this.vdwRadii[atom.elem] !== undefined) ? this.vdwRadii[atom.elem] : defaultRadius;
//       group.add(sphere);
//       sphere.position.x = atom.x;
//       sphere.position.y = atom.y;
//       sphere.position.z = atom.z;
//    }
// };

GLmol.prototype.isConnected = function(atom1, atom2) {
   const s = atom1.bonds.indexOf(atom2.serial);
   if (s !== -1) return atom1.bondOrder[s];

   if (this.protein.smallMolecule && (atom1.hetflag || atom2.hetflag)) return 0; // CHECK: or should I ?

   const distSquared = (atom1.x - atom2.x) * (atom1.x - atom2.x) +
                     (atom1.y - atom2.y) * (atom1.y - atom2.y) +
                     (atom1.z - atom2.z) * (atom1.z - atom2.z);

//   if (atom1.altLoc !== atom2.altLoc) return false;
   if (isNaN(distSquared)) return 0;
   if (distSquared < 0.5) return 0; // maybe duplicate position.

   if (distSquared > 1.3 && (atom1.elem === 'H' || atom2.elem === 'H' || atom1.elem === 'D' || atom2.elem === 'D')) return 0;
   if (distSquared < 3.42 && (atom1.elem === 'S' || atom2.elem === 'S')) return 1;
   if (distSquared > 2.78) return 0;
   return 1;
};

// GLmol.prototype.drawBondAsStickSub = function(group, atom1, atom2, bondR, order) {
//    let delta, tmp;
//    if (order > 1) delta = this.calcBondDelta(atom1, atom2, bondR * 2.3);
//    const p1 = new TV3(atom1.x, atom1.y, atom1.z);
//    const p2 = new TV3(atom2.x, atom2.y, atom2.z);
//    const mp = p1.clone().add(p2).multiplyScalar(0.5);

//    const c1 = new TCo(atom1.color), c2 = new TCo(atom2.color);
//    if (order === 1 || order === 3) {
//       this.drawCylinder(group, p1, mp, bondR, atom1.color);
//       this.drawCylinder(group, p2, mp, bondR, atom2.color);
//    }
//    if (order > 1) {
//       tmp = mp.clone().add(delta);
//       this.drawCylinder(group, p1.clone().add(delta), tmp, bondR, atom1.color);
//       this.drawCylinder(group, p2.clone().add(delta), tmp, bondR, atom2.color);
//       tmp = mp.clone().sub(delta);
//       this.drawCylinder(group, p1.clone().sub(delta), tmp, bondR, atom1.color);
//       this.drawCylinder(group, p2.clone().sub(delta), tmp, bondR, atom2.color);
//    }
// };

// GLmol.prototype.drawBondsAsStick = function(group, atomlist, bondR, atomR, ignoreNonbonded, multipleBonds, scale) {
//    const sphereGeometry = new THREE.SphereGeometry(1, this.sphereQuality, this.sphereQuality);
//    let nAtoms = atomlist.length, mp;
//    const forSpheres = [];
//    if (multipleBonds) bondR /= 2.5;
//    for (let _i = 0; _i < nAtoms; _i++) {
//       const i = atomlist[_i];
//       const atom1 = this.atoms[i];
//       if (atom1 === undefined) continue;
//       for (let _j = _i + 1; _j < _i + 30 && _j < nAtoms; _j++) {
//          const j = atomlist[_j];
//          const atom2 = this.atoms[j];
//          if (atom2 === undefined) continue;
//          const order = this.isConnected(atom1, atom2);
//          if (order === 0) continue;
//          atom1.connected = atom2.connected = true;
//          this.drawBondAsStickSub(group, atom1, atom2, bondR, (multipleBonds) ? order : 1);
//       }
//       for (let _j = 0; _j < atom1.bonds.length; _j++) {
//          const j = atom1.bonds[_j];
//          if (j < i + 30) continue; // be conservative!
//          if (atomlist.indexOf(j) === -1) continue;
//          const atom2 = this.atoms[j];
//          if (atom2 === undefined) continue;
//          atom1.connected = atom2.connected = true;
//          this.drawBondAsStickSub(group, atom1, atom2, bondR, (multipleBonds) ? atom1.bondOrder[_j] : 1);
//       }
//       if (atom1.connected) forSpheres.push(i);
//    }
//    if (atomR) this.drawAtomsAsSphere(group, forSpheres, atomR, !scale, scale);
// };

GLmol.prototype.defineCell = function() {
    const p = this.protein;
    if (p.a === undefined) return;

    p.ax = p.a;
    p.ay = 0;
    p.az = 0;
    p.bx = p.b * Math.cos(Math.PI / 180.0 * p.gamma);
    p.by = p.b * Math.sin(Math.PI / 180.0 * p.gamma);
    p.bz = 0;
    p.cx = p.c * Math.cos(Math.PI / 180.0 * p.beta);
    p.cy = p.c * (Math.cos(Math.PI / 180.0 * p.alpha) -
               Math.cos(Math.PI / 180.0 * p.gamma)
             * Math.cos(Math.PI / 180.0 * p.beta)
             / Math.sin(Math.PI / 180.0 * p.gamma));
    p.cz = Math.sqrt(p.c * p.c * Math.sin(Math.PI / 180.0 * p.beta)
               * Math.sin(Math.PI / 180.0 * p.beta) - p.cy * p.cy);
};

// GLmol.prototype.drawUnitcell = function(group) {
//     const p = this.protein;
//     if (p.a === undefined) return;

//     const vertices = [[0, 0, 0], [p.ax, p.ay, p.az], [p.bx, p.by, p.bz], [p.ax + p.bx, p.ay + p.by, p.az + p.bz],
//           [p.cx, p.cy, p.cz], [p.cx + p.ax, p.cy + p.ay,  p.cz + p.az], [p.cx + p.bx, p.cy + p.by, p.cz + p.bz], [p.cx + p.ax + p.bx, p.cy + p.ay + p.by, p.cz + p.az + p.bz]];
//     const edges = [0, 1, 0, 2, 1, 3, 2, 3, 4, 5, 4, 6, 5, 7, 6, 7, 0, 4, 1, 5, 2, 6, 3, 7];

//     const geo = new THREE. Geometry();
//     for (let i = 0; i < edges.length; i++) {
//        geo.vert ices.push(new TV3(vertices[edges[i]][0], vertices[edges[i]][1], vertices[edges[i]][2]));
//     }
//    const lineMaterial = new THREE.LineBasicMaterial({linewidth: 1, color: 0xcccccc});
//    const line = new THREE.Line(geo, lineMaterial);
//    line.type = THREE.LinePieces;
//    group.add(line);
// };

// TODO: Find inner side of a ring
GLmol.prototype.calcBondDelta = function(atom1, atom2, sep) {
   let dot;
   const axis = new TV3(atom1.x - atom2.x, atom1.y - atom2.y, atom1.z - atom2.z).normalize();
   let found = null;
   for (let i = 0; i < atom1.bonds.length && !found; i++) {
      const atom = this.atoms[atom1.bonds[i]]; if (!atom) continue;
      if (atom.serial !== atom2.serial && atom.elem !== 'H') found = atom;
   }
   for (let i = 0; i < atom2.bonds.length && !found; i++) {
      const atom = this.atoms[atom2.bonds[i]]; if (!atom) continue;
      if (atom.serial !== atom1.serial && atom.elem !== 'H') found = atom;
   }
   let delta;
   if (found) {
      const tmp = new TV3(atom1.x - found.x, atom1.y - found.y, atom1.z - found.z).normalize();
      dot = tmp.dot(axis);
      delta = new TV3(tmp.x - axis.x * dot, tmp.y - axis.y * dot, tmp.z - axis.z * dot);
   }
   if (!found || Math.abs(dot - 1) < 0.001 || Math.abs(dot + 1) < 0.001) {
      if (axis.x < 0.01 && axis.y < 0.01) {
         delta = new TV3(0, -axis.z, axis.y);
      } else {
         delta = new TV3(-axis.y, axis.x, 0);
      }
   }
   delta.normalize().multiplyScalar(sep);
   return delta;
};

// GLmol.prototype.drawBondsAsLineSub = function(geo, atom1, atom2, order) {
//    let delta, tmp, vs = geo.vert ices, cs = geo.colors;
//    if (order > 1) delta = this.calcBondDelta(atom1, atom2, 0.15);
//    const p1 = new TV3(atom1.x, atom1.y, atom1.z);
//    const p2 = new TV3(atom2.x, atom2.y, atom2.z);
//    const mp = p1.clone().add(p2).multiplyScalar(0.5);

//    const c1 = new TCo(atom1.color), c2 = new TCo(atom2.color);
//    if (order === 1 || order === 3) {
//       vs.push(p1); cs.push(c1); vs.push(mp); cs.push(c1);
//       vs.push(p2); cs.push(c2); vs.push(mp); cs.push(c2);
//    }
//    if (order > 1) {
//       vs.push(p1.clone().add(delta)); cs.push(c1);
//       vs.push(tmp = mp.clone().add(delta)); cs.push(c1);
//       vs.push(p2.clone().add(delta)); cs.push(c2);
//       vs.push(tmp); cs.push(c2);
//       vs.push(p1.clone().sub(delta)); cs.push(c1);
//       vs.push(tmp = mp.clone().sub(delta)); cs.push(c1);
//       vs.push(p2.clone().sub(delta)); cs.push(c2);
//       vs.push(tmp); cs.push(c2);
//    }
// };

// GLmol.prototype.drawBondsAsLine = function(group, atomlist, lineWidth) {
//    const geo = new THREE. Geometry();
//    const nAtoms = atomlist.length;

//    for (let _i = 0; _i < nAtoms; _i++) {
//       const i = atomlist[_i];
//       const  atom1 = this.atoms[i];
//       if (atom1 === undefined) continue;
//       for (let _j = _i + 1; _j < _i + 30 && _j < nAtoms; _j++) {
//          const j = atomlist[_j];
//          const atom2 = this.atoms[j];
//          if (atom2 === undefined) continue;
//          const order = this.isConnected(atom1, atom2);
//          if (order === 0) continue;

//          this.drawBondsAsLineSub(geo, atom1, atom2, order);
//       }
//       for (let _j = 0; _j < atom1.bonds.length; _j++) {
//           const j = atom1.bonds[_j];
//           if (j < i + 30) continue; // be conservative!
//           if (atomlist.indexOf(j) === -1) continue;
//           const atom2 = this.atoms[j];
//           if (atom2 === undefined) continue;
//           this.drawBondsAsLineSub(geo, atom1, atom2, atom1.bondOrder[_j]);
//       }
//     }
//    const lineMaterial = new THREE.LineBasicMaterial({linewidth: lineWidth});
//    lineMaterial.vertexColors = true;

//    const line = new THREE.Line(geo, lineMaterial);
//    line.type = THREE.LinePieces;
//    group.add(line);
// };

// GLmol.prototype.drawSmoothCurve = function(groupOrGeom, _points, width, colors, div) {
//    if (_points.length === 0) return;

//    div = (div === undefined) ? 5 : div;

//    const geo = groupOrGeom.isGeometry ? groupOrGeom : new THREE. Geometry();
//    const poff = geo.vert ices.length;
//    const points = this.subdivide(_points, div);

//    for (let i = 0; i < points.length; i++) {
//       geo.vert ices.push(points[i]);
//       geo.colors.push(new TCo(colors[(i === 0) ? 0 : Math.round((i - 1) / div)]));
//   }
//   if (!groupOrGeom.isGeometry) {
//    const group = groupOrGeom;
//    const lineMaterial = new THREE.LineBasicMaterial({linewidth: width});
//    lineMaterial.vertexColors = true;
//    const line = new THREE.Line(geo, lineMaterial);
//    line.type = THREE.LineStrip;
//    group.add(line);
//   }
// };

// GLmol.prototype.drawAsCross = function(group, atomlist, delta) {
//    const geo = new THREE. Geometry();
//    const points = [[delta, 0, 0], [-delta, 0, 0], [0, delta, 0], [0, -delta, 0], [0, 0, delta], [0, 0, -delta]];

//    for (let i = 0, lim = atomlist.length; i < lim; i++) {
//       const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

//       const c = new TCo(atom.color);
//       for (let j = 0; j < 6; j++) {
//          geo.vert ices.push(new TV3(atom.x + points[j][0], atom.y + points[j][1], atom.z + points[j][2]));
//          geo.colors.push(c);
//       }
//   }
//   const lineMaterial = new THREE.LineBasicMaterial({linewidth: this.lineWidth});
//   lineMaterial.vertexColors = true;
//   const line = new THREE.Line(geo, lineMaterial, THREE.LinePieces);
//   group.add(line);
// };

// // FIXME: Winkled...
// GLmol.prototype.drawSmoothTube = function(groupOrGeom, _points, colors, radii) {
//    if (_points.length < 2) return;

//    const circleDiv = this.tubeDIV, axisDiv = this.axisDIV;
//    const geo = groupOrGeom.isGeometry ? groupOrGeom : new THREE. Geometry();
//    const poff = geo.vert ices.length;
//    const points = this.subdivide(_points, axisDiv);
//    let prevAxis1 = new TV3(), prevAxis2;

//    for (let i = 0, lim = points.length; i < lim; i++) {
//       let r, idx = (i - 1) / axisDiv;
//       if (i === 0) r = radii[0];
//       else {
//          if (idx % 1 === 0) r = radii[idx];
//          else {
//             const floored = Math.floor(idx);
//             const tmp = idx - floored;
//             r = radii[floored] * tmp + radii[floored + 1] * (1 - tmp);
//          }
//       }
//       let delta, axis1, axis2;

//       if (i < lim - 1) {
//          delta = new TV3().subVectors(points[i], points[i + 1]);
//          axis1 = new TV3(0, - delta.z, delta.y).normalize().multiplyScalar(r);
//          axis2 = new TV3().crossVectors(delta, axis1).normalize().multiplyScalar(r);
// //      const dir = 1, offset = 0;
//          if (prevAxis1.dot(axis1) < 0) {
//                  axis1.negate(); axis2.negate();  //dir = -1;//offset = 2 * Math.PI / axisDiv;
//          }
//          prevAxis1 = axis1; prevAxis2 = axis2;
//       } else {
//          axis1 = prevAxis1; axis2 = prevAxis2;
//       }

//       for (let j = 0; j < circleDiv; j++) {
//          const angle = 2 * Math.PI / circleDiv * j; //* dir  + offset;
//          const c = Math.cos(angle), s = Math.sin(angle);
//          geo.vert ices.push(new TV3(
//          points[i].x + c * axis1.x + s * axis2.x,
//          points[i].y + c * axis1.y + s * axis2.y,
//          points[i].z + c * axis1.z + s * axis2.z));
//       }
//    }

//    let offset = poff;
//    for (let i = 0, lim = points.length - 1; i < lim; i++) {
//       const c =  new TCo(colors[Math.round((i - 1)/ axisDiv)]);

//       let reg = 0;
//       let r1 = new TV3().subVectors(geo.vert ices[offset], geo.vert ices[offset + circleDiv]).lengthSq();
//       let r2 = new TV3().subVectors(geo.vert ices[offset], geo.vert ices[offset + circleDiv + 1]).lengthSq();
//       if (r1 > r2) {r1 = r2; reg = 1;};
//       for (let j = 0; j < circleDiv; j++) {
//           geo.faces.push(new TF3(offset + j, offset + (j + reg) % circleDiv + circleDiv, offset + (j + 1) % circleDiv));
//           geo.faces.push(new TF3(offset + (j + 1) % circleDiv, offset + (j + reg) % circleDiv + circleDiv, offset + (j + reg + 1) % circleDiv + circleDiv));
//           geo.faces[geo.faces.length -2].color = c;
//           geo.faces[geo.faces.length -1].color = c;
//       }
//       offset += circleDiv;
//    }

//    if (!groupOrGeom.isGeometry) {
//       geo.computeFaceNormals();
//       geo.computeVertexNormals(false);
//       const group = groupOrGeom;
//       const mat = new (this.mat || THREE.MeshLambertMaterial)();
//       mat.vertexColors = THREE.FaceColors;
//       const mesh = new THREE.Mesh(geo, mat);
//       mat.side = THREE.DoubleSide; // mesh.doubleSided = true;
//       group.add(mesh);
//    }
// };


GLmol.prototype.drawMainchainCurve = function(group, atomlist, curveWidth, atomName, div) {
   let points = [], colors = [];
   let currentChain, currentResi;
   if (div === undefined) div = 5;

   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]];
      if (atom === undefined) continue;

      if ((atom.atom === atomName) && !atom.hetflag) {
         if (currentChain !== atom.chain || currentResi + 1 !== atom.resi) {
            this.drawSmoothCurve(group, points, curveWidth, colors, div);
            points = [];
            colors = [];
         }
         points.push(new TV3(atom.x, atom.y, atom.z));
         colors.push(atom.color);
         currentChain = atom.chain;
         currentResi = atom.resi;
      }
   }
    this.drawSmoothCurve(group, points, curveWidth, colors, div);
};

// GLmol.prototype.drawMainchainTube = function(group, atomlist, atomName, radius) {
//    let points = [], colors = [], radii = [];
//    let currentChain, currentResi;
//    for (let i in atomlist) {
//       const atom = this.atoms[atomlist[i]];
//       if (atom === undefined) continue;

//       if ((atom.atom === atomName) && !atom.hetflag) {
//          if (currentChain !== atom.chain || currentResi + 1 !== atom.resi) {
//             this.drawSmoothTube(group, points, colors, radii);
//             points = []; colors = []; radii = [];
//          }
//          points.push(new TV3(atom.x, atom.y, atom.z));
//          if (radius === undefined) {
//             radii.push((atom.b > 0) ? atom.b / 100 : 0.3);
//          } else {
//             radii.push(radius);
//          }
//          colors.push(atom.color);
//          currentChain = atom.chain;
//          currentResi = atom.resi;
//       }
//    }
//    this.drawSmoothTube(group, points, colors, radii);
// };

// GLmol.prototype.drawStrip = function(groupOrGeom, p1, p2, colors, div, thickness) {
//    if ((p1.length) < 2) return;
//    div = div || this.axisDIV;
//    p1 = this.subdivide(p1, div);
//    p2 = this.subdivide(p2, div);
//    if (!thickness) return this.drawThinStrip(groupOrGeom, p1, p2, colors, div);

//    const geo = groupOrGeom.isGeometry ? groupOrGeom : new THREE. Geometry();
//    const poff = geo.vert ices.length;
//    const vs = geo.vert ices, fs = geo.faces;
//    let axis, p1v, p2v, a1v, a2v;
//    for (let i = 0, lim = p1.length; i < lim; i++) {
//       vs.push(p1v = p1[i]); // 0
//       vs.push(p1v); // 1
//       vs.push(p2v = p2[i]); // 2
//       vs.push(p2v); // 3
//       if (i < lim - 1) {
//          const toNext = p1[i + 1].clone().sub(p1[i]);
//          const toSide = p2[i].clone().sub(p1[i]);
//          axis = toSide.cross(toNext).normalize().multiplyScalar(thickness);
//       }
//       vs.push(a1v = p1[i].clone().add(axis)); // 4
//       vs.push(a1v); // 5
//       vs.push(a2v = p2[i].clone().add(axis)); // 6
//       vs.push(a2v); // 7
//    }
//    const faces = [[0, 2, -6, -8], [-4, -2, 6, 4], [7, 3, -5, -1], [-3, -7, 1, 5]];
//    let a,b,c,d;
//    for (let i = 1, lim = p1.length; i < lim; i++) {
//       let offset = 8 * i + poff, color = new TCo(colors[Math.round((i - 1)/ div)]);
//       for (let j = 0; j < 4; j++) {
//          //  const f = new THREE.Face4(offset + faces[j][0], offset + faces[j][1], offset + faces[j][2], offset + faces[j][3], undefined, color);
//          [a,b,c,d] = [offset + faces[j][0], offset + faces[j][1], offset + faces[j][2], offset + faces[j][3]];
//          const f = new THREE.Face3(c,a,b, undefined, color);
//          const f1 = new THREE.Face3(a,c,d, undefined, color);
//          fs.push(f,f1);
//       }
//    }
//    let vsize = vs.length - 8; // Cap
//    for (let i = 0; i < 4; i++) {vs.push(vs[i * 2]); vs.push(vs[vsize + i * 2])};
//    vsize += 8;

//    // fs.push(new THREE.Face4(vsize, vsize + 2, vsize + 6, vsize + 4, undefined, fs[0].color));
//    [a,b,c,d] = [vsize, vsize + 2, vsize + 6, vsize + 4];
//    fs.push(new THREE.Face3(c,a,b, undefined, fs[0].color));
//    fs.push(new THREE.Face3(a,c,d, undefined, fs[0].color));

//    // fs.push(new THREE.Face4(vsize + 1, vsize + 5, vsize + 7, vsize + 3, undefined, fs[fs.length - 3].color));
//    [a,b,c,d] = [vsize + 1, vsize + 5, vsize + 7, vsize + 3];
//    fs.push(new THREE.Face3(c,a,b, undefined, fs[fs.length - 3].color));
//    fs.push(new THREE.Face3(a,c,d, undefined, fs[fs.length - 3].color));

//    if (!groupOrGeom.isGeometry) {
//       geo.computeFaceNormals();
//       geo.computeVertexNormals(false);
//       const group = groupOrGeom;
//       const material =  new (this.mat || THREE.MeshLambertMaterial)();
//       material.vertexColors = THREE.FaceColors;
//       const mesh = new THREE.Mesh(geo, material);
//       material.side = THREE.DoubleSide; // mesh.doubleSided = true;
//       group.add(mesh);
//    }
// };


// GLmol.prototype.drawThinStrip = function(groupOrGeom, p1, p2, colors, div) {
//    const geo = groupOrGeom.isGeometry ? groupOrGeom : new THREE. Geometry();
//    const poff = geo.vert ices.length;
//    for (let i = 0, lim = p1.length; i < lim; i++) {
//       geo.vert ices.push(p1[i]); // 2i
//       geo.vert ices.push(p2[i]); // 2i + 1
//    }
//    for (let i = 1, lim = p1.length; i < lim; i++) {
//       // const f = new THREE.Face4(2 * i, 2 * i + 1, 2 * i - 1, 2 * i - 2);
//       const [a,b,c,d] = [2 * i, 2 * i + 1, 2 * i - 1, 2 * i - 2];
//       const f = new THREE.Face3(c+poff,a+poff,b+poff);
//       const f1 = new THREE.Face3(a+poff,c+poff,d+poff);
//       f.color = new TCo(colors[Math.round((i - 1)/ div)]);
//       f1.color = new TCo(colors[Math.round((i - 1)/ div)]);
//       geo.faces.push(f, f1);
//    }
//    if (!groupOrGeom.isGeometry) {
//        geo.computeFaceNormals();
//        geo.computeVertexNormals(false);
//       const group = groupOrGeom;
//       const material =  new (this.mat || THREE.MeshLambertMaterial)();
//       material.vertexColors = THREE.FaceColors;
//       const mesh = new THREE.Mesh(geo, material);
//       material.side = THREE.DoubleSide; // mesh.doubleSided = true;
//       group.add(mesh);
//    }
// };


GLmol.prototype.IcosahedronGeometry = function() {
   if (!this.icosahedron) this.icosahedron = new THREE.IcosahedronGeometry(1);
   return this.icosahedron;
};

GLmol.prototype.drawCylinder = function(group, from, to, radius, color, cap) {
   if (!from || !to) return;

   const midpoint = new TV3().addVectors(from, to).multiplyScalar(0.5);
   color = new TCo(color);

   if (!this.cylinderGeometry) {
      this.cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, this.cylinderQuality, 1, !cap);
      this.cylinderGeometry.faceUvs = [];
      this.faceVertexUvs = [];
   }
   const cylinderMaterial = this.mat || new (THREE.MeshLambertMaterial)({color: color.getHex()});
   const cylinder = new THREE.Mesh(this.cylinderGeometry, cylinderMaterial);
   cylinder.position.copy(midpoint);
   cylinder.lookAt(from);
   cylinder.updateMatrix();
   cylinder.matrixAutoUpdate = false;
   const m = new THREE.Matrix4().makeScale(radius, radius, from.distanceTo(to));
   // m.rotateX(Math.PI / 2);
   cylinder.matrix.multiply(m);
   m.makeRotationX(Math.PI / 2);
   cylinder.matrix.multiply(m);
   if (group.mergeMesh)
      group.mergeMesh(cylinder);
   else
      group.add(cylinder);
};

// FIXME: transition!
GLmol.prototype.drawHelixAsCylinder = function(group, atomlist, radius) {
   let start = null;
   let currentChain, currentResi;

   const others = [], beta = [];

   let atom;
   for (let i in atomlist) {
      atom = this.atoms[atomlist[i]];
      if (atom === undefined || atom.hetflag) continue;
      if ((atom.ss !== 'h' && atom.ss !== 's') || atom.ssend || atom.ssbegin) others.push(atom.serial);
      if (atom.ss === 's') beta.push(atom.serial);
      if (atom.atom !== 'CA') continue;

      if (atom.ss === 'h' && atom.ssend) {
         if (start !== null) this.drawCylinder(group, new TV3(start.x, start.y, start.z), new TV3(atom.x, atom.y, atom.z), radius, atom.color, true);
         start = null;
      }
      currentChain = atom.chain;
      currentResi = atom.resi;
      if (start === null && atom.ss === 'h' && atom.ssbegin) start = atom;
   }
   if (start !== null) this.drawCylinder(group, new TV3(start.x, start.y, start.z), new TV3(atom.x, atom.y, atom.z), radius, atom.color);
   this.drawMainchainTube(group, others, "CA", 0.3);
   this.drawStrand(group, beta, undefined, undefined, true,  0, this.helixSheetWidth, false, this.thickness * 2);
};

GLmol.prototype.drawCartoon = function(group, atomlist, doNotSmoothen, thickness) {
   this.drawStrand(group, atomlist, 2, undefined, true, undefined, undefined, doNotSmoothen, thickness);
};

GLmol.prototype.drawStrand = function(group, atomlist, num, div, fill, coilWidth, helixSheetWidth, doNotSmoothen, thickness) {
   num = num || this.strandDIV;
   div = div || this.axisDIV;
   coilWidth = coilWidth || this.coilWidth;
   doNotSmoothen = (doNotSmoothen === undefined) ? false : doNotSmoothen;
   helixSheetWidth = helixSheetWidth || this.helixSheetWidth;
   let points = []; for (let k = 0; k < num; k++) points[k] = [];
   let colors = [];
   let currentChain, currentResi, currentCA;
   let prevCO = null, ss=null, ssborder = false;

   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]];
      if (atom === undefined) continue;

      if ((atom.atom === 'O' || atom.atom === 'CA') && !atom.hetflag) {
         if (atom.atom === 'CA') {
            if (currentChain !== atom.chain || currentResi + 1 !== atom.resi) {
               if (!thickness) for (let j = 0; j < num; j++)
                  this.drawSmoothCurve(group, points[j], 1 ,colors, div);
               if (fill) this.drawStrip(group, points[0], points[num - 1], colors, div, thickness);
               points = []; for (let k = 0; k < num; k++) points[k] = [];
               colors = [];
               prevCO = null; ss = null; ssborder = false;
            }
            currentCA = new TV3(atom.x, atom.y, atom.z);
            currentChain = atom.chain;
            currentResi = atom.resi;
            ss = atom.ss; ssborder = atom.ssstart || atom.ssend;
            colors.push(atom.color);
         } else { // O
            const O = new TV3(atom.x, atom.y, atom.z);
            O.sub(currentCA);  // was O.sub  sjpt
            O.normalize(); // can be omitted for performance
            O.multiplyScalar((ss === 'c') ? coilWidth : helixSheetWidth);
            if (prevCO !== null && O.dot(prevCO) < 0) O.negate();
            prevCO = O;
            for (let j = 0; j < num; j++) {
               const delta = -1 + 2 / (num - 1) * j;
               const v = new TV3(currentCA.x + prevCO.x * delta,
                               currentCA.y + prevCO.y * delta, currentCA.z + prevCO.z * delta);
               if (!doNotSmoothen && ss === 's') v.smoothen = true;
               points[j].push(v);
            }
         }
      }
   }
   if (!thickness) for (let j = 0; j < num; j++)
      this.drawSmoothCurve(group, points[j], 1 ,colors, div);
   if (fill) this.drawStrip(group, points[0], points[num - 1], colors, div, thickness);
};

// GLmol.prototype.drawNucleicAcidLadderSub = function(geo, lineGeo, atoms, color) {
// //        color.r *= 0.9; color.g *= 0.9; color.b *= 0.9;
//    if (atoms[0] !== undefined && atoms[1] !== undefined && atoms[2] !== undefined &&
//        atoms[3] !== undefined && atoms[4] !== undefined && atoms[5] !== undefined) {
//       const baseFaceId = geo.vert ices.length;
//       for (let i = 0; i <= 5; i++) geo.vert ices.push(atoms[i]);
//           geo.faces.push(new TF3(baseFaceId, baseFaceId + 1, baseFaceId + 2));
//           geo.faces.push(new TF3(baseFaceId, baseFaceId + 2, baseFaceId + 3));
//           geo.faces.push(new TF3(baseFaceId, baseFaceId + 3, baseFaceId + 4));
//           geo.faces.push(new TF3(baseFaceId, baseFaceId + 4, baseFaceId + 5));
//           for (let j = geo.faces.length - 4, lim = geo.faces.length; j < lim; j++) geo.faces[j].color = color;
//     }
//     if (atoms[4] !== undefined && atoms[3] !== undefined && atoms[6] !== undefined &&
//        atoms[7] !== undefined && atoms[8] !== undefined) {
//        const baseFaceId = geo.vert ices.length;
//        geo.vert ices.push(atoms[4]);
//        geo.vert ices.push(atoms[3]);
//        geo.vert ices.push(atoms[6]);
//        geo.vert ices.push(atoms[7]);
//        geo.vert ices.push(atoms[8]);
//        for (let i = 0; i <= 4; i++) geo.colors.push(color);
//        geo.faces.push(new TF3(baseFaceId, baseFaceId + 1, baseFaceId + 2));
//        geo.faces.push(new TF3(baseFaceId, baseFaceId + 2, baseFaceId + 3));
//        geo.faces.push(new TF3(baseFaceId, baseFaceId + 3, baseFaceId + 4));
//        for (let j = geo.faces.length - 3, lim = geo.faces.length; j < lim; j++) geo.faces[j].color = color;
//     }
// };

// GLmol.prototype.drawNucleicAcidLadder = function(group, atomlist) {
//    const geo = new THREE. Geometry();
//    const lineGeo = new THREE. Geometry();
//    const baseAtoms = ["N1", "C2", "N3", "C4", "C5", "C6", "N9", "C8", "N7"];
//    let currentChain, currentResi, currentComponent = new Array(baseAtoms.length);
//    let color = new TCo(0xcc0000);

//    for (let i in atomlist) {
//       const atom = this.atoms[atomlist[i]];
//       if (atom === undefined || atom.hetflag) continue;

//       if (atom.resi !== currentResi || atom.chain !== currentChain) {
//          this.drawNucleicAcidLadderSub(geo, lineGeo, currentComponent, color);
//          currentComponent = new Array(baseAtoms.length);
//       }
//       const pos = baseAtoms.indexOf(atom.atom);
//       if (pos !== -1) currentComponent[pos] = new TV3(atom.x, atom.y, atom.z);
//       if (atom.atom === 'O3\'') color = new TCo(atom.color);
//       currentResi = atom.resi; currentChain = atom.chain;
//    }
//    this.drawNucleicAcidLadderSub(geo, lineGeo, currentComponent, color);
//    geo.computeFaceNormals();
//    const mat = new (this.mat || THREE.MeshLambertMaterial)();
//    mat.vertexColors = THREE.VertexColors;
//    const mesh = new THREE.Mesh(geo, mat);
//    mat.side = THREE.DoubleSide; // mesh.doubleSided = true;
//    group.add(mesh);
// };

GLmol.prototype.drawNucleicAcidStick = function(group, atomlist) {
   let currentChain, currentResi, start = null, end = null;

   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]];
      if (atom === undefined || atom.hetflag) continue;

      if (atom.resi !== currentResi || atom.chain !== currentChain) {
         if (start !== null && end !== null)
            this.drawCylinder(group, new TV3(start.x, start.y, start.z),
                              new TV3(end.x, end.y, end.z), 0.3, start.color, true);
         start = null; end = null;
      }
      if (atom.atom === 'O3\'') start = atom;
      if (atom.resn === '  A' || atom.resn === '  G' || atom.resn === ' DA' || atom.resn === ' DG') {
         if (atom.atom === 'N1')  end = atom; //  N1(AG), N3(CTU)
      } else if (atom.atom === 'N3') {
         end = atom;
      }
      currentResi = atom.resi; currentChain = atom.chain;
   }
   if (start !== null && end !== null)
      this.drawCylinder(group, new TV3(start.x, start.y, start.z),
                        new TV3(end.x, end.y, end.z), 0.3, start.color, true);
};

// GLmol.prototype.drawNucleicAcidLine = function(group, atomlist) {
//    let currentChain, currentResi, start = null, end = null;
//    const geo = new THREE. Geometry();

//    for (let i in atomlist) {
//       const atom = this.atoms[atomlist[i]];
//       if (atom === undefined || atom.hetflag) continue;

//       if (atom.resi !== currentResi || atom.chain !== currentChain) {
//          if (start !== null && end !== null) {
//             geo.vert ices.push(new TV3(start.x, start.y, start.z));
//             geo.colors.push(new TCo(start.color));
//             geo.vert ices.push(new TV3(end.x, end.y, end.z));
//             geo.colors.push(new TCo(start.color));
//          }
//          start = null; end = null;
//       }
//       if (atom.atom === 'O3\'') start = atom;
//       if (atom.resn === '  A' || atom.resn === '  G' || atom.resn === ' DA' || atom.resn === ' DG') {
//          if (atom.atom === 'N1')  end = atom; //  N1(AG), N3(CTU)
//       } else if (atom.atom === 'N3') {
//          end = atom;
//       }
//       currentResi = atom.resi; currentChain = atom.chain;
//    }
//    if (start !== null && end !== null) {
//       geo.vert ices.push(new TV3(start.x, start.y, start.z));
//       geo.colors.push(new TCo(start.color));
//       geo.vert ices.push(new TV3(end.x, end.y, end.z));
//       geo.colors.push(new TCo(start.color));
//     }
//    const mat =  new THREE.LineBasicMaterial({linewidth: 1, linejoin: false});
//    mat.linewidth = 1.5; mat.vertexColors = true;
//    const line = new THREE.Line(geo, mat, THREE.LinePieces);
//    group.add(line);
// };

GLmol.prototype.drawCartoonNucleicAcid = function(group, atomlist, div, thickness) {
        this.drawStrandNucleicAcid(group, atomlist, 2, div, true, undefined, thickness);
};

GLmol.prototype.drawStrandNucleicAcid = function(group, atomlist, num, div, fill, nucleicAcidWidth, thickness) {
   nucleicAcidWidth = nucleicAcidWidth || this.nucleicAcidWidth;
   div = div || this.axisDIV;
   num = num || this.nucleicAcidStrandDIV;
   let points = []; for (let k = 0; k < num; k++) points[k] = [];
   let colors = [];
   let currentChain, currentResi, currentO3;
   let prevOO = null;

   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]];
      if (atom === undefined) continue;

      if ((atom.atom === 'O3\'' || atom.atom === 'OP2') && !atom.hetflag) {
         if (atom.atom === 'O3\'') { // to connect 3' end. FIXME: better way to do?
            if (currentChain !== atom.chain || currentResi + 1 !== atom.resi) {
               if (currentO3) {
                  for (let j = 0; j < num; j++) {
                     const delta = -1 + 2 / (num - 1) * j;
                     points[j].push(new TV3(currentO3.x + prevOO.x * delta,
                      currentO3.y + prevOO.y * delta, currentO3.z + prevOO.z * delta));
                  }
               }
               if (fill) this.drawStrip(group, points[0], points[1], colors, div, thickness);
               if (!thickness) for (let j = 0; j < num; j++)
                  this.drawSmoothCurve(group, points[j], 1 ,colors, div);
               points = []; for (let k = 0; k < num; k++) points[k] = [];
               colors = [];
               prevOO = null;
            }
            currentO3 = new TV3(atom.x, atom.y, atom.z);
            currentChain = atom.chain;
            currentResi = atom.resi;
            colors.push(atom.color);
         } else { // OP2
            if (!currentO3) {prevOO = null; continue;} // for 5' phosphate (e.g. 3QX3)
            const O = new TV3(atom.x, atom.y, atom.z);
            O.sub(currentO3);
            O.normalize().multiplyScalar(nucleicAcidWidth);  // TODO: refactor
            if (prevOO !== undefined && O.dot(prevOO) < 0) {
               O.negate();
            }
            prevOO = O;
            for (let j = 0; j < num; j++) {
               const delta = -1 + 2 / (num - 1) * j;
               points[j].push(new TV3(currentO3.x + prevOO.x * delta,
                 currentO3.y + prevOO.y * delta, currentO3.z + prevOO.z * delta));
            }
            currentO3 = null;
         }
      }
   }
   if (currentO3) {
      for (let j = 0; j < num; j++) {
         const delta = -1 + 2 / (num - 1) * j;
         points[j].push(new TV3(currentO3.x + prevOO.x * delta,
           currentO3.y + prevOO.y * delta, currentO3.z + prevOO.z * delta));
      }
   }
   if (fill) this.drawStrip(group, points[0], points[1], colors, div, thickness);
   if (!thickness) for (let j = 0; j < num; j++)
      this.drawSmoothCurve(group, points[j], 1 ,colors, div);
};

// GLmol.prototype.drawDottedLines = function(group, points, color) {
//     const geo = new THREE. Geometry();
//     const step = 0.3;

//     for (let i = 0, lim = Math.floor(points.length / 2); i < lim; i++) {
//         const p1 = points[2 * i], p2 = points[2 * i + 1];
//         const delta = p2.clone().sub(p1);
//         const dist = delta.length();
//         delta.normalize().multiplyScalar(step);
//         const jlim =  Math.floor(dist / step);
//         for (let j = 0; j < jlim; j++) {
//            const p = new TV3(p1.x + delta.x * j, p1.y + delta.y * j, p1.z + delta.z * j);
//            geo.vert ices.push(p);
//         }
//         if (jlim % 2 === 1) geo.vert ices.push(p2);
//     }

//     const mat = new THREE.LineBasicMaterial({color: color.getHex()});
//     mat.linewidth = 2;
//     const line = new THREE.Line(geo, mat, THREE.LinePieces);
//     group.add(line);
// };

GLmol.prototype.getAllAtoms = function() {
   const ret = [];
   for (let i in this.atoms) {
      ret.push(this.atoms[i].serial);
   }
   return ret;
};

// Probably I can refactor using higher-order functions.
GLmol.prototype.getHetatms = function(atomlist = this.atomlist) {
   const ret = [];
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (atom.hetflag) ret.push(atom.serial);
   }
   return ret;
};

GLmol.prototype.removeSolvents = function(atomlist = this.atomlist) {
   const ret = [];
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (atom.resn !== 'HOH') ret.push(atom.serial);
   }
   return ret;
};

GLmol.prototype.getProteins = function(atomlist = this.atomlist) {
   const ret = [];
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (!atom.hetflag) ret.push(atom.serial);
   }
   return ret;
};

// TODO: Test
GLmol.prototype.excludeAtoms = function(atomlist = this.atomlist, deleteList=undefined) {
   const ret = [];
   const blackList = {}; // new Object();
   for (let _i in deleteList) blackList[deleteList[_i]] = true;

   for (let _i in atomlist) {
      const i = atomlist[_i];

      if (!blackList[i]) ret.push(i);
   }
   return ret;
};

GLmol.prototype.getSidechains = function(atomlist = this.atomlist) {
   const ret = [];
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (atom.hetflag) continue;
      if (atom.atom === 'C' || atom.atom === 'O' || (atom.atom === 'N' && atom.resn !== "PRO")) continue;
      ret.push(atom.serial);
   }
   return ret;
};

GLmol.prototype.getAtomsWithin = function(atomlist = this.atomlist, extent=undefined) {
   const ret = [];

   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (atom.x < extent[0][0] || atom.x > extent[1][0]) continue;
      if (atom.y < extent[0][1] || atom.y > extent[1][1]) continue;
      if (atom.z < extent[0][2] || atom.z > extent[1][2]) continue;
      ret.push(atom.serial);
   }
   return ret;
};

GLmol.prototype.getExtent = function(atomlist = this.atomlist) {
   let xmin, ymin, zmin, xmax, ymax, zmax, xsum, ysum, zsum, cnt;
   xmin = ymin = zmin = 9999;
   xmax = ymax = zmax = -9999;
   xsum = ysum = zsum = cnt = 0;

   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;
      cnt++;
      xsum += atom.x; ysum += atom.y; zsum += atom.z;

      xmin = (xmin < atom.x) ? xmin : atom.x;
      ymin = (ymin < atom.y) ? ymin : atom.y;
      zmin = (zmin < atom.z) ? zmin : atom.z;
      xmax = (xmax > atom.x) ? xmax : atom.x;
      ymax = (ymax > atom.y) ? ymax : atom.y;
      zmax = (zmax > atom.z) ? zmax : atom.z;
   }
   return [[xmin, ymin, zmin], [xmax, ymax, zmax], [xsum / cnt, ysum / cnt, zsum / cnt]];
};

GLmol.prototype.getResiduesById = function(atomlist = this.atomlist, resi=undefined) {
   const ret = [];
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (resi.indexOf(atom.resi) !== -1) ret.push(atom.serial);
   }
   return ret;
};

GLmol.prototype.getResidueBySS = function(atomlist = this.atomlist, ss=undefined) {
   const ret = [];
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (ss.indexOf(atom.ss) !== -1) ret.push(atom.serial);
   }
   return ret;
};

GLmol.prototype.getChain = function(atomlist = this.atomlist, chain=undefined) {
   const ret = [], chains = {};
   chain = chain.toString(); // concat if Array
   for (let i = 0, lim = chain.length; i < lim; i++) chains[chain.substr(i, 1)] = true;
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (chains[atom.chain]) ret.push(atom.serial);
   }
   return ret;
};

// for HETATM only
GLmol.prototype.getNonbonded = function(atomlist = this.atomlist, chain=undefined) {
   const ret = [];
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (atom.hetflag && atom.bonds.length === 0) ret.push(atom.serial);
   }
   return ret;
};

GLmol.prototype.colorByAtom = function(atomlist = this.atomlist, colors = {}) {
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      let c = colors[atom.elem];
      if (c === undefined) c = this.ElementColors[atom.elem];
      if (c === undefined) c = this.defaultColor;
      atom.color = c;
   }
};


// MEMO: Color only CA. maybe I should add atom.cartoonColor.
GLmol.prototype.colorByStructure = function(atomlist = this.atomlist,
      helixColor = 0xff0000, sheetColor = 0x00ff00, colorSidechains = true) {
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (!colorSidechains && (atom.atom !== 'CA' || atom.hetflag)) continue;
      if (atom.ss[0] === 's') atom.color = sheetColor;
      else if (atom.ss[0] === 'h') atom.color = helixColor;
   }
};

GLmol.prototype.colorByBFactor = function(atomlist = this.atomlist, colorSidechains = true) {
   let minB = 1000, maxB = -1000;

   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (atom.hetflag) continue;
      if (colorSidechains || atom.atom === 'CA' || atom.atom === 'O3\'') {
         if (minB > atom.b) minB = atom.b;
         if (maxB < atom.b) maxB = atom.b;
      }
   }

   const mid = (maxB + minB) / 2;

   const range = (maxB - minB) / 2;
   if (range < 0.01 && range > -0.01) return;
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (atom.hetflag) continue;
      if (colorSidechains || atom.atom === 'CA' || atom.atom === 'O3\'') {
         const color = new TCo(0);
         if (atom.b < mid)
            color.setHSV(0.667, (mid - atom.b) / range, 1);
         else
            color.setHSV(0, (atom.b - mid) / range, 1);
         atom.color = color.getHex();
      }
   }
};


GLmol.setColors = function() {
   // const color = new TCo(0);
   const c = GLmol.colorsr = {};
   c[0] = col3(1,1,1);
   c[1] = c.A = col3(1,0,0);
   c[2] = c.B = col3(0,1,0);
   c[3] = c.C = col3(0,0,1);
   c[4] = c.D = col3(0,1,1);
   c[5] = c.E = col3(1,0,1);
   c[6] = c.F = col3(1,1,0);
   c[7] = c.G = col3(1,0.3,0);
   c.S = col3(1,1,0);
   for (let i=0; i<7; i++) c[i+8] = c[i].clone().multiplyScalar(0.25);
   for (let i = 0; i <= 255; i++) {
      const ch = String.fromCharCode(i);
      if (!c[ch])
         c[ch] = col3().setHSV((i * 5) % 27 / 27.0, 1, 0.9);
   }
   const cr = GLmol.colors = {};
   for (let i in c) {
      cr[i] = c[i].getHex();
   }

}
GLmol.setColors();

GLmol.prototype.colorByChain = function(atomlist = this.atomlist, colorSidechains = true) {
   const colors = GLmol.colors;
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (atom.hetflag) continue;
      if (colorSidechains || atom.atom === 'CA' || atom.atom === 'O3\'') {
         atom.color = colors[atom.chain];
      }
   }
};

GLmol.prototype.colorByChaingroup = function(atomlist = this.atomlist, colorSidechains = true) {
   const colors = GLmol.chainColors || GLmol.colors;
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;
      const g = atom.chaingroup;
      const col = colors[g];
      if (col) {
         atom.color = col;
      } else {
         if (atom.hetflag) continue;
         if (colorSidechains || atom.atom === 'CA' || atom.atom === 'O3\'') {
            const color = new TCo(0);
            const h = (g * 57) % 97 / 97.0
            // const c = (atom.chain.charCodeAt(0) - base + 1) / 3;  // assumes 3 chain letters for now
            color.setHSV(h, 1, 1);   // c**2);  trying to use s,v to show individual chains as well as groups
            atom.color = color.getHex();
         }
      }
   }
};

GLmol.prototype.colorByChainid = function(atomlist = this.atomlist, colorSidechains = true) {
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if (atom.hetflag) continue;
      if (colorSidechains || atom.atom === 'CA' || atom.atom === 'O3\'') {
         const color = new TCo(0);
         color.setHSV((atom.chainid * 57) % 97 / 97.0, 1, 0.9);
         atom.color = color.getHex();
      }
   }
};


GLmol.prototype.colorByResidue = function(atomlist = this.atomlist, residueColors = GLmol.prototype.defaultResidueColors) {
   const rc = objmap(residueColors, i=> typeof i === 'number' ? i : i.getHex());
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      const c = rc[atom.resn]
      if (c !== undefined) atom.color = c;
   }
};

GLmol.prototype.colorAtoms = function(atomlist = this.atomlist, c=undefined) {
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      atom.color = c;
   }
};

GLmol.prototype.RESIDUES = ['ARG', 'HIS', 'LYS', 'ASP', 'GLU', 'SER', 'THR', 'ASN', 'GLN', 'CYS',
'GLY', 'PRO', 'ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TYR', 'TRP'];
GLmol.prototype.defaultResidueColors = {};
GLmol.prototype.RESIDUES.forEach((r,i) =>
   GLmol.prototype.defaultResidueColors[r] = col3().setHSV(i / GLmol.prototype.RESIDUES.length, 1, 1));

GLmol.prototype.colorByPolarity = function(atomlist = this.atomlist, polar=undefined, nonpolar=undefined) {
   //would be good to have properties available for application to things other than color
   //also, hydrophabicity etc seem to be missing in GLMol.
   const polarResidues = ['ARG', 'HIS', 'LYS', 'ASP', 'GLU', 'SER', 'THR', 'ASN', 'GLN', 'CYS'];
   const nonPolarResidues = ['GLY', 'PRO', 'ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TYR', 'TRP'];
   const colorMap = {};
   for (let i in polarResidues) colorMap[polarResidues[i]] = polar;
   for (let i in nonPolarResidues) colorMap[nonPolarResidues[i]] = nonpolar;
   this.colorByResidue(atomlist, colorMap);
};

GLmol.prototype.colorByDist = function(atomlist = this.atomlist, near=undefined, far=undefined) {
   const colfun = CSynth.genColfun(near, far);
   const col = col3();
   for (let i in atomlist) {
      const atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;
      colfun(atom.x,atom.y,atom.z, col);
      atom.color = col.getHex();
   }
}

// TODO: Add near(atomlist, neighbor, distanceCutoff)
// TODO: Add expandToResidue(atomlist)

GLmol.prototype.colorChainbow = function(atomlist = this.atomlist, colorSidechains=undefined) {
   let cnt = 0;
   let atom, i;
   for (i in atomlist) {
      atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if ((colorSidechains || atom.atom !== 'CA' || atom.atom !== 'O3\'') && !atom.hetflag)
         cnt++;
   }

   const total = cnt;
   cnt = 0;
   for (i in atomlist) {
      atom = this.atoms[atomlist[i]]; if (atom === undefined) continue;

      if ((colorSidechains || atom.atom !== 'CA' || atom.atom !== 'O3\'') && !atom.hetflag) {
         const color = new TCo(0);
         color.setHSV(240.0 / 360 * (1 - cnt / total), 1, 0.9);
         atom.color = color.getHex();
         cnt++;
      }
   }
};

GLmol.prototype.drawSymmetryMates2 = function(group, asu, matrices) {
   if (matrices === undefined) return;
   asu.matrixAutoUpdate = false;

   let cnt = 1;
   this.protein.appliedMatrix = new THREE.Matrix4();
   for (let i = 0; i < matrices.length; i++) {
      const mat = matrices[i];
      if (mat === undefined || mat.isIdentity()) continue;
      console.log(mat);
      const symmetryMate = THREE.SceneUtils.cloneObject(asu);
      symmetryMate.matrix = mat;
      group.add(symmetryMate);
      for (let j = 0; j < 16; j++) this.protein.appliedMatrix.elements[j] += mat.elements[j];
      cnt++;
   }
   this.protein.appliedMatrix.multiplyScalar(cnt);
};


GLmol.prototype.drawSymmetryMatesWithTranslation2 = function(group, asu, matrices) {
   if (matrices === undefined) return;
   const p = this.protein;
   asu.matrixAutoUpdate = false;

   for (let i = 0; i < matrices.length; i++) {
      const mat = matrices[i];
      if (mat === undefined) continue;

      for (let a = -1; a <=0; a++) {
         for (let b = -1; b <= 0; b++) {
             for (let c = -1; c <= 0; c++) {
                const translationMat = new THREE.Matrix4().makeTranslation(
                   p.ax * a + p.bx * b + p.cx * c,
                   p.ay * a + p.by * b + p.cy * c,
                   p.az * a + p.bz * b + p.cz * c);
                const symop = mat.clone().multiply(translationMat);
                if (symop.isIdentity()) continue;
                const symmetryMate = THREE.SceneUtils.cloneObject(asu);
                symmetryMate.matrix = symop;
                group.add(symmetryMate);
             }
         }
      }
   }
};

GLmol.prototype.defineRepresentation = function() {
   const all = this.getAllAtoms();
   const hetatm = this.removeSolvents(this.getHetatms(all));
   this.colorByAtom(all, {});
   this.colorByChain(all);

   this.drawAtomsAsSphere(this.modelGroup, hetatm, this.sphereRadius);
   this.drawMainchainCurve(this.modelGroup, all, this.curveWidth, 'P');
   this.drawCartoon(this.modelGroup, all, this.curveWidth);
};

GLmol.prototype.getView = function() {
   if (!this.modelGroup) return [0, 0, 0, 0, 0, 0, 0, 1];
   const pos = this.modelGroup.position;
   const q = this.rotationGroup.quaternion;
   return [pos.x, pos.y, pos.z, this.rotationGroup.position.z, q.x, q.y, q.z, q.w];
};

GLmol.prototype.setView = function(arg) {
   if (!this.modelGroup || !this.rotationGroup) return;
   this.modelGroup.position.x = arg[0];
   this.modelGroup.position.y = arg[1];
   this.modelGroup.position.z = arg[2];
   this.rotationGroup.position.z = arg[3];
   this.rotationGroup.quaternion.x = arg[4];
   this.rotationGroup.quaternion.y = arg[5];
   this.rotationGroup.quaternion.z = arg[6];
   this.rotationGroup.quaternion.w = arg[7];
   this.show();
};

GLmol.prototype.setBackground = function(hex, a) {
   a = a | 1.0;
   this.bgColor = hex;
   if (this.renderer) this.renderer.setClearColorHex(hex, a);
   this.scene.fog.color = new TCo(hex);
};

GLmol.prototype.initializeScene = function() {
   // CHECK: Should I explicitly call scene.deallocateObject?
   this.scene = new THREE.Scene();
   this.scene.fog = new THREE.Fog(this.bgColor, 100, 200);

   this.modelGroup = new THREE.Object3D();
   this.rotationGroup = new THREE.Object3D();
   // sjpt this.rotationGroup.useQuaternion = true;
   this.rotationGroup.quaternion = new THREE.Quaternion(1, 0, 0, 0);
   this.rotationGroup.add(this.modelGroup);

   this.scene.add(this.rotationGroup);
   this.setupLights(this.scene);
};

GLmol.prototype.zoomInto = function(atomlist = this.atomlist, keepSlab=undefined) {
   const tmp = this.getExtent(atomlist);
   let center = new TV3(tmp[2][0], tmp[2][1], tmp[2][2]);//(tmp[0][0] + tmp[1][0]) / 2, (tmp[0][1] + tmp[1][1]) / 2, (tmp[0][2] + tmp[1][2]) / 2);
   if (this.protein.appliedMatrix) {center = this.protein.appliedMatrix.multiplyVector3(center);}
   this.modelGroup.position.copy(center.multiplyScalar(-1));
   const x = tmp[1][0] - tmp[0][0], y = tmp[1][1] - tmp[0][1], z = tmp[1][2] - tmp[0][2];

   let maxD = Math.sqrt(x * x + y * y + z * z);
   if (maxD < 25) maxD = 25;

   if (!keepSlab) {
      this.slabNear = -maxD / 1.9;
      this.slabFar = maxD / 3;
   }

   this.rotationGroup.position.z = maxD * 0.35 / Math.tan(Math.PI / 180.0 * this.camera.fov / 2) - 150;
   this.rotationGroup.quaternion = new THREE.Quaternion(1, 0, 0, 0);
};

GLmol.prototype.rebuildScene = function() {
   const time = new Date();

   const view = this.getView();
   this.initializeScene();
   this.defineRepresentation();
   this.setView(view);

   console.log("builded scene in " + (+new Date() - time) + "ms");
};

GLmol.prototype.loadMolecule = function(repressZoom) {
   this.loadMoleculeStr(repressZoom, $('#' + this.id + '_src').val());
};

// var getFileExtension;
GLmol.prototype.loadMoleculeStr = function(repressZoom, source, sstruct) {
   const time = new Date();

   this.protein = {sheet: [], helix: [], biomtChains: '', biomtMatrices: [], symMat: [], pdbID: '', title: ''};
   this.atoms = [];
   if (sstruct && window.getFileExtension(sstruct.filename) === '.xyz') {
      this.parseXYZ(source);
      this.chains = [];
   } else {
      this.parsePDB2(source);
      if (!this.parseSDF(source)) this.parseXYZ(source);
   }
   console.log("parsed in " + (+new Date() - time) + "ms");

   const title = $('#' + this.id + '_pdbTitle');
   let titleStr = '';
   if (this.protein.pdbID !== '') titleStr += '<a href="http://www.rcsb.org/pdb/explore/explore.do?structureId=' + this.protein.pdbID + '">' + this.protein.pdbID + '</a>';
   if (this.protein.title !== '') titleStr += '<br>' + this.protein.title;
   title.html(titleStr);

   /*********** sjpt not for library */
   // this.rebuildScene(true);

   //if (repressZoom === undefined || !repressZoom) this.zoomInto(this.getAllAtoms());

   //this.show();
   /******************/
 };

GLmol.prototype.setSlabAndFog = function() {
   let center = this.rotationGroup.position.z - this.camera.position.z;
   if (center < 1) center = 1;
   this.camera.near = center + this.slabNear;
   if (this.camera.near < 1) this.camera.near = 1;
   this.camera.far = center + this.slabFar;
   if (this.camera.near + 1 > this.camera.far) this.camera.far = this.camera.near + 1;
   if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.fov = this.fov;
   } else {
      this.camera.right = center * Math.tan(Math.PI / 180 * this.fov);
      this.camera.left = - this.camera.right;
      this.camera.top = this.camera.right / this.ASPECT;
      this.camera.bottom = - this.camera.top;
   }
   this.camera.updateProjectionMatrix();
   this.scene.fog.near = this.camera.near + this.fogStart * (this.camera.far - this.camera.near);
//   if (this.scene.fog.near > center) this.scene.fog.near = center;
   this.scene.fog.far = this.camera.far;
};

GLmol.prototype.enableMouse = function() {
   const me = this, glDOM = $(this.container);

   // TODO: Better touch panel support.
   // Contribution is needed as I don't own any iOS or Android device with WebGL support.
   glDOM.bind('mousedown touchstart', function(ev) {
      ev.preventDefault();
      if (!me.scene) return;
      let x = ev.pageX, y = ev.pageY;
      if (ev.originalEvent.targetTouches && ev.originalEvent.targetTouches[0]) {
         x = ev.originalEvent.targetTouches[0].pageX;
         y = ev.originalEvent.targetTouches[0].pageY;
      }
      if (x === undefined) return;
      me.isDragging = true;
      me.mouseButton = ev.which;
      me.mouseStartX = x;
      me.mouseStartY = y;
      me.cq = me.rotationGroup.quaternion;
      me.cz = me.rotationGroup.position.z;
      me.currentModelPos = me.modelGroup.position.clone();
      me.cslabNear = me.slabNear;
      me.cslabFar = me.slabFar;
    });

   glDOM.bind('DOMMouseScroll mousewheel', function(ev) { // Zoom
      ev.preventDefault();
      if (!me.scene) return;
      const scaleFactor = (me.rotationGroup.position.z - me.CAMERA_Z) * 0.85;
      if (ev.originalEvent.detail) { // Webkit
         me.rotationGroup.position.z += scaleFactor * ev.originalEvent.detail / 10;
      } else if (ev.originalEvent.wheelDelta) { // Firefox
         me.rotationGroup.position.z -= scaleFactor * ev.originalEvent.wheelDelta / 400;
      }
      console.log(ev.originalEvent.wheelDelta, ev.originalEvent.detail, me.rotationGroup.position.z);
      me.show();
   });
   glDOM.bind("contextmenu", function(ev) {ev.preventDefault();});
   $('body').bind('mouseup touchend', function(ev) {
      me.isDragging = false;
   });

   glDOM.bind('mousemove touchmove', function(ev) { // touchmove
      ev.preventDefault();
      if (!me.scene) return;
      if (!me.isDragging) return;
      let mode = 0;
      const modeRadio = $('input[name=' + me.id + '_mouseMode]:checked');
      if (modeRadio.length > 0) mode = parseInt(modeRadio.val());

      let x = ev.pageX, y = ev.pageY;
      if (ev.originalEvent.targetTouches && ev.originalEvent.targetTouches[0]) {
         x = ev.originalEvent.targetTouches[0].pageX;
         y = ev.originalEvent.targetTouches[0].pageY;
      }
      if (x === undefined) return;
      let dx = (x - me.mouseStartX) / me.WIDTH;
      let dy = (y - me.mouseStartY) / me.HEIGHT;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (mode === 3 || (me.mouseButton === 3 && ev.ctrlKey)) { // Slab
          me.slabNear = me.cslabNear + dx * 100;
          me.slabFar = me.cslabFar + dy * 100;
      } else if (mode === 2 || me.mouseButton === 3 || ev.shiftKey) { // Zoom
         let scaleFactor = (me.rotationGroup.position.z - me.CAMERA_Z) * 0.85;
         if (scaleFactor < 80) scaleFactor = 80;
         me.rotationGroup.position.z = me.cz - dy * scaleFactor;
      } else if (mode === 1 || me.mouseButton === 2 || ev.ctrlKey) { // Translate
         let scaleFactor = (me.rotationGroup.position.z - me.CAMERA_Z) * 0.85;
         if (scaleFactor < 20) scaleFactor = 20;
         if (me.webglFailed) { dx *= -1; dy *= -1;}
         const translationByScreen = new TV3(- dx * scaleFactor, - dy * scaleFactor, 0);
         const q = me.rotationGroup.quaternion;
         const qinv = new THREE.Quaternion(q.x, q.y, q.z, q.w).inverse().normalize();
         const translation = qinv.multiplyVector3(translationByScreen);
         me.modelGroup.position.x = me.currentModelPos.x + translation.x;
         me.modelGroup.position.y = me.currentModelPos.y + translation.y;
         me.modelGroup.position.z = me.currentModelPos.z + translation.z;
      } else if ((mode === 0 || me.mouseButton === 1) && r !== 0) { // Rotate
         const rs = Math.sin(r * Math.PI) / r;
         me.dq.x = Math.cos(r * Math.PI);
         me.dq.y = 0;
         me.dq.z =  rs * dx;
         me.dq.w =  rs * dy;
         me.rotationGroup.quaternion = new THREE.Quaternion(1, 0, 0, 0);
         me.rotationGroup.quaternion.multiply(me.dq);
         me.rotationGroup.quaternion.multiply(me.cq);
      }
      me.show();
   });
};


GLmol.prototype.show = function() {
   if (!this.scene) return;

   const time = new Date();
   this.setSlabAndFog();
   if (!this.webglFailed) this.renderer.render(this.scene, this.camera);
   else this.render2d();
   console.log("rendered in " + (+new Date() - time) + "ms");
};

GLmol.prototype.render2d = function() {
  const ctx = this.canvas2d[0].getContext("2d");
  this.scene.updateMatrixWorld();
  ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
  ctx.save();

  ctx.translate(this.WIDTH / 2, this.HEIGHT / 2);
  ctx.scale(30, 30);
  ctx.lineCap = "round";
  const mvMat = new THREE.Matrix4();
  mvMat.multiply(this.camera.matrixWorldInverse, this.modelGroup.matrixWorld);
//  const pmvMat = new THREE.Matrix4();
//  pmvMat.multiply(this.camera.projectionMatrix, mvMat);

  const PI2 = Math.PI * 2;
  const toDraw = [];
  const atoms = this.atoms;
  for (let i = 0, ilim = this.atoms.length; i < ilim; i++) {
      const atom = atoms[i];
      if (atom === undefined) continue;

      if (atom.screen === undefined) atom.screen = new THREE.Vector3();
      atom.screen.set(atom.x, atom.y, atom.z);
      /*p*/mvMat.multiplyVector3(atom.screen);
      if (!this.webglFailed) atom.screen.y *= -1; // plus direction of y-axis: up in OpenGL, down in Canvas

      toDraw.push([false, atom.screen.z, i]);
  }

  // TODO: do it in 1-pass
  for (let i = 0, ilim = this.atoms.length; i < ilim; i++) {
      const atom = atoms[i];
      if (atom === undefined) continue;

      for (let j = 0, jlim = atom.bonds.length; j < jlim; j++) {
         const atom2 = atoms[atom.bonds[j]];
         if (atom2 === undefined) continue;
         if (atom.serial > atom2.serial) continue;

         toDraw.push([true, (atom.screen.z + atom2.screen.z) / 2, i, atom.bonds[j]]);
      }
  }

  toDraw.sort(function(l, r) {
     return l[1] - r[1];
  });

  for (let i = 0, ilim = toDraw.length; i < ilim; i++) {
      const atom = atoms[toDraw[i][2]];
      if (!toDraw[i][0]) {
         ctx.fillStyle = "rgb(" + (atom.color >> 16) + "," + (atom.color >> 8 & 255) +
                    "," + (atom.color & 255) + ")";
         ctx.lineWidth = 0.03;
         ctx.beginPath();
         ctx.arc(atom.screen.x, atom.screen.y, 0.4, 0, PI2, true);
         ctx.closePath();
         ctx.fill();
         ctx.strokeStyle ="#000000";
         ctx.stroke();
      } else {
        const atom2 = atoms[toDraw[i][3]];
        ctx.lineWidth = 0.3;
        const cx = (atom.screen.x + atom2.screen.x) / 2;
        const cy = (atom.screen.y + atom2.screen.y) / 2;
        ctx.strokeStyle = "rgb(" + (atom.color >> 16) + "," + (atom.color >> 8 & 255) +
                   "," + (atom.color & 255) + ")";
        ctx.beginPath();
        ctx.moveTo(atom.screen.x, atom.screen.y);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.stroke();
        ctx.strokeStyle = "rgb(" + (atom2.color >> 16) + "," + (atom2.color >> 8 & 255) +
                   "," + (atom2.color & 255) + ")";
        ctx.beginPath();
        ctx.moveTo(atom2.screen.x, atom2.screen.y);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.stroke();
      }
  }

  ctx.restore();
};

// For scripting
GLmol.prototype.doFunc = function(func) {
    func(this);
};

GLmol.prototype.getAtom = function getAtom(res, atomp) {
   for (let atid = res.startResi; atid < res.endResi; atid++) {
      if (this.atoms[atid].atom === atomp) return this.atoms[atid];
   }
}


///PJT. mostly based on FoldSynth FluidCartoonView. Takes long enough to warrant generator function* ...
GLmol.prototype.drawFluidCartoon = function* ({
   group, atomlist, divURes = 10, divV = 8, baseRadius= 0.1, multiplierRadius= 2, chainSplitDistance = 10,
   ssNarrowRad= 0.1, ssBroadRad= 1, ssSheetBroadRad= 1, ssArrowSize= 1.5, tangentSpace = false,
   bias = 0, tension = -0.75, sweepVertical = true
} = {}) {
   const me = this;
   console.time('fluidCartoon');

   console.time('collect CA'); //also 'P'... nb, other sources refer to 'O', etc...
   //http://plato.cgl.ucsf.edu/trac/chimera/browser/trunk/libs/Ribbon/base.py#L73

   let caListAll = atomlist.map(i => this.atoms[i]).filter(a => a.atom === 'CA' || a.atom === 'P');
   if (caListAll.length === 0) caListAll = atomlist.map(i => this.atoms[i]);  // all if no CA or P
   //group CA atoms by chain. Assume they're guaranteed to be in order?
   //there might be a quicker / better way of getting chains.
   const chains = caListAll.reduce((a, b) => {
      if (!a[b.chain]) {
         a[b.chain] = [];
      }
      a[b.chain].push(b);
      return a;
   }, {});
   console.timeEnd('collect CA');

   console.time('split subchains');
   const distanceSqCutoff = chainSplitDistance**2;
   const chains2 = Object.getOwnPropertyNames(chains).map(name => {
      const chain = chains[name];
      const ca = chain;

      if (!ca.length) return;
      const points = ca.map(a => {
         return a.point = new TV3(a.x, a.y, a.z); //not pure FP use of map, but adding point to 'a' for use later.
      });
      const subchains = [];
      let sub = [ca[0]];
      sub = {caList: [ca[0]], startResi:0, name: ca[0].chain};
      subchains.push(sub);
      //let subStartResi = 0; //for current sub, could be better to make sub something other than atom array, but...
      for (let i=0; i<ca.length-1; i++) {
         if (points[i].distanceToSquared(points[i+1]) > distanceSqCutoff) {
            sub.endResi = i; //record end of old subchain
            //start a new subchain with ca[i+1]
            sub = {caList: [ca[i+1]], startResi: i+1, name: ca[i+1] + '_' + subchains.length};
            subchains.push(sub);
         } else {
            sub.caList.push(ca[i+1]);
         }
      }
      sub.endResi = ca.length-1; //make sure final sub has an endResi.

      return subchains;
   }).reduce((a, b) => a.concat(b), []); //turn array of subchain arrays into array of subchains
   //('subchains' were arrays of CA atoms, now objects with {caList, startResi, endResi})
   console.timeEnd('split subchains');

   //'ubunch' to concentrate interpolated points closer to control points (residues CA in this case)
   //see FoldSynth FluidCartoonView
   //const ubunch = []; XXX: factoring out >> doesn't help much and adds some difficulty eg for clean arrowheads
   //see SVN r6850 for version that still included this.

   //not sure if worth having these lookup tables, porting from FoldSynth (maybe too closely).
   const sin = [], cos = [];
   for (let v=0; v<divV; v++) {
      const a = 2 * Math.PI * v / divV;
      sin.push(Math.sin(a));
      cos.push(Math.cos(a));
   }

   for (let chainIndex in chains2) {
      const subchain = chains2[chainIndex];
      const ca = subchain.caList;
      if (ca.length < 2) continue;  // needed for example with 2qqp
      const name = ca[0].chain;
      console.time('chain ' + name);
      console.time(name + ' init');
      // let firstChain = false;
      const points = ca.map(a => a.point);
      //If we were to compute divU to have extra entries for SS transitions,
      //how much of the rest of the logic would have to change?
      const divU = 1 + ((ca.length-1) * divURes);
      //how best to count sheets & helices?
      const nSheets = new Set(ca.map(a => a.sheet)).size;
      const nHelices = new Set(ca.map(a => a.helix)).size;
      const extraU = nSheets;// 3*nSheets + 2*nHelices; //only add extra for arrowheads for now...
      const divUx = divU + extraU;
      const chainn = points.length;

      const resUps = ca.map(a => new TV3());

      const uArr = [...Array(divU).keys()];
      const curvePoints = uArr.map(u => new TV3());
      const curvePointsd = uArr.map(u => new TV3());
      const cpUps = uArr.map(u => new TV3());
      const cpDirs = uArr.map(u => new TV3());
      const rads = uArr.map(u => new THREE.Vector2());

      console.timeEnd(name + ' init');

      //from FoldSynth, originally http://local.wasp.uwa.edu.au/~pbourke/miscellaneous/interpolation/
      const hermite = function hermite(y0, y1, y2, y3, mu) {
         let m0, m1, mu2, mu3, a0, a1, a2, a3;

         mu2 = mu * mu;
         mu3 = mu2 * mu;

         m0  = (y1-y0)*(1+bias)*(1-tension)/2;
         m0 += (y2-y1)*(1-bias)*(1-tension)/2;
         m1  = (y2-y1)*(1+bias)*(1-tension)/2;
         m1 += (y3-y2)*(1-bias)*(1-tension)/2;
         a0 =  2*mu3 - 3*mu2 + 1;
         a1 =    mu3 - 2*mu2 + mu;
         a2 =    mu3 -   mu2;
         a3 = -2*mu3 + 3*mu2;

         return(a0*y1+a1*m0+a2*m1+a3*y2);
      }
      const hermiteV = function hermiteV(y0, y1, y2, y3, mu, out) {
         const x = hermite(y0.x, y1.x, y2.x, y3.x, mu);
         const y = hermite(y0.y, y1.y, y2.y, y3.y, mu);
         const z = hermite(y0.z, y1.z, y2.z, y3.z, mu);
         out.set(x, y, z);
      }
      //temp vectors etc to save calling 'new' the whole time.
      const aa = new TV3(), bb = new TV3(), aaa = new TV3(), bbb = new TV3(), vp = new TV3(); //keeping close to FoldSynth naming while porting
      const offset = new TV3(), nrm = new TV3(), dv = new TV3(), du = new TV3();

      (function smoothSheets() {
         for (let r=0; r<chainn; r++) {
            const ss = ca[r].ss;
            if (ss === 's') { //nb, original glmol did similar with 'smoothen' property, maybe make more similar
               const p = points[r];
               const p2 = points[r+1];
               p.addVectors(p, p2).multiplyScalar(0.5);
            }
         }
      })();

      (function roundHelices() {
         //TODO... check for anything valuable in PyMol:
         //FlattenSheets, SmoothLoops, FlattenSheetsRefineTips...
      })();

      // Somewhat equivalent to GLMol.subdivide(), which also does smoothSheets equivalent,
      // but doesn't output curvePointsd equivalent, so not possible to swap directly.
      (function interpolateChain() {

         let y0, y1, y2, y3;
         y0 = y1 = points[0]; y2 = points[Math.min(points.length-1, 1)]; y3 = points[Math.min(points.length-1, 2)];
         let cp = 0;
         for (let r=0; r<chainn-1; r++) {
            for (let uu=0; uu < divURes; uu++) {
               //default interpType in FoldSynth was Hermite; not implementing others (at least for now)
               const dirdelta = 0.001;
               const uf = uu/divURes; //no longer using ubunch, fractional u
               hermiteV(y0, y1, y2, y3, uf, curvePoints[cp]);
               hermiteV(y0, y1, y2, y3, uf + dirdelta, curvePointsd[cp]);
               cp++;
            }
            //end of residue, move all the points along 1
            y0=y1; y1=y2; y2=y3;
            y3 = r+3 >= chainn ? points[chainn-1] : points[r+3];
         }
         curvePoints[cp] = points[chainn-1];
         curvePointsd[cp] = curvePoints[cp-1];
      })();

      (function findDirs() {
         for (let cp=1; cp < divU-1; cp++) {
            cpDirs[cp].subVectors(curvePointsd[cp], curvePoints[cp]);
            cpDirs[cp].normalize();
         }
         cpDirs[0] = cpDirs[1];
         cpDirs[divU-1] = cpDirs[divU-2];
      })();
      const up = new TV3(), crossx = new TV3();
      (function findResUps() {
         let dir0 = cpDirs[0];
         dir0.x**2 > dir0.y**2 ? up.set(0,1,0) : up.set(1,0,0);
         for (let r=0; r < chainn; r++) {
            const cp = r*divURes;
            const atom = ca[r];
            const ss = atom.ss;
            const dir = cpDirs[cp];
            //equivalent check here I believe is "ca[r].ss === 'c'" (ss I think is always set to 'h', 's', or 'c')
            //if (shapess[r + chain.first] == null) {
            if (ss === 'c') {
               crossx.crossVectors(dir, up);
               up.crossVectors(crossx, dir);
            } else {
               ///--> fold.structDir() <--
               //r in subchain range, ss is sheetObject or helixObject
               //not really proper port of foldsynth

               //3.6 residues per turn... don't quite understand FoldSynth 'helix distance' being int, then...
               //also watch for interaction of ubunch with divURes... was probably a bug in FoldSynth
               //(although by the time the vector was crossed twice etc, up probably pointing in identical direction)
               //'d' could be a property of helixObj, but assuming constant for now.
               const d = 3.6, dd = Math.floor(d * divURes);

               if (atom.helix) { //approximately equivalent to Fold.Helix.structDir() in FoldSynth (some comments copied, others specific to here)
                  ////AAARGGGHHH::: need to be careful of startResi / endResi difference as a result of splitting chains into subchains
                  //added subchain.startResi & endResi to help with this.
                  //WE NEED TO CLARIFY WHAT INDICES WE USE WHERE / UNDER WHAT CIRCUMSTANCES THEY CAN BE TRANSFORMED ETC.
                  //pretty sure that 'resi' as parsed from PDB will still relate somewhat predictably to our array indices here... but...

                  // sjpt 14/04/19
                  // If we have multiple models we are not relative to broken chains.
                  // Code almost certainly broken if we have multiple models
                  // AND a model has broken chains with secondary structure.
                  let startResi, endResi;
                  if (me.models.length > 0) {
                     startResi = atom.helix.startResi;
                     endResi = atom.helix.endResi;
                  } else {
                     startResi = atom.helix.startResi - subchain.startResi;
                     endResi = atom.helix.endResi - subchain.startResi;
                  }
                  const startd = startResi * divURes, endd = endResi * divURes;

                  // We look backwards one loop and forwards one loop.
                  // However, near start or near end, we cannot look one complete cycle back/forward,
                  // so we use the 'first' or 'last' full loop for direction.
                  // This gives us a smooth change as we move along the helix.

                  // local direction (looking backwards)
                  const cpb1 = cp-dd < startd ? startd : cp-dd;
                  const cpb2 = cpb1 + dd; ///!<--- this is getting out of range, on account of startd+dd being too large.
                  //notice that atom.helix.endResi > subchain.endResi when this error occurs
                  //and that is the case even with very large chain split threshold (ie, splitting is not causing it)
                  const m = i => Math.min(i, curvePoints.length - 1); //for testing...
                  const sdir = aa.subVectors(curvePoints[m(cpb2)], curvePoints[m(cpb1)]);

                  // local direction (looking forwards)
                  const cpe2 = cp+dd > endd ? endd : cp+dd;
                  const cpe1 = cpe2 - dd;
                  const edir = bb.subVectors(curvePoints[m(cpe2)], curvePoints[m(cpe1)]);
                  // now average and normalize local direction
                  sdir.add(edir);
                  up.copy(sdir);
               }  // helix
               if (atom.sheet) {
                  //two atoms for direction: at least one of them should not be 'current' atom, atom.atom probably 'CA'
                  const res = atom.residue;
                  const a = res.prevsheetres ? me.getAtom(res.prevsheetres, atom.atom) : atom;
                  let b = res.nextsheetres ? me.getAtom(res.nextsheetres, atom.atom) : atom;
                  // experiment to use O if the strands are not joined in sheets (eg Chimera export)
                  // gives odd glitches, did not look deeper
                  // if (a === b) b = me.getAtom(res, 'O');
                  if (!b || a === b) {  // badly defined sheet, use non-sheet code
                     crossx.crossVectors(dir, up);
                     up.crossVectors(crossx, dir);
                  } else {
                     up.subVectors(a, b);
                  }
                  //removing old commented out howFarIn related code, see SVN ~r6850 for ref.
               }
            }  // helix or sheet
            resUps[r].copy(up).normalize();
         }
         // make sure we don't completely flip.
         // most likely to be at start of secondary structure
         for (let r=1; r < chainn; r++) {
            if (resUps[r].dot(resUps[r-1]) < 0) resUps[r].multiplyScalar(-1);
         }
      })();
      (function findCPUps() {
         let y0, y1, y2, y3;
         y0 = y1 = resUps[0]; y2 = resUps[Math.min(chainn-1,1)]; y3 = resUps[Math.min(chainn-1,2)];
         let cp = 0;
         for (let r=0; r<chainn-1; r++) {
            for (let uu=0; uu < divURes; uu++) {
               hermiteV(y0, y1, y2, y3, uu/divURes, cpUps[cp]);
               //--> FoldSynth has some edge case code I'm not bothering with right now...
               cpUps[cp].normalize();
               cp++;
            }
				// end of residue, move all the points along 1
				y0=y1; y1=y2; y2=y3;
				y3 = r+3 >= chainn ? resUps[chainn-1] : resUps[r+3];
         }
			cpUps[cp] = cpUps[cp-1];       // add very last point
      })();

      ////// Positions & color //////
      console.time(name + ' positions');
      const getIndex = function getIndex(u, v) {
         //remember that FoldSynth index into VertexAttrib<T> was aware of size of T.
         //here, we are indexing into float buffers.
         return u * divV + v; //should this by * 3? Applying elsewhere instead...
      }

      const vArrSize = 3 * divU * divV;
      const posData = new Float32Array(vArrSize), colData = new Uint8Array(vArrSize);
      const objectId = new Uint32Array(divU * divV), uvData = new Float32Array(2*divU*divV);
      for (let cpp=0; cpp<divU; cpp++) {
         let cp = cpp;
         const r = Math.floor((cp+0.5)/divURes); //why not round?
         const atom = ca[r];
         const ss = atom.ss;
         const col = atom.color;
         //const kr = Math.floor(cp / divURes);
         //bug was happening when f was slightly greater than chainn-2, trying floor - but not entirely sure of original logic.

         //const f = kr + ubunch[cp - kr*divURes];
         //const f = kr + (cp - kr*divURes)/divURes;
         const f = cp/divURes;
         const rad = rads[cp];
         rad.set(baseRadius, baseRadius*multiplierRadius);


         if (ss === 'h') {
            rad.x = ssNarrowRad;
            rad.y = ssBroadRad;
         } else if (ss === 's') {
            //TODO: improve arrow heads. >>Harder transitions between SS regions.<<
            //if we're at the start/end of an SS, (do) we want an extra set of divV points with baseRadii(?)
            //if we're at the start of an arrowhead, we *do* want a set with ss radii
            //we need to accomodate for these extra U in normal calculation.
            //could be a problem with degenerate cases if radii parameters were identical.
            const sheet = atom.sheet;
            //TODO: allow arrhead different arrowhead length than 1 residue
            if (atom.resi === sheet.endResi - 1) {
               rad.x = ssNarrowRad * ssArrowSize * (1 + r - f) + rad.x * (f - r);
               rad.y = ssBroadRad  * ssArrowSize * (1 + r - f) + rad.y * (f - r);
            } else if (atom.resi === sheet.startResi) {
               //...
               rad.x = ssNarrowRad * (f - r) + rad.x * (1 + r - f);
               rad.y = ssBroadRad  * (f - r) + rad.y * (1 + r - f);
            } else {
               rad.x = ssNarrowRad;
               rad.y = ssSheetBroadRad;
            }
         }

         if (r === 0) rad.multiplyScalar(cp/divURes);
         if (f > chainn-2) rad.multiplyScalar((divU-cp-1)/divURes); //<<< watch out for f here?

         const dir = cpDirs[cp], upp = cpUps[cp], basePoint = curvePoints[cp];
         aa.crossVectors(dir, upp); aa.normalize();
         if (sweepVertical) {
            bb.copy(upp); bb.multiplyScalar(-1);
         } else {
            bb.crossVectors(dir, aa); bb.normalize();
         }
         aa.multiplyScalar(rad.x);
         bb.multiplyScalar(rad.y);
         for (let v=0; v<divV; v++) {
            //this implementation will differ from FoldSynth
            //one BufferGeometry per chain vs single big one...
            //good to reduce the draw calls, but probably easier to code 1 per chain
            //can consolidate afterwards.
            //Might be handy to control chains visibility / other properties per chain anyway.
            //---addVertex(cpp, basePoint, v);
            aaa.copy(aa).multiplyScalar(sin[v]);
            bbb.copy(bb).multiplyScalar(cos[v]);
            offset.addVectors(aaa, bbb);
            vp.copy(basePoint);
            vp.add(offset);
            //nb: computeBoundingSphere is expensive later; we should do that while we're here.

            //could it be that pushing in order is different to FoldSynth's "pa.put(vertBuffer.getIndex(cpp, v), vp)"?
            //posData.push(vp.x, vp.y, vp.z);
            //there is probably also an expense to using array then converting to Float32Array.
            //getIndex may be problematic with divUx; may be better to simply accumulate?
            const i = getIndex(cpp, v) * 3;
            posData[i] = vp.x; posData[i+1] = vp.y; posData[i+2] = vp.z;
            objectId[i/3] = atom.serial;
            uvData[2*i/3] = cp / divU; //doesn't account for ubunch
            uvData[(2*i/3)+1] = v / divV;

            colData[i] = (col >> 16 & 255);
            colData[i+1] = (col >>  8 & 255);
            colData[i+2] = (col       & 255);
         }
      }
      console.timeEnd(name + ' positions');

      ////// Normals ///////
      console.time(name + ' normals');
      const getPos = function getPos(i, out) {
         //remember that FoldSynth index into VertexAttrib<T> was aware of size of T.
         //here, we are indexing into float buffers.
         i *= 3;
         const p = posData;
         out.set(p[i], p[i+1], p[i+2]);
         return out;
      }
      const nrmData = new Float32Array(vArrSize);
      //TODO: add tangent space depending on options
      const tanData = new Float32Array(vArrSize);
      const binrmData = new Float32Array(vArrSize);
      const addNormal = function addNormal(u, v, n, t, b) {
         const i = getIndex(u, v) * 3;
         nrmData[i] = n.x; nrmData[i+1] = n.y; nrmData[i+2] = n.z;
         if (t) {   tanData[i] = t.x;   tanData[i+1] = t.y;   tanData[i+2] = t.z; }
         if (b) { binrmData[i] = b.x; binrmData[i+1] = b.y; binrmData[i+2] = t.z; }
      }
      for (let cp=0; cp<divU; cp++) {
         const cpind = getIndex(cp, 0);
         const cpindpre = cp === 0 ? cpind : cpind - divV;
         const cpindpost = cp === divU-1 ? cpind : cpind+divV;

         for (let v=0; v<divV; v++) {
            //nb, FoldSynth has 'fineNormals' parameter, default false... I think maybe I prefer it off.
            //seems about same performance.
            const nvJ = (v-1+divV) % divV;
            const nvI = (v+1) % divV;
            //re-use temp vectors with FoldSynth variable naming for this context
            const plocal = aa, nu = bb, nv = aaa;
            getPos(cpind+nvJ, plocal);
            getPos(cpind+nvI, nv);

            dv.subVectors(nv, plocal);
            getPos(cpindpre + v, plocal);
            getPos(cpindpost + v, nu);
            du.subVectors(nu, plocal);

            nrm.crossVectors(du, dv);
            nrm.normalize();
            //XXX: is this correct tangent space?
            if (tangentSpace) addNormal(cp, v, nrm, du.normalize(), dv.normalize());
            else addNormal(cp, v, nrm);
         }
      }
      console.timeEnd(name + ' normals');

      ////// Indices /////
      console.time(name + ' indices');
      const indData = new Uint32Array(6 * (divU-1) * divV); //nb, Uint16 too small...
      // used to use triangle strip, but no longer supported by three.js
      const d = indData;
      let i = 0;
      for (let v = 0; v < divV; v++) {
         const v1 = (v+1) % divV;
         for (let u = 0; u < divU-1; u++) {
            const u1 = u+1;
            d[i++] = (u  * divV + v);
            d[i++] = (u1 * divV + v);
            d[i++] = (u1 * divV + v1);

            d[i++] = (u  * divV + v);
            d[i++] = (u1 * divV + v1);
            d[i++] = (u  * divV + v1);
         }
      }
      if (i !== d.length) console.error('wrong i on drawfluidcartoon', i, d.length);
      console.timeEnd(name + ' indices');

      const geometry = new THREE.BufferGeometry();
      geometry.setIndex(new THREE.BufferAttribute(indData, 1));
      geometry.setAttribute('position', new THREE.BufferAttribute(posData, 3));
      geometry.setAttribute('normal',   new THREE.BufferAttribute(nrmData, 3));
      if (tangentSpace)  {
         geometry.setAttribute('binormal', new THREE.BufferAttribute(binrmData, 3));
         geometry.setAttribute('tangent',  new THREE.BufferAttribute(tanData, 3));
      }
      geometry.setAttribute('color',    new THREE.BufferAttribute(colData, 3));
      geometry.setAttribute('uv',       new THREE.BufferAttribute(uvData, 2));
      geometry.objectId = objectId;
      geometry.attributes.color.normalized = true;

      const mat = this.cartoonMat || new (THREE.MeshLambertMaterial)();
      mat.vertexColors = THREE.VertexColors;
      const mesh = new THREE.Mesh(geometry, mat);
      // mesh.draw Mode = THREE.TriangleStripDraw Mode;
      mesh.name = 'fluidCartoon ' + name;
      group.add(mesh);
      console.timeEnd('chain ' + name);
      yield mesh;
   }//);
   console.timeEnd('fluidCartoon');
}  // GLmol.prototype.drawFluidCartoon


return GLmol;
}());
