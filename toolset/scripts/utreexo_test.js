
const crypto = require("crypto");


function utreexoHash(){
    let leaf = ["0000000000000000000000000000000000000000000000000000000000000003", 
        "0000000000000000000000000000000000000000000000000000000000000004"];
    

    let leaf_hashes = []; 
    for (let i = 0; i<leaf.length; i++){
        leaf_hashes.push(crypto.createHash("sha256")
        .update(Buffer.from(leaf[i], 'hex'))
        .digest("hex"))
    }   
    let branch_results = [];
    branch_results.push(crypto.createHash("sha256")
    .update(Buffer.from(leaf_hashes[0] + leaf_hashes[1], 'hex'))
    .digest("hex"));
    let double_leaf_hash = []
    for (let i = 0; i<leaf.length; i++){
        double_leaf_hash.push(crypto.createHash("sha256")
        .update(Buffer.from(leaf_hashes[i], 'hex'))
        .digest("hex"))
    }   
    branch_results.push(crypto.createHash("sha256")
    .update(Buffer.from(double_leaf_hash[0] + double_leaf_hash[1], 'hex'))
    .digest("hex"));
    return branch_results;
}

function main(){
    let result = utreexoHash(); 
    console.log(result);
}


main();