'use strict'
var makeDraggable, log, everyframe, currentGenes, U, tad, tadkin, W, feed, GX, S, format, Maestro, killev, writetextremote, readtext,
fileTypeHandlers, COL, WA, makeRegexp, THREE, getFoldState, genedefs, xfetch;

var _vieweditlist = {}
/** make a new viewedit panel me.name, and  use it  to set values if requested */
function Viewedit({name = 'test', usevalues = true, initstring, top, left, right, width=370, height=600} = {}) {
    if (!everyframe) everyframe = f => setInterval(f, 100); //  for minicode version
    if (!readtext) readtext = async f => await (await xfetch(f)).text();
    if (!W) W = window; if (!WA) W = window;
    name = name.replace('.vesettings', '');
    var me = this;
    me.name = name;
    const findobject = Viewedit.findobject;

    if (_vieweditlist[me.name]) _vieweditlist[me.name].remove();
    _vieweditlist[me.name] = me;

    var hh = me.topgui = document.createElement('fieldset')
    hh.id = 'viewedit' + me.name
    const old = document.getElementById(hh.id); if (old) document.body.removeChild(old);
    document.body.appendChild(hh)
    hh.className = 'vieweditholder';
    hh.innerHTML = `
        <legend onclick="toggleFold(this)">viewedit: ${me.name}</legend>
        <div>
            <textarea name="vieweditfilter" class="vieweditfilter" placeholder="... filter here ..."></textarea>
            <div class="fieldbody viewedit" tabIndex="1"></div>
        </div>`
    const topdiv = hh.children[1];
    const maindiv = topdiv.children[1];
    me.calcloop = everyframe(() => me.calc())
    hh.style.top = top ?? (innerHeight * 0.1)+'px';
    hh.style.left = left ?? 'unset';
    hh.style.right = right ?? 'unset';
    hh.style.width = width + 'px'
    hh.style.height = height + 'px'
    if (makeDraggable)
        makeDraggable(hh, {usesize: false, button: 1, movecallback: outerresize})
    else
        hh.style.position = 'fixed'
    // not yet window.addEventListener('beforeunload', () => me.remove())

    const ee = me.gui = hh.getElementsByClassName('viewedit')[0];
    const filtbox = hh.getElementsByClassName('vieweditfilter')[0];

    filtbox.onchange = filtbox.oninput = evt => me.filter(filtbox.value)

    function outerresize() {
        const pad =  hh.style.paddingBottom.pre('px')
        maindiv.style.height = (hh.clientHeight - maindiv.offsetTop - topdiv.offsetTop - pad) + 'px'
    }

    // special values control classes control display details, held on the key and value fields
    // mytype: number, string, function, boolean, myoneof, myoneofsummary, myfolder, myerror
    // myselected:
    // mypending:

    const setclass = function(i, type) {
        const tt = me.dds[i];
        const tt1 = me.dds[i+1];
        tt.mytype = type ?? tt.mytype
        const cl = tt.mytype + ' ' + (tt.myselected ? 'selected' : '') + ' ' + (tt.mypending ? 'pending' : '')
        tt.classList = cl + ' ' + 'key'
        tt1.classList = cl + ' ' + 'value'
    }

    // recalculate, and add empty line if needed
    me.calc = function eecalc() {
        if (!me.topgui.parentNode) return console.error('calc in unconnected gui')
        if (getFoldState(me.topgui)) return;
        if (W.timex) console.time('calctime' + W.timex)
        let dds = me.dds = Array.from(ee.childNodes);
        for (let i = dds.length - 4; i >= 0; i -= 2) {
            if (!dds[i].isIntersecting) continue;
            const k = dds[i].value;
            let r;
            if (k === '') {
                r = ''
            } else if (dds[i+1].mypending) {
                r = dds[i+1].value
                continue;
            } else try {
                if (k[0] === '.') {
                    r = JSON.stringify(Viewedit.list(k.substring(1))).replaceall('"','');
                } else {
                    r = dds[i].getter();
                }
            } catch(e) {
                r = e.message
                dds[i].mytype = 'myerror'
            }
            const ty = r?.isColor ? 'color' : typeof r;
            const rbase = r;
            dds[i+1].onmousedown = null; // until proven otherwise
            if (ty === 'object') {
                r = r.toString !== toString ? r.toString() : format(r, undefined, {totlen: 30}); // JSON.stringify(r).replaceall('"','');
            } else if (ty === 'function') {
                r = dds[i].value.pre('\n')
                if (r.startsWith('VEF("')) r = r.post('"').pre('"');
                dds[i+1].onmousedown = rbase;
            } else if (ty === 'undefined') {
                r = '!!! undefined'
            }
            if (!dds[i].mytype.startsWith('my')) {
                setclass(i, ty)
                dds[i+1].type = ty === 'number' ? 'number' : ty === 'boolean' ? 'checkbox' : ty === 'function' ? 'button' : ty === 'color' ? 'color' : 'text'
            }
            me.inpp(dds[i+1], r);
            if (ty === 'number') {
                const v = (+dds[i+1].value).toFixed(9);
                const nt0 = v.length - (v*1+'').length;  // number of trailing 0
                const dused = 9 - nt0;    //number of decimal digits dused
                const step = 10**-dused;
                const oldstep = dds[i+1].step || 1;
                if (oldstep > step) dds[i+1].step = '0.'+'0'.repeat(dused-1)+'1';
            }
        }
        if (dds[dds.length-2]?.value !== '')
            me.addrow('');
        if (W.timex) console.timeEnd('calctime' + W.timex)
    }

    var observer = new IntersectionObserver(function(entries) {
        for (const e of entries) {
            e.target.isIntersecting = e.isIntersecting
        }
    }, { threshold: [0] });


    ee.oninput = function(evt) {
        const dds = me.dds = Array.from(ee.childNodes);
        const tt = evt.target;
        tt.mypending = true;
        tt.classList.add('pending');

        const i = dds.indexOf(tt)
        if (i%2 === 0) {
            tt.rows = tt.value.split('\n').length;
            return ee.onchange(evt);
        }
        if (tt?.type === 'color') ee.onchange(evt)
        return true;
    }

    ee.onmouseover = function(evt) {
        let h = Viewedit.hover;
        if (!h) {
            h = Viewedit.hover = document.createElement('DIV');
            document.body.append(h);
            // h.style = 'position: fixed; zindex:9999; background: white; color: black; font-size: 125%';
            h.style = 'position: fixed; z-index:999999; background: white; color: black; font-size: 150%; border: 2px solid red; paddng:0.25em'
        }
        const dds = me.dds = Array.from(ee.childNodes);
        const tt = evt.target;
        const i = dds.indexOf(tt) | 1;
        const help = dds[i]?.help;
        if (!help) return;
        // log('enter', dds[i]?.help ?? 'nohelp')
        h.style.display = ''
        const r = dds[i-1].getBoundingClientRect();
        h.innerHTML = help;
        h.style.top = (r.top + r.height + 5) + 'px';
        h.style.left = r.left + 'px';
        log('sty', h.style.bottom, h.style.left)
    }

    ee.onmouseout = function() {
        if (Viewedit.hover) Viewedit.hover.style.display = 'none';
    }

    ee.onmousedown = function(evt) {
        if (Viewedit.lastdown) Viewedit.lastdown.style.zIndex = '' // nb onfocus does not bubble
        hh.style.zIndex = 9999; Viewedit.lastdown = hh;
        if (evt.buttons !== 1) return;
        const dds = me.dds = Array.from(ee.childNodes);
        const tt = evt.target;
        const i = dds.indexOf(tt)
        if (i%2 === 0) {
            tt.myselected = !tt.myselected;
            setclass(i);
        }
    }

    ee.onkeydown = async function(evt) {
        const dds = me.dds = Array.from(ee.childNodes);
        const tt = evt.target;
        const ii = dds.indexOf(tt);
        if (evt.altKey) {  // nb shift,insert conflicted with paste
            const i = ii & 126;
            switch(evt.key) {
                case 'ArrowDown': ee.insertBefore(dds[i+2],dds[i]); ee.insertBefore(dds[i+3],dds[i]); dds[i].focus(); break;
                case 'ArrowUp': if (i > 0) {ee.insertBefore(dds[i],dds[i-2]); ee.insertBefore(dds[i+1],dds[i-2]);} dds[i].focus(); break;
                case 'Insert': me.addrow('', '', dds[i+1]).k.focus(); break;
                case 'Delete': ee.removeChild(dds[i+1]); ee.removeChild(dds[i]); dds[i+2]?.focus(); break;
                case '-': tt.rows = +tt.rows === 1 ? tt.value.split('\n').length : 1; break;
                case 'c': {
                    let tocopy = dds.filter(d => d.myselected);
                    if (tocopy.length === 0) tocopy = [tt];
                    const copys = tocopy.map(t => me.inpp(t)).join('~~~');
                    log('copy', copys)

                    navigator.clipboard.writeText(copys);
                } break;
                case 'v': {
                    const texts = (await navigator.clipboard.readText()).split('~~~');
                    for (const t of texts) me.addrow(t, undefined, dds[i+1]).k.focus();
                } break;
                // case 'q': me.remove();
            }
            evt.stopPropagation();
        }

        if (ii % 2 === 1) {
            switch (evt.key) {
                case '#': tt.step = ''; break;  // will be reset on calc
                case '<': tt.min = tt.value; break;
                case '>': tt.max = tt.value; break;
                case '?': alert(`min ${tt.min} < .. > ${tt.max} max, step ? ${tt.step}`); break;
            }
        }

        if (evt.ctrlKey && !evt.shiftKey && evt.key === 's') { me.save(); killev(evt); }
        if (evt.ctrlKey && evt.key === 'x') { me.remove(); killev(evt); }
    }

    me.filter = function(filter) {
        const dds = me.dds = Array.from(ee.childNodes);
        const testregexp = makeRegexp(filter);
        for (let i = 0; i < dds.length; i += 2) {
            dds[i].style.display = dds[i+1].style.display = me.inpp(dds[i]).match(testregexp) ? '' : 'none';
        }
    }

    /* convenience get/set.
    Irritating use: proxy would not accept object as key, only string: property could not be indexed at all */
    me.inpp = function(inp, v) {
        if (v === undefined) { return (
            inp.type === 'checkbox' ? inp.checked :
            inp.type === 'number' ? +inp.value :
            inp.type === 'color' ? new THREE.Color(inp.value) :
            inp.value);
        } else {
            if (inp.type === 'checkbox') inp.checked = v;
            else if (inp.type === 'color') inp.value = '#' + v.getHexString();
            else inp.value = v;
        }
    }

    me.eval = s => {
        try {
            const f = me.makefun(s)
            const r = f();
            return r;
        } catch (e) {
            return '!!! ' + e
        }
    }

    me.makefun = s => {
        let ss = s ? 'return (' + s + ')' : ''
        if (s && s[0] === '#') {
            const sk = s.substring(1);
            if (!GX.getgui(sk))
                ss = `return 'no gui for ${sk}'`
            else if (GX.getgui(sk).press)
                ss = `return VEF(\`${sk}\`)`
            else
                ss = `return VEV[\`${sk}\`]`
        }
        try {
            return new Function(ss);
        } catch (e) {
            return () => 'bad function:' + e;
        }
    }

    ee.onchange = function(evt) {
        //console.log('onchange', evt.target.value);
        const dds = me.dds = Array.from(ee.childNodes);
        const tt = evt.target;
        tt.mypending = false; tt.classList.remove('pending');
        const i = dds.indexOf(tt)
        if (i === -1) {
            log('NOT FOUND')
        } else if (i%2 == 0) {
            try {
                dds[i].getter = me.makefun(dds[i].value);
                me.inpp(dds[i+1], dds[i].getter());
                const k = tt.value;
                if (k.startsWith('G.')) {
                    const gd = genedefs[k.substring(2)];
                    if (gd) {
                        const f = dds[i+1];
                        f.min = gd.min;
                        f.max = gd.max;
                        f.step = gd.step;
                        f.help = gd.help;
                    }
                }
            } catch (e) {
                dds[i].getter = me.makefun('"???  ' + e + '"');
                // console.error('???', dds[i].value)
            }
            me.calc()
        } else {
            const k = dds[i-1].value;
            const v = dds[i].value;
            const oldv = dds[i-1].getter();
            try {
                if (dds[i].type === 'color')
                    me.eval(`${k}.setHex(0x${v.substring(1)})`);
                else if (typeof oldv === 'object')
                    me.eval(`Object.assign(${k}, ${v})`);
                else
                    me.eval(k + '=' + ((tt.type === 'checkbox' || tt.type === 'radio') ? tt.checked : tt.value));
            } catch(e) {
                console.error('cannot assign' , k, '=', v);
            }
        }
        localStorage['viewedit_' + me.name] = dds.map(v => me.inpp(v)).join('\n~~~\n');
        // tt.lastValue = tt.value;
    }

    me.save = function(sname, promptt = 'enter name for save') {
        if (!sname) sname = prompt(promptt, me.name);
        if (!sname) return;
        const dds = me.dds = Array.from(ee.childNodes);
        me.lastsave = dds.map(v => me.inpp(v)).join('\n~~~\n');
        writetextremote('settings/' + sname + '.vesettings', me.lastsave);
    }

    me.load = async function(lname, values = true) {
        if (!lname) lname = prompt('enter name for load', me.name);
        if (!lname) return;
        const ss = await readtext('settings/' + lname + '.vesettings', true)
        me.restore(ss, values)
    }

    me.addrow = function eeaddrow(k, v, pos, mytype = 'temp') {
        const addafter = (e, aft) => aft ? ee.insertBefore(e, aft.nextSibling) : ee.appendChild(e);
        let dds = me.dds = Array.from(ee.childNodes);
        if (dds[dds.length-2]?.value === '') {ee.removeChild(dds[dds.length-1]); ee.removeChild(dds[dds.length-2]); }

        const e = document.createElement('TEXTAREA');
        e.value = k; addafter(e, pos);
        e.name = k + '$';
        e.rows = k.split('\n').length;
        // const v = k === '' ? k : eva l q(k);
        const f = document.createElement('INPUT');
        f.name = k + '_';
        f.value = '?';
        addafter(f, e);
        dds = me.dds = Array.from(ee.childNodes);
        // e.mytype = f.mytype = mytype; //
        setclass(dds.indexOf(e), mytype);
        ee.onchange({target: e})
        if (v !== undefined) {
            f.value = f.checked = v;
            ee.onchange({target: f});
        }
        observer.observe(e)
        return {k:e, v:f};
    }

    me.restore = async function eerestore(ll, set = usevalues) {
        ll = ll ?? initstring;
        ll = ll ?? await readtext('settings/' + me.name + '.vesettings', true);
        ll = ll ?? localStorage['viewedit_' + me.name];
        ll = ll ?? '';
        const lls = ll.split('\n~~~\n');
        for (let i = 0; i < lls.length; i += 2) {
            let v = lls[i+1];
            if (v === 'false') v = false;
            if (v === 'true') v = true;
            me.addrow(lls[i], set ? v : undefined);
        }
    }
    me.restoreset;
    me.restore(initstring, me.restoreset); // will restore from file or localStorage if no initstring

    // Object.values(_vieweditlist)[0].topgui.style.display
    // me.visible =

    me.calc()
    //for (let i=100; i < 1000; i++) setTimeout(()=>outerresize(), i);

    me.remove = function() {
        const dds = me.dds = Array.from(ee.childNodes);
        if (dds.map(v => me.inpp(v)).join('\n~~~\n') !== me.lastsave) {
            me.save('data has changed, do you want to save before quit?');
        }
        hh.parentNode?.removeChild(hh);
        Maestro.remove('preframe', me.calcloop);
        delete _vieweditlist[me.name];
        observer.disconnect();
    }

    me.addfromgx = function eeaddfromgx(pat, values = false) {
        const u = undefined;
        const p = GX.getgui(pat);
        if (!p) return console.error('no pattern', pat);
        if (p.press) {
            const {k, v} = me.addrow(`#${p.mostName()}`,u,u, 'myoneof')
            if (p.panelDetails) {
                v.type = 'radio'
                k.mytype = v.mytype = 'myoneof'
                v.name = p.panelDetails.mostName()
                v.checked = p.panelDetails.getValue() === p.mostName()
            }
            return {k, v}
        }
        if (p.isPanel) {
            return me.addrow(`#${p.mostName()}`,u,u, 'myoneofsummary')
        }
        if (p.guiType === 'folder') {
            return me.addrow(`"FOLDER: ${p.mostName()}"`,u,u, 'myfolder')
        }

        if (!p.getValue)  return console.error('pattern has no value', pat);
        const oo = findobject(p.object);
        let k;
        if (oo)
            k = (oo.ownerName === 'W' ? '' : oo.ownerName + '.') + oo.objName + Viewedit.propname(p)
        else
            k = `#${p.mostName()}`
        const {k:kk, v:vv} = me.addrow(k, values ? p.getValue() : undefined)
        vv.min = p._min;
        vv.max = p._max;
        vv.step = p._step;
        if (p.changeFunction)
            vv.onchange = async () => {p.changeFunction(); await S.frame(); p.changeFunction();}
    }

    me.addmenu = function addmenu(menupattern, values = false) {
        const d = GX.guidict();
        for (const k in d) {
            if (k.match(menupattern))
                me.addfromgx(k, values)
        }
    }

    Object.defineProperty(me, 'visible', {
        get: () => me.topgui.style.display !== 'none',
        set: v => {me.topgui.style.display = v ? '' : 'none'}
    })
} // Viewedit

/** find a 'holder' of this object so we can generate a string for it */
Viewedit.findobject = function findobject(o, ffprefs) {
    ffprefs = ffprefs ?? {G: currentGenes, U, tad, tadkin, W, feed, COL, "COL.hsvopts": COL.hsvopts} // dynnamic in case 'base' object change
    for (const ownerName in ffprefs) {
        const owner = ffprefs[ownerName];
        if (owner === o)
            return {ownerName: 'W', objName: ownerName}
        const i = Object.values(owner).indexOf(o);
        if (i !== -1) {
            const objName = Object.keys(owner)[i];
            return {ownerName, objName}
        }
    }
}

Viewedit.fromGX = function(pat) {
    delete localStorage['viewedit__' + pat];
    const mm = new Viewedit({name: '_' + pat})
    mm.addmenu(pat)
    return mm;
}

Viewedit.propname = pp => {
    const p = pp.propertyName ?? pp;
    return p.match(/^[a-zA-Z_$]\w*/) ? '.' + p : "['" + p + "']"
}

Viewedit.keyFromGX = function VieweditkeyFromGX(pat) {
    const p = GX.getgui(pat);
    if (!p) return console.error('no pattern', pat);
    if (p.press) {
        return {key: `#${p.mostName()}`}
    }
    if (p.isPanel) {
        return {key: `GX.getValue("${p.mostName()}")`}
    }

    if (!p.getValue)  return console.error('pattern has no value', pat);
    const oo = Viewedit.findobject(p.object);
    if (!oo) return console.error('no object', pat);
    let k = (oo.ownerName === 'W' ? '' : oo.ownerName + '.') + oo.objName + Viewedit.propname(p)
    const r = {key: k, min: p._min, max: p._max, step: p._step};
    if (p.changeFunction)
        r.onchange = async () => {p.changeFunction(); await S.frame(); p.changeFunction();}
    return r;
}

/** find named owner object + property for all gui items */
Viewedit.mapobjects = function() {
    const notfound = WA.notfound = []
    const noobj = WA.noobj = []
    const r = {}
    for (let n in GX.guiDictCache) {
        let c = GX.guiDictCache[n];
        if (c.object) {
            let oo = Viewedit.findobject(c.object);
            if (!oo) {
                log(n, 'object not found')
                notfound.push[n]
            } else {
                oo.propertyName = c.propertyName
                oo.value = c.getValue()
                r[n] = oo;
            }
        } else {
            log(n, 'no object')
            noobj.push(n)
        }
    }
return r;
}

// change display of all viewedit meus, h undefined, toggle, else true or false
Viewedit.toggle = function(h) {
    if (h === undefined) h = !Object.values(_vieweditlist)[0].visible;
    for (const v of Object.values(_vieweditlist)) v.visible = h;
}

/** find all places where this name happens */
Viewedit.owners = 'W G U tad tadkin feed'.split(' ')
Viewedit.list = function eelist(lname, prefs = Viewedit.owners) {
    const r = {}
    for (const pn of prefs) {
        const p = window[pn];
        const v = JSON.stringify(p[lname]);
        if (v !== undefined) {
            if (!r[v]) r[v] = '';
            r[v] += pn
        }
    }
return r;
}




var VEF = name => GX.getgui(name).press;
var VEV = new Proxy({}, {get: (o,k)=>GX.getValue(k), set: (o,k,v)=>GX.setValue(k,v)})

if (fileTypeHandlers) fileTypeHandlers['.vesettings'] = (data, fid) => new Viewedit({name:fid, initstring: data})