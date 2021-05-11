import Resolution from '../index';
import {ResolutionErrorCode} from '../errors/resolutionError';
import {NullAddress} from '../types';
import {
  CryptoDomainWithoutResolver,
  CryptoDomainWithTwitterVerification,
  mockAsyncMethods,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
  protocolLink,
  expectConfigurationErrorCode,
  CryptoDomainWithoutGunDbRecords,
  CryptoDomainWithAllRecords,
} from './helpers';
import FetchProvider from '../FetchProvider';
import {CnsSupportedNetworks, NamingServiceName} from '../types/publicTypes';
import Cns from '../Cns';
import Networking from '../utils/Networking';
import {ConfigurationErrorCode} from '../errors/configurationError';

let resolution: Resolution;
let cns: Cns;

beforeEach(async () => {
  jest.restoreAllMocks();
  resolution = new Resolution({
    sourceConfig: {cns: {url: protocolLink(), network: 'mainnet'}},
  });
  cns = resolution.serviceMap[NamingServiceName.CNS] as Cns;
});

describe('CNS', () => {
  it('should define the default cns contract', () => {
    expect(cns).toBeDefined();
    expect(cns.network).toBe(1);
    expect(cns.url).toBe(protocolLink());
  });

  it('should not allow ropsten as testnet', async () => {
    await expectConfigurationErrorCode(
      () =>
        new Resolution({
          sourceConfig: {
            cns: {network: 'ropsten' as CnsSupportedNetworks},
          },
        }),
      ConfigurationErrorCode.UnsupportedNetwork,
    );
  });

  it('checks the record by key', async () => {
    const eyes = mockAsyncMethods(cns, {
      get: {
        resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
        records: {
          'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
        },
      },
    });
    const ipfsHash = await resolution.record(
      CryptoDomainWithAllRecords,
      'ipfs.html.value',
    );
    expectSpyToBeCalled(eyes);
    expect(ipfsHash).toBe('QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu');
  });

  it('should return verified twitter handle', async () => {
    const spies = mockAsyncMethods(cns, {
      get: {
        resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
        owner: '0x6ec0deed30605bcd19342f3c30201db263291589',
        records: {
          ['validation.social.twitter.username']:
            '0xcd2655d9557e5535313b47107fa8f943eb1fec4da6f348668062e66233dde21b413784c4060340f48da364311c6e2549416a6a23dc6fbb48885382802826b8111b',
          ['social.twitter.username']: 'derainberk',
        },
      },
    });
    const twitterHandle = await resolution.serviceMap[
      NamingServiceName.CNS
    ].twitter(CryptoDomainWithTwitterVerification);
    expectSpyToBeCalled(spies);
    expect(twitterHandle).toBe('derainberk');
  });

  it('should return NoRecord Resolution error', async () => {
    const spies = mockAsyncMethods(cns, {
      get: {
        resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
        records: {},
      },
    });
    await expectResolutionErrorCode(
      resolution.record(CryptoDomainWithAllRecords, 'No.such.record'),
      ResolutionErrorCode.RecordNotFound,
    );
    expectSpyToBeCalled(spies);
  }, 20000);

  it('should return a valid resolver address', async () => {
    const spies = mockAsyncMethods(cns, {
      get: {resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842'},
    });
    const resolverAddress = await resolution.resolver(
      CryptoDomainWithAllRecords,
    );
    expectSpyToBeCalled(spies);
    expect(resolverAddress).toBe('0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842');
  });

  it('should not find a resolver address', async () => {
    const spies = mockAsyncMethods(cns, {
      get: {
        owner: '0x0000000000000000000000000000000000000000',
        resolver: undefined,
      },
    });

    await expectResolutionErrorCode(
      resolution.resolver('unknown-unknown-938388383.crypto'),
      ResolutionErrorCode.UnregisteredDomain,
    );
    expectSpyToBeCalled(spies);
  });

  it('should throw ResolutionError.UnspecifiedResolver', async () => {
    const spies = mockAsyncMethods(cns, {
      get: {owner: 'someowneraddress', resolver: NullAddress},
    });
    await expectResolutionErrorCode(
      resolution.resolver(CryptoDomainWithoutResolver),
      ResolutionErrorCode.UnspecifiedResolver,
    );
    expectSpyToBeCalled(spies);
  });

  describe('.Crypto', () => {
    it(`checks the BCH address on ${CryptoDomainWithAllRecords}`, async () => {
      const eyes = mockAsyncMethods(cns, {
        get: {
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          records: {
            ['crypto.BCH.address']:
              'qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8',
          },
        },
      });
      const addr = await resolution.addr(CryptoDomainWithAllRecords, 'BCH');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe('qzx048ez005q4yhphqu2pylpfc3hy88zzu4lu6q9j8');
    });

    it(`checks the ADA address on ${CryptoDomainWithAllRecords}`, async () => {
      const eyes = mockAsyncMethods(cns, {
        get: {
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          records: {
            ['crypto.ADA.address']:
              'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
          },
        },
      });
      const addr = await resolution.addr(CryptoDomainWithAllRecords, 'ADA');
      expectSpyToBeCalled(eyes);
      expect(addr).toBe(
        'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
      );
    });

    describe('.Metadata', () => {
      it('should resolve with ipfs stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['ipfs.html.value']:
                'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
            },
          },
        });
        const ipfsHash = await resolution.ipfsHash(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(ipfsHash).toBe('QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu');
      });

      it('should resolve with email stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['whois.email.value']: 'johnny@unstoppabledomains.com',
            },
          },
        });
        const email = await resolution.email(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(email).toBe('johnny@unstoppabledomains.com');
      });

      it('should resolve with httpUrl stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['ipfs.redirect_domain.value']: 'google.com',
            },
          },
        });
        const httpUrl = await resolution.httpUrl(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(eyes);
        expect(httpUrl).toBe('google.com');
      });

      it('should resolve with the gundb chatId stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['gundb.username.value']:
                '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
            },
          },
        });
        const chatId = await resolution.chatId('brad.crypto');
        expectSpyToBeCalled(eyes);
        expect(chatId).toBe(
          '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
        );
      });

      it('should throw UnspecifiedResolver for chatId', async () => {
        mockAsyncMethods(cns, {
          get: {
            owner: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
          },
        });
        await expectResolutionErrorCode(
          resolution.chatId(CryptoDomainWithoutResolver),
          ResolutionErrorCode.UnspecifiedResolver,
        );
      });

      it('should resolve with the gundb public key stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['gundb.public_key.value']:
                'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
            },
          },
        });
        const publicKey = await resolution.chatPk('brad.crypto');
        expectSpyToBeCalled(eyes);
        expect(publicKey).toBe(
          'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
        );
      });

      it('should error out for gundb public key stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
          get: {
            resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            records: {},
          },
        });
        await expectResolutionErrorCode(
          resolution.chatPk(CryptoDomainWithoutGunDbRecords),
          ResolutionErrorCode.RecordNotFound,
        );
        expectSpyToBeCalled(eyes);
      });

      it('should error out for gundb chatId stored on cns', async () => {
        const eyes = mockAsyncMethods(cns, {
          get: {
            resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            records: {},
          },
        });
        await expectResolutionErrorCode(
          resolution.chatId(CryptoDomainWithoutGunDbRecords),
          ResolutionErrorCode.RecordNotFound,
        );
        expectSpyToBeCalled(eyes);
      });
    });
  });

  describe('.Crypto ProxyReader', () => {
    it('should return record by key', async () => {
      const eyes = mockAsyncMethods(cns, {
        get: {
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          records: {
            ['ipfs.html.value']:
              'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          },
        },
      });
      const ipfsHash = await resolution.record(
        CryptoDomainWithAllRecords,
        'ipfs.html.value',
      );
      expectSpyToBeCalled(eyes);
      expect(ipfsHash).toBe('QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu');
    });

    it('should return NoRecord Resolution error when value not found', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {
          resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
          records: {},
        },
      });
      await expectResolutionErrorCode(
        resolution.record(CryptoDomainWithAllRecords, 'No.such.record'),
        ResolutionErrorCode.RecordNotFound,
      );
      expectSpyToBeCalled(spies);
    });

    it('should return a valid resolver address', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {
          resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
          records: {},
        },
      });
      const resolverAddress = await resolution.resolver(
        CryptoDomainWithAllRecords,
      );
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
      );
    });

    it('should return UnregisteredDomain error when owner address not found', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {owner: NullAddress},
      });
      await expectResolutionErrorCode(
        resolution.resolver('unknown-unknown-938388383.crypto'),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled(spies);
    });

    it('should return UnspecifiedResolver error when resolver address not found', async () => {
      const spies = mockAsyncMethods(cns, {
        get: {owner: '0x000000000000000000000000000000000000dead'},
      });
      await expectResolutionErrorCode(
        resolution.resolver(CryptoDomainWithoutResolver),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });

    it('should work without any configs', async () => {
      resolution = new Resolution();
      const eyes = mockAsyncMethods(
        resolution.serviceMap[NamingServiceName.CNS],
        {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['crypto.ETH.address']:
                '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
            },
          },
        },
      );
      const address = await resolution.addr(CryptoDomainWithAllRecords, 'eth');
      expectSpyToBeCalled(eyes);
      expect(address).toBe('0xe7474D07fD2FA286e7e0aa23cd107F8379085037');
    });

    describe('.Metadata', () => {
      it('should resolve with ipfs stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['ipfs.html.value']:
                'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
            },
          },
        });
        const ipfsHash = await resolution.ipfsHash(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(ipfsHash).toBe('QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu');
      });

      it('should resolve with email stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {['whois.email.value']: 'johnny@unstoppabledomains.com'},
          },
        });
        const email = await resolution.email(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(email).toBe('johnny@unstoppabledomains.com');
      });

      it.skip('should resolve with httpUrl stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['ipfs.redirect_domain.value']: 'https://unstoppabledomains.com/',
            },
          },
        });
        const httpUrl = await resolution.httpUrl(CryptoDomainWithAllRecords);
        expectSpyToBeCalled(spies);
        expect(httpUrl).toBe('https://unstoppabledomains.com/');
      });

      it('should resolve with the gundb chatId stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['gundb.username.value']:
                '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
            },
          },
        });
        const chatId = await resolution.chatId('brad.crypto');
        expectSpyToBeCalled(spies);
        expect(chatId).toBe(
          '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
        );
      });

      it('should throw UnspecifiedResolver for chatId', async () => {
        mockAsyncMethods(cns, {
          get: {
            owner: '0x000000000000000000000000000000000000dead',
            records: {},
            resolver: NullAddress,
          },
        });
        await expectResolutionErrorCode(
          resolution.chatId(CryptoDomainWithoutResolver),
          ResolutionErrorCode.UnspecifiedResolver,
        );
      });

      it('should resolve with the gundb public key stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {
              ['gundb.public_key.value']:
                'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
            },
          },
        });
        const publicKey = await resolution.chatPk('brad.crypto');
        expectSpyToBeCalled(spies);
        expect(publicKey).toBe(
          'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
        );
      });

      it('should error out for gundb public key stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {},
          },
        });
        await expectResolutionErrorCode(
          resolution.chatPk(CryptoDomainWithoutGunDbRecords),
          ResolutionErrorCode.RecordNotFound,
        );
        expectSpyToBeCalled(spies);
      });

      it('should error out for gundb chatId stored on cns', async () => {
        const spies = mockAsyncMethods(cns, {
          get: {
            resolver: '0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842',
            records: {},
          },
        });
        await expectResolutionErrorCode(
          resolution.chatId(CryptoDomainWithoutGunDbRecords),
          ResolutionErrorCode.RecordNotFound,
        );
        expectSpyToBeCalled(spies);
      });
    });
  });

  describe('.Hashing', () => {
    describe('.Namehash', () => {
      it('supports root node', async () => {
        expect(resolution.isSupportedDomain('crypto')).toEqual(true);
        expect(resolution.namehash('crypto')).toEqual(
          '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
        );
      });

      it('starts with -', async () => {
        expect(resolution.isSupportedDomain('-hello.crypto')).toEqual(true);
        expect(resolution.namehash('-hello.crypto')).toBe(
          '0xc4ad028bcae9b201104e15f872d3e85b182939b06829f75a128275177f2ff9b2',
        );
      });

      it('ends with -', async () => {
        expect(resolution.isSupportedDomain('hello-.crypto')).toEqual(true);
        expect(resolution.namehash('hello-.crypto')).toBe(
          '0x82eaa6ef14e438940bfd7747e0e4c4fec42af20cee28ddd0a7d79f52b1c59b72',
        );
      });

      it('starts and ends with -', async () => {
        expect(resolution.isSupportedDomain('-hello-.crypto')).toEqual(true);
        expect(resolution.namehash('-hello-.crypto')).toBe(
          '0x90cc1963ff09ce95ee2dbb3830df4f2115da9756e087a50283b3e65f6ffe2a4e',
        );
      });

      it('should throw UnregisteredDomain', async () => {
        const eyes = mockAsyncMethods(cns, {
          get: {owner: NullAddress},
        });

        await expectResolutionErrorCode(
          resolution.record('unregistered.crypto', 'crypto.ETH.address'),
          ResolutionErrorCode.UnregisteredDomain,
        );
        expectSpyToBeCalled(eyes);
      });
    });
  });

  describe('#namehash', () => {
    it('supports options', async () => {
      expect(resolution.namehash('operadingo4.crypto')).toEqual(
        '0x70f542f09763d3ab404a6d87f6a2fad7d49f01b09c44064b4227d165ead5cf25',
      );

      expect(
        resolution.namehash('operadingo4.crypto', {prefix: false}),
      ).toEqual(
        '70f542f09763d3ab404a6d87f6a2fad7d49f01b09c44064b4227d165ead5cf25',
      );

      expect(
        resolution.namehash('operadingo4.crypto', {format: 'dec'}),
      ).toEqual(
        '51092378573785850370557709888128643877973998831507731627523713553233928900389',
      );
    });
  });

  describe('Providers', () => {
    it('should throw error when FetchProvider throws Error', async () => {
      const url = protocolLink();
      const provider = new FetchProvider(NamingServiceName.CNS, url);
      resolution = new Resolution({
        sourceConfig: {cns: {url, provider, network: 'mainnet'}},
      });
      jest.spyOn(Networking, 'fetch').mockRejectedValue(new Error('error_up'));

      await expect(
        resolution.record(CryptoDomainWithAllRecords, 'No.such.record'),
      ).rejects.toEqual(new Error('error_up'));
    });
  });
});
