pragma circom 2.0.2;

include "../../../circuits/Schnorr/utxo_deserialize.circom";


template Main(n, k) {
    signal input script_pub_key[n * k + 16]; 
    signal input public_key [2][k]; 
    signal output out; 
    component pubKeyCheckInst = pubKeyCheck(n, k);
    pubKeyCheckInst.script_pub_key <== script_pub_key; 
    pubKeyCheckInst.public_key <== public_key; 
    out <-- pubKeyCheckInst.out;
}

component main = Main(64, 4);