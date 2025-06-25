pragma circom 2.0.2;


include "secp256k1.circom"; 
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

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

template SchnorrCheck(n, k) {
    signal input signature[k]; 
    signal input G [2][k]; 
    signal input message[k];
    signal input randomPoint[2][k];
    signal input publickeyPoint[2][k];
    var bitifiedRandomX[k][n]; 
    var bitifiedPublickeyX[k][n]; 
    var bitifiedMessage[k][n]; 

    var sum = 0;
    signal lhs[2][k]; 
    signal rhs[2][k];
    component number2bitConversion[3][k];
    signal output out;

    
    component multiplier[2];
    multiplier[0] = Secp256k1ScalarMult(n,k);
    multiplier[0].scalar <== signature;
    multiplier[0].point <== G;
    lhs <== multiplier[0].out;
    component signatureHash = Sha256(n * k * 3);

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
    signatureHash.in <== hashInputPrepration.out;
    component scalarConversion = bits2scalar(n, k);
    scalarConversion.in <==  signatureHash.out;
    multiplier[1] = Secp256k1ScalarMult(n,k); 
    multiplier[1].scalar <== scalarConversion.out;
    multiplier[1].point <== publickeyPoint;
    component addPoints = Secp256k1AddUnequal(n,k);
    addPoints.a <== multiplier[1].out;
    addPoints.b <== randomPoint;
    rhs <== addPoints.out;
    
    component isEqual[2 * k +1];

    for(var arr_index = 0; arr_index < k; arr_index++){
        isEqual[arr_index] = IsEqual();
        isEqual[arr_index].in[0] <== lhs[0][arr_index];
        isEqual[arr_index].in[1] <== rhs[0][arr_index];
        isEqual[arr_index + k] = IsEqual();
        isEqual[arr_index + k].in[0] <== lhs[1][arr_index];
        isEqual[arr_index + k].in[1] <== rhs[1][arr_index];
        sum = sum + isEqual[arr_index].out + isEqual[arr_index + k].out;
    }

    isEqual[2 * k] = IsEqual();
    isEqual[2 * k].in[0] <== sum;
    isEqual[2 * k].in[1] <== 2 * k;
    out <== isEqual[k].out;
}

component main = SchnorrCheck(64, 4);