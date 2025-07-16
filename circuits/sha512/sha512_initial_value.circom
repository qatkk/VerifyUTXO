pragma circom 2.0.0;

//------------------------------------------------------------------------------
// initial hash value for SHA2-512-256 

template Sha512_initial_value() {

  signal output out[8][64];

  var initial_state[8] =  
        [0x22312194fc2bf72c
        ,0x9f555fa3c84c64c2
        ,0x2393b86b6f53b151
        ,0x963877195940eabd
        ,0x96283ee2a88effe3
        ,0xbe5e1e2553863992
        ,0x2b0199fc2c85b8aa
        ,0x0eb72ddc81c52ca2
        ];

  for(var k=0; k<8; k++) { 
    for(var i=0; i<64; i++) {
      out[k][i] <== (initial_state[k] >> i) & 1; 
    }
  }

}
