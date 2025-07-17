const chai = require("chai");
const path = require("path");
const crypto = require("crypto");
const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);
const secp256k1 = require('secp256k1');
const { Point, CURVE } = require('@noble/secp256k1');

const circuitPath =  "circuits/Schnorr";


const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;


function bitArray2buffer(a) {
    const len = Math.floor((a.length -1 )/8)+1;
    const b = new Buffer.alloc(len);

    for (let i=0; i<a.length; i++) {
        const p = Math.floor(i/8);
        b[p] = b[p] | (Number(a[i]) << ( 7 - (i%8)  ));
    }
    return b;
}

function bufferToBigInt(buf) {
  let result = 0n;
  for (const byte of buf) {
    result = (result << 8n) + BigInt(byte);
  }
  return result;
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


describe("Schnorr test", function () {
    this.timeout(100000);
    it("Check multiplication in circom", async () => {
        const cir = await wasm_tester(path.join(__dirname, circuitPath, "check_mult.circom"));

        ///////////////// message 
        let message = crypto.randomBytes(32);
        let hash = crypto.createHash("sha256")
            .update(message)
            .digest();
        const hash_input = bigintToTuple(bufferToBigInt(hash)% CURVE.n) ;
        
        ////////////////////////// JS multiplication
        const resulting_point = Point.BASE.multiply(bufferToBigInt(hash)); 
        const x_result =  bigintToTuple(bufferToBigInt(resulting_point.toRawBytes(false).slice(1,33))); 
        const y_result =  bigintToTuple(bufferToBigInt(resulting_point.toRawBytes(false).slice(33,65))); 
        const x_input = bigintToTuple(bufferToBigInt(Point.BASE.toRawBytes(false).slice(1,33))); 
        const y_input =  bigintToTuple(bufferToBigInt(Point.BASE.toRawBytes(false).slice(33,65)));
        const witness = await cir.calculateWitness({ "scalar": hash_input, "point": [x_input, y_input]}, true);

        assert.equal(x_result[0], witness[1]);
        assert.equal(x_result[1], witness[2]);
        assert.equal(x_result[2], witness[3]);
        assert.equal(x_result[3], witness[4]);
        assert.equal(y_result[0], witness[5]);
        assert.equal(y_result[1], witness[6]);
        assert.equal(y_result[2], witness[7]);
        assert.equal(y_result[3], witness[8]);

    }).timeout(1000000);
it("Check number to bit inversion in circom", async () => {
        const cir = await wasm_tester(path.join(__dirname, circuitPath, "check_num2bits.circom"));

        let random;
        do {
            random = crypto.randomBytes(32);
        } while (!secp256k1.privateKeyVerify(random));        
       

        // Call the circuit
        const witness = await cir.calculateWitness({ randomPoint: bigintToTuple(bufferToBigInt(random)) }, true);

        // Extract output bits from witness (depends on position; assume outputs start at witness[1])
        const rawBits = witness.slice(1, 257);
        assert.deepStrictEqual(bigintToTuple(bufferToBigInt(bitArray2buffer(rawBits))), bigintToTuple(bufferToBigInt(random)));
    }).timeout(1000000);

it("Check signature in circom", async () => {
        const cir = await wasm_tester(path.join(__dirname, circuitPath, "schnorr_test.circom"));

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

        // ////////// signature verification : 
        const lef_hand_side = Point.BASE.multiply(signature); 
        const right_hand_side = random_point.add(public_key_point.multiply(hash));
        assert.equal(lef_hand_side.equals(right_hand_side), true);

        const random_x =  bigintToTuple(bufferToBigInt(random_point.toRawBytes(false).slice(1,33))); 
        const random_y =  bigintToTuple(bufferToBigInt(random_point.toRawBytes(false).slice(33,65))); 
        const signature_input = bigintToTuple(signature);
        const G_x = bigintToTuple(bufferToBigInt(Point.BASE.toRawBytes(false).slice(1,33))); 
        const G_y =  bigintToTuple(bufferToBigInt(Point.BASE.toRawBytes(false).slice(33,65)));

        const pk_x = bigintToTuple(bufferToBigInt(public_key_point.toRawBytes(false).slice(1,33))); 
        const pk_y =  bigintToTuple(bufferToBigInt(public_key_point.toRawBytes(false).slice(33,65)));
        const message_input = bigintToTuple(bufferToBigInt(message));
        const witness = await cir.calculateWitness({  "signature": signature_input, "G": [G_x, G_y], "message": message_input, "random_point": [random_x, random_y], "pub_key_point": [pk_x, pk_y]}, true);
        assert.equal(1, witness[1]);

    }).timeout(1000000);

});