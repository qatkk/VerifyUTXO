pragma circom 2.0.1;

include "../../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../sha512/sha512_hash_bits.circom";

template reverseBits(){
    signal input in[8][64]; 
    signal output out[256]; 
    for (var i= 0; i<64; i++){
        out[i] <== in[0][63 - i];
        out[i+64] <== in[1][63 - i];
        out[i+128] <== in[2][63 - i];
        out[i+192] <== in[3][63 - i];
    }   
}

template utreexoProofCheck(N) {
    signal input leaf[256]; 
    signal input branch_input[N][256];
    signal input route[N]; 
    var concat[512];
    signal leaf_branch[N+1][256];
    signal output root[256];
    component hash_root[N];
    component result_transform[N];

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
        hash_root[level] = Sha512_hash_bits(512);
        hash_root[level].inp_bits <-- concat;
        result_transform[level] = reverseBits();
        result_transform[level].in <== hash_root[level].hash_qwords;
        leaf_branch[level+1] <== result_transform[level].out;
    }
    root <== leaf_branch[N];
}
component main = utreexoProofCheck(2);
