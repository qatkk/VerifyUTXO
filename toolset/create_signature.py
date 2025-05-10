# /// Arguments:
# ///    R: Curve point. Hidden version of the per-message nonce.
# ///    S: Field element. Signature to be verified.
# ///    A: Curve point. Public part of the key used to create S.
# ///    M0: 256bit array. First 256bits of the message used to create S  .
# ///    M1: 256bit array. Trailing 256bits of the message used to create S  .
# ///    context: Curve parameters used to create S.
# ///
# /// Returns:
# ///     Return true for S being a valid EdDSA Signature, false otherwise.

from zokrates_pycrypto.eddsa import PrivateKey, PublicKey
from zokrates_pycrypto.utils import write_signature_for_zokrates_cli 
from os import urandom 
from zokrates_pycrypto.field import FQ
import struct
import hashlib 

def to_u32_array(data_bytes):
    padded = data_bytes.rjust((len(data_bytes) + 3) & ~3, b'\x00')  # pad to multiple of 4
    return list(struct.unpack(f">{len(padded)//4}I", padded))

def to_u8_array(data: bytes | str, input_type ="hex") -> list[int]:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return list(data)

def keccak256(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    return hashlib.sha3_256(data).hexdigest()

sec_key = FQ(
        1997011358982923168928344992199991480689546837621580239342656433234255379025
    )
pv_key = PrivateKey(sec_key)
# /////////////////////////// We should be padding the message to fit into 512 bits for this to work! 
# /////////////////////////// Todo : 
# /////////////////////////// Fix this and change the signature
msg = urandom(64)
sig = pv_key.sign(msg)
pub_key = PublicKey.from_private(pv_key)
write_signature_for_zokrates_cli(pub_key, pv_key.sign(msg), msg, "./input.txt")
