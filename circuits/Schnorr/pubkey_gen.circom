pragma circom 2.0.2;

import "./ecdsa.circom";

component main {public [privkey]} = ECDSAPrivToPub(64, 4);