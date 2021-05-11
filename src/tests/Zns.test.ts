import Resolution, {ResolutionErrorCode} from '../index';
import {
  mockAsyncMethod,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
  mockAsyncMethods,
} from './helpers';
import {NullAddress} from '../types';
import {NamingServiceName, ZnsSupportedNetworks} from '../types/publicTypes';
import Zns from '../Zns';

let resolution: Resolution;
let zns: Zns;

describe('ZNS', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    resolution = new Resolution();
    zns = resolution.serviceMap[NamingServiceName.ZNS] as Zns;
  });

  describe('.NormalizeSource', () => {
    it('checks normalizeSource zns (boolean)', async () => {
      expect(zns.network).toBe(1);
      expect(zns.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (string)', async () => {
      expect(zns.network).toBe(1);
      expect(zns.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #1', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          zns: {url: 'https://api.zilliqa.com', network: 'mainnet'},
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS] as Zns;
      expect(zns.network).toBe(1);
      expect(zns.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #3', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          zns: {url: 'https://api.zilliqa.com', network: 'mainnet'},
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS] as Zns;
      expect(zns.network).toBe(1);
      expect(zns.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #4', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          zns: {url: 'https://api.zilliqa.com', network: 'mainnet'},
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS] as Zns;
      expect(zns.network).toBe(1);
      expect(zns.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #6', async () => {
      expect(
        () =>
          new Resolution({
            sourceConfig: {zns: {network: '42' as ZnsSupportedNetworks}},
          }),
      ).toThrowError('Unspecified network in Resolution ZNS configuration');
    });

    it('checks normalizeSource zns (object) #7', async () => {
      expect(
        () =>
          new Resolution({
            sourceConfig: {zns: {network: 'invalid' as ZnsSupportedNetworks}},
          }),
      ).toThrowError('Unspecified network in Resolution ZNS configuration');
    });

    it('checks normalizeSource zns (object) #8', async () => {
      const resolution = new Resolution({
        sourceConfig: {zns: {network: 'mainnet'}},
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS] as Zns;
      expect(zns.network).toBe(1);
      expect(zns.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #10', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          zns: {
            registryAddress: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
            network: 'mainnet',
          },
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS] as Zns;
      expect(zns.network).toBe(1);
      expect(zns.registryAddress).toBe(
        'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
      );
      expect(zns.url).toBe('https://api.zilliqa.com');
    });

    it('checks normalizeSource zns (object) #11', async () => {
      const resolution = new Resolution({
        sourceConfig: {
          zns: {
            registryAddress: '0xabcffff1231586348194fcabbeff1231240234fc',
            network: 'mainnet',
          },
        },
      });
      zns = resolution.serviceMap[NamingServiceName.ZNS] as Zns;
      expect(zns.network).toBe(1);
      expect(zns.url).toBe('https://api.zilliqa.com');
      expect(zns.registryAddress).toBe(
        'zil1408llufrzkrrfqv5lj4malcjxyjqyd8urd7xz6',
      );
    });
  });

  describe('.Resolve', () => {
    it('resolves .zil name using blockchain', async () => {
      const eyes = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil1ye72zl5t8wl5n3f2fsa5w0x7hja0jqj7mhct23',
          '0xb17c35e557a8c13a730696c92d716a58421e36ca',
        ],
        getResolverRecords: {
          'crypto.BTC.address': '1NZKHwpfqprxzcaijcjf71CZr27D8osagR',
          'crypto.ETH.address': '0xaa91734f90795e80751c96e682a321bb3c1a4186',
        },
      });
      const result = await resolution.allRecords('cofounding.zil');
      expectSpyToBeCalled(eyes);
      expect(result).toBeDefined();
      expect(result['crypto.ETH.address']).toEqual(
        '0xaa91734f90795e80751c96e682a321bb3c1a4186',
      );
      expect(result['crypto.BTC.address']).toEqual(
        '1NZKHwpfqprxzcaijcjf71CZr27D8osagR',
      );
    });

    it('resolves domain using blockchain #2', async () => {
      const spyes = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil1zzpjwyp2nu29pcv3sh04qxq9x5l45vke0hrwec',
          '0x3f329078d95f043fd902d5c3ea2fbce0b3fca003',
        ],
        getResolverRecords: {
          'crypto.BURST.address': 'BURST-R7KK-SBSY-FENX-AWYMW',
          'crypto.ZIL.address': 'zil1zzpjwyp2nu29pcv3sh04qxq9x5l45vke0hrwes',
          'ipfs.html.value':
            'mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a',
          'whois.email.value': 'rleinbox@gmail.com',
          'whois.for_sale.value': 'true',
        },
      });
      const result = await resolution.allRecords('test-manage-one.zil');
      expectSpyToBeCalled(spyes);
      expect(result).toEqual({
        'crypto.BURST.address': 'BURST-R7KK-SBSY-FENX-AWYMW',
        'crypto.ZIL.address': 'zil1zzpjwyp2nu29pcv3sh04qxq9x5l45vke0hrwes',
        'ipfs.html.value':
          'mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a',
        'whois.email.value': 'rleinbox@gmail.com',
        'whois.for_sale.value': 'true',
      });
    });

    it('should return a valid resolver address', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil194qcjskuuxh6qtg8xw3qqrr3kdc6dtq8ct6j9s',
          '0xdac22230adfe4601f00631eae92df6d77f054891',
        ],
      });
      const resolverAddress = await resolution.resolver('brad.zil');
      expectSpyToBeCalled(spies);
      expect(resolverAddress).toBe(
        '0xdac22230adfe4601f00631eae92df6d77f054891',
      );
    });

    it('should return a valid owner address', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil194qcjskuuxh6qtg8xw3qqrr3kdc6dtq8ct6j9s',
          '0xdac22230adfe4601f00631eae92df6d77f054891',
        ],
      });
      const ownerAddress = await resolution.owner('brad.zil');
      expectSpyToBeCalled(spies);
      expect(ownerAddress).toBe('zil194qcjskuuxh6qtg8xw3qqrr3kdc6dtq8ct6j9s');
    });

    it('should not find a resolverAddress', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: undefined,
      });
      await expectResolutionErrorCode(
        resolution.resolver('sopmethingveryweirdthatnoonewilltakeever.zil'),
        ResolutionErrorCode.UnregisteredDomain,
      );
      expectSpyToBeCalled(spies);
    });

    it('should have a zero resolver hahaha', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz',
          NullAddress,
        ],
      });
      await expectResolutionErrorCode(
        resolution.resolver('uihui12d.zil'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });

    it('should have a zero resolver 2', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [
          'zil10scu59zrf8fr6gyw5vnwcz43hg7rvah747pz5h',
          NullAddress,
        ],
      });
      await expectResolutionErrorCode(
        resolution.resolver('paulalcock.zil'),
        ResolutionErrorCode.UnspecifiedResolver,
      );
      expectSpyToBeCalled(spies);
    });
  });

  describe('.isSupportedDomain', () => {
    it('starts with -', () => {
      expect(resolution.isSupportedDomain('-hello.zil')).toEqual(true);
    });

    it('ends with -', () => {
      expect(resolution.isSupportedDomain('hello-.zil')).toEqual(true);
    });

    it('starts and ends with -', () => {
      expect(resolution.isSupportedDomain('-hello-.zil')).toEqual(true);
    });
  });

  describe('.Hashing', () => {
    describe('.Namehash', () => {
      it('supports standard domain', () => {
        expect(resolution.namehash('ny.zil')).toEqual(
          '0xd45bcb80c1ca68da09082d7618280839a1102446b639b294d07e9a1692ec241f',
        );
      });

      it('supports root "zil" domain', () => {
        expect(resolution.namehash('zil')).toEqual(
          '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3',
        );
      });

      it('raises ResoltuionError when domain is not supported', async () => {
        await expectResolutionErrorCode(
          () => resolution.namehash('hello.world'),
          ResolutionErrorCode.UnsupportedDomain,
        );
      });
    });
  });

  describe('.Record Data', () => {
    it('should return IPFS hash from zns', async () => {
      const eye = mockAsyncMethod(zns, 'getContractMapValue', {
        argtypes: [],
        arguments: [
          '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
          '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
        ],
        constructor: 'Record',
      });
      const secondEye = mockAsyncMethod(zns, 'getResolverRecords', {
        'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
        'whois.email.value': 'matt+test@unstoppabledomains.com',
        'whois.for_sale.value': 'true',
      });
      const hash = await resolution.ipfsHash('ergergergerg.zil');
      expectSpyToBeCalled([eye, secondEye]);
      expect(hash).toStrictEqual(
        'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
      );
    });

    it('should return httpUrl associated with the domain', async () => {
      const eye = mockAsyncMethod(zns, 'getContractMapValue', {
        argtypes: [],
        arguments: [
          '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
          '0xa9b1d3647e4deb9ce4e601c2c9e0a2fdf2d7415a',
        ],
        constructor: 'Record',
      });
      const secondEye = mockAsyncMethod(zns, 'getResolverRecords', {
        'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
        'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
        'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
        'whois.email.value': 'matt+test@unstoppabledomains.com',
        'whois.for_sale.value': 'true',
      });
      const httpUrl = await resolution.httpUrl('ergergergerg.zil');
      expectSpyToBeCalled([eye, secondEye]);
      expect(httpUrl).toBe('www.unstoppabledomains.com');
    });

    it('should return all records for zil domain', async () => {
      const eye = mockAsyncMethod(zns, 'getContractMapValue', {
        argtypes: [],
        arguments: [
          '0xcea21f5a6afc11b3a4ef82e986d63b8b050b6910',
          '0x34bbdee3404138430c76c2d1b2d4a2d223a896df',
        ],
        constructor: 'Record',
      });
      const secondEye = mockAsyncMethod(zns, 'getResolverRecords', {
        'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
        'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
        'whois.email.value': 'jeyhunt@gmail.com',
      });
      const records = await resolution.allRecords('johnnyjumper.zil');
      expectSpyToBeCalled([eye, secondEye]);
      expect(records).toMatchObject({
        'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
        'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
        'whois.email.value': 'jeyhunt@gmail.com',
      });
    });
  });
});
