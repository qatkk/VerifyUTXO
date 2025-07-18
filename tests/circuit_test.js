
const chai = require("chai");
const path = require("path");
const crypto = require("crypto");
const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);
const secp256k1 = require('secp256k1');
const { Point, CURVE } = require('@noble/secp256k1');
const {bigintToTuple, bufferToBigInt, buffer2bitArray} = require("../src/utils");
const circuitPath =  "../circuits";
const assert = chai.assert;
const wasm_tester = require("circom_tester").wasm;


describe("Test", function () {
    this.timeout(100000);
    it("Check the circuit with 5 utxos", async () => {
        const cir = await wasm_tester(path.join(__dirname, circuitPath, "circuit.circom"));
        
        let UTXO = {
            txid: "154c6d0cfbb06c1349895f3d3514e1fa00ca2f237804c81feb2f19744a97c1ca", 
            vout: 0, 
            script_pub_key: "51203b82b2b2a9185315da6f80da5f06d0440d8a5e1457fa93387c2d919c86ec8786"
        };
        branches = ['78878c98c04617640f89246e7de665c5c2d69a92ec9eeefcd41f51d83c02dc68',
                'ff322cfc1797a2c3bc95283b61f169296d911843c9231773bc7a9da83de594df'];
        roots = ['a988af8ad86ee2ceca10622f97f160d3588e361f5bea8cc9093892c5632b6d7f',
                'f79bbdfafac756e6bf835c263b7d5ef7ed0b5524274ec07878e884476e1b4f1a'];
        let vout_bytes = (Buffer.alloc(4)).fill(UTXO.vout);
        route = [1, 1];
        const private_key = Buffer.from([
            55,  68, 106, 191,  62, 202, 104,   6,
            113,  79, 140, 252, 204, 121,  90, 205,
            119, 156,   9, 248, 182, 235, 201, 126,
            32,  43, 237,   0, 110, 187, 201,  80
            ]);
        assert(secp256k1.privateKeyVerify(private_key));
        const public_key_point =  Buffer.from([
                4,  59, 130, 178, 178, 169,  24,  83,  21, 218, 111,
            128, 218,  95,   6, 208,  68,  13, 138,  94,  20,  87,
            250, 147,  56, 124,  45, 145, 156, 134, 236, 135, 134,
            229, 104, 126, 166,  11,  18,  18, 229, 171,  73,  20,
            36, 231, 138,  61, 211,  45, 168, 145, 235, 208,   8,
            134,  49, 222, 150, 144, 147,  44, 136,   6, 131
            ]);

        branch_bytes = [
            Buffer.from(branches[0], 'hex'), 
            Buffer.from(branches[1], 'hex')
        ];
        const branch_input = [
            buffer2bitArray(branch_bytes[0]), 
            buffer2bitArray(branch_bytes[1])
        ];

        let random;
        do {
            random = crypto.randomBytes(32);
        } while (!secp256k1.privateKeyVerify(random));        
        let random_point = Point.BASE.multiply(bufferToBigInt(random));
        ///////////////// message 
        let message = crypto.randomBytes(32);
        //////////////// e for the signature
        let input = Buffer.concat([random_point.toRawBytes().slice(1,33),
        public_key_point.slice(1, 33),
        message]);

        let hash = crypto.createHash("sha256")
            .update(input)
            .digest("hex");
        hash = bufferToBigInt(Buffer.from(hash, 'hex')) % CURVE.n;

        const signature = (bufferToBigInt(random) + hash * bufferToBigInt(private_key)) % CURVE.n;
        ///////////////// Signature inputs 
        const random_x =  bigintToTuple(bufferToBigInt(random_point.toRawBytes(false).slice(1,33))); 
        const random_y =  bigintToTuple(bufferToBigInt(random_point.toRawBytes(false).slice(33,65))); 
        const signature_input = bigintToTuple(signature);
        const G_x = bigintToTuple(bufferToBigInt(Point.BASE.toRawBytes(false).slice(1,33))); 
        const G_y =  bigintToTuple(bufferToBigInt(Point.BASE.toRawBytes(false).slice(33,65)));

        const pk_x = bigintToTuple(bufferToBigInt(public_key_point.slice(1,33))); 
        const pk_y =  bigintToTuple(bufferToBigInt(public_key_point.slice(33,65)));
        const message_input = bigintToTuple(bufferToBigInt(message));
        

        const circuit_inputs = {
            "txid": buffer2bitArray(Buffer.from(UTXO.txid, 'hex')), 
            "vout": buffer2bitArray(vout_bytes),
            "route": route, 
            "script_pub_key": buffer2bitArray(Buffer.from(UTXO.script_pub_key, 'hex')), 
            "proof": branch_input, 
            "roots": [buffer2bitArray(Buffer.from(roots[0], 'hex')), buffer2bitArray(Buffer.from(roots[1], 'hex'))], 
            "signature": signature_input, 
            "G": [G_x, G_y], 
            "message": message_input, 
            "random_point": [random_x, random_y], 
            "public_key": [pk_x, pk_y]
        }

        const witness = await cir.calculateWitness(circuit_inputs, true); 
    }).timeout(1000000);
});
