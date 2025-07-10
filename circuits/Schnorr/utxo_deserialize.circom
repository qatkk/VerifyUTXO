pragma circom 2.0.2;

include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

include "secp256k1.circom"; 

template bits2scalar(n, k) { 
    signal input in[k*n]; 
    var reversedValue [k][n];
    var converted[k]; 
    signal output out [k];
    component bit2numConversion[k];
    for (var arr_index = 0; arr_index< k; arr_index++){
        for (var bit_index = 0; bit_index< n; bit_index++) {
            reversedValue[arr_index][n - 1 - bit_index] = in[bit_index + arr_index * n] ;
        }
        bit2numConversion[arr_index] = Bits2Num(n);
        bit2numConversion[arr_index].in <-- reversedValue[arr_index];
        converted[k - 1 - arr_index] = bit2numConversion[arr_index].out;
    }
    out <-- converted;
}

template deserializeUTXO(n, k){
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
    signal input utxo[n * k + 16]; 
    signal input public_key [2][k]; 
    signal extracted_public_key[k]; 
    signal output out; 
    var equality_check = 1; 
    component pubKeyExtract = deserializeUTXO(n, k); 
    pubKeyExtract.in <== utxo; 
    extracted_public_key <== pubKeyExtract.out; 
    component checkOnCurve = Secp256k1PointOnCurve(); 
    checkOnCurve.x <== public_key[0]; 
    checkOnCurve.y <== public_key[1]; 
    component equalityCheck[k];
    for (var i = 0; i<k; i ++) { 
        equalityCheck[i] =  IsZero(); 
        public_key[0][i] - extracted_public_key[i] ==> equalityCheck[i].in; 
        equality_check = equality_check && equalityCheck[i].out; 
    }
    out <-- equality_check;
}

component main = pubKeyCheck(64, 4);