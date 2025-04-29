// prover.go
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

func main() {
	// Initialize the accumulator (prover) and verifier (stump)

	// Data elements (UTXOs in this case)
	data := []string{"utxo1", "7e195aa3de827814f172c362fcf838d92ba10e3f9fdd9c3ecaf79522b311b22d", "utxo3", "utxo4"}

	// Hash the data to create commitments for the elements
	rememberIndexes := 1
	value, _ := hex.DecodeString(data[rememberIndexes])
	fmt.Println(value)
	hash_value := sha256.Sum256(value)
	fmt.Println(hex.EncodeToString(hash_value[:]))
}
