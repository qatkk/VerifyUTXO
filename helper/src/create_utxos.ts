import * as assert from 'assert';
import BIP32Factory from 'bip32';
import * as bip39 from 'bip39';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import {
  toXOnly,
} from 'bitcoinjs-lib/src/psbt/bip371';
import { sha256 } from '@noble/hashes/sha2';
import { randomBytes } from 'crypto';

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);


function taggedHashing(tag: String, data: Uint8Array): Uint8Array{
  const tagHash = sha256(Uint8Array.from(Buffer.from(tag)));
  return sha256(Uint8Array.from(Buffer.concat([tagHash,tagHash,data])));
}

async function createP2TR(){
    const mnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const path = `m/86'/0'/0'/0/1`; // Path to first child of receiving wallet on first account
    // Verify the above (Below is no different than other HD wallets)
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const rootKey = bip32.fromSeed(seed, bitcoin.networks.regtest);
    const xprv = rootKey.toBase58();
    const childNode = rootKey.derivePath(path);
    let privateKey;
    if (! childNode.privateKey){
      throw("the private key is not accesible!");
    }else {
      privateKey = childNode.privateKey; 
    }
    const message = randomBytes(32); 
    const signature = ecc.signSchnorr(message, privateKey); 
    console.log("the public key is", Buffer.from(childNode.publicKey));
    // Since internalKey is an xOnly pubkey, we drop the DER header byte
    const childNodeXOnlyPubkey = toXOnly(Buffer.from(childNode.publicKey));

    // This is new for taproot
    // Note: we are using mainnet here to get the correct address
    // The output is the same no matter what the network is.
    const { address, output } = bitcoin.payments.p2tr({
      internalPubkey: childNodeXOnlyPubkey,
      network: bitcoin.networks.regtest
    });
    console.log("taproot address", address, "\nthe p2tr locking script output", output); 
    const tweakedPubkey = ecc.pointAddScalar(childNode.publicKey, taggedHashing("TapTweak", childNodeXOnlyPubkey), true); 
    if (!tweakedPubkey){
      throw("couldn't manually create the tweaked publickey!");
    }else{
      assert.deepEqual(Buffer.from(tweakedPubkey).slice(1), output?.slice(2));
    }
    const pubkeyPoint = ecc.pointCompress(Buffer.from(tweakedPubkey), false); 
    let point = {
      x: pubkeyPoint.slice(1, 33),
      y: pubkeyPoint.slice(33, 65)
    };
    console.log("the tweaked public key point is", point.x);
    console.log("the tweaked public key point is", tweakedPubkey);
  }

  createP2TR(); 