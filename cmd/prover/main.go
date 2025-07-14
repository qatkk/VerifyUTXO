// prover.go
package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/gob"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/btcsuite/btcd/rpcclient"
	_ "github.com/mattn/go-sqlite3" // SQLite driver
	"github.com/utreexo/utreexo"
)

func main() {
	// RPC config
	connCfg := &rpcclient.ConnConfig{
		Host:         "127.0.0.1:18446",
		User:         "foo", // match your bitcoin.conf
		Pass:         "bar", // match your bitcoin.conf
		HTTPPostMode: true,  // bitcoind requires POST
		DisableTLS:   true,  // no TLS on regtest
	}
	data := []string{}

	// Connect to bitcoind
	client, err := rpcclient.New(connCfg, nil)
	if err != nil {
		log.Fatalf("RPC connection failed: %v", err)
	}
	defer client.Shutdown()
	time.Sleep(time.Second)
	blockHeight, err := client.GetBlockCount()
	if err != nil {
		log.Fatalf("Failed to get block count: %v", err)
	} else {
		log.Printf("Current block height: %d", blockHeight)
	}
	// result, err := client.RawRequest("dumptxoutset", []json.RawMessage{json.RawMessage(`"utxo-set.dat"`)})
	// if err != nil {
	// 	log.Fatalf("RPC call failed: %v", err)
	// }
	// fmt.Printf("Result: %s\n", result)

	// err = waitForFile("data/utxo-set.dat", 1024, 10*time.Second)
	// if err != nil {
	// 	log.Fatalf("File wait failed: %v", err)
	// }

	// cmd := exec.Command("python3", "helper/src/utxo_to_sqlite.py", "data/regtest/utxo.dat", "data/utxos.sqlite")
	// err := cmd.Run()
	// if err != nil {
	// 	log.Fatalf("Failed to run Python script: %v", err)
	// }

	// Open SQLite DB
	db, err := sql.Open("sqlite3", "./data/utxos.sqlite")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Query example
	// rows, err := db.Query("SELECT txid, vout, value, scriptpubkey FROM utxos LIMIT 10")
	rows, err := db.Query(`
    SELECT txid, vout, value, scriptpubkey, height, coinbase 
    FROM utxos`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var txid string
		var vout int
		var value int
		var scriptPubKey string
		var coinbase bool
		var height int64
		err = rows.Scan(&txid, &vout, &value, &scriptPubKey, &height, &coinbase)
		if err != nil {
			log.Fatal(err)
		}
		if coinbase && (blockHeight-height >= 100) {
			data = append(data, txid+scriptPubKey)
		} else if !coinbase {
			data = append(data, txid+scriptPubKey)
		}
	}

	prover := utreexo.NewAccumulator()

	// // Verifer does not support proving elements.
	verifier := utreexo.Stump{}

	// // A verifier may keep the below to cache the leaves and the merkle branches
	// // for some of the elements.
	cachedHashes := []utreexo.Hash{}
	cachedProof := utreexo.Proof{}

	// // Hash the data to create commitments for the elements
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
}
