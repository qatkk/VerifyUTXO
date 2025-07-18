#!/bin/bash

set -e  # Exit on any error
echo "Running the prover to generate the inputs"
ts-node src/prover/prover.ts

# Compile the circuit
circom circuits/circuit.circom --r1cs --wasm -o src/prover/ 2>/dev/null

node src/prover/circuit_js/generate_witness.js src/prover/circuit_js/circuit.wasm src/prover/inputs.json src/prover/witness.wtns
echo "Witness generated at src/prover/witness.wtns"

# Run Groth16 setup with increased memory limit
NODE_OPTIONS="--max-old-space-size=8192" snarkjs groth16 setup src/prover/circuit.r1cs powersOfTau28_hez_final_22.ptau src/prover/circuit.zkey

# Contribute randomness
snarkjs zkey contribute src/prover/circuit.zkey src/prover/circuit_final.zkey --name="prover" --entropy="7a84c98f62db3b5e4f9d67012e01468c113dab0e646b3f3e29e6cb5a35c4f18b"

# Export verification key
snarkjs zkey export verificationkey src/prover/circuit_final.zkey src/prover/verification_key.json

node src/prover/proof_generation.js

