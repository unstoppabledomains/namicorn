/* eslint-disable no-undef */
/**
 * All functionality below came from here https://github.com/Zilliqa/Zilliqa-JavaScript-Library/tree/dev/packages/zilliqa-js-crypto/src
 */

import BN from 'bn.js';
import {sha256} from 'js-sha256';
import {hexToBytes} from './index';

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
// HRP is the human-readable part of zilliqa bech32 addresses

const HRP = 'zil';

const tHRP = 'tzil';

function isByteString(str: string, len: number) {
  return !!str.replace('0x', '').match(`^[0-9a-fA-F]{${len}}$`);
}

function isAddress(address: string) {
  return isByteString(address, 40);
}

/**
 * convertBits
 *
 * groups buffers of a certain width to buffers of the desired width.
 *
 * For example, converts byte buffers to buffers of maximum 5 bit numbers,
 * padding those numbers as necessary. Necessary for encoding Ethereum-style
 * addresses as bech32 ones.
 * @param {Buffer} data
 * @param {number} fromWidth
 * @param {number} toWidth
 * @param {boolean} pad
 * @returns {Buffer|null}
 */
function convertBits(
  data: Buffer,
  fromWidth: number,
  toWidth: number,
  pad = true,
) {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toWidth) - 1;
  // tslint:disable-next-line
  for (let p = 0; p < data.length; ++p) {
    const value = data[p];
    if (value < 0 || value >> fromWidth !== 0) {
      return null;
    }

    acc = (acc << fromWidth) | value;
    bits += fromWidth;
    while (bits >= toWidth) {
      bits -= toWidth;
      ret.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toWidth - bits)) & maxv);
    }
  } else if (bits >= fromWidth || (acc << (toWidth - bits)) & maxv) {
    return null;
  }

  return Buffer.from(ret);
}

function hrpExpand(hrp: string): Buffer {
  const ret: any[] = [];
  let p;
  for (p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }

  ret.push(0);
  for (p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) & 31);
  }

  return Buffer.from(ret);
}

function polymod(values: Buffer): number {
  let chk = 1;
  // tslint:disable-next-line
  for (let p = 0; p < values.length; ++p) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    for (let i = 0; i < 5; ++i) {
      if ((top >> i) & 1) {
        chk ^= GENERATOR[i];
      }
    }
  }
  return chk;
}

function createChecksum(hrp: string, data: Buffer) {
  const values = Buffer.concat([
    Buffer.from(hrpExpand(hrp)),
    data,
    Buffer.from([0, 0, 0, 0, 0, 0]),
  ]);
  // var values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = polymod(values) ^ 1;
  const ret: any[] = [];
  for (let p = 0; p < 6; ++p) {
    ret.push((mod >> (5 * (5 - p))) & 31);
  }

  return Buffer.from(ret);
}

function verifyChecksum(hrp: string, data: Buffer) {
  return polymod(Buffer.concat([hrpExpand(hrp), data])) === 1;
}

function encode(hrp: string, data: Buffer) {
  const combined = Buffer.concat([data, createChecksum(hrp, data)]);
  let ret = hrp + '1';
  // tslint:disable-next-line
  for (let p = 0; p < combined.length; ++p) {
    ret += CHARSET.charAt(combined[p]);
  }

  return ret;
}

function decode(bechString: string) {
  let p;
  let hasLower = false;
  let hasUpper = false;
  for (p = 0; p < bechString.length; ++p) {
    if (bechString.charCodeAt(p) < 33 || bechString.charCodeAt(p) > 126) {
      return null;
    }

    if (bechString.charCodeAt(p) >= 97 && bechString.charCodeAt(p) <= 122) {
      hasLower = true;
    }

    if (bechString.charCodeAt(p) >= 65 && bechString.charCodeAt(p) <= 90) {
      hasUpper = true;
    }
  }
  if (hasLower && hasUpper) {
    return null;
  }

  bechString = bechString.toLowerCase();
  const pos = bechString.lastIndexOf('1');
  if (pos < 1 || pos + 7 > bechString.length || bechString.length > 90) {
    return null;
  }

  const hrp = bechString.substring(0, pos);
  const data: number[] = [];
  for (p = pos + 1; p < bechString.length; ++p) {
    const d = CHARSET.indexOf(bechString.charAt(p));
    if (d === -1) {
      return null;
    }

    data.push(d);
  }

  if (!verifyChecksum(hrp, Buffer.from(data))) {
    return null;
  }

  return {hrp, data: Buffer.from(data.slice(0, data.length - 6))};
}

/**
 * toChecksumAddress
 *
 * takes hex-encoded string and returns the corresponding address
 * @param {string} address
 * @returns {string}
 */
export const toChecksumAddress = (address: string): string => {
  if (!isAddress(address)) {
    throw new Error(`${address} is not a valid base 16 address`);
  }

  address = address.toLowerCase().replace('0x', '');
  const hash = sha256(hexToBytes(address));
  const v = new BN(hash as unknown as string, 'hex', 'be');
  let ret = '0x';

  for (let i = 0; i < address.length; i++) {
    if ('0123456789'.indexOf(address[i]) !== -1) {
      ret += address[i];
    } else {
      ret += v.and(new BN(2).pow(new BN(255 - 6 * i))).gte(new BN(1))
        ? address[i].toUpperCase()
        : address[i].toLowerCase();
    }
  }

  return ret;
};

/**
 * toBech32Address
 *
 * Encodes a canonical 20-byte Ethereum-style address as a bech32 zilliqa
 * address.
 *
 * The expected format is zil1<address><checksum> where address and checksum
 * are the result of bech32 encoding a Buffer containing the address bytes.
 * @param {string} address 20 byte canonical address
 * @param {boolean} testnet
 * @returns {string} 38 char bech32 encoded zilliqa address
 */
export function toBech32Address(address: string, testnet = false): string {
  if (!isAddress(address)) {
    throw new Error('Invalid address format.');
  }

  const addrBz = convertBits(
    Buffer.from(address.replace('0x', ''), 'hex'),
    8,
    5,
  );

  if (addrBz === null) {
    throw new Error('Could not convert byte Buffer to 5-bit Buffer');
  }

  return encode(testnet ? tHRP : HRP, addrBz);
}

/**
 * fromBech32Address
 * @param {string} address - a valid Zilliqa bech32 address
 * @param {boolean} testnet
 * @returns {string} a canonical 20-byte Ethereum-style address
 */
export function fromBech32Address(address: string, testnet = false): string {
  const res = decode(address);

  if (res === null) {
    throw new Error('Invalid bech32 address');
  }

  const {hrp, data} = res;

  const shouldBe = testnet ? tHRP : HRP;
  if (hrp !== shouldBe) {
    throw new Error(`Expected hrp to be ${shouldBe} but got ${hrp}`);
  }

  const buf = convertBits(data, 5, 8, false);

  if (buf === null) {
    throw new Error('Could not convert buffer to bytes');
  }

  return toChecksumAddress(buf.toString('hex'));
}
