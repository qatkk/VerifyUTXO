// prover.go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os/exec"

	_ "github.com/mattn/go-sqlite3" // SQLite driver
)

func main() {
	// // RPC config
	// connCfg := &rpcclient.ConnConfig{
	// 	Host:         "127.0.0.1:18446",
	// 	User:         "foo", // match your bitcoin.conf
	// 	Pass:         "bar", // match your bitcoin.conf
	// 	HTTPPostMode: true,  // bitcoind requires POST
	// 	DisableTLS:   true,  // no TLS on regtest
	// }

	// // Connect to bitcoind
	// client, err := rpcclient.New(connCfg, nil)
	// if err != nil {
	// 	log.Fatalf("RPC connection failed: %v", err)
	// }
	// defer client.Shutdown()
	// time.Sleep(time.Second)

	// result, err := client.RawRequest("dumptxoutset", []json.RawMessage{json.RawMessage(`"utxo-set.dat"`)})
	// if err != nil {
	// 	log.Fatalf("RPC call failed: %v", err)
	// }
	// fmt.Printf("Result: %s\n", result)

	// err = waitForFile("data/utxo-set.dat", 1024, 10*time.Second)
	// if err != nil {
	// 	log.Fatalf("File wait failed: %v", err)
	// }

	cmd := exec.Command("python3", "helper/src/utxo_to_sqlite.py", "data/regtest/utxo.dat", "data/utxos.sqlite")
	err := cmd.Run()
	if err != nil {
		log.Fatalf("Failed to run Python script: %v", err)
	}

	// Open SQLite DB
	db, err := sql.Open("sqlite3", "./data/utxos.sqlite")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Query example
	rows, err := db.Query("SELECT txid, vout, value FROM utxos LIMIT 10")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var txid string
		var vout int
		var value int
		err = rows.Scan(&txid, &vout, &value)
		if err != nil {
			log.Fatal(err)
		}
		fmt.Printf("txid: %s, vout: %d, value: %d\n", txid, vout, value)
	}
	// prover := utreexo.NewAccumulator()

	// // Verifer does not support proving elements.
	// verifier := utreexo.Stump{}

	// // A verifier may keep the below to cache the leaves and the merkle branches
	// // for some of the elements.
	// cachedHashes := []utreexo.Hash{}
	// cachedProof := utreexo.Proof{}
	// // Data elements (UTXOs in this case)
	// data := []string{"0000000000000000000000000000000000000000000000000000000000000001",
	// 	"0000000000000000000000000000000000000000000000000000000000000002",
	// 	"0000000000000000000000000000000000000000000000000000000000000003",
	// 	"0000000000000000000000000000000000000000000000000000000000000004"}

	// // Hash the data to create commitments for the elements
	// hashes := make([]utreexo.Hash, len(data))
	// leaves := make([]utreexo.Leaf, len(data))

	// for i, d := range data {
	// 	decoded, _ := hex.DecodeString(d)
	// 	hash := sha256.Sum256([]byte(decoded))
	// 	hashes[i] = hash
	// 	leaves[i] = utreexo.Leaf{Hash: hash}
	// }

	// // Add elements to the accumulator and the verifier
	// prover.Modify(leaves, nil, utreexo.Proof{})
	// fmt.Println(prover.GetRoots())
	// fmt.Println(leaves)
	// updateData, _ := verifier.Update(nil, hashes, utreexo.Proof{})

	// rememberIndexes := []uint32{1}
	// _, _ = cachedProof.Update(cachedHashes, hashes, nil, rememberIndexes, updateData)
	// fmt.Println("proof for the requested index is ", cachedProof.Proof)

	// f, err := os.Create("proof.gob")
	// if err != nil {
	// 	panic(err)
	// }
	// defer f.Close()

	// enc := gob.NewEncoder(f)
	// err = enc.Encode(leaves[rememberIndexes[0]].Hash)
	// if err != nil {
	// 	panic(err)
	// }
	// err = enc.Encode(cachedProof.Proof)
	// if err != nil {
	// 	panic(err)
	// }

	// fmt.Println("📤 Proof and hash written to proof.gob")
}
