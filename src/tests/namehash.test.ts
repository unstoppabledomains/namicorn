import {
  eip137Childhash,
  eip137Namehash,
  znsChildhash,
  znsNamehash,
} from '../utils/namehash';

describe('Namehash', () => {
  describe('EIP-137', () => {
    it('should return namehash', () => {
      const expectedNamehash =
        '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9';
      const namehash = eip137Namehash('brad.crypto');
      expect(namehash).toEqual(expectedNamehash);
    });

    it('should return namehash for subdomain', () => {
      const expectedNamehash =
        '0x22d0b0ff9a317f337bb5a5e41b2ac550132d661c1af0036d8fc4881928210136';
      const namehash = eip137Namehash('subdomain.beresnev.crypto');
      expect(namehash).toEqual(expectedNamehash);
    });

    it('should return namehash for .crypto domain zone', () => {
      const expectedNamehash =
        '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f';
      const namehash = eip137Namehash('crypto');
      expect(namehash).toEqual(expectedNamehash);
    });

    it('should return childhash for .crypto domain zone', () => {
      const expectedNamehash =
        '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f';
      const childhash = eip137Childhash(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'crypto',
      );
      expect(childhash).toEqual(expectedNamehash);
    });

    it('should return childhash', () => {
      const expectedNamehash =
        '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9';
      const childhash = eip137Childhash(
        '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
        'brad',
      );
      expect(childhash).toEqual(expectedNamehash);
    });

    it('should return namehash for ENS domain', () => {
      const expectedNamehash =
        '0x96a270260d2f9e37845776c17a47ae9b8b7e7e576b2365afd2e7f30f43e9bb49';
      const namehash = eip137Namehash('beresnev.eth');
      expect(namehash).toEqual(expectedNamehash);
    });
  });

  describe('ZNS', () => {
    it('should return namehash', () => {
      const expectedNamehash =
        '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787';
      const namehash = znsNamehash('brad.zil');
      expect(namehash).toEqual(expectedNamehash);
    });

    it('should return namehash for subdomain', () => {
      const expectedNamehash =
        '0xe7572940cb7c826a1edfc2c2aea8bbcc4b17f6b5a3ae3e13371aa39f6deea748';
      const namehash = znsNamehash('subdomain.beresnev.zil');
      expect(namehash).toEqual(expectedNamehash);
    });

    it('should return namehash for .zil domain zone', () => {
      const expectedNamehash =
        '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3';
      const namehash = znsNamehash('zil');
      expect(namehash).toEqual(expectedNamehash);
    });

    it('should return childhash for .zil domain zone', () => {
      const expectedNamehash =
        '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3';
      const childhash = znsChildhash(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'zil',
      );
      expect(childhash).toEqual(expectedNamehash);
    });

    it('should return childhash', () => {
      const expectedNamehash =
        '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787';
      const childhash = znsChildhash(
        '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3',
        'brad',
      );
      expect(childhash).toEqual(expectedNamehash);
    });
  });
});
