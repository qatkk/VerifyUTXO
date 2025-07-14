import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import Client from 'bitcoin-core';
import BIP32Factory from 'bip32';
import * as bip39 from 'bip39';
import { sha256 } from '@noble/hashes/sha2';


const ECPair = ECPairFactory(ecc);
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

async function initializeWallet() {
    const mnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const rootKey = bip32.fromSeed(seed, bitcoin.networks.regtest);
    const fingerprint = Buffer.from(rootKey.fingerprint).toString('hex');
    const accountPath = "86'/1'/0'"; 
    const accountNode = rootKey.derivePath(accountPath);
    const xpub = accountNode.neutered().toBase58();
    const decscriptor = `tr([${fingerprint}/${accountPath}]${xpub}/0/*)`;
    const descInfo = await client.command('getdescriptorinfo', decscriptor);
    await client.command('importdescriptors', [{
        desc: descInfo.descriptor,
        timestamp: 'now',
        range: [0, 99],
        active: true
        }]).then(info => {
        console.log("Descriptor imported successfully:", info);
    }).catch(err => {
        console.error("Error importing descriptor:", err);
    }); 
    await client.command('listdescriptors').then(info => {
        console.log("Wallet Information:", info);
    }).catch(err => {
        console.error("Error fetching wallet information:", err);
    });
}

async function createAddress(ifExternal: boolean, index: number) {
    const mnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const rootKey = bip32.fromSeed(seed, bitcoin.networks.regtest);
    const account = rootKey.derivePath("m/86'/1'/0'");
    const external = account.derive(ifExternal ? 0 : 1);
    const child = external.derive(index);
    const { address } = bitcoin.payments.p2tr({
    internalPubkey: Buffer.from(child.publicKey.slice(1, 33)),
    network: bitcoin.networks.regtest,
    });
    client.command('getaddressinfo', address).then(info => {
        console.log("Address Information:", info);
    }).catch(err => {
        console.error("Error fetching address information:", err);
    });
    return {
        address: address,
        xpub: child.neutered().toBase58(),
        xprv: child.toBase58(),
        publicKey: Buffer.from(child.publicKey).toString('hex'),
        privateKey: child.privateKey ? Buffer.from(child.privateKey).toString('hex') : null
    }; 
}

async function createUTXOSet(size: number, verbose: boolean = false) {
    let address = []; 
    for (let index = 0; index < size; index++) {
        const addr = await createAddress(true, index);
        address.push(addr);
        await client.command('generatetoaddress', 1, address[index].address).then(info => {
            if (verbose) console.log("Blocks generated:", info);
        }).catch(err => {
            console.error("Error generating blocks:", err);
        });
    }
    //  Mining 100 blocks on top to make the utxos spendable 
    await client.command('generatetoaddress', 100, address[size - 1].address).then(info => {
            if (verbose) console.log("Blocks generated:", info);
        }).catch(err => {
            console.error("Error generating blocks:", err);
        });
    return {
        addresses: address
    };
}

async function main(){
    await initializeWallet().then(() => {
        console.log("Wallet initialized successfully.");
    }).catch(err => {
        console.error("Error initializing wallet:", err);
    }); 
    await createUTXOSet(5, false);
    return 0; 
}

main(); 
