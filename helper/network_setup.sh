
#!/bin/bash
docker ps -q --filter ancestor=bitcoin/bitcoin:28.1 | xargs -r docker kill

# Remove all stopped containers based on the image 'bitcoin/bitcoin:28.1'
docker ps -a -q --filter ancestor=bitcoin/bitcoin:28.1 | xargs -r docker rm

sleep 5

# Detect the folder containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rm -rf "$SCRIPT_DIR/../data"
mkdir -p "$SCRIPT_DIR/../data" 
# Compute the host folder ../data relative to script dir
HOST_DATA_DIR="$(cd "$SCRIPT_DIR/../data" && pwd)"

docker run -d -p 18446:18445 \
  -v "$HOST_DATA_DIR":/home/bitcoin/.bitcoin \
  bitcoin/bitcoin:28.1 \
    -regtest \
    -datadir=/home/bitcoin/.bitcoin/ \
    -rpcuser=foo \
    -rpcpassword=bar \
    -server \
    -rpcallowip=0.0.0.0/0 \
    -rpcbind=0.0.0.0 \
    -rpcport=18445 \
    -port=18446

echo "Waiting for Bitcoin Core RPC to be available..."

until bitcoin-cli -regtest -rpcuser=foo -rpcpassword=bar -rpcport=18446 getblockchaininfo > /dev/null 2>&1; do
  echo "Waiting for Bitcoin Core RPC..."
  sleep 3
done

echo "Bitcoin Core RPC is up!"#  Create the wallet 

bitcoin-cli -regtest -rpcuser=foo -rpcpassword=bar \
  -rpcport=18446 \
  createwallet "initwallet" true true "" true
sleep 2
ts-node ./helper/src/network_init.ts 


echo "setting up the utreexo server" 

cd ./cmd 
go run . 