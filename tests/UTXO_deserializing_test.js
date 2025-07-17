const chai = require("chai");
const path = require("path");
const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);
const secp256k1 = require('secp256k1');
const {bitArray2buffer, bufferToBigInt, bigintToTuple} = require("../src/utils");

const circuitPath = 'circuits/Schnorr'; 
const assert = chai.assert;
const wasm_tester = require("circom_tester").wasm;


describe("Check utxo deserialization", function () {
    this.timeout(100000);

    it("Check public key deserialization", async () => {
        const originalLog = console.log;
        // Override console.log to suppress output
        console.log = function () {};
          const cir = await wasm_tester(path.join(__dirname, circuitPath, "utxo_deserialize_test.circom"), 
          { silent: true });
        console.log = originalLog;
        const hexString = "51 20 a8 2f 29 94 4d 65 b8 6a e6 b5 e5 cc 75 e2 94 ea d6 c5 93 91 a1 ed c5 e0 16 e3 49 8c 67 fc 7b bb";

        // Step 1: Split hex string into bytes
        const hexBytes = hexString.split(" ");
        const bitArray = hexBytes.flatMap(byte => {
        const binary = parseInt(byte, 16).toString(2).padStart(8, '0');
        return [...binary].map(b => parseInt(b));
        });
        const uncompressedPubKey = secp256k1.publicKeyConvert(Buffer.concat([Buffer.from([0x02], 'hex'), bitArray2buffer(bitArray).slice(2,34)]), false);

        const pubkeyXInput = bigintToTuple(bufferToBigInt(uncompressedPubKey.slice(1, 33)));
        const pubkeyYInput = bigintToTuple(bufferToBigInt(uncompressedPubKey.slice(33, 65)) );

        const witness = await cir.calculateWitness({ "script_pub_key": bitArray, "public_key": [pubkeyXInput, pubkeyYInput]}, true);
        assert.equal(witness[1], 1); 
    }).timeout(1000000);

});