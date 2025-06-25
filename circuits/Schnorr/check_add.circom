pragma circom 2.0.2;

include "secp256k1.circom"; 
include "secp256k1_func.circom";


template addTwoPoints(n, k) {
    signal input point_one[2][k]; 
    signal input point_two[2][k];
    signal output out[2][k];

    component addPoints = Secp256k1AddUnequal(n,k);
    addPoints.a <== point_one;
    addPoints.b <== point_two;
    out <== addPoints.out;
}

component main = addTwoPoints(64, 4);
