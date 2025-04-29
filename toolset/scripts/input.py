import sys
import argparse
import struct
import hashlib
import base58

def hex_to_bytes(s):
    print(bytes.fromhex(s))
    return bytes.fromhex(s)

def base58_to_bytes(s):
    return base58.b58decode_check(s)

def raw_to_bytes(s):
    return s.encode()

def to_u32_array(data_bytes):
    padded = data_bytes.rjust((len(data_bytes) + 3) & ~3, b'\x00')  # pad to multiple of 4
    return list(struct.unpack(f">{len(padded)//4}I", padded))

def to_sha256(data_bytes):
    return hashlib.sha256(data_bytes).digest()

def print_result(result, output_type):
    if isinstance(result, bytes):
        print(result.hex())
    elif isinstance(result, list):
        if output_type == 'matrix':
            # Format as u32[2][16]
            matrix = [[0]*16 for _ in range(2)]
            for i, val in enumerate(result[:32]):
                matrix[i // 16][i % 16] = val
            print("u32[2][16] = {")
            for row in matrix:
                print("   ", row, ",")
            print("}")
        else:
            print(result)
    else:
        print(result)

def main():
    parser = argparse.ArgumentParser(description="Transform input into hashes or u32 arrays.")
    parser.add_argument("input", help="The input string (hex, base58, or raw)")
    parser.add_argument("--format", choices=["hex", "base58", "raw"], default="hex", help="Format of the input")
    parser.add_argument("--to", choices=["u32", "hash", "hash_u32", "byte"], default="u32", help="Target transformation")
    parser.add_argument("--output", choices=["list", "matrix"], default="list", help="u32 output format")

    args = parser.parse_args()

    # Convert input string to bytes
    if args.format == "hex":
        data_bytes = hex_to_bytes(args.input)
    elif args.format == "base58":
        data_bytes = base58_to_bytes(args.input)
    elif args.format == "raw":
        data_bytes = raw_to_bytes(args.input)
    else:
        raise ValueError("Unsupported input format")

    # Perform transformation

    if args.to == "u32":
        result = to_u32_array(data_bytes)
    elif args.to == "byte": 
        result = hex_to_bytes(args.input)
    elif args.to == "hash":
        result = to_sha256(data_bytes)
    elif args.to == "hash_u32":
        result = to_u32_array(to_sha256(data_bytes))
    else:
        raise ValueError("Unsupported transformation")

    # Print result
    print_result(result, args.output)

if __name__ == "__main__":
    main()
