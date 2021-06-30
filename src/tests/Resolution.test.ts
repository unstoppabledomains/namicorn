import nock from 'nock';
import Resolution, {
  ResolutionError,
  ResolutionErrorCode,
  UnclaimedDomainResponse,
} from '../index';
import {
  DnsRecordType,
  JsonRpcPayload,
  NamingServiceName,
} from '../types/publicTypes';
import {JsonRpcProvider, InfuraProvider} from '@ethersproject/providers';
import Web3HttpProvider from 'web3-providers-http';
import Web3WsProvider from 'web3-providers-ws';
import Web3V027Provider from 'web3-0.20.7/lib/web3/httpprovider';
import {
  expectResolutionErrorCode,
  expectSpyToBeCalled,
  mockAsyncMethods,
  protocolLink,
  ProviderProtocol,
  caseMock,
  mockAsyncMethod,
  CryptoDomainWithTwitterVerification,
  skipItInLive,
  isLive,
  CryptoDomainWithUsdtMultiChainRecords,
  expectConfigurationErrorCode,
  CryptoDomainWithAllRecords,
} from './helpers';
import {RpcProviderTestCases} from '../utils/providerMockData';
import fetch, {FetchError} from 'node-fetch';
import Uns from '../Uns';
import Zns from '../Zns';
import Ens from '../Ens';
import FetchProvider from '../FetchProvider';
import {ConfigurationErrorCode} from '../errors/configurationError';
import {HTTPProvider} from '@zilliqa-js/core';
import {Eip1993Factories as Eip1193Factories} from '../utils/Eip1993Factories';
import UnsConfig from '../config/uns-config.json';
import EthereumContract from '../contracts/EthereumContract';

let resolution: Resolution;
let uns: Uns;
let zns: Zns;
let ens: Ens;

beforeEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
  resolution = new Resolution({
    sourceConfig: {
      uns: {url: protocolLink(), network: 'rinkeby'},
      ens: {url: protocolLink(), network: 'rinkeby'},
    },
  });
  uns = resolution.serviceMap[NamingServiceName.UNS] as unknown as Uns;
  ens = resolution.serviceMap[NamingServiceName.ENS] as unknown as Ens;
  zns = resolution.serviceMap[NamingServiceName.ZNS] as unknown as Zns;
});

describe('Resolution', () => {
  describe('.Basic setup', () => {
    it('should work with autonetwork url configuration', async () => {
      const rinkebyUrl = protocolLink();
      const goerliUrl = rinkebyUrl.replace('rinkeby', 'goerli');
      // mocking getNetworkConfigs because no access to inner provider.request
      const UnsGetNetworkOriginal = Uns.autoNetwork;
      const EnsGetNetworkOriginal = Ens.autoNetwork;
      if (!isLive()) {
        Uns.autoNetwork = jest.fn().mockReturnValue(
          new Uns({
            network: 'rinkeby',
            provider: new FetchProvider(NamingServiceName.UNS, rinkebyUrl),
          }),
        );
        Ens.autoNetwork = jest.fn().mockReturnValue(
          new Ens({
            network: 'goerli',
            provider: new FetchProvider(NamingServiceName.ENS, goerliUrl),
          }),
        );
      }
      const resolution = await Resolution.autoNetwork({
        uns: {url: rinkebyUrl},
        ens: {url: goerliUrl},
      });
      // We need to manually restore the function as jest.restoreAllMocks and simillar works only with spyOn
      Uns.autoNetwork = UnsGetNetworkOriginal;
      Ens.autoNetwork = EnsGetNetworkOriginal;
      expect(
        (resolution.serviceMap[NamingServiceName.UNS] as unknown as Uns)
          .network,
      ).toBe(4);
      expect(
        (resolution.serviceMap[NamingServiceName.ENS] as unknown as Ens)
          .network,
      ).toBe(5);
    });

    it('should not work with invalid proxyReader configuration', async () => {
      const mainnetUrl = protocolLink();
      const customNetwork = 'goerli';
      const goerliUrl = mainnetUrl.replace('mainnet', customNetwork);
      expectConfigurationErrorCode(() => {
        new Uns({
          network: customNetwork,
          url: goerliUrl,
          proxyReaderAddress: '0x012312931293',
        });
      }, ConfigurationErrorCode.InvalidConfigurationField);
    });

    it('should work with proxyReader configuration', async () => {
      const mainnetUrl = protocolLink();
      const customNetwork = 'goerli';
      const goerliUrl = mainnetUrl.replace('mainnet', customNetwork);
      const uns = new Uns({
        network: customNetwork,
        url: goerliUrl,
        proxyReaderAddress: '0xe7474D07fD2FA286e7e0aa23cd107F8379025037',
      });
      expect(uns).toBeDefined();
    });

    it('should not work with invalid proxyReader configuration 2', async () => {
      const mainnetUrl = protocolLink();
      const customNetwork = 'goerli';
      const provider = new FetchProvider(NamingServiceName.UNS, mainnetUrl);
      expectConfigurationErrorCode(() => {
        new Uns({
          network: customNetwork,
          provider,
          proxyReaderAddress: '0x012312931293',
        });
      }, ConfigurationErrorCode.InvalidConfigurationField);
    });

    it('should work with custom network configuration with provider', async () => {
      const mainnetUrl = protocolLink();
      const customNetwork = 'goerli';
      const provider = new FetchProvider(NamingServiceName.UNS, mainnetUrl);
      const uns = new Uns({
        network: customNetwork,
        provider,
        proxyReaderAddress: '0xe7447Fdd52FA286e7e0aa23cd107F83790250897',
      });
      expect(uns).toBeDefined();
    });

    it('should work with autonetwork provider configuration', async () => {
      const provider = new FetchProvider(
        'UDAPI',
        protocolLink().replace('rinkeby', 'mainnet'),
      );
      const spy = mockAsyncMethod(provider, 'request', '1');
      const resolution = await Resolution.autoNetwork({
        uns: {provider},
        ens: {provider},
      });
      expect(spy).toBeCalledTimes(2);
      expect(
        (resolution.serviceMap[NamingServiceName.UNS] as unknown as Uns)
          .network,
      ).toBe(1);
      expect(
        (resolution.serviceMap[NamingServiceName.ENS] as unknown as Ens)
          .network,
      ).toBe(1);
    });

    it('should fail because provided url failled net_version call', async () => {
      const mockedProvider = new FetchProvider(
        NamingServiceName.UNS,
        'https://google.com',
      );
      const providerSpy = mockAsyncMethod(
        mockedProvider,
        'request',
        new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage:
            'Request to https://google.com failed with responce status 405',
        }),
      );
      const factorySpy = mockAsyncMethod(
        FetchProvider,
        'factory',
        () => mockedProvider,
      );
      try {
        await Resolution.autoNetwork({
          uns: {url: 'https://google.com'},
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ResolutionError);
        expect(error.message).toBe(
          '< Request to https://google.com failed with responce status 405 >',
        );
      }
      expectSpyToBeCalled([factorySpy, providerSpy]);
    });

    it('should fail because provided provider failed to make a net_version call', async () => {
      const mockedProvider = new FetchProvider(
        NamingServiceName.ENS,
        'http://unstoppabledomains.com',
      );
      const providerSpy = mockAsyncMethod(
        mockedProvider,
        'request',
        new FetchError(
          'invalid json response body at https://unstoppabledomains.com/ reason: Unexpected token < in JSON at position 0',
          'invalid_json',
        ),
      );
      try {
        await Resolution.autoNetwork({
          ens: {provider: mockedProvider},
        });
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect(error.message).toBe(
          'invalid json response body at https://unstoppabledomains.com/ reason: Unexpected token < in JSON at position 0',
        );
      }
      expect(providerSpy).toBeCalled();
    });

    it('should fail because of unsupported test network for uns', async () => {
      const blockchainUrl = protocolLink().replace('rinkeby', 'ropsten');
      const mockedProvider = new FetchProvider(
        NamingServiceName.UNS,
        blockchainUrl,
      );
      const providerSpy = mockAsyncMethod(mockedProvider, 'request', () => '3');
      const providerFactorySpy = mockAsyncMethod(
        FetchProvider,
        'factory',
        () => mockedProvider,
      );

      await expectConfigurationErrorCode(
        Resolution.autoNetwork({
          uns: {url: blockchainUrl},
        }),
        ConfigurationErrorCode.UnsupportedNetwork,
      );
    });

    skipItInLive('should fail in test development', async () => {
      try {
        await fetch('https://pokeres.bastionbot.org/images/pokemon/10.png');
      } catch (err) {
        // nock should prevent all outgoing traffic
        expect(err).toBeInstanceOf(FetchError);
        return;
      }
      fail('nock is not configured correctly!');
    });

    it('should get a valid resolution instance', async () => {
      const resolution = Resolution.infura('api-key', {
        uns: {network: 'rinkeby'},
        ens: {network: 'rinkeby'},
      });
      uns = resolution.serviceMap[NamingServiceName.UNS] as unknown as Uns;
      ens = resolution.serviceMap[NamingServiceName.ENS] as unknown as Ens;
      expect(uns.url).toBe(`https://rinkeby.infura.io/v3/api-key`);
      expect(ens.url).toBe(`https://rinkeby.infura.io/v3/api-key`);
    });

    it('should throw on unspecified network', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      expect(() =>
        Resolution.fromResolutionProvider(provider, {}),
      ).toThrowError('< Must specify network for ens, uns, or zns >');
    });

    it('should create resolution instance from Zilliqa provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      const resolutionFromZilliqaProvider =
        Resolution.fromZilliqaProvider(provider);
      const resolution = new Resolution({
        sourceConfig: {
          zns: {url: 'https://api.zilliqa.com', network: 'mainnet'},
        },
      });
      expect(
        (
          resolutionFromZilliqaProvider.serviceMap[
            NamingServiceName.ZNS
          ] as unknown as Zns
        ).url,
      ).toEqual(
        (resolution.serviceMap[NamingServiceName.ZNS] as unknown as Zns).url,
      );
      expect(
        (
          resolutionFromZilliqaProvider.serviceMap[
            NamingServiceName.ZNS
          ] as unknown as Zns
        ).network,
      ).toEqual(
        (resolution.serviceMap[NamingServiceName.ZNS] as unknown as Zns)
          .network,
      );
      expect(
        (
          resolutionFromZilliqaProvider.serviceMap[
            NamingServiceName.ZNS
          ] as unknown as Zns
        ).registryAddr,
      ).toEqual(
        (resolution.serviceMap[NamingServiceName.ZNS] as unknown as Zns)
          .registryAddr,
      );
    });

    it('should retrieve record using resolution instance created from Zilliqa provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      const resolution = Resolution.fromZilliqaProvider(provider);
      zns = resolution.serviceMap[NamingServiceName.ZNS] as unknown as Zns;
      const spies = mockAsyncMethods(zns, {
        allRecords: {
          'crypto.ETH.address': '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
        },
      });
      const ethAddress = await resolution.addr('brad.zil', 'ETH');
      expectSpyToBeCalled(spies);
      expect(ethAddress).toBe('0x45b31e01AA6f42F0549aD482BE81635ED3149abb');
    });

    it('provides empty response constant', async () => {
      const response = UnclaimedDomainResponse;
      expect(response.addresses).toEqual({});
      expect(response.meta.owner).toEqual(null);
    });

    describe('.ServiceName', () => {
      it('checks ens service name', () => {
        const resolution = new Resolution();
        const serviceName = resolution.serviceName('domain.eth');
        expect(serviceName).toBe('ENS');
      });

      it('should resolve gundb chat id', async () => {
        const eyes = mockAsyncMethods(uns, {
          get: {
            resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            records: {
              ['gundb.username.value']:
                '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
            },
          },
        });
        const gundb = await resolution.chatId('homecakes.crypto');
        expectSpyToBeCalled(eyes);
        expect(gundb).toBe(
          '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
        );
      });

      describe('.ipfsHash', () => {
        skipItInLive(
          'should prioritize new keys over depricated ones',
          async () => {
            const spies = mockAsyncMethods(uns, {
              get: {
                resolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
                records: {
                  ['dweb.ipfs.hash']: 'new record Ipfs hash',
                  ['ipfs.html.value']: 'old record Ipfs hash',
                },
              },
            });
            const hash = await resolution.ipfsHash(CryptoDomainWithAllRecords);
            expectSpyToBeCalled(spies);
            expect(hash).toBe('new record Ipfs hash');
          },
        );

        skipItInLive(
          'should prioritize browser record key over ipfs.redirect_url one',
          async () => {
            const spies = mockAsyncMethods(uns, {
              get: {
                resolver: '0xA1cAc442Be6673C49f8E74FFC7c4fD746f3cBD0D',
                records: {
                  ['browser.redirect_url']: 'new record redirect url',
                  ['ipfs.redirect_domain.value']: 'old record redirect url',
                },
              },
            });
            const redirectUrl = await resolution.httpUrl(
              CryptoDomainWithAllRecords,
            );
            expectSpyToBeCalled(spies);
            expect(redirectUrl).toBe('new record redirect url');
          },
        );
      });

      describe('serviceName', () => {
        it('checks ens service name', () => {
          const resolution = new Resolution();
          const serviceName = resolution.serviceName('domain.eth');
          expect(serviceName).toBe('ENS');
        });

        it('checks zns service name', () => {
          const resolution = new Resolution();
          const serviceName = resolution.serviceName('domain.zil');
          expect(serviceName).toBe('ZNS');
        });

        it('checks uns service name', () => {
          const resolution = new Resolution();
          const serviceName = resolution.serviceName('domain.crypto');
          expect(serviceName).toBe('UNS');
        });
      });
    });

    describe('.Errors', () => {
      it('checks Resolution#addr error #1', async () => {
        const resolution = new Resolution();
        zns = resolution.serviceMap[NamingServiceName.ZNS] as unknown as Zns;
        const spy = mockAsyncMethods(zns, {
          getRecordsAddresses: undefined,
        });
        await expectResolutionErrorCode(
          resolution.addr('sdncdoncvdinvcsdncs.zil', 'ZIL'),
          ResolutionErrorCode.UnregisteredDomain,
        );
        expectSpyToBeCalled(spy);
      });

      it('checks error for email on brad.zil', async () => {
        const spies = mockAsyncMethods(zns, {
          allRecords: {
            'crypto.BCH.address': 'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
            'crypto.BTC.address': '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
            'crypto.DASH.address': 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
            'crypto.ETH.address': '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
            'crypto.LTC.address': 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
            'crypto.XMR.address':
              '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
            'crypto.ZEC.address': 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
            'crypto.ZIL.address': 'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
            'ipfs.html.value': 'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
            'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
          },
        });
        await expectResolutionErrorCode(
          resolution.email('brad.zil'),
          ResolutionErrorCode.RecordNotFound,
        );
        expectSpyToBeCalled(spies);
      });

      describe('.Namehash errors', () => {
        it('should be invalid domain', async () => {
          const unsInvalidDomain = 'hello..crypto';
          const ensInvalidDomain = 'hello..eth';
          const znsInvalidDomain = 'hello..zil';
          await expectResolutionErrorCode(
            () => resolution.namehash(unsInvalidDomain),
            ResolutionErrorCode.UnsupportedDomain,
          );
          await expectResolutionErrorCode(
            () => resolution.namehash(ensInvalidDomain),
            ResolutionErrorCode.UnsupportedDomain,
          );
          await expectResolutionErrorCode(
            () => resolution.namehash(znsInvalidDomain),
            ResolutionErrorCode.UnsupportedDomain,
          );
        });
      });
    });

    describe('.Records', () => {
      describe('.DNS', () => {
        skipItInLive('getting dns get', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
              records: {
                'dns.ttl': '128',
                'dns.A': '["10.0.0.1","10.0.0.2"]',
                'dns.A.ttl': '90',
                'dns.AAAA': '["10.0.0.120"]',
              },
            },
          });
          const dnsRecords = await resolution.dns('someTestDomain.crypto', [
            DnsRecordType.A,
            DnsRecordType.AAAA,
          ]);
          expectSpyToBeCalled(spies);
          expect(dnsRecords).toStrictEqual([
            {TTL: 90, data: '10.0.0.1', type: 'A'},
            {TTL: 90, data: '10.0.0.2', type: 'A'},
            {TTL: 128, data: '10.0.0.120', type: 'AAAA'},
          ]);
        });

        skipItInLive('should work with others records', async () => {
          const spies = mockAsyncMethods(uns, {
            get: {
              resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
              records: {
                'dns.ttl': '128',
                'dns.A': '["10.0.0.1","10.0.0.2"]',
                'dns.A.ttl': '90',
                'dns.AAAA': '["10.0.0.120"]',
                ['crypto.ETH.address']:
                  '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
                ['crypto.ADA.address']:
                  '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
                ['crypto.ARK.address']:
                  '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
              },
            },
          });
          const dnsRecords = await resolution.dns('someTestDomain.crypto', [
            DnsRecordType.A,
            DnsRecordType.AAAA,
          ]);
          expectSpyToBeCalled(spies);
          expect(dnsRecords).toStrictEqual([
            {TTL: 90, data: '10.0.0.1', type: 'A'},
            {TTL: 90, data: '10.0.0.2', type: 'A'},
            {TTL: 128, data: '10.0.0.120', type: 'AAAA'},
          ]);
        });
      });

      describe('.Metadata', () => {
        it('checks return of email for ergergergerg.zil', async () => {
          const spies = mockAsyncMethods(zns, {
            allRecords: {
              'ipfs.html.hash':
                'QmefehFs5n8yQcGCVJnBMY3Hr6aMRHtsoniAhsM1KsHMSe',
              'ipfs.html.value':
                'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHu',
              'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
              'whois.email.value': 'matt+test@unstoppabledomains.com',
              'whois.for_sale.value': 'true',
            },
          });
          const email = await resolution.email('ergergergerg.zil');
          expectSpyToBeCalled(spies);
          expect(email).toBe('matt+test@unstoppabledomains.com');
        });
      });

      describe('.Crypto', () => {
        it(`domains "brad.crypto" and "Brad.crypto" should return the same results`, async () => {
          const eyes = mockAsyncMethods(uns, {
            get: {
              resolver: '0xBD5F5ec7ed5f19b53726344540296C02584A5237',
              records: {
                ['crypto.ETH.address']:
                  '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
              },
            },
          });
          const capital = await resolution.addr('Brad.crypto', 'eth');
          const lower = await resolution.addr('brad.crypto', 'eth');
          expectSpyToBeCalled(eyes, 2);
          expect(capital).toStrictEqual(lower);
        });
        describe('.multichain', () => {
          it('should work with usdt on different erc20', async () => {
            const erc20Spy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              owner: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              records: {
                ['crypto.USDT.version.ERC20.address']:
                  '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              },
            });
            const erc20 = await resolution.multiChainAddr(
              CryptoDomainWithUsdtMultiChainRecords,
              'usdt',
              'erc20',
            );
            expect(erc20).toBe('0xe7474D07fD2FA286e7e0aa23cd107F8379085037');
            expect(erc20Spy).toBeCalled();
          });

          it('should work with usdt tron chain', async () => {
            const tronSpy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              owner: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              records: {
                ['crypto.USDT.version.TRON.address']:
                  'TNemhXhpX7MwzZJa3oXvfCjo5pEeXrfN2h',
              },
            });
            const tron = await resolution.multiChainAddr(
              CryptoDomainWithUsdtMultiChainRecords,
              'usdt',
              'tron',
            );
            expect(tron).toBe('TNemhXhpX7MwzZJa3oXvfCjo5pEeXrfN2h');
            expect(tronSpy).toBeCalled();
          });

          it('should work with usdt omni chain', async () => {
            const omniSpy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              owner: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              records: {
                ['crypto.USDT.version.OMNI.address']:
                  '19o6LvAdCPkjLi83VsjrCsmvQZUirT4KXJ',
              },
            });
            const omni = await resolution.multiChainAddr(
              CryptoDomainWithUsdtMultiChainRecords,
              'usdt',
              'omni',
            );
            expect(omni).toBe('19o6LvAdCPkjLi83VsjrCsmvQZUirT4KXJ');
            expect(omniSpy).toBeCalled();
          });

          it('should work with usdt eos chain', async () => {
            const eosSpy = mockAsyncMethod(uns, 'get', {
              resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
              owner: '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
              records: {
                ['crypto.USDT.version.EOS.address']: 'letsminesome',
              },
            });
            const eos = await resolution.multiChainAddr(
              CryptoDomainWithUsdtMultiChainRecords,
              'usdt',
              'eos',
            );
            expect(eosSpy).toBeCalled();
            expect(eos).toBe('letsminesome');
          });
        });
      });

      describe('.Providers', () => {
        it('should work with web3HttpProvider', async () => {
          // web3-providers-http has problems with type definitions
          // We still prefer everything to be statically typed on our end for better mocking
          const provider = new (Web3HttpProvider as any)(
            protocolLink(),
          ) as Web3HttpProvider.HttpProvider;
          // mock the send function with different implementations (each should call callback right away with different answers)
          const eye = mockAsyncMethod(
            provider,
            'send',
            (payload: JsonRpcPayload, callback) => {
              const result = caseMock(
                payload.params?.[0],
                RpcProviderTestCases,
              );
              callback &&
                callback(null, {
                  jsonrpc: '2.0',
                  id: 1,
                  result,
                });
            },
          );
          const resolution = Resolution.fromWeb3Version1Provider(provider, {
            uns: {network: 'rinkeby'},
          });
          const ethAddress = await resolution.addr('brad.crypto', 'ETH');

          // expect each mock to be called at least once.
          expectSpyToBeCalled([eye]);
          expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
        });

        it('should work with webSocketProvider', async () => {
          // web3-providers-ws has problems with type definitions
          // We still prefer everything to be statically typed on our end for better mocking
          const provider = new (Web3WsProvider as any)(
            protocolLink(ProviderProtocol.wss),
          ) as Web3WsProvider.WebsocketProvider;
          const eye = mockAsyncMethod(provider, 'send', (payload, callback) => {
            const result = caseMock(payload.params?.[0], RpcProviderTestCases);
            callback(null, {
              jsonrpc: '2.0',
              id: 1,
              result,
            });
          });

          const resolution = Resolution.fromWeb3Version1Provider(provider, {
            uns: {network: 'rinkeby'},
          });
          const ethAddress = await resolution.addr('brad.crypto', 'ETH');
          provider.disconnect(1000, 'end of test');
          expectSpyToBeCalled([eye]);
          expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
        });

        it('should work for ethers jsonrpc provider', async () => {
          const provider = new JsonRpcProvider(
            protocolLink(ProviderProtocol.http),
            'rinkeby',
          );
          const resolution = Resolution.fromEthersProvider(provider, {
            uns: {network: 'rinkeby'},
          });
          const eye = mockAsyncMethod(provider, 'call', (params) =>
            Promise.resolve(caseMock(params, RpcProviderTestCases)),
          );
          const ethAddress = await resolution.addr('brad.crypto', 'ETH');
          expectSpyToBeCalled([eye]);
          expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
        });

        it('should work with ethers default provider', async () => {
          const provider = new InfuraProvider(
            'rinkeby',
            '213fff28936343858ca9c5115eff1419',
          );

          const eye = mockAsyncMethod(provider, 'call', (params) =>
            Promise.resolve(caseMock(params, RpcProviderTestCases)),
          );
          const resolution = Resolution.fromEthersProvider(provider, {
            uns: {network: 'rinkeby'},
          });
          const ethAddress = await resolution.addr('brad.crypto', 'eth');
          expectSpyToBeCalled([eye]);
          expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
        });

        it('should work with web3@0.20.7 provider', async () => {
          const provider = new Web3V027Provider(
            protocolLink(ProviderProtocol.http),
            5000,
            null,
            null,
            null,
          );
          const eye = mockAsyncMethod(
            provider,
            'sendAsync',
            (payload: JsonRpcPayload, callback: any) => {
              const result = caseMock(
                payload.params?.[0],
                RpcProviderTestCases,
              );
              callback(undefined, {
                jsonrpc: '2.0',
                id: 1,
                result,
              });
            },
          );
          const resolution = Resolution.fromWeb3Version0Provider(provider, {
            uns: {network: 'rinkeby'},
          });
          const ethAddress = await resolution.addr('brad.crypto', 'eth');
          expectSpyToBeCalled([eye]);
          expect(ethAddress).toBe('0x8aaD44321A86b170879d7A244c1e8d360c99DdA8');
        });

        describe('.All-get', () => {
          it('should be able to get logs with ethers default provider', async () => {
            const provider = new InfuraProvider(
              'rinkeby',
              '213fff28936343858ca9c5115eff1419',
            );

            const eye = mockAsyncMethod(provider, 'call', (params) =>
              Promise.resolve(caseMock(params, RpcProviderTestCases)),
            );
            const eye2 = mockAsyncMethod(provider, 'getLogs', (params) =>
              Promise.resolve(caseMock(params, RpcProviderTestCases)),
            );

            const resolution = Resolution.fromEthersProvider(provider, {
              uns: {network: 'rinkeby'},
            });
            const resp = await resolution.allRecords('brad.crypto');
            expectSpyToBeCalled([eye], 2);
            expectSpyToBeCalled([eye2], 2);
            expect(resp).toMatchObject({
              'gundb.username.value':
                '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
              'ipfs.html.value':
                'QmdyBw5oTgCtTLQ18PbDvPL8iaLoEPhSyzD91q9XmgmAjb',
              'ipfs.redirect_domain.value':
                'https://abbfe6z95qov3d40hf6j30g7auo7afhp.mypinata.cloud/ipfs/Qme54oEzRkgooJbCDr78vzKAWcv6DDEZqRhhDyDtzgrZP6',
              'crypto.ETH.address':
                '0x8aaD44321A86b170879d7A244c1e8d360c99DdA8',
              'gundb.public_key.value':
                'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
              'crypto.BTC.address':
                'bc1q359khn0phg58xgezyqsuuaha28zkwx047c0c3y',
            });
          });

          it('should be able to get logs with jsonProvider', async () => {
            const provider = new JsonRpcProvider(
              protocolLink(ProviderProtocol.http),
              'rinkeby',
            );
            const resolution = Resolution.fromEthersProvider(provider, {
              uns: {network: 'rinkeby'},
            });
            const eye = mockAsyncMethod(provider, 'call', (params) =>
              Promise.resolve(caseMock(params, RpcProviderTestCases)),
            );
            const eye2 = mockAsyncMethod(provider, 'getLogs', (params) => {
              // console.log({params, response: caseMock(params, RpcProviderTestCases)});
              return Promise.resolve(caseMock(params, RpcProviderTestCases));
            });

            const resp = await resolution.allRecords('brad.crypto');
            expectSpyToBeCalled([eye], 2);
            expectSpyToBeCalled([eye2], 2);
            expect(resp).toMatchObject({
              'gundb.username.value':
                '0x8912623832e174f2eb1f59cc3b587444d619376ad5bf10070e937e0dc22b9ffb2e3ae059e6ebf729f87746b2f71e5d88ec99c1fb3c7c49b8617e2520d474c48e1c',
              'ipfs.html.value':
                'QmdyBw5oTgCtTLQ18PbDvPL8iaLoEPhSyzD91q9XmgmAjb',
              'ipfs.redirect_domain.value':
                'https://abbfe6z95qov3d40hf6j30g7auo7afhp.mypinata.cloud/ipfs/Qme54oEzRkgooJbCDr78vzKAWcv6DDEZqRhhDyDtzgrZP6',
              'crypto.ETH.address':
                '0x8aaD44321A86b170879d7A244c1e8d360c99DdA8',
              'gundb.public_key.value':
                'pqeBHabDQdCHhbdivgNEc74QO-x8CPGXq4PKWgfIzhY.7WJR5cZFuSyh1bFwx0GWzjmrim0T5Y6Bp0SSK0im3nI',
              'crypto.BTC.address':
                'bc1q359khn0phg58xgezyqsuuaha28zkwx047c0c3y',
            });
          });

          it('should get standard keys from legacy resolver', async () => {
            // There are no legacy providers on testnet
            const provider = new InfuraProvider(
              'mainnet',
              '213fff28936343858ca9c5115eff1419',
            );
            const eye = mockAsyncMethod(provider, 'call', (params) =>
              Promise.resolve(caseMock(params, RpcProviderTestCases)),
            );

            const resolution = Resolution.fromEthersProvider(provider, {
              uns: {network: 'mainnet'},
            });
            const resp = await resolution.allRecords('monmouthcounty.crypto');

            expectSpyToBeCalled([eye], 2);
            expect(resp).toMatchObject({
              'crypto.BTC.address': '3NwuV8nVT2VKbtCs8evChdiW6kHTHcVpdn',
              'crypto.ETH.address':
                '0x1C42088b82f6Fa5fB883A14240C4E066dDFf1517',
              'crypto.LTC.address': 'MTnTNwKikiMi97Teq8XQRabL9SZ4HjnKNB',
              'crypto.ADA.address':
                'DdzFFzCqrhsfc3MQvjsLr9BHkaFYeE7BotyTATdETRoSPj6QPiotK4xpcFZk66KVmtr87tvUFTcbTHZRkcdbMR5Ss6jCfzCVtFRMB7WE',
              'ipfs.html.value':
                'QmYqX8D8SkaF5YcpaWMyi5xM43UEteFiSNKYsjLcdvCWud',
              'ipfs.redirect_domain.value':
                'https://abbfe6z95qov3d40hf6j30g7auo7afhp.mypinata.cloud/ipfs/QmYqX8D8SkaF5YcpaWMyi5xM43UEteFiSNKYsjLcdvCWud',
            });
          });
        });

        it('should get all records using custom networks', async () => {
          const resolution = new Resolution({
            sourceConfig: {
              uns: {
                network: 'custom',
                proxyReaderAddress:
                  '0xa6E7cEf2EDDEA66352Fd68E5915b60BDbb7309f5',
                url: 'https://mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
              },
              zns: {
                network: 'custom',
                registryAddress: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
                url: 'https://api.zilliqa.com',
              },
            },
          });
          const uns = resolution.serviceMap['UNS'] as unknown as Uns;
          const zns = resolution.serviceMap['ZNS'] as unknown as Zns;
          const unsAllRecordsMock = mockAsyncMethods(uns, {
            getStartingBlock: undefined,
            resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
            getStandardRecords: {
              'crypto.ETH.address':
                '0x8aaD44321A86b170879d7A244c1e8d360c99DdA8',
            },
          });
          const unsGetNewKeyMock = mockAsyncMethod(uns, 'getNewKeyEvents', []);
          const znsAllRecordsMock = mockAsyncMethods(zns, {
            resolver: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
            getResolverRecords: {
              'crypto.ZIL.address':
                'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
            },
          });
          const znsRecords = await resolution.allRecords('brad.zil');
          const unsRecords = await resolution.allRecords('brad.crypto');

          expectSpyToBeCalled(znsAllRecordsMock);
          expectSpyToBeCalled(unsAllRecordsMock);
          expect(unsRecords['crypto.ETH.address']).toEqual(
            '0x8aaD44321A86b170879d7A244c1e8d360c99DdA8',
          );
          expect(znsRecords['crypto.ZIL.address']).toEqual(
            'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
          );
          if (isLive()) {
            expect(unsGetNewKeyMock).toBeCalledWith(
              expect.any(EthereumContract),
              resolution.namehash('brad.crypto'),
              '0x99a587',
            );
          } else {
            expect(unsGetNewKeyMock).toBeCalledWith(
              expect.any(EthereumContract),
              resolution.namehash('brad.crypto'),
              'earliest',
            );
          }
        });
      });

      describe('.Dweb', () => {
        describe('.IPFS', () => {
          it('checks return of IPFS hash for brad.zil', async () => {
            const spies = mockAsyncMethods(zns, {
              allRecords: {
                'crypto.BCH.address':
                  'qrq4sk49ayvepqz7j7ep8x4km2qp8lauvcnzhveyu6',
                'crypto.BTC.address': '1EVt92qQnaLDcmVFtHivRJaunG2mf2C3mB',
                'crypto.DASH.address': 'XnixreEBqFuSLnDSLNbfqMH1GsZk7cgW4j',
                'crypto.ETH.address':
                  '0x45b31e01AA6f42F0549aD482BE81635ED3149abb',
                'crypto.LTC.address': 'LetmswTW3b7dgJ46mXuiXMUY17XbK29UmL',
                'crypto.XMR.address':
                  '447d7TVFkoQ57k3jm3wGKoEAkfEym59mK96Xw5yWamDNFGaLKW5wL2qK5RMTDKGSvYfQYVN7dLSrLdkwtKH3hwbSCQCu26d',
                'crypto.ZEC.address': 't1h7ttmQvWCSH1wfrcmvT4mZJfGw2DgCSqV',
                'crypto.ZIL.address':
                  'zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj',
                'ipfs.html.value':
                  'QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK',
                'ipfs.redirect_domain.value': 'www.unstoppabledomains.com',
              },
            });
            const hash = await resolution.ipfsHash('brad.zil');
            expectSpyToBeCalled(spies);
            expect(hash).toBe('QmVaAtQbi3EtsfpKoLzALm6vXphdi2KjMgxEDKeGg6wHuK');
          });
        });

        describe('.Gundb', () => {
          it('should resolve gundb chat id', async () => {
            const eyes = mockAsyncMethods(uns, {
              get: {
                resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
                records: {
                  ['gundb.username.value']:
                    '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
                },
              },
            });
            const gundb = await resolution.chatId('homecakes.crypto');
            expectSpyToBeCalled(eyes);
            expect(gundb).toBe(
              '0x47992daf742acc24082842752fdc9c875c87c56864fee59d8b779a91933b159e48961566eec6bd6ce3ea2441c6cb4f112d0eb8e8855cc9cf7647f0d9c82f00831c',
            );
          });
        });
      });

      describe('.Verifications', () => {
        describe('.Twitter', () => {
          it('should return verified twitter handle', async () => {
            const readerSpies = mockAsyncMethods(uns, {
              get: {
                resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
                owner: '0x499dd6d875787869670900a2130223d85d4f6aa7',
                records: {
                  ['validation.social.twitter.username']:
                    '0x01882395ce631866b76f43535843451444ef4a8ff44db0a9432d5d00658a510512c7519a87c78ba9cad7553e26262ada55c254434a1a3784cd98d06fb4946cfb1b',
                  ['social.twitter.username']: 'Marlene12Bob',
                },
              },
            });
            const twitterHandle = await resolution.twitter(
              CryptoDomainWithTwitterVerification,
            );
            expectSpyToBeCalled(readerSpies);
            expect(twitterHandle).toBe('Marlene12Bob');
          });

          it('should throw unsupported method', async () => {
            const resolution = new Resolution();
            await expectResolutionErrorCode(
              resolution.twitter('ryan.zil'),
              ResolutionErrorCode.UnsupportedMethod,
            );
          });
        });
      });
    });
  });

  describe('.registryAddress', () => {
    it('should return zns mainnet registry address', async () => {
      const registryAddress = await resolution.registryAddress('testi.zil');
      expect(registryAddress).toBe(
        'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
      );
    });

    it('should return cns mainnet registry address #1', async () => {
      const spies = mockAsyncMethods(uns, {
        registryAddress: UnsConfig.networks[4].contracts.CNSRegistry.address,
      });
      const registryAddress = await resolution.registryAddress('testi.crypto');
      expectSpyToBeCalled(spies);
      expect(registryAddress).toBe(
        UnsConfig.networks[4].contracts.CNSRegistry.address,
      );
    });

    it('should return uns mainnet registry address', async () => {
      const spies = mockAsyncMethods(uns, {
        registryAddress: UnsConfig.networks[4].contracts.UNSRegistry.address,
      });
      const registryAddress = await resolution.registryAddress('testi.888');
      expectSpyToBeCalled(spies);
      expect(registryAddress).toBe(
        UnsConfig.networks[4].contracts.UNSRegistry.address,
      );
    });
  });

  describe('.records', () => {
    it('works', async () => {
      const eyes = mockAsyncMethods(uns, {
        get: {
          owner: '0x6EC0DEeD30605Bcd19342f3c30201DB263291589',
          resolver: '0x878bC2f3f717766ab69C0A5f9A6144931E61AEd3',
          records: {
            'crypto.ADA.address':
              'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
            'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
          },
        },
      });
      expect(
        await resolution.records(CryptoDomainWithAllRecords, [
          'crypto.ADA.address',
          'crypto.ETH.address',
        ]),
      ).toEqual({
        'crypto.ADA.address':
          'DdzFFzCqrhssjmxkChyAHE9MdHJkEc4zsZe7jgum6RtGzKLkUanN1kPZ1ipVPBLwVq2TWrhmPsAvArcr47Pp1VNKmZTh6jv8ctAFVCkj',
        'crypto.ETH.address': '0xe7474D07fD2FA286e7e0aa23cd107F8379085037',
      });
      expectSpyToBeCalled([...eyes]);
    });
  });

  describe('.isRegistered', () => {
    it('should return true', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
          records: {
            ['ipfs.html.value']:
              'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          },
        },
      });
      const isRegistered = await resolution.isRegistered('brad.crypto');
      expectSpyToBeCalled(spies);
      expect(isRegistered).toBe(true);
    });

    it('should return false', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          owner: '',
          resolver: '',
          records: {},
        },
      });
      const isRegistered = await resolution.isRegistered(
        'thisdomainisdefinitelynotregistered123.crypto',
      );
      expectSpyToBeCalled(spies);
      expect(isRegistered).toBe(false);
    });

    it('should return true', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
      });
      const isRegistered = await resolution.isRegistered('brad.zil');
      expectSpyToBeCalled(spies);
      expect(isRegistered).toBe(true);
    });

    it('should return false', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [''],
      });
      const isRegistered = await resolution.isRegistered(
        'thisdomainisdefinitelynotregistered123.zil',
      );
      expectSpyToBeCalled(spies);
      expect(isRegistered).toBe(false);
    });
  });

  describe('.isAvailable', () => {
    it('should return false', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          owner: '0x58cA45E932a88b2E7D0130712B3AA9fB7c5781e2',
          resolver: '0x95AE1515367aa64C462c71e87157771165B1287A',
          records: {
            ['ipfs.html.value']:
              'QmQ38zzQHVfqMoLWq2VeiMLHHYki9XktzXxLYTWXt8cydu',
          },
        },
      });
      const isAvailable = await resolution.isAvailable('brad.crypto');
      expectSpyToBeCalled(spies);
      expect(isAvailable).toBe(false);
    });

    it('should return true', async () => {
      const spies = mockAsyncMethods(uns, {
        get: {
          owner: '',
          resolver: '',
          records: {},
        },
      });
      const isAvailable = await resolution.isAvailable(
        'qwdqwdjkqhdkqdqwjd.crypto',
      );
      expectSpyToBeCalled(spies);
      expect(isAvailable).toBe(true);
    });

    it('should return false', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
      });
      const isAvailable = await resolution.isAvailable('brad.zil');
      expectSpyToBeCalled(spies);
      expect(isAvailable).toBe(false);
    });

    it('should return true', async () => {
      const spies = mockAsyncMethods(zns, {
        getRecordsAddresses: [''],
      });
      const isAvailable = await resolution.isAvailable('ryan.zil');
      expectSpyToBeCalled(spies);
      expect(isAvailable).toBe(true);
    });
  });

  describe('.namehash', () => {
    it('brad.crypto', () => {
      const expectedNamehash =
        '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9';
      const namehash = resolution.namehash('brad.crypto');
      expect(namehash).toEqual(expectedNamehash);
    });

    it('brad.zil', () => {
      const expectedNamehash =
        '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787';
      const namehash = resolution.namehash('brad.zil');
      expect(namehash).toEqual(expectedNamehash);
    });

    it('brad.eth', () => {
      const expectedNamehash =
        '0xe2cb672a04d6270338f15a428216ca714514dc01fdbdd76e97038a8d4080e01c';
      const namehash = resolution.namehash('brad.eth');
      expect(namehash).toEqual(expectedNamehash);
    });
  });

  describe('.childhash', () => {
    it('brad.crypto', () => {
      const expectedNamehash =
        '0x756e4e998dbffd803c21d23b06cd855cdc7a4b57706c95964a37e24b47c10fc9';
      const namehash = resolution.childhash(
        '0x0f4a10a4f46c288cea365fcf45cccf0e9d901b945b9829ccdb54c10dc3cb7a6f',
        'brad',
        NamingServiceName.UNS,
      );
      expect(namehash).toEqual(expectedNamehash);
    });

    it('brad.zil', () => {
      const expectedNamehash =
        '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787';
      const namehash = resolution.childhash(
        '0x9915d0456b878862e822e2361da37232f626a2e47505c8795134a95d36138ed3',
        'brad',
        NamingServiceName.ZNS,
      );
      expect(namehash).toEqual(expectedNamehash);
    });

    it('brad.eth', () => {
      const expectedNamehash =
        '0x96a270260d2f9e37845776c17a47ae9b8b7e7e576b2365afd2e7f30f43e9bb49';
      const namehash = resolution.childhash(
        '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
        'beresnev',
        NamingServiceName.ENS,
      );
      expect(namehash).toEqual(expectedNamehash);
    });

    it('should throw error if service is not supported', () => {
      expect(() =>
        resolution.childhash(
          '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
          'beresnev',
          'COM' as NamingServiceName,
        ),
      ).toThrowError('Naming service COM is not supported');
    });
  });
});
