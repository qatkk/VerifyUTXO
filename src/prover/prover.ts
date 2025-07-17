import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import Client from 'bitcoin-core';
import BIP32Factory from 'bip32';
import * as bip39 from 'bip39';
import { sha256 } from '@noble/hashes/sha2';
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371';

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

interface UTXO {
  txid: string;
  vout: number;
  address: string;
  scriptPubKey: string;
  amount: number;
  confirmations: number;
  spendable: boolean;
  solvable: boolean;
  safe: boolean;
  desc: string;
  parent_descs: string;
  reused: boolean;
}

interface Proof{
    proof: string[]; 
    roots: string[];
}

const client = new Client({
    host: 'http://localhost:18446', 
    username: 'foo', 
    password: 'bar', 
    wallet: 'initwallet'
}); 

function taggedHashing(tag: String, data: Uint8Array): Uint8Array{
  const tagHash = sha256(Uint8Array.from(Buffer.from(tag)));
  return sha256(Uint8Array.from(Buffer.concat([tagHash,tagHash,data])));
}


function parseDescriptorToPath(desc: string): string {
  const match = desc.match(/\[([0-9a-fA-F]+\/[0-9h\/]+)\]/);
  if (!match || !match[1]) throw new Error("Invalid descriptor format");

  const path = match[1]
    .split('/')
    .slice(1) // remove the fingerprint (e.g., 73c5da0a)
    .map(seg => seg.replace(/h/g, "'"))
    .join('/');

  return "m/" + path;
}

async function getUTXOs(){
    let UTXOSet: UTXO[] = await client.command("listunspent"); 
    if (UTXOSet == null) {
        throw("The wallet doesn't have any spendable outputs.")
    }else{ 
        return UTXOSet; 
    }
}

async function getUTreeXOProof(UTXOset: UTXO[], index: number) { 
    let proof: Proof;
    console.log(JSON.stringify({txid:UTXOset[0].txid, vout:UTXOset[0].vout}))
    const response = await fetch("http://localhost:8080/proof", {
      method: 'POST',
      body: JSON.stringify({txid:UTXOset[0].txid, vout:UTXOset[0].vout}),
      headers: {'Content-Type': 'application/json'} 
    });
    if (!response.ok) 
    { 
        console.error("Error");
    }
    else if (response.status >= 400) {
        console.error('HTTP Error: '+response.status+' - '+response.statusText);
    }
    else{
        proof = await response.json(); 
        return proof; 
    }
}

async function getKeysForUTXO(index: number, UTXOset: UTXO[]) {
    const path = parseDescriptorToPath(UTXOset[index].desc);
    console.log(UTXOset[index].desc, "\n", path);
    const mnemonic =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const rootKey = bip32.fromSeed(seed, bitcoin.networks.regtest);
    const spendingKey = rootKey.derivePath(path); 
    return { 
        privKey: spendingKey.privateKey, 
        publickey: spendingKey.publicKey
    }
}

function isInThisTree(left_members: string[], index: number) {
    const tree_size = left_members.length;
    if (index < Math.pow(2, tree_size - 1)) {
        return 1; 
    }else {
        return 0;
    }
}

function toFixedBinaryArray(n: number, size: number): number[] {
  const binaryStr = n.toString(2).padStart(size, '0'); 
  return binaryStr.split('').map(Number);       
}


function getRoute(index: number, set_size: number) {
    if(index >= set_size){
        return -1; 
    }
    let bin_set_size = set_size.toString(2).split('');
    let is_tree_found = isInThisTree(bin_set_size, index); 
    while(!is_tree_found){
        index = index - Math.pow(2, bin_set_size.length -1); 
        bin_set_size = bin_set_size.slice(1, ); 
        let size = parseInt(bin_set_size.join(''),2);
        console.log(size);
        bin_set_size = size.toString(2).split('');  
        is_tree_found = isInThisTree(bin_set_size, index); 
    }
    return toFixedBinaryArray(index, bin_set_size.length - 1).reverse();
}


async function main (){
    let UTXOset: UTXO[] = await getUTXOs(); 
    const spendingKey = await getKeysForUTXO(0, UTXOset);
    const tweakedPubkey = ecc.pointAddScalar(spendingKey.publickey, taggedHashing("TapTweak", toXOnly(Buffer.from((spendingKey.publickey)))), true); 
    const proof = await getUTreeXOProof(UTXOset, 0);
    console.log("UTXO leaf info \n", UTXOset[0].txid, UTXOset[0].vout, UTXOset[0].scriptPubKey, '\n');
    console.log("proof", proof);
}

main(); 
