pragma circom 2.0.1;

include "../../node_modules/circomlib/circuits/sha256/sha256.circom";


template Main(N) {
    signal input leaf[256]; 
    signal input branch_input[N][256];
    signal input route[N]; 
    var concat[512];
    signal leaf_branch[N+1][256];
    signal output root[256];
    component sha256_root[N];

    component sha256_leaf = Sha256(256);
    sha256_leaf.in <== leaf;
    leaf_branch[0] <== sha256_leaf.out;
    for (var level = 0; level < N; level++ ){
        for (var bit_index = 0; bit_index < 256; bit_index++) {
            if (route[level] == 1){
                concat[bit_index] = branch_input[level][bit_index];
                concat[bit_index + 256] = leaf_branch[level][bit_index];
            }else {
                concat[bit_index] = leaf_branch[level][bit_index];
                concat[bit_index + 256] = branch_input[level][bit_index];
            }
        }
        sha256_root[level] = Sha256(512);
        sha256_root[level].in <-- concat;
        leaf_branch[level+1] <== sha256_root[level].out;
    }
    root <== leaf_branch[N];
}
component main = Main(2);
