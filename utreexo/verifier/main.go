package main

import (
	"crypto/sha256"
	"encoding/gob"
	"fmt"
	"os"

	"github.com/utreexo/utreexo"
)

func main() {
	f, err := os.Open("proof.gob")
	if err != nil {
		panic(err)
	}
	defer f.Close()
	var verifier utreexo.Stump

	// Cache variables for storing leaves and proofs
	// Data elements (UTXOs in this case)
	data := []string{"utxo1", "utxo2", "utxo3", "utxo4"}

	// Hash the data to create commitments for the elements
	hashes := make([]utreexo.Hash, len(data))
	leaves := make([]utreexo.Leaf, len(data))
	for i, d := range data {
		hash := sha256.Sum256([]byte(d))
		hashes[i] = hash
		leaves[i] = utreexo.Leaf{Hash: hash}
	}

	var hash utreexo.Hash
	var proof utreexo.Proof
	var proof_hashes = proof.Proof
	dec := gob.NewDecoder(f)
	dec.Decode(&hash)
	dec.Decode(&proof_hashes)
	fmt.Println(hash, proof_hashes)
	proof.Proof = proof_hashes
	verifier.Update(nil, hashes, utreexo.Proof{})
	result, err := utreexo.Verify(verifier, []utreexo.Hash{hash}, proof)

	if err != nil {
		panic(err)
	}
	if len(result) > 0 {
		fmt.Println("✅ Proof verified")
	} else {
		fmt.Println("❌ Proof failed")
	}
}
