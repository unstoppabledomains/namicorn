import {RequestArguments} from '../types';
import {
  ConfigurationError,
  ConfigurationErrorCode,
} from '../errors/configurationError';
import ResolutionError, {ResolutionErrorCode} from '../errors/resolutionError';
import {
  Web3Version0Provider,
  Provider,
  Web3Version1Provider,
  JsonRpcResponse,
  EthersProvider,
  ZilliqaProvider,
} from '../types/publicTypes';

export const Eip1993Factories = {
  fromWeb3Version0Provider,
  fromWeb3Version1Provider,
  fromEthersProvider,
  fromZilliqaProvider,
};

/**
 * Create a Provider instance from web3 0.x version provider
 * @param provider - an 0.x version provider from web3 ( must implement sendAsync(payload, callback) )
 * @see https://github.com/ethereum/web3.js/blob/0.20.7/lib/web3/httpprovider.js#L116
 */
function fromWeb3Version0Provider(provider: Web3Version0Provider): Provider {
  if (provider.sendAsync === undefined) {
    throw new ConfigurationError(ConfigurationErrorCode.IncorrectProvider);
  }
  return {
    request: (request: RequestArguments) =>
      new Promise((resolve, reject) => {
        provider.sendAsync(
          {
            jsonrpc: '2.0',
            method: request.method,
            params: wrapArray(request.params),
            id: 1,
          },
          (error: Error | null, result: JsonRpcResponse) => {
            if (error) {
              reject(error);
            }
            if (result.error) {
              reject(
                new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
                  providerMessage: result.error,
                }),
              );
            }
            resolve(result.result);
          },
        );
      }),
  };
}

/**
 * Create a Provider instance from web3 1.x version provider
 * @param provider - an 1.x version provider from web3 ( must implement send(payload, callback) )
 * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L165
 * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-providers-http/src/index.js#L95
 */
function fromWeb3Version1Provider(provider: Web3Version1Provider): Provider {
  if (provider.send === undefined) {
    throw new ConfigurationError(ConfigurationErrorCode.IncorrectProvider);
  }
  return {
    request: (request: RequestArguments) =>
      new Promise((resolve, reject) => {
        provider.send(
          {
            jsonrpc: '2.0',
            method: request.method,
            params: wrapArray(request.params),
            id: 1,
          },
          (error: Error | null, result: JsonRpcResponse) => {
            if (error) {
              reject(error);
            }
            if (result.error) {
              reject(
                new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
                  providerMessage: result.error,
                }),
              );
            }
            resolve(result.result);
          },
        );
      }),
  };
}

/**
 * Creates a Provider instance from a provider that implements Ethers Provider#call interface.
 * This wrapper support only `eth_call` method for now, which is enough for all the current Resolution functionality
 * @param provider - provider object
 * @see https://github.com/ethers-io/ethers.js/blob/v4-legacy/providers/abstract-provider.d.ts#L91
 * @see https://github.com/ethers-io/ethers.js/blob/v5.0.4/packages/abstract-provider/src.ts/index.ts#L224
 * @see https://docs.ethers.io/ethers.js/v5-beta/api-providers.html#jsonrpcprovider-inherits-from-provider
 * @see https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts
 */
function fromEthersProvider(provider: EthersProvider): Provider {
  if (provider.call === undefined) {
    throw new ConfigurationError(ConfigurationErrorCode.IncorrectProvider);
  }
  return {
    request: async (request: RequestArguments) => {
      try {
        switch (request.method) {
        case 'eth_call':
          return await provider.call(request.params![0]);
        case 'eth_getLogs':
          return await provider.getLogs(request.params![0]);
        default:
          throw new ResolutionError(
            ResolutionErrorCode.ServiceProviderError,
            {
              providerMessage: `Unsupported provider method ${request.method}`,
            },
          );
        }
      } catch (error) {
        throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage: error.message,
        });
      }
    },
  };
}

/**
 * Creates a Provider instance from @zilliqa-js/core Provider
 * @param provider - provider object
 */
function fromZilliqaProvider(provider: ZilliqaProvider): Provider {
  if (provider.middleware === undefined || provider.send === undefined) {
    throw new ConfigurationError(ConfigurationErrorCode.IncorrectProvider);
  }
  return {
    request: async (request: RequestArguments) => {
      try {
        const resp = await provider.send(
          request.method,
          ...((request.params as []) || []),
        );
        if (resp.error) {
          throw new Error(resp.error.message);
        }
        return resp.result;
      } catch (error) {
        throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage: error.message,
        });
      }
    },
  };
}

function wrapArray<T>(params: T | T[] = []): T[] {
  return params instanceof Array ? params : [params];
}
