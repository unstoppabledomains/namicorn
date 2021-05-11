import {isValidTwitterSignature} from '../utils/TwitterSignatureValidator';

describe('TwitterSignatureValidator', () => {
  it('should return true for valid signature', () => {
    const isValid = isValidTwitterSignature({
      tokenId:
        '0xcbef5c2009359c88519191d7c0d00f3973f76f24bdb0fc8d5254de26a44e0903',
      owner: '0x6EC0DEeD30605Bcd19342f3c30201DB263291589',
      twitterHandle: 'derainberk',
      validationSignature:
        '0xcd2655d9557e5535313b47107fa8f943eb1fec4da6f348668062e66233dde21b413784c4060340f48da364311c6e2549416a6a23dc6fbb48885382802826b8111b',
    });
    expect(isValid).toBeTruthy();
  });
});
