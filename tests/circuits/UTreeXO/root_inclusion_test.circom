pragma circom 2.0.1; 

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/bitify.circom";


template bits2scalar(n, k) { 
    signal input in[k*n]; 
    var reversedValue [k][n];
    signal converted[k]; 
    signal output out[k];
    component bit2numConversion[k];
    for (var arr_index = 0; arr_index< k; arr_index++){
        for (var bit_index = 0; bit_index< n; bit_index++) {
            reversedValue[arr_index][n - 1 - bit_index] = in[bit_index + arr_index * n] ;
        }
        bit2numConversion[arr_index] = Bits2Num(n);
        bit2numConversion[arr_index].in <-- reversedValue[arr_index];
        converted[k - 1 - arr_index] <== bit2numConversion[arr_index].out;
    }
    out <== converted;
}


template Main(n, k, number_of_trees){
    signal input roots[number_of_trees][256];
    signal input root[256]; 
    signal output out;

    component equalityCheck[k][number_of_trees];
    component scalarConversion[number_of_trees];
    signal converted_root[k];
    signal converted_roots[number_of_trees][k];
    var equality_check = 1;
    var is_found = 0;
    component rootConversion = bits2scalar(n, k); 
    rootConversion.in <== root; 
    converted_root <== rootConversion.out;
    for (var j = 0; j<number_of_trees; j++){
        equality_check = 1;
        scalarConversion[j] = bits2scalar(n, k);
        scalarConversion[j].in <== roots[j];
        converted_roots[j] <== scalarConversion[j].out; 
        for (var i = 0; i<k; i++){
            equalityCheck[i][j] =  IsZero(); 
            equalityCheck[i][j].in <== converted_root[i] - converted_roots[j][i] ; 
            equality_check = equality_check * equalityCheck[i][j].out;        
        }
        if (equality_check == 1) {
            is_found = 1; 
        }
    }
    if (is_found){
        out <-- 1;
    }else{
        out <-- 0;
    }
}

component main = Main(128, 2, 2);

