pragma circom 2.0.1;

include "../../node_modules/circomlib/circuits/sha256/sha256.circom";


template Main() {
    signal input leaf[256]; 
    signal input branch_input[256];
    signal input route; 
    var concat[512];
    signal leaf_branch[256];
    signal output root[256];
    signal branch_hash[512];
    component sha256_leaf = Sha256(256);
    sha256_leaf.in <== leaf;
    leaf_branch <== sha256_leaf.out;

    for (var i = 0; i < 256; i++) {
        if (route >= 0){
            concat[i] = branch_input[i];
            concat[i + 256] = leaf_branch[i];
        }else {
            concat[i] = leaf_branch[i];
            concat[i + 256] = branch_input[i];
        }
    }
    branch_hash <-- concat;
    component sha256_root = Sha256(512);
    sha256_root.in <== branch_hash;
    root <== sha256_root.out;
}

component main = Main();
