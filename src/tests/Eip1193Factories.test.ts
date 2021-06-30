import {HTTPProvider} from '@zilliqa-js/core';
import {ResolutionErrorCode} from '../errors/resolutionError';
import {Eip1993Factories as Eip1193Factories} from '../utils/Eip1993Factories';
import {
  mockAsyncMethods,
  expectSpyToBeCalled,
  expectResolutionErrorCode,
} from './helpers';

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Eip1193Factories', () => {
  describe('fromZilliqaProvider', () => {
    it('should create provider from zilliqa provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      expect(provider).toBeDefined();
    });
    it('should make request from created provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      const eyes = mockAsyncMethods(provider, {
        request: {code: ''},
      });

      const resp = (await provider.request({
        method: 'GetSmartContractCode',
        params: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
      })) as any;
      expectSpyToBeCalled(eyes);
      expect(resp.code).toBeDefined();
    });
    it('should make invalid request from created provider', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      await expectResolutionErrorCode(
        provider.request({
          method: 'InvalidMethod',
          params: ['zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz'],
        }),
        ResolutionErrorCode.ServiceProviderError,
      );
    });
    it('should retrieve record ', async () => {
      const zilliqaProvider = new HTTPProvider('https://api.zilliqa.com');
      const provider = Eip1193Factories.fromZilliqaProvider(zilliqaProvider);
      const eyes = mockAsyncMethods(provider, {
        request: {
          records: {
            '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787':
              {
                argtypes: [],
                arguments: [Array],
                constructor:
                  '0x9611c53be6d1b32058b2747bdececed7e1216793.Record',
              },
          },
        },
      });
      const records = await provider.request({
        method: 'GetSmartContractSubState',
        params: [
          '9611c53BE6d1b32058b2747bdeCECed7e1216793',
          'records',
          [
            '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787',
          ],
        ],
      });
      expectSpyToBeCalled(eyes);
      expect(records).toMatchObject({
        records: {
          '0x5fc604da00f502da70bfbc618088c0ce468ec9d18d05540935ae4118e8f50787':
            {
              argtypes: [],
              constructor: '0x9611c53be6d1b32058b2747bdececed7e1216793.Record',
            },
        },
      });
    });
  });
});
