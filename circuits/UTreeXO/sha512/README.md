
SHA2-512 implementation in circom:
This is the implementation done in https://github.com/bkomuves/hash-circuits.git repository in github. 
---------------------------------

- `sha512_compress.circom`: inner loop of the compression functions
- `sha512_schedule.circom`: the "message schedule", where the message chunk is 1024 bits
- `sha512_round_const.circom`: the round constants (they are the same for SHA384 too)
- `sha512_initial_value.circom`: the hash initialization vector, the values are changed to the ones for a truncated version for the sake of the project
- `sha512_rounds.circom`: the `n`-round compression function, where the hash state is 512 bits
- `sha512_padding.circom`: the padding (it's the same for SHA384 too)
- `sha512_hash_bits.circom`: SHA512 hash of a sequence of bits
