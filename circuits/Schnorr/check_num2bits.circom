pragma circom 2.0.2;


include "../../node_modules/circomlib/circuits/bitify.circom";


template bit2numCheck(n, k) {
    signal input randomPoint[k];
    var bitifiedRandomX[k][n]; 
    var concatinated [k*n];
    component number2bitConversion[k];
    signal output randomXoutput[k*n];

    for (var arr_index = 0; arr_index < k; arr_index++){
        number2bitConversion[arr_index] = Num2Bits(n);
        number2bitConversion[arr_index].in <== randomPoint[k - 1 - arr_index];
        bitifiedRandomX[arr_index] = number2bitConversion[arr_index].out; 
        for (var bit_index = 0; bit_index< n; bit_index++) {
            concatinated[bit_index + arr_index * n] = bitifiedRandomX[arr_index][n - 1 - bit_index];
        }
    }
    randomXoutput <-- concatinated;
}

component main = bit2numCheck(64, 4);