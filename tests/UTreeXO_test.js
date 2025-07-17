const chai = require("chai");
const path = require("path");
const crypto = require("crypto");
const Scalar = require("ffjavascript").Scalar;
const {sha512_256} = require("@noble/hashes/sha2.js");
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const assert = chai.assert;
const expect = chai.expect;
const circuitPath = 'circuits/UTreeXO'; // Path to the Merkle tree circuits
const wasm_tester = require("circom_tester").wasm;

function buffer2bitArray(b) {
    const res = [];
    for (let i=0; i<b.length; i++) {
        for (let j=0; j<8; j++) {
            res.push((b[i] >> (7-j) &1));
        }
    }
    return res;
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

function sha256(b){
    return crypto.createHash("sha256")
            .update(b)
            .digest();
}


describe("UTreeXO and hash test", function () {
    this.timeout(100000);
    it("Test if the concatination circtuit works", async () => {
        const cir = await wasm_tester(path.join(__dirname, circuitPath, "concat_test.circom"));

        let b = new Buffer.alloc(32);
        left_leaf = "b94d27b9934d3e08a52e52d7da7dabfadeb8a4fa7e6d16c8f2f4e8ee7f6c9fbe";
        right_leaf = "cc4927aaf29ad7fadcdd79949a6f8c9a5bb2e9640443978c762a0385bc128671";
        right_bytes = Buffer.from(right_leaf, 'hex'); 
        left_bytes = Buffer.from(left_leaf, 'hex');


        const left_input = buffer2bitArray(left_bytes);
        const righ_input = buffer2bitArray(right_bytes);
        const witness = await cir.calculateWitness({ "right_leaf": righ_input, "left_leaf": left_input }, true);

        const circom_concat = witness.slice(1, 513).map(Number);
        const js_concat = buffer2bitArray(Buffer.from(left_leaf + right_leaf, 'hex'));
        
        expect(circom_concat).to.eql(js_concat);

    }).timeout(1000000);
    it("Test sha512-256 truncated version", async () => {
        const cir = await wasm_tester(path.join(__dirname, circuitPath, "sha512_output_MS.circom"), {
            silent: true
        });
        const leaves = [
        Buffer.from("0000000000000000000000000000000000000000000000000000000000000001", "hex"),
        Buffer.from("0000000000000000000000000000000000000000000000000000000000000002", "hex")
        ];

        // Hash leaves once (single SHA256)
        const leafHashes = leaves.map(sha256);
        // Concat in left || right order
        const concat = Buffer.concat([leafHashes[0], leafHashes[1]]);

        // Compute double SHA256 root
        const root = sha512_256(concat);


        const witness = await cir.calculateWitness({ "in": buffer2bitArray(concat)}, true);

        const circom_out = witness.slice(1, 257);
        assert.ok(Buffer.from(root).equals(bitArray2buffer(circom_out)));

    }).timeout(1000000);
    it("Test the UTreeXO proof for a merkle tree of depth 2", async () => {
        const cir = await wasm_tester(path.join(__dirname, circuitPath, "utreexo_proof_test.circom"), {
            silent: true
        });

        let UTXO = {
            txid: "99bee497a92d0f37371d5e9917a47783b85db060d262088006491640a5a5ea05", 
            vout: 0, 
            script_pub_key: "5120abc00e9eb6086f9a3178734e26799a7783a5637c0a749d3f69384cdb618aad28"
        };
        branches = ['252e4b0a7778fa06d3cea00a00cd6d5086e0a9b760095b846839c60327baac32',
                    '584f327fdeba3242c22f3cd0e52ca6f2a473fd1cea7a38d9723f8d220e8080f2'];
        root = ['a988af8ad86ee2ceca10622f97f160d3588e361f5bea8cc9093892c5632b6d7f',
                'f79bbdfafac756e6bf835c263b7d5ef7ed0b5524274ec07878e884476e1b4f1a'];
        vout_bytes = (Buffer.alloc(4)).writeUint32BE(0);
        route = [1, 0];
        branch_bytes = [
            Buffer.from(branches[0], 'hex'), 
            Buffer.from(branches[1], 'hex')
        ];
        const branch_input = [
            buffer2bitArray(branch_bytes[0]), 
            buffer2bitArray(branch_bytes[1])
        ];

        const witness = await cir.calculateWitness({ "txid": buffer2bitArray(Buffer.from(UTXO.txid, 'hex')), "vout": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             "route": route, "script_pub_key": buffer2bitArray(Buffer.from(UTXO.script_pub_key, 'hex')), "proof": branch_input}, true);

        const circom_out = witness.slice(1, 257);
        const hash2 = bitArray2buffer(circom_out).toString("hex");
        assert.ok((root[0] == hash2) || (root[1] == hash2));
    }).timeout(1000000);

    it("Test root inclusion", async () => {
        const cir = await wasm_tester(path.join(__dirname, circuitPath, "root_inclusion_test.circom"), {
            silent: true
        });
        root = ['a988af8ad86ee2ceca10622f97f160d3588e361f5bea8cc9093892c5632b6d7f',
                'f79bbdfafac756e6bf835c263b7d5ef7ed0b5524274ec07878e884476e1b4f1a'];

        const witness = await cir.calculateWitness({ "roots": [buffer2bitArray(Buffer.from(root[0], 'hex')), buffer2bitArray(Buffer.from(root[1], 'hex'))], 
            "root": buffer2bitArray(Buffer.from(root[0], 'hex'))}, true);
        assert.equal(witness[1], 1);
        }).timeout(1000000);


});