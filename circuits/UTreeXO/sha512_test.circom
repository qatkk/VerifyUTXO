pragma circom 2.0.1;

include "../sha512/sha512_hash_bits.circom";




template Main(len) {
    signal input in[len]; 
    signal output out[8][64]; 
    component hash = Sha512_hash_bits(len);
    hash.inp_bits <== in; 
    out <== hash.hash_qwords;
}


component main = Main(512);