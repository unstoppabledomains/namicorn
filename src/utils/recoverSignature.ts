/* eslint-disable no-undef */
import {keccak256 as sha3} from 'js-sha3';
import {hexToBytes} from '.';
import {requireOrFail} from './requireOrFail';

const bytesLength = (a: string) => (a.length - 2) / 2;
const bytesSlice = (i: number, j: number, bs: string) =>
  '0x' + bs.slice(i * 2 + 2, j * 2 + 2);
const bytesToNumber = (hex: string) => parseInt(hex.slice(2), 16);

const decodeSignature = (hex: string) => [
  bytesSlice(64, bytesLength(hex), hex),
  bytesSlice(0, 32, hex),
  bytesSlice(32, 64, hex),
];

const toChecksum = (address: string) => {
  const addressHash = sha3(address.slice(2));
  let checksumAddress = '0x';
  for (let i = 0; i < 40; i++) {
    checksumAddress +=
      parseInt(addressHash[i + 2], 16) > 7
        ? address[i + 2].toUpperCase()
        : address[i + 2];
  }

  return checksumAddress;
};

const getSecp256k1 = () => {
  const elliptic = requireOrFail('elliptic', 'elliptic', '^6.5.3');
  return new elliptic.ec('secp256k1');
};

export const hashMessage = (message: string): string => {
  const messageBytes = hexToBytes(Buffer.from(message, 'utf8').toString('hex'));
  const messageBuffer = Buffer.from(messageBytes);
  const preamble = '\x19Ethereum Signed Message:\n' + messageBytes.length;
  const preambleBuffer = Buffer.from(preamble);
  const ethMessage = Buffer.concat([preambleBuffer, messageBuffer]);
  return '0x' + sha3(ethMessage.toString());
};

export const recover = (message: string, signature: string): string => {
  const secp256k1 = getSecp256k1();
  const hash = hashMessage(message);
  const vals = decodeSignature(signature);
  const vrs = {
    v: bytesToNumber(vals[0]),
    r: vals[1].slice(2),
    s: vals[2].slice(2),
  };
  const ecPublicKey = secp256k1.recoverPubKey(
    Buffer.from(hash.slice(2), 'hex'),
    vrs,
    vrs.v < 2 ? vrs.v : 1 - (vrs.v % 2),
  );
  const publicKey = '0x' + ecPublicKey.encode('hex', false).slice(2);
  const publicHash = '0x' + sha3(hexToBytes(publicKey));
  return toChecksum('0x' + publicHash.slice(-40));
};
