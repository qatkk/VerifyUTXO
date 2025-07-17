pragma circom 2.0.0; 

include "../../../circuits/Schnorr/schnorr.circom";

template Main(n, k) {
    signal input signature[k]; 
    signal input G [2][k]; 
    signal input message[k];
    signal input random_point[2][k];
    signal input pub_key_point[2][k];
    signal output out; 
    component schnorrCheckInst = SchnorrCheck(n, k);
    schnorrCheckInst.signature <== signature; 
    schnorrCheckInst.G <== G; 
    schnorrCheckInst.message <== message; 
    schnorrCheckInst.random_point <== random_point; 
    schnorrCheckInst.pub_key_point <== pub_key_point; 
    out <== schnorrCheckInst.out;
}

component main = Main(64, 4);