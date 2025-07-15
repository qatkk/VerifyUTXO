package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/btcsuite/btcd/rpcclient"
	_ "github.com/mattn/go-sqlite3" // SQLite driver
)

func DumpUTXOSet(verbose bool) map[string]interface{} {
	// RPC config
	connCfg := &rpcclient.ConnConfig{
		Host:         "127.0.0.1:18446",
		User:         "foo", // match your bitcoin.conf
		Pass:         "bar", // match your bitcoin.conf
		HTTPPostMode: true,  // bitcoind requires POST
		DisableTLS:   true,  // no TLS on regtest
	}
	// Connect to bitcoind
	client, err := rpcclient.New(connCfg, nil)
	if err != nil {
		log.Fatalf("RPC connection failed: %v \n Please check the reg test docker!", err)
	}
	defer client.Shutdown()
	time.Sleep(time.Second)
	blockHeight, err := client.GetBlockCount()
	if err != nil {
		log.Default().Printf("Failed to get block count: %v", err)
	} else if verbose {
		log.Printf("Current block height: %d", blockHeight)
	}
	utxoDumpName := fmt.Sprintf("utxo-set-%d.dat", blockHeight)
	nameJSON, err := json.Marshal(utxoDumpName)
	if err != nil {
		log.Default().Printf("Failed to encode filename: %v", err)
	}
	path := filepath.Join("..", "data", "regtest", utxoDumpName)
	_, err = os.Stat(path)
	if os.IsNotExist(err) {
		_, err = client.RawRequest("dumptxoutset", []json.RawMessage{json.RawMessage(nameJSON)})
		if err != nil {
			log.Default().Printf("Failed to dump UTXO set: %v", err)
		}
	}
	return map[string]interface{}{
		"utxoFileName": utxoDumpName,
		"blockHeight":  blockHeight,
	}
}

func CreateDatabase(utxoDumpName string) {
	dbPath := filepath.Join("..", "data", "utxos.sqlite")
	UTXOPath := filepath.Join("..", "data", "regtest", utxoDumpName)
	decoderPath := filepath.Join("..", "helper", "src", "utxo_to_sqlite.py")
	_, err := os.Stat(dbPath)
	if !os.IsNotExist(err) {
		err := os.Remove(dbPath)
		if err != nil {
			log.Default().Printf("Failed to remove existing database: %v", err)
		}
	}
	cmd := exec.Command("python3", decoderPath, UTXOPath, dbPath)
	err = cmd.Run()
	if err != nil {
		log.Default().Printf("Failed to run Python script: %v", err)
	}
}

func Sqlite2UTXO(currentBlockHeight int64) [][]string {
	data := [][]string{}
	db, err := sql.Open("sqlite3", "../data/utxos.sqlite")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

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
		dataRow := []string{txid, fmt.Sprintf("%d", vout), scriptPubKey}
		if coinbase && (currentBlockHeight-height >= 100) {
			data = append(data, dataRow)
		} else if !coinbase {
			data = append(data, dataRow)
		}
	}
	return data
}
