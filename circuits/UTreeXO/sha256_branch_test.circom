pragma circom 2.0.1;

include "../../node_modules/circomlib/circuits/sha256/sha256.circom";


template Main() {
    signal input right_leaf[256]; 
    signal input left_leaf[256];
    signal concat[512];
    signal output root[256];

    for (var i = 0; i < 256; i++) {
        concat[i] <== left_leaf[i];
        concat[i + 256] <== right_leaf[i];
    }

    component sha256_leaf = Sha256(512);
    sha256_leaf.in <== concat;
    root <== sha256_leaf.out;
}

component main = Main();
