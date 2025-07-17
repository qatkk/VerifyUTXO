pragma circom 2.0.1;

include "../../../circuits/UTreeXO/sha512/sha512_hash_bits.circom";

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


template Main(len) {
    signal input in[len]; 
    signal output out[256]; 

    component hash = Sha512_hash_bits(len);
    component result_transform = reverseBits();
    hash.inp_bits <== in; 
    result_transform.in <== hash.hash_qwords;
    out <== result_transform.out;
}


component main = Main(512);