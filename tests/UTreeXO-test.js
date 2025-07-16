const chai = require("chai");
const path = require("path");
const crypto = require("crypto");
const Scalar = require("ffjavascript").Scalar;
const {sha512_256} = require("@noble/hashes/sha2.js");
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const assert = chai.assert;
const expect = chai.expect;
const circuitPath = '../circuits/UTreeXO'; // Path to the Merkle tree circuits
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
        const cir = await wasm_tester(path.join(__dirname, circuitPath, "utreexo_proof.circom"), {
            silent: true
        });

        leaves = ["0000000000000000000000000000000000000000000000000000000000000001", "0000000000000000000000000000000000000000000000000000000000000002", 
        "0000000000000000000000000000000000000000000000000000000000000003", 
        "0000000000000000000000000000000000000000000000000000000000000004"];
        leave_hashes =[
            crypto.createHash("sha256").update(Buffer.from(leaves[0], 'hex')).digest("hex"), 
            crypto.createHash("sha256").update(Buffer.from(leaves[1], 'hex')).digest("hex"), 
            crypto.createHash("sha256").update(Buffer.from(leaves[2], 'hex')).digest("hex"), 
            crypto.createHash("sha256").update(Buffer.from(leaves[3], 'hex')).digest("hex")
        ];
        branches = ["d9147961436944f43cd99d28b2bbddbf452ef872b30c8279e255e7daafc7f946", "651fe8319214c73a560e938119bb7333e678164f8d0d64da6a39423b76c125d5"];
        root = "0969c843d81476eb61cd04ebd5712fab80e04ba03e9d8cd14d2ab4c16ee22026";
        leaf_bytes = Buffer.from(leaves[3], 'hex');
        route = [1, 1];
        branch_bytes = [
            Buffer.from(branches[0], 'hex'), 
            Buffer.from(branches[1], 'hex')
        ];
        const leaf_input = buffer2bitArray(leaf_bytes);
        const branch_input = [
            buffer2bitArray(branch_bytes[0]), 
            buffer2bitArray(branch_bytes[1])
        ];
        const witness = await cir.calculateWitness({ "leaf": leaf_input, "branch_input": branch_input , "route": route}, true);

        const circom_out = witness.slice(1, 257);
        const hash2 = bitArray2buffer(circom_out).toString("hex");
        assert.equal(root, hash2);
    }).timeout(1000000);


});