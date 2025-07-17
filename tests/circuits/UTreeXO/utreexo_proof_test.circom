pragma circom 2.0.1;

include "../../../circuits/UTreeXO/utreexo_proof.circom";



template Main(){
    component UTreeXOTest = UTXO2UTreeXORoot(2);
    signal input txid[256]; 
    signal input vout[32]; 
    signal input script_pub_key[272];
    signal input proof[2][256]; 
    signal input route[2]; 
    signal output root[256];
    UTreeXOTest.txid <== txid; 
    UTreeXOTest.vout <== vout; 
    UTreeXOTest.script_pub_key <== script_pub_key;
    UTreeXOTest.proof <== proof; 
    UTreeXOTest.route <== route; 
    root <== UTreeXOTest.root;
}

component main = Main();