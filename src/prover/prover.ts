import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import Client from 'bitcoin-core';
import BIP32Factory from 'bip32';
import * as bip39 from 'bip39';
import { sha256 } from '@noble/hashes/sha2';
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371';
import { assert, error } from 'console';
import * as secp256k1 from "secp256k1";
import {Point, CURVE} from "@noble/secp256k1";
import { randomBytes } from 'crypto';
import { bufferToBigInt, bigintToTuple, bitArray2buffer, buffer2bitArray } from '../utils'; 
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from "crypto";

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
    index: number; 
    setSize: number;
}

interface KeySet{
    private_key: Uint8Array<ArrayBufferLike>;
    public_key: Uint8Array<ArrayBufferLike>;
}

interface SchnorrSig{
    signature: bigint;
    message: Buffer<ArrayBufferLike>;
    random_point: Point;
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
    const response = await fetch("http://localhost:8080/proof", {
      method: 'POST',
      body: JSON.stringify({txid:UTXOset[index].txid, vout:UTXOset[index].vout}),
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
    const mnemonic =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const rootKey = bip32.fromSeed(seed, bitcoin.networks.regtest);
    const keys = rootKey.derivePath(path); 
    const xOnlyPubkey = keys.publicKey.slice(1, 33);
    const p2tr = bitcoin.payments.p2tr({ internalPubkey: Buffer.from(xOnlyPubkey) });
    return { 
        privKey: keys.privateKey, 
        publickey: keys.publicKey
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

function tweakedKeys(keys: KeySet) :KeySet{
       let tweak = taggedHashing("TapTweak", toXOnly(Buffer.from((keys.public_key)))); 

    let tweakedPubkey = ecc.pointAddScalar(keys.public_key, tweak, true); 
    if (!tweakedPubkey || !keys.private_key) {
        throw new Error("Tweaked public key is null.");
    }
    let tweaked_priv_key; 
    let pub_from_priv_tweaked;
    if (tweakedPubkey[0] == 3){
        tweaked_priv_key = ecc.privateSub(keys.private_key, tweak);
        if(!tweaked_priv_key){
             throw new Error("Failed to derive tweaked private key");
        }
        pub_from_priv_tweaked = ecc.pointFromScalar(tweaked_priv_key, true);
        let negated_tweak = ecc.privateNegate(tweak);
        tweakedPubkey = ecc.pointAddScalar(keys.public_key, negated_tweak, true); 
        if (!tweakedPubkey || !keys.private_key) {
            throw new Error("Tweaked public key is null.");
        }
        if (!pub_from_priv_tweaked)
        {
            throw Error ("unable to drive public key from tweaked private key");
        }
        assert(Buffer.from(pub_from_priv_tweaked).equals(tweakedPubkey));
    }else {
        tweaked_priv_key = ecc.privateAdd(keys.private_key, tweak);
        if(!tweaked_priv_key){
             throw new Error("Failed to derive tweaked private key");
        }
        pub_from_priv_tweaked = ecc.pointFromScalar(tweaked_priv_key);
        if (!pub_from_priv_tweaked)
        {
            throw Error ("unable to drive public key from tweaked private key");
        }
        assert(Buffer.from(pub_from_priv_tweaked).equals(tweakedPubkey));
    }
    return {
        private_key: tweaked_priv_key, 
        public_key: tweakedPubkey
    }
}

function schnorr (private_key:  Uint8Array<ArrayBufferLike> ){
    let random;
    do {
        random = randomBytes(32);
    } while (!secp256k1.privateKeyVerify(random));
    let random_point = Point.BASE.multiply(bufferToBigInt(random));
    ///////////////// message 
    let message = randomBytes(32);
    let public_key_point = secp256k1.publicKeyCreate(private_key, false);
    //////////////// e for the signature
    let input = Buffer.concat([random_point.toRawBytes(false).slice(1,33),
    public_key_point.slice(1, 33),
    message]);

    let hash = sha256(input);
    let hash_in_field = bufferToBigInt(hash) % CURVE.n;

    const signature = (bufferToBigInt(random) + hash_in_field * bufferToBigInt(private_key)) % CURVE.n;
    return {
        random_point: random_point, 
        message: message, 
        signature: signature
    }
}

function getZKInputs(UTXOset: UTXO[], UTXO_index: number, UTreeXO_proof: Proof, signature: SchnorrSig, spending_keys: KeySet){
    const root_inputs = UTreeXO_proof.roots.map(root => buffer2bitArray(Buffer.from(root, 'hex')));
    const random_x =  bigintToTuple(bufferToBigInt(signature.random_point.toRawBytes(false).slice(1,33))); 
    const random_y =  bigintToTuple(bufferToBigInt(signature.random_point.toRawBytes(false).slice(33,65))); 
    const signature_input = bigintToTuple(signature.signature);
    const G_x = bigintToTuple(bufferToBigInt(Point.BASE.toRawBytes(false).slice(1,33))); 
    const G_y =  bigintToTuple(bufferToBigInt(Point.BASE.toRawBytes(false).slice(33,65)));
    const vout_bytes = (Buffer.alloc(4)).fill(UTXOset[UTXO_index].vout);
    const public_key_point = ecc.pointCompress(Buffer.from(spending_keys.public_key), false);
    const pk_x = bigintToTuple(bufferToBigInt(public_key_point.slice(1,33))); 
    const pk_y =  bigintToTuple(bufferToBigInt(public_key_point.slice(33,65)));
    const message_input = bigintToTuple(bufferToBigInt(signature.message));
    const proof_inputs =  UTreeXO_proof.proof.map(hash => buffer2bitArray(Buffer.from(hash, 'hex')));
    console.log(UTreeXO_proof.index, UTreeXO_proof.setSize);
    let route: number[] | -1 = -1;
    if (
        typeof UTreeXO_proof?.index === 'number' &&
        typeof UTreeXO_proof?.setSize === 'number'
    ) {
        route = getRoute(UTreeXO_proof.index, UTreeXO_proof.setSize);
    } else {
        throw new Error("UTreeXO_proof.index or UTreeXO_proof.set_size is undefined");
    }
    const zk_proof_inputs = {
        "txid": buffer2bitArray(Buffer.from(UTXOset[UTXO_index].txid, 'hex')), 
        "vout": buffer2bitArray(vout_bytes),
        "route": route, 
        "script_pub_key": buffer2bitArray(Buffer.from(UTXOset[UTXO_index].scriptPubKey, 'hex')), 
        "proof": proof_inputs, 
        "roots": root_inputs, 
        "signature": signature_input, 
        "G": [G_x, G_y], 
        "message": message_input, 
        "random_point": [random_x, random_y], 
        "public_key": [pk_x, pk_y]
    }
    const filePath = path.join(__dirname, 'inputs.json');
    const json = JSON.stringify(zk_proof_inputs, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
        2
        );
    fs.writeFileSync(filePath, json, 'utf-8');
    return zk_proof_inputs;
}


async function main (){
    let UTXOset: UTXO[] = await getUTXOs(); 
    let UTXO_index = 3; 
    const wallet_keys = await getKeysForUTXO(UTXO_index, UTXOset);
    if (!wallet_keys.privKey){
        throw Error("Private keys not accesible!");
    }
    const spending_keys = tweakedKeys({private_key:wallet_keys.privKey, public_key: wallet_keys.publickey}); 
    const signature = schnorr(spending_keys.private_key);
    const UTreeXO_proof = await getUTreeXOProof(UTXOset, UTXO_index);
    if (!UTreeXO_proof) {
        throw new Error("UTreeXO_proof is undefined");
    }
    getZKInputs(UTXOset, UTXO_index, UTreeXO_proof, signature, spending_keys); 
}

main(); 
