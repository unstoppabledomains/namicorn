import { EtheriumNamingService } from './namingService';
import {
  NamingServiceSource,
  RegistryMap,
  NullAddress,
  NamicornResolution,
} from './types';
import { hash } from 'eth-ens-namehash';
import { default as resolverInterface } from './cns/contract/resolver';
import { default as cnsInterface } from './cns/contract/registry';
import { ResolutionError } from '.';
import { ResolutionErrorCode } from './resolutionError';
import Contract from './utils/contract';

/**
 * Class to support connection with Crypto naming service
 * @param network - network string such as
 * - mainnet
 * - ropsten
 * @param url - main api url such as
 * - https://mainnet.infura.io
 * @param registryAddress - address for a registry contract
 */
export default class Cns extends EtheriumNamingService {
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  /** @ignore */
  private cnsContract: any;
  /** @ignore */
  readonly RegistryMap: RegistryMap = {
    mainnet: '0x608624cA9dacbf78B19232e15f67107Da0AeE715',
  };

  /**
   * Source object describing the network naming service operates on
   * @param source - if specified as a string will be used as main url, if omited then defaults are used
   * @throws ConfigurationError - when either network or url is setup incorrectly
   */
  constructor(source: NamingServiceSource = true) {
    super();
    source = this.normalizeSource(source);
    this.network = source.network as string;
    this.url = source.url;
    if (!this.network) {
      throw new Error('Unspecified network in Namicorn CNS configuration');
    }
    if (!this.url) {
      throw new Error('Unspecified url in Namicorn CNS configuration');
    }
    this.registryAddress = source.registry
      ? source.registry
      : this.RegistryMap[this.network];
    if (this.registryAddress) {
      this.cnsContract = new Contract(
        this.url,
        cnsInterface,
        this.registryAddress,
      );
    }
  }

  /**
   * Checks if the domain is in valid format
   * @param domain - domain name to be checked
   * @returns
   */
  isSupportedDomain(domain: string): boolean {
    return domain.indexOf('.') > 0 && /^.{1,}\.(crypto)$/.test(domain);
  }

  /**
   * Resolves the given domain. [DEPRICATED]
   * @async
   * @param domain - domain name to be resolved
   * @returns- Returns a promise that resolves in an object
   */
  async resolve(domain: string): Promise<NamicornResolution> {
    try {
      this.ensureSupportedDomain(domain);
      var [tokenId, owner, ttl, resolver] = await this.getResolutionMeta(
        domain,
      );
    } catch (err) {
      if (err instanceof ResolutionError) return null;
      throw err;
    }
    const address = await this.fetchAddress(resolver, tokenId, 'ETH');
    return {
      addresses: {
        ETH: address,
      },
      meta: {
        owner,
        type: 'cns',
        ttl,
      },
    };
  }

  /**
   * Produces ENS namehash
   * @param domain - domain to be hashed
   * @return ENS namehash of a domain
   */
  namehash(domain: string): string {
    this.ensureSupportedDomain(domain);
    return hash(domain);
  }

  /**
   * Resolves domain to a specific cryptoAddress
   * @param domain - domain name to be resolved
   * @param currencyTicker currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @returns - A promise that resolves in a string
   */
  async address(domain: string, currencyTicker: string): Promise<string> {
    const [tokenId, _, __, resolver] = await this.getResolutionMeta(domain);
    const addr: string = await this.fetchAddress(
      resolver,
      tokenId,
      currencyTicker,
    );
    if (!addr)
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedCurrency, {
        domain,
        currencyTicker,
      });
    return addr;
  }

  /**
   * @ignore
   * @param resolver - Resolver address
   * @param tokenId - namehash of a domain name
   */
  private async fetchAddress(
    resolver: string,
    tokenId: string,
    coinName?: string,
  ): Promise<string> {
    const resolverContract = new Contract(
      this.url,
      resolverInterface,
      resolver,
    );
    const addrKey = `crypto.${coinName.toUpperCase()}.address`;
    const addr: string = await this.getRecord(resolverContract, 'get', [
      addrKey,
      tokenId,
    ]);
    return addr;
  }

  /** @ignore */
  private getResolver = async (tokenId): Promise<string> =>
    await this.callMethod(this.cnsContract, 'resolverOf', [tokenId]);

  /** @internal */
  async owner(tokenId): Promise<string> {
    return await this.callMethod(this.cnsContract, 'ownerOf', [tokenId]);
  }

  private getTtl = async (
    contract: Contract,
    methodname: string,
    params: any[],
  ): Promise<string> =>
    await this.callMethod(this.cnsContract, methodname, params);

  /** @internal */
  async record(domain: string, key: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const resolver: string = await this.getResolver(tokenId);
    const resolverContract = new Contract(
      this.url,
      resolverInterface,
      resolver,
    );
    const record: string = await this.getRecord(resolverContract, 'get', [
      key,
      tokenId,
    ]);
    // Wrong Record checks
    if (!record || record === '0x' || record == NullAddress)
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: key,
        domain: domain,
      });
    return record;
  }

  /** This is done to make testwriting easy */
  private async getRecord(
    contract: Contract,
    methodname: string,
    params: any[],
  ): Promise<any> {
    return await this.callMethod(contract, methodname, params);
  }

  /**
   * @param domain
   * @retuns Promise that resolves to [tokenId, owner, ttl, resolver]
   */
  private async getResolutionMeta(
    domain: string,
  ): Promise<[string, string, number, string]> {
    const tokenId = this.namehash(domain);
    const owner: string = await this.owner(tokenId);
    const resolver: string = await this.getResolver(tokenId);

    if (!resolver || resolver === NullAddress) {
      if (!owner || owner === NullAddress)
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain,
        });
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain,
      });
    }
    const resolverContract = new Contract(
      this.url,
      resolverInterface,
      resolver,
    );
    const ttl = await this.getTtl(resolverContract, 'get', ['ttl', tokenId]);
    return [tokenId, owner, parseInt(ttl) || 0, resolver];
  }

  /**
   * Internal wrapper for ens method. Used to throw an error when ens is down
   *  @param method - method to be called
   *  @throws ResolutionError -> When blockchain is down
   */
  private async callMethod(
    contract: Contract,
    methodname: string,
    params: any,
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
          method: 'CNS',
        });
      }
      throw error;
    }
  }
}
