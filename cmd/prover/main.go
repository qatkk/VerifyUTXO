// prover.go
package main

import (
	"crypto/sha256"
	"encoding/gob"
	"encoding/hex"
	"fmt"
	"os"

	"github.com/utreexo/utreexo"
)

func main() {
	// Initialize the accumulator (prover) and verifier (stump)
	prover := utreexo.NewAccumulator()

	// Data elements (UTXOs in this case)
	data := []string{"utxo1", "7e195aa3de827814f172c362fcf838d92ba10e3f9fdd9c3ecaf79522b311b22d", "utxo3", "utxo4"}

	// Hash the data to create commitments for the elements
	hashes := make([]utreexo.Hash, len(data))
	leaves := make([]utreexo.Leaf, len(data))

	for i, d := range data {
		decoded, _ := hex.DecodeString(d)
		hash := sha256.Sum256([]byte(decoded))
		hashes[i] = hash
		leaves[i] = utreexo.Leaf{Hash: hash}
	}
	// Add elements to the accumulator and the verifier
	prover.Modify(leaves, nil, utreexo.Proof{})
	rememberIndexes := []uint32{1}
	proof, _ := prover.Prove([]utreexo.Hash{leaves[rememberIndexes[0]].Hash})
	fmt.Println(proof.Proof)
	// fmt.Println([]byte(hex.DecodeString(data[rememberIndexes[0]])))
	// Write proof, hash, and roots to file
	f, err := os.Create("proof.gob")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	enc := gob.NewEncoder(f)
	err = enc.Encode(leaves[rememberIndexes[0]].Hash)
	if err != nil {
		panic(err)
	}
	err = enc.Encode(proof.Proof)
	if err != nil {
		panic(err)
	}

	fmt.Println("📤 Proof and hash written to proof.gob")
}
