import nock from 'nock';
import Resolution from '../index';
import Networking from '../utils/Networking';
import {
  DefaultUrl,
  mockAPICalls,
  mockAsyncMethod,
  expectSpyToBeCalled,
  CryptoDomainWithTwitterVerification,
} from './helpers';

let resolution: Resolution;

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
  resolution = new Resolution({
    sourceConfig: {
      zns: {api: true},
      ens: {api: true},
      cns: {api: true},
    },
  });
});

describe('Unstoppable API', () => {
  it('namehashes zil domain', async () => {
    expect(resolution.namehash('cofounding.zil')).toEqual(
      '0x1cc365ffd60bb50538e01d24c1f1e26c887c36f26a0de250660b8a1465c60667',
    );
  });

  it('should return verified twitter handle', async () => {
    const eyes = mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        addresses: {},
        whois: {},
        ipfs: {},
        gundb: {},
        social: {},
        meta: {
          domain: 'ijustwannatestsomething2.crypto',
          namehash:
            '0xcbef5c2009359c88519191d7c0d00f3973f76f24bdb0fc8d5254de26a44e0903',
          tokenId:
            '92242420535237173873666448151646428182056687247223888232110666318291334465795',
          owner: '0x6ec0deed30605bcd19342f3c30201db263291589',
          resolver: '0xb66dce2da6afaaa98f2013446dbcb0f4b0ab2842',
          type: 'CNS',
          ttl: 0,
        },
        records: {
          'social.twitter.username': 'derainberk',
          'validation.social.twitter.username':
            '0xcd2655d9557e5535313b47107fa8f943eb1fec4da6f348668062e66233dde21b413784c4060340f48da364311c6e2549416a6a23dc6fbb48885382802826b8111b',
        },
      }),
    });
    const twitterHandle = await resolution.twitter(
      CryptoDomainWithTwitterVerification,
    );
    expectSpyToBeCalled([eyes]);
    expect(twitterHandle).toBe('derainberk');
  });

  it('should throw unsupported method', async () => {
    const handle = 'ryan.eth';
    await expect(resolution.twitter(handle)).rejects.toThrowError(
      `Method twitter is not supported for ${handle}`,
    );
  });

  it('returns owner of the domain', async () => {
    mockAPICalls('ud_api_generic_test', DefaultUrl);
    expect(await resolution.owner('cofounding.zil')).toEqual(
      'zil1ye72zl5t8wl5n3f2fsa5w0x7hja0jqj7mhct23',
    );
  });

  it('should return a valid ipfsHash from API', async () => {
    const eyes = mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        addresses: {
          BCH: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
          BTC: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
          DASH: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
          ETH: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
          LTC: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
          XMR: '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
          ZEC: 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
          ZIL: 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
        },
        whois: {},
        ipfs: {
          html: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
          redirect_domain: 'www.unstoppabledomains.com',
        },
        meta: {
          owner: '0x2d418942dce1afa02d0733a2000c71b371a6ac07',
          type: 'ZNS',
          ttl: 0,
        },
        records: {
          'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
          'crypto.BCH.address': 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
          'crypto.BTC.address': '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
          'crypto.ETH.address': '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
          'crypto.LTC.address': 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
          'crypto.XMR.address':
            '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
          'crypto.ZEC.address': 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
          'crypto.ZIL.address': 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
          'crypto.DASH.address': 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
          'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
        },
      }),
    });
    const ipfsHash = await resolution.ipfsHash('brad.zil');
    expectSpyToBeCalled([eyes]);
    expect(ipfsHash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
  });

  it('should return a valid email from API', async () => {
    const eyes = mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        addresses: {},
        whois: {
          email: 'matt+test@unstoppabledomains.com',
          for_sale: 'true',
        },
        ipfs: {
          html: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
          redirect_domain: 'www.unstoppabledomains.com',
        },
        meta: {
          owner: '0x4e984952e867ff132cd4b70cd3f313d68c511b76',
          type: 'ZNS',
          ttl: 0,
        },
        records: {
          'ipfs.html.hash': 'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
          'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
          'whois.email.value': 'matt+test@unstoppabledomains.com',
          'whois.for_sale.value': 'true',
          'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
        },
      }),
    });
    const email = await resolution.email('ergergergerg.zil');
    expectSpyToBeCalled([eyes]);
    expect(email).toBe('matt+test@unstoppabledomains.com');
  });

  it('should return a valid httpUrl from API', async () => {
    const eyes = mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        addresses: {
          BCH: 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
          BTC: '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
          DASH: 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
          ETH: '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
          LTC: 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
          XMR: '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
          ZEC: 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
          ZIL: 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
        },
        whois: {},
        ipfs: {
          html: 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
          redirect_domain: 'www.unstoppabledomains.com',
        },
        meta: {
          owner: '0x2d418942dce1afa02d0733a2000c71b371a6ac07',
          type: 'ZNS',
          ttl: 0,
        },
        records: {
          'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
          'crypto.BCH.address': 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
          'crypto.BTC.address': '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
          'crypto.ETH.address': '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
          'crypto.LTC.address': 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
          'crypto.XMR.address':
            '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
          'crypto.ZEC.address': 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
          'crypto.ZIL.address': 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
          'crypto.DASH.address': 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
          'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
        },
      }),
    });
    const httpUrl = await resolution.httpUrl('brad.zil');
    expectSpyToBeCalled([eyes]);
    expect(httpUrl).toBe('www.unstoppabledomains.com');
  });

  it('should get all records from API', async () => {
    const eyes = mockAsyncMethod(Networking, 'fetch', {
      json: () => ({
        addresses: {ETH: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037'},
        whois: {email: 'jeyhunt@gmail.com'},
        ipfs: {html: 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu'},
        gundb: {},
        social: {},
        meta: {
          domain: 'johnnyjumper.zil',
          namehash:
            '0x08ab2ffa92966738c881a37d0d97f168d2e076d24639921762d0985ebaa62e31',
          owner: '0xcea21f5a6afc11b3a4ef82e986d63b8b050b6910',
          type: 'ZNS',
          ttl: 0,
        },
        records: {
          'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          'whois.email.value': 'jeyhunt@gmail.com',
          'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
        },
      }),
    });
    const records = await resolution.allRecords('johnnyjumper.zil');
    expectSpyToBeCalled([eyes]);
    expect(records).toMatchObject({
      'ipfs.html.value': 'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
      'whois.email.value': 'jeyhunt@gmail.com',
      'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
    });
  });
});
