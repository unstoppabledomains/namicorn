import NamingService from './namingService';
import ResolutionError, { ResolutionErrorCode } from './resolutionError';
import {
  BlockhanNetworkUrlMap,
  isNullAddress,
  NamingServiceName,
  NamingServiceSource,
  NetworkIdMap,
  SourceDefinition,
} from './types';
import { invert } from './utils';
import Contract from './utils/contract';

/** @internal */
export abstract class EthereumNamingService extends NamingService {
  readonly name: NamingServiceName;
  abstract registryAddress?: string;
  abstract url: string;
  protected abstract getResolver(id: string): Promise<string>;
  protected registryContract: Contract;
  /** @internal */
  readonly NetworkIdMap: NetworkIdMap = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
  };

  readonly UrlMap: BlockhanNetworkUrlMap = {
    mainnet: 'https://mainnet.infura.io',
    ropsten: 'https://ropsten.infura.io',
    kovan: 'https://kovan.infura.io',
    rinkeby: 'https://rinkeby.infura.io',
    goerli: 'https://goerli.infura.io',
  };

  readonly NetworkNameMap = invert(this.NetworkIdMap);

  /**
   * Returns the resolver address of a domain if exists
   * @param domain - domain name
   * @throws ResolutionError with codes UnregisteredDomain or UnspecifiedResolver
   */
  async resolver(domain: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const ownerPromise = this.owner(domain);
    const resolverAddress = await this.getResolver(nodeHash);
    if (!resolverAddress || isNullAddress(resolverAddress)) {
      await this.throwOwnershipError(domain, ownerPromise);
    } else {
      // We don't care about this promise anymore
      // Ensure it doesn't generate a warning if it rejects
      ownerPromise.catch(() => {});
    }
    return resolverAddress;
  }

  /**
   * Look up for network from url provided
   * @param url - main api url for blockchain
   * @returns Network such as:
   *  - mainnet
   *  - testnet
   */
  private networkFromUrl(url: string): string | undefined {
    for (const key in this.NetworkNameMap) {
      if (!this.NetworkNameMap.hasOwnProperty(key)) continue;
      if (url.indexOf(key) >= 0) return key;
    }
  }

  /**
   * Normalizes the source object based on type
   * @internal
   * @param source
   * @returns
   */
  protected normalizeSource(source: NamingServiceSource): SourceDefinition {
    switch (typeof source) {
      case 'boolean': {
        return {
          url: this.UrlMap['mainnet'],
          network: this.networkFromUrl(this.UrlMap['mainnet']),
        };
      }
      case 'string': {
        return {
          url: source as string,
          network: this.networkFromUrl(source as string),
        };
      }
      case 'object': {
        source = { ...source };
        if (typeof source.network == 'number') {
          source.network = this.NetworkIdMap[source.network];
        }
        if (source.registry) {
          source.network = source.network ? source.network : 'mainnet';
          source.url = source.url
            ? source.url
            : `https://${source.network}.infura.io`;
        }
        if (
          source.network &&
          !source.url &&
          this.NetworkNameMap.hasOwnProperty(source.network)
        ) {
          source.url = `https://${source.network}.infura.io`;
        }
        if (source.url && !source.network) {
          source.network = this.networkFromUrl(source.url);
        }
        return source;
      }
    }
  }

  /**
   * Checks if the current network is supported
   * @returns
   */
  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  /**
   * Internal wrapper for ens method. Used to throw an error when ens is down
   *  @param method - method to be called
   *  @throws ResolutionError -> When blockchain is down
   */
  protected async callMethod(
    contract: Contract,
    methodname: string,
    params: string[],
  ): Promise<any> {
    try {
      return await contract.fetchMethod(methodname, params);
    } catch (error) {
      const { message }: { message: string } = error;
      if (
        message.match(/Invalid JSON RPC response/) ||
        message.match(/legacy access request rate exceeded/)
      ) {
        throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
          method: this.name,
        });
      }
      throw error;
    }
  }

  protected buildContract(abi, address) {
    return new Contract(this.name, this.url, abi, address, this.web3Provider);
  }

  protected async throwOwnershipError(
    domain,
    ownerPromise?: Promise<string | null>,
  ) {
    const owner = ownerPromise ? await ownerPromise : await this.owner(domain);
    if (isNullAddress(owner))
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
      domain,
    });
  }
}