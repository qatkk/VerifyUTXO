
#!/bin/bash
docker ps -q --filter ancestor=ruimarinho/bitcoin-core:24 | xargs -r docker kill
docker ps -a -q --filter ancestor=ruimarinho/bitcoin-core:24 | xargs -r docker rm

sleep 5
#  This script sets up the regtest as a docker, initializes a wallet, and creates 5 UTXOs for testing. 
docker run -d -p 18445:18445 ruimarinho/bitcoin-core:24 -printtoconsole -rpcuser=foo -rpcpassword=bar -regtest \
  -server \
  -rpcallowip=0.0.0.0/0 \
  -rpcbind=0.0.0.0 \
  -rpcport=18445

echo "Waiting for Bitcoin Core RPC to be available..."

until bitcoin-cli -regtest -rpcuser=foo -rpcpassword=bar -rpcport=18445 getblockchaininfo > /dev/null 2>&1; do
  echo "Waiting for Bitcoin Core RPC..."
  sleep 3
done

echo "Bitcoin Core RPC is up!"#  Create the wallet 

bitcoin-cli -regtest -rpcuser=foo -rpcpassword=bar \
  -rpcport=18445 \
  createwallet "initwallet" true true "" true
sleep 2
ts-node ./helper/src/network_init.ts 

sleep 2 
echo "List the utxos in the wallet" 
bitcoin-cli -regtest -rpcuser=foo -rpcpassword=bar \
  -rpcport=18445 \
  -rpcwallet=initwallet listunspent

