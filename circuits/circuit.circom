pragma circom 2.0.1;

include "UTreeXO/utreexo_proof.circom";
include "Schnorr/utxo_deserialize.circom";
include "Schnorr/schnorr.circom";

template Main(tree_depth, number_of_trees, n, k){
    ///////// UTreeXO inputs ////////////////////
    signal input txid[256]; 
    signal input vout[32]; 
    signal input script_pub_key[272];
    signal input proof[tree_depth][256]; 
    signal input route[tree_depth]; 
    signal input roots[number_of_trees][256];
    ///////// Signature inputs //////////////////
    signal input public_key [2][k]; 
    signal input signature[k]; 
    signal input G [2][k]; 
    signal input message[k];
    signal input random_point[2][k];
    //////// Internal signals ///////////////////
    signal root[256];
    signal checks[3]; 

    //////// UTreeXO root computations
    component UTreeXOTest = UTXO2UTreeXORoot(tree_depth);
    UTreeXOTest.txid <== txid; 
    UTreeXOTest.vout <== vout; 
    UTreeXOTest.script_pub_key <== script_pub_key;
    UTreeXOTest.proof <== proof; 
    UTreeXOTest.route <== route; 
    root <== UTreeXOTest.root;

    //////// UTreeXO root inclusion check //////////////
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
        checks[0] <-- 1;
    }else{
        checks[0] <-- 0;
    }

    /////// UTXO deserialization check /////////////////
    component pubKeyCheckInst = pubKeyCheck(n, k);
    pubKeyCheckInst.script_pub_key <== script_pub_key; 
    pubKeyCheckInst.public_key <== public_key; 
    checks[1] <== pubKeyCheckInst.out;


    ////// Signature check /////////////////////////////
    component schnorrCheckInst = SchnorrCheck(n, k);
    schnorrCheckInst.signature <== signature; 
    schnorrCheckInst.G <== G; 
    schnorrCheckInst.message <== message; 
    schnorrCheckInst.random_point <== random_point; 
    schnorrCheckInst.pub_key_point <== public_key; 
    checks[2] <== schnorrCheckInst.out;
    assert(checks[0]);
    assert(checks[1]); 
    assert(checks[2]);
}

component main = Main(2, 2, 64, 4);
