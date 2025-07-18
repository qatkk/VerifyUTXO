# Verify UTXO Ownership 

This repo implements a proof of concept implementation to prove to a verifier the ownership of a UTXO still existing in the UTXO set. 

UTXO set membersip is proved using UTreeXO. A backend server acts as the bride node of UTreeXO providing proof for a queried UTXO in the set. 

The UTXO ownership is proved by providing a Schnorr signature verified by the tweaked public key included in the output of a P2TR UTXO (for now this is the only type of UTXO supported in the repo). 

## Installation and setup 
Install the dependencied by running the following command in the root directory of the repository.
```bash
npm install 
```

To setup the regtes and run the UTreeXO server, run the network setup script. 

```bash 
sudo chmod +x ./helper/network_setup.sh
./helper/network_setup.sh
``` 
Now you can query proofs for a UTXO owned by the wallet using the prover. 

```bash 
ts-node /src/prover/prover.ts
```
## Proof Generation 
To do 

## Setting
To do

## Tests

The tests folder contains different tests to check the passed inputs and the computations done between the circom circuits and Javascript. 
To run the tests for the overall circuit proving the ownership and set membership of a UTXO run the circuit_test.js as below: 
```bash 
npx mocha tests/cicruit_test.js 
``` 

## Temporary Files

The code will mount the current directory to include the files created and changed by the regtest in the ./data folder. The dumped UTXO set can also be found in this folder under the format "./data/regtest/utxo-set-{block height}.dat" signifying which block height the UTXO set belongs to. 

Upon running the prover, an inputs.json file will be created containing the public and private inputs neccassary to create the witness and proof for the general circuit "./circuits/circuit.circom". 


## References 

This repository is using the seckp256k1 implementation for circom as provided by 0xPARC [circom-ecdsa](https://github.com/0xPARC/circom-ecdsa) and the sha512 implementation provided by bkomuves [hash-circuits](https://github.com/bkomuves/hash-circuits.git).