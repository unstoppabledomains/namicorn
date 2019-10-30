import nodeFetch from 'node-fetch';
import Ens from './ens';
import Zns from './zns';
import { Blockchain, NamicornResolution } from './types';
import ResolutionError from './resolutionError';

const DefaultUrl = 'https://unstoppabledomains.com/api/v1';

/**
 * @ignore
 * Node env has special properties stored in process which are not inside the browser env.
 * Multiple checks is to avoid hitting the undefined while going deeper.
 */
const isNode = () => {
  if (typeof process === 'object') {
    if (typeof process.versions === 'object') {
      if (typeof process.versions.node !== 'undefined') {
        return true;
      }
    }
  }
  return false;
};

/** @ignore */
const myFetch = isNode() ? nodeFetch : window.fetch;

/** @ignore Used internaly to set the right user-agent for fetch */
const DefaultUserAgent = isNode()
  ? 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'
  : navigator.userAgent;
/** @ignore */
const version = require('../package.json').version;
/** @ignore */
const CustomUserAgent = `${DefaultUserAgent} namicorn/${version}`;
/** @ignore */
const headers = { 'X-user-agent': CustomUserAgent };

/**
 * Blockchain domain resolution library - Namicorn.
 *
 * @example
 * ```
 * let namicorn = new Namicorn({blockchain: {ens: {url: 'https://mainnet.infura.io', network: 'mainnet'}}});
 * let domain = brad.zil
 * let resolution = namicorn.address(domain);
 * ```
 */
class Namicorn {
  static readonly UNCLAIMED_DOMAIN_RESPONSE: NamicornResolution = {
    addresses: {},
    meta: {
      owner: null, //available domain
      type: '',
      ttl: 0,
    },
  };

  readonly api: string;
  readonly blockchain: Blockchain | boolean;
  /**
   * @ignore
   */
  readonly ens?: Ens;
  /**
   * @ignore
   */
  readonly zns?: Zns;

  /**
   * Namicorn constructor
   * @property {Blockchain} blockchain - main configuration object
   */
  constructor({
    blockchain = true,
    api = DefaultUrl,
  }: { api?: string; blockchain?: Blockchain } = {}) {
    this.api = api.toString();
    this.blockchain = !!blockchain;
    if (blockchain) {
      if (blockchain == true) {
        blockchain = {};
      }
      if (blockchain.ens === undefined) {
        blockchain.ens = true;
      }
      if (blockchain.zns === undefined) {
        blockchain.zns = true;
      }
      if (blockchain.ens) {
        this.ens = new Ens(blockchain.ens);
      }
      if (blockchain.zns) {
        this.zns = new Zns(blockchain.zns);
      }
    }
  }

  /**
   * Resolves the given domain
   * @async
   * @param {string} domain - domain name to be resolved
   * @returns {Promise<NamicornResolution>} - Returns a promise that resolves in an object
   */
  async resolve(domain: string): Promise<NamicornResolution> {
    if (this.blockchain) {
      return await this.resolveUsingBlockchain(domain);
    } else {
      const response = await myFetch(`${this.api}/${domain}`)
      return response.json();
    }
  }

  /**
   * Resolves give domain name to a specific currency address if exists
   * @async
   * @param {string} domain - domain name to be resolved
   * @param {string} currencyTicker - currency ticker like BTC, ETH, ZIL
   * @returns {Promise<string | null>} - A promise that resolves in an address or null
   */
  async address(
    domain: string,
    currencyTicker: string,
  ): Promise<string | null> {
    try {
      return await this.addressOrThrow(domain, currencyTicker);
    } catch (error) {
      if (error instanceof ResolutionError) {
        return null;
      } else {
        throw error;
      }
    }
  }

  /**
   * Resolves given domain to a specific currency address or throws
   * @param domain - domain name
   * @param currencyTicker - currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @throws UNREGISTERED_DOMAIN
   * @throws NOT_REGISTERED_CURRENCY
   */
  async addressOrThrow(
    domain: string,
    currencyTicker: string,
  ): Promise<string> {
    try {
      var data = await this.resolve(domain);
    } catch (err) {
      if (err instanceof ResolutionError) {
        return null;
      } else {
        throw err;
      }
    }
    if (data && !data.meta.owner)
      throw new ResolutionError('UnregisteredDomain', { domain });
    if (data && !data.addresses[currencyTicker.toUpperCase()])
      throw new ResolutionError('UnregisteredCurrency', {
        domain,
        currencyTicker,
      });
    return (data && data.addresses[currencyTicker.toUpperCase()]) || null;
  }

  /**
   * This method is only for ens at the moment. Reverse the ens address to a ens registered domain name
   * @async
   * @param {string} address - address you wish to reverse
   * @param {string} currencyTicker - currency ticker like BTC, ETH, ZIL
   * @returns {Promise<string>} - domain name attached to this address
   */
  async reverse(address: string, currencyTicker: string): Promise<string> {
    return await this.ens.reverse(address, currencyTicker);
  }

  /**
   * Checks if the domain is in valid format
   * @param {string} domain - domain name to be checked
   * @returns {boolean}
   */
  isSupportedDomain(domain: string): boolean {
    return (
      (this.zns && this.zns.isSupportedDomain(domain)) ||
      (this.ens && this.ens.isSupportedDomain(domain))
    );
  }

  /**
   * Checks if the domain is supported by the specified network as well as if it is in valid format
   * @param {string} domain - domain name to be checked
   * @returns {boolean}
   */
  isSupportedDomainInNetwork(domain: string): boolean {
    const method = this.getNamingMethod(domain);
    return method && method.isSupportedNetwork();
  }

  /**
   * @ignore
   */
  private async resolveUsingBlockchain(
    domain: string,
  ): Promise<NamicornResolution> {
    const method = this.getNamingMethod(domain);
    if (!method) throw new ResolutionError('UnsupportedDomain', { domain });
    const result = await method.resolve(domain);
    return result || Namicorn.UNCLAIMED_DOMAIN_RESPONSE;
  }

  /**
   * @ignore
   */
  private getNamingMethod(domain: string): Ens | Zns | undefined {
    const methods = [this.ens, this.zns];
    const method = methods.find(
      method => method && method.isSupportedDomain(domain),
    );
    return method;
  }
}

export { Namicorn, Namicorn as default };