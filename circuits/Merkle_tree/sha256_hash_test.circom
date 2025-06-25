pragma circom 2.0.1;

include "../../node_modules/circomlib/circuits/sha256/sha256.circom";

template Main() {
    signal input leaf[256]; //private
    signal output root[256];

    component sha256_leaf = Sha256(256);
    sha256_leaf.in <== leaf;
    root <== sha256_leaf.out;
}

component main = Main();
