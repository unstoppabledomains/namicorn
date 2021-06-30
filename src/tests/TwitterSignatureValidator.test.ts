import {isValidTwitterSignature} from '../utils/TwitterSignatureValidator';

describe('TwitterSignatureValidator', () => {
  it('should return true for valid signature', () => {
    const isValid = isValidTwitterSignature({
      tokenId:
        '0x0ef61568699a847f9994473ba65185dc75906121d3e10cb9deb37bc722ce6334',
      owner: '0x499dd6d875787869670900a2130223d85d4f6aa7',
      twitterHandle: 'Marlene12Bob',
      validationSignature:
        '0x01882395ce631866b76f43535843451444ef4a8ff44db0a9432d5d00658a510512c7519a87c78ba9cad7553e26262ada55c254434a1a3784cd98d06fb4946cfb1b',
    });
    expect(isValid).toBeTruthy();
  });
});
