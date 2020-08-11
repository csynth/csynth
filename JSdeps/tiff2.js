// created with browserify from
// npm install tiff
//---PJT--- this keeps being a source of problems.
// I believe (hope) we should now be able to use it as a module...
// C:\GoldsmithsSVN\aaorganicart\Electron.1.6.7>node_modules\.bin\browserify -r tiff -o tiff2.js

require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

const defaultByteLength = 1024 * 8;
const charArray = [];

class IOBuffer {
    constructor(data, options) {
        options = options || {};
        if (data === undefined) {
            data = defaultByteLength;
        }
        if (typeof data === 'number') {
            data = new ArrayBuffer(data);
        }
        let length = data.byteLength;
        const offset = options.offset ? options.offset>>>0 : 0;
        if (data.buffer) {
            length = data.byteLength - offset;
            if (data.byteLength !== data.buffer.byteLength) { // Node.js buffer from pool
                data = data.buffer.slice(data.byteOffset + offset, data.byteOffset + data.byteLength);
            } else if (offset) {
                data = data.buffer.slice(offset);
            } else {
                data = data.buffer;
            }
        }
        this.buffer = data;
        this.length = length;
        this.byteLength = length;
        this.byteOffset = 0;
        this.offset = 0;
        this.littleEndian = true;
        this._data = new DataView(this.buffer);
        this._increment = length || defaultByteLength;
        this._mark = 0;
    }

    available(byteLength) {
        if (byteLength === undefined) byteLength = 1;
        return (this.offset + byteLength) <= this.length;
    }

    isLittleEndian() {
        return this.littleEndian;
    }

    setLittleEndian() {
        this.littleEndian = true;
    }

    isBigEndian() {
        return !this.littleEndian;
    }

    setBigEndian() {
        this.littleEndian = false;
    }

    skip(n) {
        if (n === undefined) n = 1;
        this.offset += n;
    }

    seek(offset) {
        this.offset = offset;
    }

    mark() {
        this._mark = this.offset;
    }

    reset() {
        this.offset = this._mark;
    }

    rewind() {
        this.offset = 0;
    }

    ensureAvailable(byteLength) {
        if (byteLength === undefined) byteLength = 1;
        if (!this.available(byteLength)) {
            const newIncrement = this._increment + this._increment;
            this._increment = newIncrement;
            const newLength = this.length + newIncrement;
            const newArray = new Uint8Array(newLength);
            newArray.set(new Uint8Array(this.buffer));
            this.buffer = newArray.buffer;
            this.length = newLength;
            this._data = new DataView(this.buffer);
        }
    }

    readBoolean() {
        return this.readUint8() !== 0;
    }

    readInt8() {
        return this._data.getInt8(this.offset++);
    }

    readUint8() {
        return this._data.getUint8(this.offset++);
    }

    readByte() {
        return this.readUint8();
    }

    readBytes(n) {
        if (n === undefined) n = 1;
        var bytes = new Uint8Array(n);
        for (var i = 0; i < n; i++) {
            bytes[i] = this.readByte();
        }
        return bytes;
    }

    readInt16() {
        var value = this._data.getInt16(this.offset, this.littleEndian);
        this.offset += 2;
        return value;
    }

    readUint16() {
        var value = this._data.getUint16(this.offset, this.littleEndian);
        this.offset += 2;
        return value;
    }

    readInt32() {
        var value = this._data.getInt32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }

    readUint32() {
        var value = this._data.getUint32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }

    readFloat32() {
        var value = this._data.getFloat32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }

    readFloat64() {
        var value = this._data.getFloat64(this.offset, this.littleEndian);
        this.offset += 8;
        return value;
    }

    readChar() {
        return String.fromCharCode(this.readInt8());
    }

    readChars(n) {
        if (n === undefined) n = 1;
        charArray.length = n;
        for (var i = 0; i < n; i++) {
            charArray[i] = this.readChar();
        }
        return charArray.join('');
    }

    writeBoolean(bool) {
        this.writeUint8(bool ? 0xff : 0x00);
    }

    writeInt8(value) {
        this.ensureAvailable(1);
        this._data.setInt8(this.offset++, value);
    }

    writeUint8(value) {
        this.ensureAvailable(1);
        this._data.setUint8(this.offset++, value);
    }

    writeByte(value) {
        this.writeUint8(value);
    }

    writeBytes(bytes) {
        this.ensureAvailable(bytes.length);
        for (var i = 0; i < bytes.length; i++) {
            this._data.setUint8(this.offset++, bytes[i]);
        }
    }

    writeInt16(value) {
        this.ensureAvailable(2);
        this._data.setInt16(this.offset, value, this.littleEndian);
        this.offset += 2;
    }

    writeUint16(value) {
        this.ensureAvailable(2);
        this._data.setUint16(this.offset, value, this.littleEndian);
        this.offset += 2;
    }

    writeInt32(value) {
        this.ensureAvailable(4);
        this._data.setInt32(this.offset, value, this.littleEndian);
        this.offset += 4;
    }

    writeUint32(value) {
        this.ensureAvailable(4);
        this._data.setUint32(this.offset, value, this.littleEndian);
        this.offset += 4;
    }

    writeFloat32(value) {
        this.ensureAvailable(4);
        this._data.setFloat32(this.offset, value, this.littleEndian);
        this.offset += 4;
    }

    writeFloat64(value) {
        this.ensureAvailable(8);
        this._data.setFloat64(this.offset, value, this.littleEndian);
        this.offset += 8;
    }

    writeChar(str) {
        this.writeUint8(str.charCodeAt(0));
    }

    writeChars(str) {
        for (var i = 0; i < str.length; i++) {
            this.writeUint8(str.charCodeAt(i));
        }
    }

    toArray() {
        return new Uint8Array(this.buffer, 0, this.offset);
    }
}

module.exports = IOBuffer;

},{}],2:[function(require,module,exports){
'use strict';

const TIFFDecoder = require('./tiffDecoder');

module.exports = function decodeTIFF(data, options) {
    const decoder = new TIFFDecoder(data, options);
    return decoder.decode(options);
};

},{"./tiffDecoder":8}],3:[function(require,module,exports){
'use strict';

const tags = {
    standard: require('./tags/standard'),
    exif: require('./tags/exif'),
    gps: require('./tags/gps')
};

class IFD {
    constructor(kind) {
        if (!kind) {
            throw new Error('missing kind');
        }
        this.data = null;
        this.fields = new Map();
        this.kind = kind;
        this._map = null;
    }

    get(tag) {
        if (typeof tag === 'number') {
            return this.fields.get(tag);
        } else if (typeof tag === 'string') {
            return this.fields.get(tags[this.kind].tagsByName[tag]);
        } else {
            throw new Error('expected a number or string');
        }
    }

    get map() {
        if (!this._map) {
            this._map = {};
            const taglist = tags[this.kind].tagsById;
            for (var key of this.fields.keys()) {
                if (taglist[key]) {
                    this._map[taglist[key]] = this.fields.get(key);
                }
            }
        }
        return this._map;
    }
}

module.exports = IFD;

},{"./tags/exif":5,"./tags/gps":6,"./tags/standard":7}],4:[function(require,module,exports){
'use strict';

var types = new Map([
    [1, [1, readByte]],       // BYTE
    [2, [1, readASCII]],      // ASCII
    [3, [2, readShort]],      // SHORT
    [4, [4, readLong]],       // LONG
    [5, [8, readRational]],   // RATIONAL
    [6, [1, readSByte]],      // SBYTE
    [7, [1, readByte]],       // UNDEFINED
    [8, [2, readSShort]],     // SSHORT
    [9, [4, readSLong]],      // SLONG
    [10, [8, readSRational]], // SRATIONAL
    [11, [4, readFloat]],     // FLOAT
    [12, [8, readDouble]]     // DOUBLE
]);

exports.getByteLength = function (type, count) {
    return types.get(type)[0] * count;
};

exports.readData = function (decoder, type, count) {
    return types.get(type)[1](decoder, count);
};

function readByte(decoder, count) {
    if (count === 1) return decoder.readUint8();
    var array = new Uint8Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readUint8();
    }
    return array;
}

function readASCII(decoder, count) {
    var strings = [];
    var currentString = '';
    for (var i = 0; i < count; i++) {
        var char = String.fromCharCode(decoder.readUint8());
        if (char === '\0') {
            strings.push(currentString);
            currentString = '';
        } else {
            currentString += char;
        }
    }
    if (strings.length === 1) {
        return strings[0];
    } else {
        return strings;
    }
}

function readShort(decoder, count) {
    if (count === 1) return decoder.readUint16();
    var array = new Uint16Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readUint16();
    }
    return array;
}

function readLong(decoder, count) {
    if (count === 1) return decoder.readUint32();
    var array = new Uint32Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readUint32();
    }
    return array;
}

function readRational(decoder, count) {
    if (count === 1) {
        return decoder.readUint32() / decoder.readUint32();
    }
    var rationals = new Array(count);
    for (var i = 0; i < count; i++) {
        rationals[i] = decoder.readUint32() / decoder.readUint32();
    }
    return rationals;
}

function readSByte(decoder, count) {
    if (count === 1) return decoder.readInt8();
    var array = new Int8Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readInt8();
    }
    return array;
}

function readSShort(decoder, count) {
    if (count === 1) return decoder.readInt16();
    var array = new Int16Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readInt16();
    }
    return array;
}

function readSLong(decoder, count) {
    if (count === 1) return decoder.readInt32();
    var array = new Int32Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readInt32();
    }
    return array;
}

function readSRational(decoder, count) {
    if (count === 1) {
        return decoder.readInt32() / decoder.readInt32();
    }
    var rationals = new Array(count);
    for (var i = 0; i < count; i++) {
        rationals[i] = decoder.readInt32() / decoder.readInt32();
    }
    return rationals;
}

function readFloat(decoder, count) {
    if (count === 1) return decoder.readFloat32();
    var array = new Float32Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readFloat32();
    }
    return array;
}

function readDouble(decoder, count) {
    if (count === 1) return decoder.readFloat64();
    var array = new Float64Array(count);
    for (var i = 0; i < count; i++) {
        array[i] = decoder.readFloat64();
    }
    return array;
}

},{}],5:[function(require,module,exports){
'use strict';

const tagsById = {
    0x829A: 'ExposureTime',
    0x829D: 'FNumber',
    0x8822: 'ExposureProgram',
    0x8824: 'SpectralSensitivity',
    0x8827: 'ISOSpeedRatings',
    0x8828: 'OECF',
    0x8830: 'SensitivityType',
    0x8831: 'StandardOutputSensitivity',
    0x8832: 'RecommendedExposureIndex',
    0x8833: 'ISOSpeed',
    0x8834: 'ISOSpeedLatitudeyyy',
    0x8835: 'ISOSpeedLatitudezzz',
    0x9000: 'ExifVersion',
    0x9003: 'DateTimeOriginal',
    0x9004: 'DateTimeDigitized',
    0x9101: 'ComponentsConfiguration',
    0x9102: 'CompressedBitsPerPixel',
    0x9201: 'ShutterSpeedValue',
    0x9202: 'ApertureValue',
    0x9203: 'BrightnessValue',
    0x9204: 'ExposureBiasValue',
    0x9205: 'MaxApertureValue',
    0x9206: 'SubjectDistance',
    0x9207: 'MeteringMode',
    0x9208: 'LightSource',
    0x9209: 'Flash',
    0x920A: 'FocalLength',
    0x9214: 'SubjectArea',
    0x927C: 'MakerNote',
    0x9286: 'UserComment',
    0x9290: 'SubsecTime',
    0x9291: 'SubsecTimeOriginal',
    0x9292: 'SubsecTimeDigitized',
    0xA000: 'FlashpixVersion',
    0xA001: 'ColorSpace',
    0xA002: 'PixelXDimension',
    0xA003: 'PixelYDimension',
    0xA004: 'RelatedSoundFile',
    0xA20B: 'FlashEnergy',
    0xA20C: 'SpatialFrequencyResponse',
    0xA20E: 'FocalPlaneXResolution',
    0xA20F: 'FocalPlaneYResolution',
    0xA210: 'FocalPlaneResolutionUnit',
    0xA214: 'SubjectLocation',
    0xA215: 'ExposureIndex',
    0xA217: 'SensingMethod',
    0xA300: 'FileSource',
    0xA301: 'SceneType',
    0xA302: 'CFAPattern',
    0xA401: 'CustomRendered',
    0xA402: 'ExposureMode',
    0xA403:	'WhiteBalance',
    0xA404:	'DigitalZoomRatio',
    0xA405:	'FocalLengthIn35mmFilm',
    0xA406:	'SceneCaptureType',
    0xA407:	'GainControl',
    0xA408:	'Contrast',
    0xA409:	'Saturation',
    0xA40A:	'Sharpness',
    0xA40B:	'DeviceSettingDescription',
    0xA40C:	'SubjectDistanceRange',
    0xA420:	'ImageUniqueID',
    0xA430: 'CameraOwnerName',
    0xA431: 'BodySerialNumber',
    0xA432: 'LensSpecification',
    0xA433: 'LensMake',
    0xA434: 'LensModel',
    0xA435: 'LensSerialNumber',
    0xA500: 'Gamma'
};

const tagsByName = {};
for (var i in tagsById) {
    tagsByName[tagsById[i]] = i;
}

module.exports = {
    tagsById,
    tagsByName
};

},{}],6:[function(require,module,exports){
'use strict';

const tagsById = {
    0x0000: 'GPSVersionID',
    0x0001: 'GPSLatitudeRef',
    0x0002: 'GPSLatitude',
    0x0003: 'GPSLongitudeRef',
    0x0004: 'GPSLongitude',
    0x0005: 'GPSAltitudeRef',
    0x0006: 'GPSAltitude',
    0x0007: 'GPSTimeStamp',
    0x0008: 'GPSSatellites',
    0x0009: 'GPSStatus',
    0x000A: 'GPSMeasureMode',
    0x000B: 'GPSDOP',
    0x000C: 'GPSSpeedRef',
    0x000D: 'GPSSpeed',
    0x000E: 'GPSTrackRef',
    0x000F: 'GPSTrack',
    0x0010: 'GPSImgDirectionRef',
    0x0011: 'GPSImgDirection',
    0x0012: 'GPSMapDatum',
    0x0013: 'GPSDestLatitudeRef',
    0x0014: 'GPSDestLatitude',
    0x0015: 'GPSDestLongitudeRef',
    0x0016: 'GPSDestLongitude',
    0x0017: 'GPSDestBearingRef',
    0x0018: 'GPSDestBearing',
    0x0019: 'GPSDestDistanceRef',
    0x001A: 'GPSDestDistance',
    0x001B: 'GPSProcessingMethod',
    0x001C: 'GPSAreaInformation',
    0x001D: 'GPSDateStamp',
    0x001E: 'GPSDifferential',
    0x001F: 'GPSHPositioningError'
};

const tagsByName = {};
for (var i in tagsById) {
    tagsByName[tagsById[i]] = i;
}

module.exports = {
    tagsById,
    tagsByName
};

},{}],7:[function(require,module,exports){
'use strict';

const tagsById = {
    // Baseline tags
    0x00FE: 'NewSubfileType',
    0x00FF: 'SubfileType',
    0x0100: 'ImageWidth',
    0x0101: 'ImageLength',
    0x0102: 'BitsPerSample',
    0x0103: 'Compression',
    0x0106: 'PhotometricInterpretation',
    0x0107: 'Threshholding',
    0x0108: 'CellWidth',
    0x0109: 'CellLength',
    0x010A: 'FillOrder',
    0x010E: 'ImageDescription',
    0x010F: 'Make',
    0x0110: 'Model',
    0x0111: 'StripOffsets',
    0x0112: 'Orientation',
    0x0115: 'SamplesPerPixel',
    0x0116: 'RowsPerStrip',
    0x0117: 'StripByteCounts',
    0x0118: 'MinSampleValue',
    0x0119: 'MaxSampleValue',
    0x011A: 'XResolution',
    0x011B: 'YResolution',
    0x011C: 'PlanarConfiguration',
    0x0120: 'FreeOffsets',
    0x0121: 'FreeByteCounts',
    0x0122: 'GrayResponseUnit',
    0x0123: 'GrayResponseCurve',
    0x0128: 'ResolutionUnit',
    0x0131: 'Software',
    0x0132: 'DateTime',
    0x013B: 'Artist',
    0x013C: 'HostComputer',
    0x0140: 'ColorMap',
    0x0152: 'ExtraSamples',
    0x8298: 'Copyright',

    // Extension tags
    0x010D: 'DocumentName',
    0x011D: 'PageName',
    0x011E: 'XPosition',
    0x011F: 'YPosition',
    0x0124: 'T4Options',
    0x0125: 'T6Options',
    0x0129: 'PageNumber',
    0x012D: 'TransferFunction',
    0x013D: 'Predictor',
    0x013E: 'WhitePoint',
    0x013F: 'PrimaryChromaticities',
    0x0141: 'HalftoneHints',
    0x0142: 'TileWidth',
    0x0143: 'TileLength',
    0x0144: 'TileOffsets',
    0x0145: 'TileByteCounts',
    0x0146: 'BadFaxLines',
    0x0147: 'CleanFaxData',
    0x0148: 'ConsecutiveBadFaxLines',
    0x014A: 'SubIFDs',
    0x014C: 'InkSet',
    0x014D: 'InkNames',
    0x014E: 'NumberOfInks',
    0x0150: 'DotRange',
    0x0151: 'TargetPrinter',
    0x0153: 'SampleFormat',
    0x0154: 'SMinSampleValue',
    0x0155: 'SMaxSampleValue',
    0x0156: 'TransferRange',
    0x0157: 'ClipPath',
    0x0158: 'XClipPathUnits',
    0x0159: 'YClipPathUnits',
    0x015A: 'Indexed',
    0x015B: 'JPEGTables',
    0x015F: 'OPIProxy',
    0x0190: 'GlobalParametersIFD',
    0x0191: 'ProfileType',
    0x0192: 'FaxProfile',
    0x0193: 'CodingMethods',
    0x0194: 'VersionYear',
    0x0195: 'ModeNumber',
    0x01B1: 'Decode',
    0x01B2: 'DefaultImageColor',
    0x0200: 'JPEGProc',
    0x0201: 'JPEGInterchangeFormat',
    0x0202: 'JPEGInterchangeFormatLength',
    0x0203: 'JPEGRestartInterval',
    0x0205: 'JPEGLosslessPredictors',
    0x0206: 'JPEGPointTransforms',
    0x0207: 'JPEGQTables',
    0x0208: 'JPEGDCTables',
    0x0209: 'JPEGACTables',
    0x0211: 'YCbCrCoefficients',
    0x0212: 'YCbCrSubSampling',
    0x0213: 'YCbCrPositioning',
    0x0214: 'ReferenceBlackWhite',
    0x022F: 'StripRowCounts',
    0x02BC: 'XMP',
    0x800D: 'ImageID',
    0x87AC: 'ImageLayer',

    // Private tags
    0x80A4: 'WangAnnotatio',
    0x82A5: 'MDFileTag',
    0x82A6: 'MDScalePixel',
    0x82A7: 'MDColorTable',
    0x82A8: 'MDLabName',
    0x82A9: 'MDSampleInfo',
    0x82AA: 'MDPrepDate',
    0x82AB: 'MDPrepTime',
    0x82AC: 'MDFileUnits',
    0x830E: 'ModelPixelScaleTag',
    0x83BB: 'IPTC',
    0x847E: 'INGRPacketDataTag',
    0x847F: 'INGRFlagRegisters',
    0x8480: 'IrasBTransformationMatrix',
    0x8482: 'ModelTiepointTag',
    0x85D8: 'ModelTransformationTag',
    0x8649: 'Photoshop',
    0x8769: 'ExifIFD',
    0x8773: 'ICCProfile',
    0x87AF: 'GeoKeyDirectoryTag',
    0x87B0: 'GeoDoubleParamsTag',
    0x87B1: 'GeoAsciiParamsTag',
    0x8825: 'GPSIFD',
    0x885C: 'HylaFAXFaxRecvParams',
    0x885D: 'HylaFAXFaxSubAddress',
    0x885E: 'HylaFAXFaxRecvTime',
    0x935C: 'ImageSourceData',
    0xA005: 'InteroperabilityIFD',
    0xA480: 'GDAL_METADATA',
    0xA481: 'GDAL_NODATA',
    0xC427: 'OceScanjobDescription',
    0xC428: 'OceApplicationSelector',
    0xC429: 'OceIdentificationNumber',
    0xC42A: 'OceImageLogicCharacteristics',
    0xC612: 'DNGVersion',
    0xC613: 'DNGBackwardVersion',
    0xC614: 'UniqueCameraModel',
    0xC615: 'LocalizedCameraModel',
    0xC616: 'CFAPlaneColor',
    0xC617: 'CFALayout',
    0xC618: 'LinearizationTable',
    0xC619: 'BlackLevelRepeatDim',
    0xC61A: 'BlackLevel',
    0xC61B: 'BlackLevelDeltaH',
    0xC61C: 'BlackLevelDeltaV',
    0xC61D: 'WhiteLevel',
    0xC61E: 'DefaultScale',
    0xC61F: 'DefaultCropOrigin',
    0xC620: 'DefaultCropSize',
    0xC621: 'ColorMatrix1',
    0xC622: 'ColorMatrix2',
    0xC623: 'CameraCalibration1',
    0xC624: 'CameraCalibration2',
    0xC625: 'ReductionMatrix1',
    0xC626: 'ReductionMatrix2',
    0xC627: 'AnalogBalance',
    0xC628: 'AsShotNeutral',
    0xC629: 'AsShotWhiteXY',
    0xC62A: 'BaselineExposure',
    0xC62B: 'BaselineNoise',
    0xC62C: 'BaselineSharpness',
    0xC62D: 'BayerGreenSplit',
    0xC62E: 'LinearResponseLimit',
    0xC62F: 'CameraSerialNumber',
    0xC630: 'LensInfo',
    0xC631: 'ChromaBlurRadius',
    0xC632: 'AntiAliasStrength',
    0xC634: 'DNGPrivateData',
    0xC635: 'MakerNoteSafety',
    0xC65A: 'CalibrationIlluminant1',
    0xC65B: 'CalibrationIlluminant2',
    0xC65C: 'BestQualityScale',
    0xC660: 'AliasLayerMetadata'
};

const tagsByName = {};
for (var i in tagsById) {
    tagsByName[tagsById[i]] = i;
}

module.exports = {
    tagsById,
    tagsByName
};

},{}],8:[function(require,module,exports){
'use strict';

const IOBuffer = require('iobuffer');
const IFD = require('./ifd');
const TiffIFD = require('./tiffIfd');
const IFDValue = require('./ifdValue');

const defaultOptions = {
    ignoreImageData: false,
    onlyFirst: false
};

class TIFFDecoder extends IOBuffer {
    constructor(data, options) {
        super(data, options);
        this._nextIFD = 0;
    }

    decode(options) {
        options = Object.assign({}, defaultOptions, options);
        const result = [];
        this.decodeHeader();
        while (this._nextIFD) {
            result.push(this.decodeIFD(options));
            if (options.onlyFirst) {
                return result[0];
            }
        }
        return result;
    }

    decodeHeader() {
        // Byte offset
        let value = this.readUint16();
        if (value === 0x4949) {
            this.setLittleEndian();
        } else if (value === 0x4D4D) {
            this.setBigEndian();
        } else {
            throw new Error('invalid byte order: 0x' + value.toString(16));
        }

        // Magic number
        value = this.readUint16();
        if (value !== 42) {
            throw new Error('not a TIFF file');
        }

        // Offset of the first IFD
        this._nextIFD = this.readUint32();
    }

    decodeIFD(options) {
        this.seek(this._nextIFD);

        var ifd;
        if (!options.kind) {
            ifd = new TiffIFD();
        } else {
            ifd = new IFD(options.kind);
        }

        const numEntries = this.readUint16();
        for (var i = 0; i < numEntries; i++) {
            this.decodeIFDEntry(ifd);
        }
        if (!options.ignoreImageData) {
            this.decodeImageData(ifd);
        }
        this._nextIFD = this.readUint32();
        return ifd;
    }

    decodeIFDEntry(ifd) {
        const offset = this.offset;
        const tag = this.readUint16();
        const type = this.readUint16();
        const numValues = this.readUint32();

        if (type < 1 || type > 12) {
            this.skip(4); // unknown type, skip this value
            return;
        }

        const valueByteLength = IFDValue.getByteLength(type, numValues);
        if (valueByteLength > 4) {
            this.seek(this.readUint32());
        }

        const value = IFDValue.readData(this, type, numValues);
        ifd.fields.set(tag, value);

        // Read sub-IFDs
        if (tag === 0x8769 || tag === 0x8825) {
            let currentOffset = this.offset;
            let kind;
            if (tag === 0x8769) {
                kind = 'exif';
            } else if (tag === 0x8825) {
                kind = 'gps';
            }
            this._nextIFD = value;
            ifd[kind] = this.decodeIFD({
                kind,
                ignoreImageData: true
            });
            this.offset = currentOffset;
        }

        // go to the next entry
        this.seek(offset);
        this.skip(12);
    }

    decodeImageData(ifd) {
        const orientation = ifd.orientation;
        if (orientation && orientation !== 1) {
            unsupported('orientation', orientation);
        }
        switch (ifd.type) {
            case 1: // BlackIsZero
            case 2: // RGB
                this.readStripData(ifd);
                break;
            case 3: // pallette ---- sjpt patch
                log('NOT SURE ABOUT TYPE 3 pallette TIFF DATA, DECODING AND HOPING');
                this.readStripData(ifd);
                break;
            default:
                unsupported('image type', ifd.type);
                break;
        }
    }

    readStripData(ifd) {
        const width = ifd.width;
        const height = ifd.height;

        const bitDepth = validateBitDepth(ifd.bitsPerSample);
        const sampleFormat = ifd.sampleFormat;
        let size = width * height;
        const data = getDataArray(size, 1, bitDepth, sampleFormat);

        const compression = ifd.compression;
        const rowsPerStrip = ifd.rowsPerStrip;
        const maxPixels = rowsPerStrip * width;
        const stripOffsets = ifd.stripOffsets;
        const stripByteCounts = ifd.stripByteCounts;

        var pixel = 0;
        for (var i = 0; i < stripOffsets.length; i++) {
            var stripData = this.getStripData(compression, stripOffsets[i], stripByteCounts[i]);
            // Last strip can be smaller
            var length = size > maxPixels ? maxPixels : size;
            size -= length;
            if (bitDepth === 8) {
                pixel = fill8bit(data, stripData, pixel, length);
            } else if (bitDepth === 16) {
                pixel = fill16bit(data, stripData, pixel, length, this.isLittleEndian());
            } else if (bitDepth === 32 && sampleFormat === 3) {
                pixel = fillFloat32(data, stripData, pixel, length, this.isLittleEndian());
            } else {
                unsupported('bitDepth', bitDepth);
            }
        }

        ifd.data = data;
    }

    getStripData(compression, offset, byteCounts) {
        switch (compression) {
            case 1: // No compression
                return new DataView(this.buffer, offset, byteCounts);
            case 2: // CCITT Group 3 1-Dimensional Modified Huffman run length encoding
            case 32773: // PackBits compression
                return unsupported('Compression', compression);
            default:
                throw new Error('invalid compression: ' + compression);
        }
    }
}

module.exports = TIFFDecoder;

function getDataArray(size, channels, bitDepth, sampleFormat) {
    if (bitDepth === 8) {
        return new Uint8Array(size * channels);
    } else if (bitDepth === 16) {
        return new Uint16Array(size * channels);
    } else if (bitDepth === 32 && sampleFormat === 3) {
        return new Float32Array(size * channels);
    } else {
        return unsupported('bit depth / sample format', bitDepth + ' / ' + sampleFormat);
    }
}

function fill8bit(dataTo, dataFrom, index, length) {
    for (var i = 0; i < length; i++) {
        dataTo[index++] = dataFrom.getUint8(i);
    }
    return index;
}

function fill16bit(dataTo, dataFrom, index, length, littleEndian) {
    for (var i = 0; i < length * 2; i += 2) {
        dataTo[index++] = dataFrom.getUint16(i, littleEndian);
    }
    return index;
}

function fillFloat32(dataTo, dataFrom, index, length, littleEndian) {
    for (var i = 0; i < length * 4; i += 4) {
        dataTo[index++] = dataFrom.getFloat32(i, littleEndian);
    }
    return index;
}

function unsupported(type, value) {
    throw new Error('Unsupported ' + type + ': ' + value);
}

function validateBitDepth(bitDepth) {
    if (bitDepth.length) {
        const bitDepthArray = bitDepth;
        bitDepth = bitDepthArray[0];
        for (var i = 0; i < bitDepthArray.length; i++) {
            if (bitDepthArray[i] !== bitDepth) {
                unsupported('bit depth', bitDepthArray);
            }
        }
    }
    return bitDepth;
}

},{"./ifd":3,"./ifdValue":4,"./tiffIfd":9,"iobuffer":1}],9:[function(require,module,exports){
'use strict';

const Ifd = require('./ifd');

const dateTimeRegex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

class TiffIfd extends Ifd {
    constructor() {
        super('standard');
    }

    // Custom fields
    get size() {
        return this.width * this.height;
    }
    get width() {
        return this.imageWidth;
    }
    get height() {
        return this.imageLength;
    }
    get components() {
        return this.samplesPerPixel;
    }
    get date() {
        var date = new Date();
        var result = dateTimeRegex.exec(this.dateTime);
        date.setFullYear(result[1], result[2] - 1, result[3]);
        date.setHours(result[4], result[5], result[6]);
        return date;
    }

    // IFD fields
    get newSubfileType() {
        return this.get(254);
    }
    get imageWidth() {
        return this.get(256);
    }
    get imageLength() {
        return this.get(257);
    }
    get bitsPerSample() {
        return this.get(258);
    }
    get compression() {
        return this.get(259) || 1;
    }
    get type() {
        return this.get(262);
    }
    get fillOrder() {
        return this.get(266) || 1;
    }
    get documentName() {
        return this.get(269);
    }
    get imageDescription() {
        return this.get(270);
    }
    get stripOffsets() {
        return alwaysArray(this.get(273));
    }
    get orientation() {
        return this.get(274);
    }
    get samplesPerPixel() {
        return this.get(277);
    }
    get rowsPerStrip() {
        return this.get(278);
    }
    get stripByteCounts() {
        return alwaysArray(this.get(279));
    }
    get minSampleValue() {
        return this.get(280) || 0;
    }
    get maxSampleValue() {
        return this.get(281) || Math.pow(2, this.bitsPerSample) - 1;
    }
    get xResolution() {
        return this.get(282);
    }
    get yResolution() {
        return this.get(283);
    }
    get planarConfiguration() {
        return this.get(284) || 1;
    }
    get resolutionUnit() {
        return this.get(296) || 2;
    }
    get dateTime() {
        return this.get(306);
    }
    get predictor() {
        return this.get(317) || 1;
    }
    get sampleFormat() {
        return this.get(339) || 1;
    }
    get sMinSampleValue() {
        return this.get(340) || this.minSampleValue;
    }
    get sMaxSampleValue() {
        return this.get(341) || this.maxSampleValue;
    }
}

function alwaysArray(value) {
    if (typeof value === 'number') return [value];
    return value;
}

module.exports = TiffIfd;

},{"./ifd":3}],"tiff":[function(require,module,exports){
'use strict';

exports.decode = require('./decode');

},{"./decode":2}]},{},[]);
