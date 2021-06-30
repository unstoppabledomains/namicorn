import {
  fromBech32Address,
  toBech32Address,
  toChecksumAddress,
} from './utils/znsUtils';
import {isNullAddress, constructRecords} from './utils';
import {Dictionary, ZnsResolution, ZnsSupportedNetwork} from './types';
import {ResolutionError, ResolutionErrorCode} from './errors/resolutionError';
import {
  CryptoRecords,
  Provider,
  ZnsSource,
  NamingServiceName,
} from './types/publicTypes';
import FetchProvider from './FetchProvider';
import {znsChildhash, znsNamehash} from './utils/namehash';
import {NamingService} from './NamingService';
import ConfigurationError, {
  ConfigurationErrorCode,
} from './errors/configurationError';

/**
 * @internal
 */
export default class Zns extends NamingService {
  static readonly UrlMap = {
    1: 'https://api.zilliqa.com',
    333: 'https://dev-api.zilliqa.com',
    111: 'http://localhost:4201',
  };

  static readonly NetworkNameMap = {
    mainnet: 1,
    testnet: 333,
    localnet: 111,
  };

  static readonly RegistryMap = {
    1: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
  };

  readonly name: NamingServiceName = NamingServiceName.ZNS;
  readonly network: number;
  readonly url: string | undefined;
  readonly registryAddr: string;
  readonly provider: Provider;

  constructor(source?: ZnsSource) {
    super();
    if (!source) {
      source = {
        url: Zns.UrlMap[1],
        network: 'mainnet',
      };
    }
    this.checkNetworkConfig(source);
    this.network = Zns.NetworkNameMap[source.network];
    this.url = source['url'] || Zns.UrlMap[this.network];
    this.provider =
      source['provider'] || new FetchProvider(this.name, this.url!);
    this.registryAddr =
      source['registryAddress'] || Zns.RegistryMap[this.network];
    this.checkRegistryAddress(this.registryAddr);
    if (this.registryAddr.startsWith('0x')) {
      this.registryAddr = toBech32Address(this.registryAddr);
    }
  }

  serviceName(): NamingServiceName {
    return this.name;
  }

  async owner(domain: string): Promise<string> {
    const recordAddresses = await this.getRecordsAddresses(domain);
    if (!recordAddresses) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }
    const [ownerAddress] = recordAddresses;
    if (!ownerAddress) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }

    return ownerAddress;
  }

  async resolver(domain: string): Promise<string> {
    const recordsAddresses = await this.getRecordsAddresses(domain);
    if (!recordsAddresses || !recordsAddresses[0]) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: domain,
      });
    }

    const [, resolverAddress] = recordsAddresses;
    if (isNullAddress(resolverAddress)) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain: domain,
      });
    }

    return resolverAddress;
  }

  namehash(domain: string): string {
    if (!this.checkDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
    return znsNamehash(domain);
  }

  childhash(parentHash: string, label: string): string {
    return znsChildhash(parentHash, label);
  }

  async isSupportedDomain(domain: string): Promise<boolean> {
    return this.checkDomain(domain);
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

  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    const records = await this.allRecords(domain);
    return constructRecords(keys, records);
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    const resolverAddress = await this.resolver(domain);
    return await this.getResolverRecords(resolverAddress);
  }

  async twitter(domain: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'twitter',
    });
  }

  async reverse(
    address: string,
    currencyTicker: string,
  ): Promise<string | null> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'reverse',
    });
  }

  async isRegistered(domain: string): Promise<boolean> {
    const recordAddresses = await this.getRecordsAddresses(domain);
    return Boolean(recordAddresses && recordAddresses[0]);
  }

  async getTokenUri(tokenId: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'getTokenUri',
    });
  }

  async isAvailable(domain: string): Promise<boolean> {
    return !(await this.isRegistered(domain));
  }

  async registryAddress(domain: string): Promise<string> {
    return this.registryAddr;
  }

  private async getRecordsAddresses(
    domain: string,
  ): Promise<[string, string] | undefined> {
    if (!this.isSupportedDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }

    const registryRecord = await this.getContractMapValue(
      this.registryAddr,
      'records',
      this.namehash(domain),
    );
    if (!registryRecord) {
      return undefined;
    }
    const [ownerAddress, resolverAddress] = registryRecord.arguments as [
      string,
      string,
    ];
    return [
      ownerAddress.startsWith('0x')
        ? toBech32Address(ownerAddress)
        : ownerAddress,
      resolverAddress,
    ];
  }

  private async getResolverRecords(
    resolverAddress: string,
  ): Promise<ZnsResolution> {
    if (isNullAddress(resolverAddress)) {
      return {};
    }
    const resolver = toChecksumAddress(resolverAddress);
    return ((await this.getContractField(resolver, 'records')) ||
      {}) as Dictionary<string>;
  }

  private async fetchSubState(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const params = [contractAddress.replace('0x', ''), field, keys];
    const method = 'GetSmartContractSubState';
    return await this.provider.request({method, params});
  }

  private async getContractField(
    contractAddress: string,
    field: string,
    keys: string[] = [],
  ): Promise<any> {
    const contractAddr = contractAddress.startsWith('zil1')
      ? fromBech32Address(contractAddress)
      : contractAddress;
    const result = (await this.fetchSubState(contractAddr, field, keys)) || {};
    return result[field];
  }

  private async getContractMapValue(
    contractAddress: string,
    field: string,
    key: string,
  ): Promise<any> {
    const record = await this.getContractField(contractAddress, field, [key]);
    return (record && record[key]) || null;
  }

  private checkDomain(domain: String): boolean {
    const tokens = domain.split('.');
    return (
      !!tokens.length &&
      tokens[tokens.length - 1] === 'zil' &&
      tokens.every((v) => !!v.length)
    );
  }

  private checkNetworkConfig(source: ZnsSource): void {
    if (!source.network) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: NamingServiceName.ZNS,
      });
    }
    if (!ZnsSupportedNetwork.guard(source.network)) {
      this.checkCustomNetworkConfig(source);
    }
  }

  private checkRegistryAddress(address: string): void {
    // Represents both versions of Zilliqa addresses eth-like and bech32 zil-like
    const addressValidator = new RegExp(
      '^0x[a-fA-F0-9]{40}$|^zil1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$',
    );
    if (!addressValidator.test(address)) {
      throw new ConfigurationError(
        ConfigurationErrorCode.InvalidConfigurationField,
        {
          method: this.name,
          field: 'registryAddress',
        },
      );
    }
  }

  private checkCustomNetworkConfig(source: ZnsSource): void {
    if (!source.registryAddress) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: NamingServiceName.ZNS,
          config: 'registryAddress',
        },
      );
    }
    if (!source['url'] && !source['provider']) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: NamingServiceName.ZNS,
          config: 'url or provider',
        },
      );
    }
  }
}
