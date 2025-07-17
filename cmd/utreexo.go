package main

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"strconv"

	"github.com/utreexo/utreexo"
)

func hashToHexArray(hashes []utreexo.Hash) []string {
	hexes := make([]string, len(hashes))
	for i, h := range hashes {
		hexes[i] = hex.EncodeToString(h[:])
	}
	return hexes
}

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
		txidBytes, _ := hex.DecodeString(d[0])

		voutUint, _ := strconv.ParseUint(d[1], 10, 32)
		voutBytes := make([]byte, 4)
		binary.BigEndian.PutUint32(voutBytes, uint32(voutUint))

		scriptBytes, _ := hex.DecodeString(d[2])
		// Concatenate the byte slices
		input := append(txidBytes, voutBytes...)
		input = append(input, scriptBytes...)
		if d[0] == txid && d[1] == fmt.Sprintf("%d", vout) {
			rememberIndexes = append(rememberIndexes, uint32(i))
		}
		hash := sha256.Sum256([]byte(input))
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
		fmt.Printf("%d , %d", rememberIndexes, len(hashes))
	}
	return map[string]interface{}{
		"roots":   hashToHexArray(verifier.Roots),
		"proof":   hashToHexArray(cachedProof.Proof),
		"index":   rememberIndexes[0],
		"setSize": len(hashes),
	}
}

func GetRoots(UTXOSet [][]string, verbose bool) []utreexo.Hash {
	//  This code is from the test file in the Utreexo repo
	verifier := utreexo.Stump{}

	// // Hash the data to create commitments for the elements
	hashes := make([]utreexo.Hash, len(UTXOSet))
	leaves := make([]utreexo.Leaf, len(UTXOSet))

	for i, d := range UTXOSet {
		txidBytes, _ := hex.DecodeString(d[0])

		voutUint, _ := strconv.ParseUint(d[1], 10, 32)
		voutBytes := make([]byte, 4)
		binary.BigEndian.PutUint32(voutBytes, uint32(voutUint))

		scriptBytes, _ := hex.DecodeString(d[2])
		// Concatenate the byte slices
		input := append(txidBytes, voutBytes...)
		input = append(input, scriptBytes...)
		hash := sha256.Sum256([]byte(input))
		hashes[i] = hash
		leaves[i] = utreexo.Leaf{Hash: hash}
	}

	_, _ = verifier.Update(nil, hashes, utreexo.Proof{})
	if verbose {
		fmt.Println("verifier roots are ", verifier.Roots)
	}
	return verifier.Roots
}
