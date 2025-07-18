const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

async function generateProof() {
  try {
    const zkeyPath = path.resolve(__dirname, "circuit_final.zkey");
    const witness_path = path.resolve(__dirname,"witness.wtns");
    const verification_key_path = path.resolve(__dirname, "verification_key.json");
    const proof_path = path.resolve(__dirname, "proof.json");
    const public_inputs = path.resolve(__dirname, "public.json");

    // Generate proof and public signals
    const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyPath, witness_path);

    // Save proof to proof.json
    fs.writeFileSync(proof_path, JSON.stringify(proof, null, 2));
    console.log("Proof saved to proof.json");

    // Save public signals to public.json
    fs.writeFileSync(public_inputs, JSON.stringify(publicSignals, null, 2));
    console.log("Public signals saved to public.json");

    // Verify
    const vKey = JSON.parse(fs.readFileSync(verification_key_path));
    const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    console.log("Verification result:", res);  // true or false
    process.exit(0);
    } catch (err) {
    console.error("Error generating and verifying the proof:", err);
  }
}

generateProof();