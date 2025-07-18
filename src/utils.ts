// utils.ts

export function bufferToBigInt(buf: Uint8Array | Buffer): bigint {
  let result = 0n;
  for (const byte of buf) {
    result = (result << 8n) + BigInt(byte);
  }
  return result;
}

export function buffer2bitArray(b: Uint8Array | Buffer): number[] {
  const res: number[] = [];
  for (let i = 0; i < b.length; i++) {
    for (let j = 0; j < 8; j++) {
      res.push((b[i] >> (7 - j)) & 1);
    }
  }
  return res;
}

export function bigintToTuple(x: bigint): bigint[] {
  const mod = 2n ** 64n;
  const ret: bigint[] = [0n, 0n, 0n, 0n];

  let xTemp = x;
  for (let i = 0; i < ret.length; i++) {
    ret[i] = xTemp % mod;
    xTemp = xTemp / mod;
  }

  return ret;
}

export function bitArray2buffer(a: number[]): Buffer {
  const len = Math.floor((a.length - 1) / 8) + 1;
  const b = Buffer.alloc(len);

  for (let i = 0; i < a.length; i++) {
    const p = Math.floor(i / 8);
    b[p] = b[p] | (Number(a[i]) << (7 - (i % 8)));
  }

  return b;
}
