package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/utreexo/utreexo"
)

func GetProof(UTXOSet [][]string, txid string, vout int, verbose bool) map[string]interface{} {
	//  This code is from the test file in the Utreexo repo
	verifier := utreexo.Stump{}
	rememberIndexes := []uint32{}
	cachedHashes := []utreexo.Hash{}
	cachedProof := utreexo.Proof{}

	// // Hash the data to create commitments for the elements
	hashes := make([]utreexo.Hash, len(UTXOSet))
	leaves := make([]utreexo.Leaf, len(UTXOSet))

	for i, d := range UTXOSet {
		input := d[0] + d[1] + d[2] // Assuming d[0] is txid and d[1] is the index and d[2] is scriptPubKey
		if d[0] == txid && d[1] == fmt.Sprintf("%d", vout) {
			rememberIndexes = append(rememberIndexes, uint32(i))
		}
		decoded, _ := hex.DecodeString(input)
		hash := sha256.Sum256([]byte(decoded))
		hashes[i] = hash
		leaves[i] = utreexo.Leaf{Hash: hash}
	}
	if rememberIndexes == nil {
		fmt.Println("No matching txid found in UTXO set")
		return nil
	}
	updateData, _ := verifier.Update(nil, hashes, utreexo.Proof{})
	_, _ = cachedProof.Update(cachedHashes, hashes, nil, rememberIndexes, updateData)
	if verbose {
		fmt.Println("verifier roots are ", verifier.Roots)
		fmt.Println("proof for the requested index is ", cachedProof.Proof)
	}
	return map[string]interface{}{
		"roots": verifier.Roots,
		"proof": cachedProof.Proof,
	}
}

func GetRoots(UTXOSet [][]string, verbose bool) []utreexo.Hash {
	//  This code is from the test file in the Utreexo repo
	verifier := utreexo.Stump{}

	// // Hash the data to create commitments for the elements
	hashes := make([]utreexo.Hash, len(UTXOSet))
	leaves := make([]utreexo.Leaf, len(UTXOSet))

	for i, d := range UTXOSet {
		input := d[0] + d[1] + d[2] // Assuming d[0] is txid and d[1] is the index and d[2] is scriptPubKey
		decoded, _ := hex.DecodeString(input)
		hash := sha256.Sum256([]byte(decoded))
		hashes[i] = hash
		leaves[i] = utreexo.Leaf{Hash: hash}
	}

	_, _ = verifier.Update(nil, hashes, utreexo.Proof{})
	if verbose {
		fmt.Println("verifier roots are ", verifier.Roots)
	}
	return verifier.Roots
}
