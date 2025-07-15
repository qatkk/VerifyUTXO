package main

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
)

func getRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got / request\n")
	io.WriteString(w, "The UTreeXO is up and running!\n")
}
func getUtreexoProof(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	jsonData := make(map[string]interface{})
	err = json.Unmarshal(body, &jsonData)
	if err != nil {
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}
	txid := jsonData["txid"].(string)
	vout := int(jsonData["vout"].(float64))
	if txid == "" {
		http.Error(w, "Missing txid in request", http.StatusBadRequest)
		return
	}
	io.WriteString(w, "%s the request receieved for utxo with txid: "+txid+"and index "+fmt.Sprintf("%d", vout)+"\n")
	result := DumpUTXOSet(false)
	CreateDatabase(result["utxoFileName"].(string))
	UTXOSet := Sqlite2UTXO(result["blockHeight"].(int64))
	proof := GetProof(UTXOSet, txid, vout, false)
	proofJSON, err := json.Marshal(proof["proof"])
	if err != nil {
		http.Error(w, "Error marshaling proof", http.StatusInternalServerError)
		return
	}
	rootsJSON, err := json.Marshal(proof["roots"])
	if err != nil {
		http.Error(w, "Error marshaling roots", http.StatusInternalServerError)
		return
	}
	io.WriteString(w, "The proof for the requested UTXO is: \n"+string(proofJSON)+"\n and the roots in the accumulator are"+string(rootsJSON)+"\n")
}

func main() {
	mux := http.NewServeMux()
	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}
	mux.HandleFunc("/", getRoot)
	mux.HandleFunc("/proof", getUtreexoProof)

	err := server.ListenAndServe()
	if err != nil {
		fmt.Printf("Error starting server: %v\n", err)
		os.Exit(1)
	}
}
