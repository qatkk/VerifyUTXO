pragma circom 2.0.2;


include "secp256k1.circom"; 
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/sha256/sha256.circom";


template concat3Inputwith256Bits(k, n){
    signal input firstInput [k][n];
    signal input secondInput [k][n];
    signal input thirdInput [k][n];
    var concatinated [k * n * 3]; 
    signal output out[k * 3 * n];
    for (var arr_index = 0; arr_index< k; arr_index++){
        for (var bit_index = 0; bit_index< n; bit_index++) {
            concatinated[bit_index + arr_index * n] = firstInput[arr_index][n - 1 - bit_index];
            concatinated[bit_index + arr_index * n + k* n] = secondInput[arr_index][n - 1 - bit_index];
            concatinated[bit_index + arr_index * n + k* n* 2] = thirdInput[arr_index][n - 1 - bit_index];
        }
    }
    out <-- concatinated;
}

template hashInputCheck(n, k) {
    signal input signature[k]; 
    signal input G [2][k]; 
    signal input message[k];
    signal input randomPoint[2][k];
    signal input publickeyPoint[2][k];
    var bitifiedRandomX[k][n]; 
    var bitifiedPublickeyX[k][n]; 
    var bitifiedMessage[k][n]; 

    component number2bitConversion[3][k];
    signal output hashResult[256];

    component sigHash = Sha256(n * k * 3);
    for (var arr_index = 0; arr_index < k; arr_index++){
        number2bitConversion[0][arr_index] = Num2Bits(n);
        number2bitConversion[0][arr_index].in <== randomPoint[0][k - 1 - arr_index];
        bitifiedRandomX[arr_index] = number2bitConversion[0][arr_index].out; 

        number2bitConversion[1][arr_index] = Num2Bits(n);
        number2bitConversion[1][arr_index].in <== publickeyPoint[0][k - 1 - arr_index];
        bitifiedPublickeyX[arr_index] = number2bitConversion[1][arr_index].out; 

        number2bitConversion[2][arr_index] = Num2Bits(n);
        number2bitConversion[2][arr_index].in <== message[k - 1 - arr_index];
        bitifiedMessage[arr_index] = number2bitConversion[2][arr_index].out; 
    }
    component hashInputPrepration = concat3Inputwith256Bits(k, n); 
    hashInputPrepration.firstInput <-- bitifiedRandomX; 
    hashInputPrepration.secondInput <-- bitifiedPublickeyX;
    hashInputPrepration.thirdInput <-- bitifiedMessage;
    sigHash.in <== hashInputPrepration.out;
    hashResult <== sigHash.out;

}

component main = hashInputCheck(64, 4);