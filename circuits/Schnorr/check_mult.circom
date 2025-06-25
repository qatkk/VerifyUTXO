pragma circom 2.0.2;


include "secp256k1.circom"; 

template mulScalarAndPoint(n, k) {
    signal input scalar[k]; 
    signal input point[2][k];
    signal output out[2][k];

    component multiplier = Secp256k1ScalarMult(n,k);
    multiplier.scalar <== scalar;
    multiplier.point <== point;
    out <== multiplier.out;
}

component main = mulScalarAndPoint(64, 4);
