const crypto = require("crypto");
const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);
const secp256k1 = require('secp256k1');
const { Point, CURVE } = require('@noble/secp256k1');



function bufferToBigInt(buf) {
  let result = 0n;
  for (const byte of buf) {
    result = (result << 8n) + BigInt(byte);
  }
  return result;
}

function buffer2bitArray(b) {
    const res = [];
    for (let i=0; i<b.length; i++) {
        for (let j=0; j<8; j++) {
            res.push((b[i] >> (7-j) &1));
        }
    }
    return res;
}

function bigintToTuple(x) {
  const mod = 2n ** 64n;
  const ret = [0n, 0n, 0n, 0n];

  let xTemp = x;
  for (let i = 0; i < ret.length; i++) {
    ret[i] = xTemp % mod;
    xTemp = xTemp / mod;
  }

  return ret;
}

function bitArray2buffer(a) {
    const len = Math.floor((a.length -1 )/8)+1;
    const b = new Buffer.alloc(len);

    for (let i=0; i<a.length; i++) {
        const p = Math.floor(i/8);
        b[p] = b[p] | (Number(a[i]) << ( 7 - (i%8)  ));
    }
    return b;
}


function schnorr(){
    let privKey;
    do {
        privKey = crypto.randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privKey));
    let public_key_point = Point.BASE.multiply(bufferToBigInt(privKey));
    //////////// random point 
    let random;
    do {
        random = crypto.randomBytes(32);
    } while (!secp256k1.privateKeyVerify(random));        
    let random_point = Point.BASE.multiply(bufferToBigInt(random));
    ///////////////// message 
    let message = crypto.randomBytes(32);
    //////////////// e for the signature
    let input = Buffer.concat([random_point.toRawBytes().slice(1,33),
    public_key_point.toRawBytes().slice(1, 33),
    message]);

    let hash = crypto.createHash("sha256")
        .update(input)
        .digest("hex");
    hash = bufferToBigInt(Buffer.from(hash, 'hex')) % CURVE.n;

    const signature = (bufferToBigInt(random) + hash * bufferToBigInt(privKey)) % CURVE.n;
}



module.exports = {bigintToTuple, bitArray2buffer, buffer2bitArray, bufferToBigInt, schnorr}