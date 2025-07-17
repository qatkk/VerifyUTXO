pragma circom 2.0.2;


include "secp256k1.circom"; 
include "utils.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/sha256/sha256.circom";



template SchnorrCheck(n, k) {
    signal input signature[k]; 
    signal input G [2][k]; 
    signal input message[k];
    signal input random_point[2][k];
    signal input pub_key_point[2][k];
    var random_x_bits[k][n]; 
    var public_key_x_bits[k][n]; 
    var message_bits[k][n]; 

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
        number2bitConversion[0][arr_index].in <== random_point[0][k - 1 - arr_index];
        random_x_bits[arr_index] = number2bitConversion[0][arr_index].out; 

        number2bitConversion[1][arr_index] = Num2Bits(n);
        number2bitConversion[1][arr_index].in <== pub_key_point[0][k - 1 - arr_index];
        public_key_x_bits[arr_index] = number2bitConversion[1][arr_index].out; 

        number2bitConversion[2][arr_index] = Num2Bits(n);
        number2bitConversion[2][arr_index].in <== message[k - 1 - arr_index];
        message_bits[arr_index] = number2bitConversion[2][arr_index].out; 
    }
    component hashInputPrepration = concat3Inputwith256Bits(k, n); 
    hashInputPrepration.firstInput <-- random_x_bits; 
    hashInputPrepration.secondInput <-- public_key_x_bits;
    hashInputPrepration.thirdInput <-- message_bits;
    signatureHash.in <== hashInputPrepration.out;
    component scalarConversion = bits2scalar(n, k);
    scalarConversion.in <==  signatureHash.out;
    multiplier[1] = Secp256k1ScalarMult(n,k); 
    multiplier[1].scalar <== scalarConversion.out;
    multiplier[1].point <== pub_key_point;
    component addPoints = Secp256k1AddUnequal(n,k);
    addPoints.a <== multiplier[1].out;
    addPoints.b <== random_point;
    rhs <== addPoints.out;
    
    component isEqual[2 * k + 1];

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
