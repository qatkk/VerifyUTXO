from bitcoin.core import COIN, COutPoint, CTxIn, CTxOut, CTransaction
from bitcoin.wallet import CBitcoinAddress
from bitcoin.core.script import CScript, OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG
from bitcoin.core import lx, b2x
from bitcoin.core import b2lx
import hashlib

# from bitcoin import SelectParams
from bitcoin.core import CMutableTxOut, CMutableTxIn, CMutableTransaction, Hash160
from bitcoin.core.script import SignatureHash, SIGHASH_ALL
from bitcoin.core.scripteval import VerifyScript, SCRIPT_VERIFY_P2SH
from bitcoin.wallet import CBitcoinSecret


# Let's create the UTXO we have the secret key for 

h = hashlib.sha256(b'correct horse battery staple').digest()
seckey = CBitcoinSecret.from_secret_bytes(h)

# Same as the txid:vout the createrawtransaction RPC call requires
#
# lx() takes *little-endian* hex and converts it to bytes; in Bitcoin
# transaction hashes are shown little-endian rather than the usual big-endian.
# There's also a corresponding x() convenience function that takes big-endian
# hex and converts it to bytes.
txid = lx('7e195aa3de827814f172c362fcf838d92ba10e3f9fdd9c3ecaf79522b311b22d')
vout = 0

# Create the txin structure, which includes the outpoint. The scriptSig
# defaults to being empty.
txin = CMutableTxIn(COutPoint(txid, vout))

# We also need the scriptPubKey of the output we're spending because
# SignatureHash() replaces the transaction scriptSig's with it.
#
# Here we'll create that scriptPubKey from scratch using the pubkey that
# corresponds to the secret key we generated above.
txin_scriptPubKey = CScript([OP_DUP, OP_HASH160, Hash160(seckey.pub), OP_EQUALVERIFY, OP_CHECKSIG])

# Create the txout. This time we create the scriptPubKey from a Bitcoin
# address.
txout = CMutableTxOut(0.001*COIN, CBitcoinAddress('1C7zdTfnkzmr13HfA2vNm5SJYRK6nEKyq8').to_scriptPubKey())

# Create the unsigned transaction.
tx = CMutableTransaction([txin], [txout])
message = hashlib.sha256(b'message to sign').digest()
sig = seckey.sign(message)
print(f"the signature on the message {message.hex()} is {sig.hex()}")
print(f"the public key is{seckey.pub.hex()}")

