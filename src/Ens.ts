import {default as ensInterface} from './contracts/ens/ens';
import {default as resolverInterface} from './contracts/ens/resolver';
import {
  BlockhanNetworkUrlMap,
  EnsSupportedNetwork,
  EthCoinIndex,
  hasProvider,
} from './types';
import {ResolutionError, ResolutionErrorCode} from './errors/resolutionError';
import EthereumContract from './contracts/EthereumContract';
import EnsNetworkMap from 'ethereum-ens-network-map';
import {EnsSource, NamingServiceName, Provider} from './types/publicTypes';
import {
  constructRecords,
  EthereumNetworksInverted,
  isNullAddress,
} from './utils';
import FetchProvider from './FetchProvider';
import {eip137Childhash, eip137Namehash} from './utils/namehash';
import {NamingService} from './NamingService';
import ConfigurationError, {
  ConfigurationErrorCode,
} from './errors/configurationError';
import {EthereumNetworks} from './utils';
import {requireOrFail} from './utils/requireOrFail';

/**
 * @internal
 */
export default class Ens extends NamingService {
  static readonly UrlMap: BlockhanNetworkUrlMap = {
    1: 'https://mainnet.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee',
    3: 'https://ropsten.infura.io/v3/d423cf2499584d7fbe171e33b42cfbee',
  };

  readonly name = NamingServiceName.ENS;
  readonly network: number;
  readonly url: string | undefined;
  readonly provider: Provider;
  readonly readerContract: EthereumContract;

  constructor(source?: EnsSource) {
    super();
    if (!source) {
      source = {
        url: Ens.UrlMap[1],
        network: 'mainnet',
      };
    }
    if (!source.network || !EnsSupportedNetwork.guard(source.network)) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: NamingServiceName.ENS,
      });
    }
    this.network = EthereumNetworks[source.network];
    this.url = source['url'] || Ens.UrlMap[this.network];
    this.provider =
      source['provider'] || new FetchProvider(this.name, this.url!);
    const registryAddress =
      source['registryAddress'] || EnsNetworkMap[this.network];
    this.readerContract = new EthereumContract(
      ensInterface,
      registryAddress,
      this.provider,
    );
  }

  static async autoNetwork(
    config: {url: string} | {provider: Provider},
  ): Promise<Ens> {
    let provider: Provider;

    if (hasProvider(config)) {
      provider = config.provider;
    } else {
      if (!config.url) {
        throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedUrl, {
          method: NamingServiceName.ENS,
        });
      }
      provider = FetchProvider.factory(NamingServiceName.ENS, config.url);
    }

    const networkId = (await provider.request({
      method: 'net_version',
    })) as number;
    const networkName = EthereumNetworksInverted[networkId];
    if (!networkName || !EnsSupportedNetwork.guard(networkName)) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: NamingServiceName.ENS,
      });
    }
    return new this({network: networkName, provider: provider});
  }

  serviceName(): NamingServiceName {
    return this.name;
  }

  namehash(domain: string): string {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
    return eip137Namehash(domain);
  }

  childhash(parentHash: string, label: string): string {
    return eip137Childhash(parentHash, label);
  }

  isSupportedDomain(domain: string): boolean {
    return (
      domain === 'eth' ||
      (/^[^-]*[^-]*\.(eth|luxe|xyz|kred|addr\.reverse)$/.test(domain) &&
        domain.split('.').every((v) => !!v.length))
    );
  }

  async owner(domain: string): Promise<string> {
    const namehash = this.namehash(domain);
    return await this.callMethod(this.readerContract, 'owner', [namehash]);
  }

  async resolver(domain: string): Promise<string> {
    const nodeHash = this.namehash(domain);
    const resolverAddr = await this.callMethod(
      this.readerContract,
      'resolver',
      [nodeHash],
    );
    if (isNullAddress(resolverAddr)) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver);
    }
    return resolverAddr;
  }

  async record(domain: string, key: string): Promise<string> {
    const returnee = (await this.records(domain, [key]))[key];
    if (!returnee) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        recordName: key,
      });
    }
    return returnee;
  }

  async records(
    domain: string,
    keys: string[],
  ): Promise<Record<string, string>> {
    const values = await Promise.all(
      keys.map(async (key) => {
        if (key.startsWith('crypto.')) {
          const ticker = key.split('.')[1];
          return await this.addr(domain, ticker);
        }
        if (key === 'ipfs.html.value' || key === 'dweb.ipfs.hash') {
          return await this.getContentHash(domain);
        }
        const ensRecordName = this.fromUDRecordNameToENS(key);
        return await this.getTextRecord(domain, ensRecordName);
      }),
    );
    return constructRecords(keys, values);
  }

  async reverse(
    address: string,
    currencyTicker: string,
  ): Promise<string | null> {
    if (currencyTicker != 'ETH') {
      throw new Error(`Ens doesn't support any currency other than ETH`);
    }

    if (address.startsWith('0x')) {
      address = address.substr(2);
    }

    const reverseAddress = address + '.addr.reverse';
    const nodeHash = this.namehash(reverseAddress);
    const resolverAddress = await this.resolver(reverseAddress).catch(
      (err: ResolutionError) => {
        if (err.code === ResolutionErrorCode.UnspecifiedResolver) {
          return null;
        }
        throw err;
      },
    );

    if (isNullAddress(resolverAddress)) {
      return null;
    }

    const resolverContract = new EthereumContract(
      resolverInterface(resolverAddress, EthCoinIndex),
      resolverAddress,
      this.provider,
    );

    return await this.resolverCallToName(resolverContract, nodeHash);
  }

  /**
   * This was done to make automated tests more configurable
   */
  private resolverCallToName(resolverContract: EthereumContract, nodeHash) {
    return this.callMethod(resolverContract, 'name', [nodeHash]);
  }

  async twitter(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'twitter',
    });
  }

  async allRecords(domain: string): Promise<Record<string, string>> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'allRecords',
    });
  }

  protected getCoinType(currencyTicker: string): string {
    const bip44constants = requireOrFail(
      'bip44-constants',
      'bip44-constants',
      '^8.0.5',
    );
    const formatsByCoinType = requireOrFail(
      '@ensdomains/address-encoder',
      '@ensdomains/address-encoder',
      '>= 0.1.x <= 0.2.x',
    ).formatsByCoinType;
    const coin = bip44constants.findIndex(
      (item) =>
        item[1] === currencyTicker.toUpperCase() ||
        item[2] === currencyTicker.toUpperCase(),
    );
    if (coin < 0 || !formatsByCoinType[coin]) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedCurrency, {
        currencyTicker,
      });
    }

    return coin.toString();
  }

  private fromUDRecordNameToENS(record: string): string {
    const mapper = {
      'ipfs.redirect_domain.value': 'url',
      'browser.redirect_url': 'url',
      'whois.email.value': 'email',
      'gundb.username.value': 'gundb_username',
      'gundb.public_key.value': 'gundb_public_key',
    };
    return mapper[record] || record;
  }

  private async addr(
    domain: string,
    currencyTicker: string,
  ): Promise<string | undefined> {
    const resolver = await this.resolver(domain).catch(
      (err: ResolutionError) => {
        if (err.code !== ResolutionErrorCode.UnspecifiedResolver) {
          throw err;
        }
      },
    );
    if (!resolver) {
      const owner = await this.owner(domain);
      if (isNullAddress(owner)) {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain,
        });
      }
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain,
      });
    }

    const cointType = this.getCoinType(currencyTicker.toUpperCase());
    return await this.fetchAddress(resolver, domain, cointType);
  }

  private async fetchAddress(
    resolver: string,
    domain: string,
    coinType: string,
  ): Promise<string | undefined> {
    const formatsByCoinType = requireOrFail(
      '@ensdomains/address-encoder',
      '@ensdomains/address-encoder',
      '>= 0.1.x <= 0.2.x',
    ).formatsByCoinType;
    const resolverContract = new EthereumContract(
      resolverInterface(resolver, coinType),
      resolver,
      this.provider,
    );
    const nodeHash = this.namehash(domain);
    const addr: string =
      coinType !== EthCoinIndex
        ? await this.callMethod(resolverContract, 'addr', [nodeHash, coinType])
        : await this.callMethod(resolverContract, 'addr', [nodeHash]);
    if (isNullAddress(addr)) {
      return undefined;
    }
    // eslint-disable-next-line no-undef
    const data = Buffer.from(addr.replace('0x', ''), 'hex');
    return formatsByCoinType[coinType].encoder(data);
  }

  private async getTextRecord(domain, key): Promise<string | undefined> {
    const nodeHash = this.namehash(domain);
    const resolver = await this.getResolverContract(domain);
    return await this.callMethod(resolver, 'text', [nodeHash, key]);
  }

  private async getContentHash(domain: string): Promise<string | undefined> {
    const contentHash = requireOrFail('content-hash', 'content-hash', '^2.5.2');
    const nodeHash = this.namehash(domain);
    const resolverContract = await this.getResolverContract(domain);
    const contentHashEncoded = await this.callMethod(
      resolverContract,
      'contenthash',
      [nodeHash],
    );
    const codec = contentHash.getCodec(contentHashEncoded);
    if (codec !== 'ipfs-ns') {
      return undefined;
    }
    return contentHash.decode(contentHashEncoded);
  }

  private async getResolverContract(
    domain: string,
    coinType?: string,
  ): Promise<EthereumContract> {
    const resolverAddress = await this.resolver(domain);
    return new EthereumContract(
      resolverInterface(resolverAddress, coinType),
      resolverAddress,
      this.provider,
    );
  }

  private async callMethod(
    contract: EthereumContract,
    method: string,
    params: (string | string[])[],
  ): Promise<any> {
    const result = await contract.call(method, params);
    return result[0];
  }
}
