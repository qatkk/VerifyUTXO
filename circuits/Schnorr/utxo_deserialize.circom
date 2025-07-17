pragma circom 2.0.2;

include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "utils.circom";
include "secp256k1.circom"; 


template deserializeScript(n, k){
    signal input in[n * k + 16 ]; 
    var opcode_push_version[8] = [0, 1, 0, 1, 0, 0, 0, 1]; 
    var opcode_push[8] = [0, 0, 1, 0, 0, 0, 0, 0]; 
    var opcode_check = 1; 
    var x_only_public_key_bit [n * k];
    signal output out [k]; 

    ////////////////// check the opcodes match of the p2tr
    for (var bit_index = 0; bit_index< 16; bit_index++) {
        if (bit_index < 8 ){
            opcode_check = opcode_check && (opcode_push_version[bit_index] == in[bit_index]);
        }else { 
            opcode_check = opcode_check && (opcode_push[bit_index - 8] == in[bit_index]);
        }
    }
    for (var bit_index = 0; bit_index< n * k ; bit_index++) {
            x_only_public_key_bit[bit_index] = in[bit_index + 16];
        }
    component pubkeybi2Num = bits2scalar(n, k); 
    pubkeybi2Num.in <-- x_only_public_key_bit; 
    out <== pubkeybi2Num.out; 
}


template pubKeyCheck(n, k) {
    signal input script_pub_key[n * k + 16]; 
    signal input public_key [2][k]; 
    signal extracted_public_key[k]; 
    signal output out; 
    var equality_check = 1; 
    component pubKeyExtract = deserializeScript(n, k); 
    pubKeyExtract.in <== script_pub_key; 
    extracted_public_key <== pubKeyExtract.out; 
    component checkOnCurve = Secp256k1PointOnCurve(); 
    checkOnCurve.x <== public_key[0]; 
    checkOnCurve.y <== public_key[1]; 
    component equalityCheck[k];
    for (var i = 0; i<k; i ++) { 
        equalityCheck[i] =  IsZero(); 
        equalityCheck[i].in <== public_key[0][i] - extracted_public_key[i]; 
        equality_check = equality_check * equalityCheck[i].out; 
    }
    out <-- equality_check;
}
