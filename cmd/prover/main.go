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
	prover := utreexo.NewAccumulator()

	// Verifer does not support proving elements.
	verifier := utreexo.Stump{}

	// A verifier may keep the below to cache the leaves and the merkle branches
	// for some of the elements.
	cachedHashes := []utreexo.Hash{}
	cachedProof := utreexo.Proof{}
	// Data elements (UTXOs in this case)
	data := []string{"0000000000000000000000000000000000000000000000000000000000000001",
		"0000000000000000000000000000000000000000000000000000000000000002",
		"0000000000000000000000000000000000000000000000000000000000000003",
		"0000000000000000000000000000000000000000000000000000000000000004"}

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
	fmt.Println(prover.GetRoots())
	fmt.Println(leaves)
	updateData, _ := verifier.Update(nil, hashes, utreexo.Proof{})

	rememberIndexes := []uint32{1}
	_, _ = cachedProof.Update(cachedHashes, hashes, nil, rememberIndexes, updateData)
	fmt.Println("proof for the requested index is ", cachedProof.Proof)

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
	err = enc.Encode(cachedProof.Proof)
	if err != nil {
		panic(err)
	}

	fmt.Println("📤 Proof and hash written to proof.gob")
}
