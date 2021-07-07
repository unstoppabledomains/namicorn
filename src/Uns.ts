import {
  BlockhanNetworkUrlMap,
  UnsSupportedNetwork,
  ProxyReaderMap,
  hasProvider,
  NullAddress,
  EventData,
} from './types';
import {default as proxyReaderAbi} from './contracts/uns/proxyReader';
import {default as registryAbi} from './contracts/uns/registry';
import {default as resolverInterface} from './contracts/uns/resolver';
import ResolutionError, {ResolutionErrorCode} from './errors/resolutionError';
import EthereumContract from './contracts/EthereumContract';
import {
  constructRecords,
  isNullAddress,
  EthereumNetworksInverted,
  EthereumNetworks,
} from './utils';
import {
  UnsSource,
  CryptoRecords,
  DomainData,
  NamingServiceName,
  Provider,
} from './types/publicTypes';
import {isValidTwitterSignature} from './utils/TwitterSignatureValidator';
import UnsConfig from './config/uns-config.json';
import FetchProvider from './FetchProvider';
import {eip137Childhash, eip137Namehash} from './utils/namehash';
import {NamingService} from './NamingService';
import ConfigurationError, {
  ConfigurationErrorCode,
} from './errors/configurationError';
import SupportedKeys from './config/supported-keys.json';
import {Interface} from '@ethersproject/abi';

/**
 * @internal
 */
export default class Uns extends NamingService {
  static readonly ProxyReaderMap: ProxyReaderMap = getProxyReaderMap();

  static readonly UrlMap: BlockhanNetworkUrlMap = {
    1: 'https://mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    4: 'https://rinkeby.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
  };

  readonly name: NamingServiceName = NamingServiceName.UNS;
  readonly network: number;
  readonly url: string | undefined;
  readonly provider: Provider;
  readonly readerContract: EthereumContract;

  constructor(source?: UnsSource) {
    super();
    if (!source) {
      source = {
        url: Uns.UrlMap[1],
        network: 'mainnet',
      };
    }
    this.checkNetworkConfig(source);
    this.network = EthereumNetworks[source.network];
    this.url = source['url'] || Uns.UrlMap[this.network];
    this.provider =
      source['provider'] || new FetchProvider(this.name, this.url!);
    this.readerContract = new EthereumContract(
      proxyReaderAbi,
      source['proxyReaderAddress'] || Uns.ProxyReaderMap[this.network],
      this.provider,
    );
  }

  static async autoNetwork(
    config: {url: string} | {provider: Provider},
  ): Promise<Uns> {
    let provider: Provider;

    if (hasProvider(config)) {
      provider = config.provider;
    } else {
      if (!config.url) {
        throw new ConfigurationError(ConfigurationErrorCode.UnspecifiedUrl, {
          method: NamingServiceName.UNS,
        });
      }
      provider = FetchProvider.factory(NamingServiceName.UNS, config.url);
    }

    const networkId = (await provider.request({
      method: 'net_version',
    })) as number;
    const networkName = EthereumNetworksInverted[networkId];
    if (!networkName || !UnsSupportedNetwork.guard(networkName)) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: NamingServiceName.UNS,
      });
    }
    return new this({network: networkName, provider: provider});
  }

  namehash(domain: string): string {
    if (!this.checkDomain(domain)) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }
    return eip137Namehash(domain);
  }

  childhash(parentHash: string, label: string): string {
    return eip137Childhash(parentHash, label);
  }

  serviceName(): NamingServiceName {
    return this.name;
  }

  async isSupportedDomain(domain: string): Promise<boolean> {
    if (!this.checkDomain(domain)) {
      return false;
    }

    const tld = domain.split('.').pop();
    if (!tld) {
      return false;
    }
    const [exists] = await this.readerContract.call('exists', [
      this.namehash(tld),
    ]);
    return exists;
  }

  async owner(domain: string): Promise<string> {
    return (await this.getVerifiedData(domain)).owner;
  }

  async resolver(domain: string): Promise<string> {
    return (await this.getVerifiedData(domain)).resolver;
  }

  async record(domain: string, key: string): Promise<string> {
    const returnee = (await this.records(domain, [key]))[key];
    if (!returnee) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: key,
        domain,
      });
    }
    return returnee;
  }

  async records(
    domain: string,
    keys: string[],
  ): Promise<Record<string, string>> {
    return (await this.getVerifiedData(domain, keys)).records;
  }

  async allRecords(domain: string): Promise<CryptoRecords> {
    const tokenId = this.namehash(domain);
    const resolver = await this.resolver(domain);

    const resolverContract = new EthereumContract(
      resolverInterface,
      resolver,
      this.provider,
    );
    if (this.isLegacyResolver(resolver)) {
      return await this.getStandardRecords(tokenId);
    }

    return await this.getAllRecords(resolverContract, tokenId);
  }

  async twitter(domain: string): Promise<string> {
    const tokenId = this.namehash(domain);
    const keys = [
      'validation.social.twitter.username',
      'social.twitter.username',
    ];
    const data = await this.getVerifiedData(domain, keys);
    const {records} = data;
    const validationSignature = records['validation.social.twitter.username'];
    const twitterHandle = records['social.twitter.username'];
    if (isNullAddress(validationSignature)) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        recordName: 'validation.social.twitter.username',
      });
    }

    if (!twitterHandle) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        domain,
        recordName: 'social.twitter.username',
      });
    }

    const owner = data.owner;
    if (
      !isValidTwitterSignature({
        tokenId,
        owner,
        twitterHandle,
        validationSignature,
      })
    ) {
      throw new ResolutionError(
        ResolutionErrorCode.InvalidTwitterVerification,
        {
          domain,
        },
      );
    }

    return twitterHandle;
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
    const tokenId = this.namehash(domain);
    const data = await this.get(tokenId, []);

    return !isNullAddress(data.owner);
  }

  async getTokenUri(tokenId: string): Promise<string> {
    try {
      const [tokenUri] = await this.readerContract.call('tokenURI', [tokenId]);
      return tokenUri;
    } catch (error) {
      if (
        error instanceof ResolutionError &&
        error.code === ResolutionErrorCode.ServiceProviderError &&
        error.message === '< execution reverted >'
      ) {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          method: NamingServiceName.UNS,
          methodName: 'getTokenUri',
        });
      }
      throw error;
    }
  }

  async isAvailable(domain: string): Promise<boolean> {
    return !(await this.isRegistered(domain));
  }

  async registryAddress(domainOrNamehash: string): Promise<string> {
    if (
      !this.checkDomain(domainOrNamehash, domainOrNamehash.startsWith('0x'))
    ) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain: domainOrNamehash,
      });
    }
    const namehash = domainOrNamehash.startsWith('0x')
      ? domainOrNamehash
      : this.namehash(domainOrNamehash);
    const [address] = await this.readerContract.call('registryOf', [namehash]);
    if (address === NullAddress) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: domainOrNamehash,
      });
    }
    return address;
  }

  async getDomainFromTokenId(tokenId: string): Promise<string> {
    const registryAddress = await this.registryAddress(tokenId);
    const registryContract = new EthereumContract(
      registryAbi,
      registryAddress,
      this.provider,
    );
    const startingBlock = this.getStartingBlockFromRegistry(registryAddress);
    const newURIEvents = await registryContract.fetchLogs(
      'NewURI',
      tokenId,
      startingBlock,
    );
    if (!newURIEvents || newURIEvents.length === 0) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain: `with tokenId ${tokenId}`,
      });
    }
    const rawData = newURIEvents[newURIEvents.length - 1].data;
    const decoded = Interface.getAbiCoder().decode(['string'], rawData);
    return decoded[decoded.length - 1];
  }

  private getStartingBlockFromRegistry(registryAddress: string): string {
    const contractDetails = Object.values(UnsConfig?.networks).reduce(
      (acc, network) => {
        const contracts = network.contracts;

        return [
          ...acc,
          ...Object.values(contracts).map((c) => ({
            address: c.address,
            deploymentBlock: c.deploymentBlock,
          })),
        ];
      },
      [],
    );

    const contractDetail = contractDetails.find(
      (detail) => detail.address === registryAddress,
    );
    if (!contractDetail || contractDetail?.deploymentBlock === '0x0') {
      return 'earliest';
    }
    return contractDetail.deploymentBlock;
  }

  private async getVerifiedData(
    domain: string,
    keys?: string[],
  ): Promise<DomainData> {
    const tokenId = this.namehash(domain);
    const data = await this.get(tokenId, keys);
    if (isNullAddress(data.resolver)) {
      if (isNullAddress(data.owner)) {
        throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
          domain,
        });
      }
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain,
      });
    }
    return data;
  }

  private async getStandardRecords(tokenId: string): Promise<CryptoRecords> {
    const keys = Object.keys(SupportedKeys.keys);
    return await this.getMany(tokenId, keys);
  }

  private async getAllRecords(
    resolverContract: EthereumContract,
    tokenId: string,
  ): Promise<CryptoRecords> {
    const startingBlock = await this.getStartingBlock(
      resolverContract,
      tokenId,
    );
    const logs = await this.getNewKeyEvents(
      resolverContract,
      tokenId,
      startingBlock || 'earliest',
    );
    const keyTopics = logs.map((event) => event.topics[2]);
    // If there are no NewKey events we want to check the standardRecords
    if (keyTopics.length === 0) {
      return await this.getStandardRecords(tokenId);
    }
    return await this.getManyByHash(tokenId, keyTopics);
  }

  private async getMany(
    tokenId: string,
    keys: string[],
  ): Promise<CryptoRecords> {
    return (await this.get(tokenId, keys)).records;
  }

  private async getManyByHash(
    tokenId: string,
    hashes: string[],
  ): Promise<CryptoRecords> {
    const [keys, values] = (await this.readerContract.call('getManyByHash', [
      hashes,
      tokenId,
    ])) as [string[], string[]];
    return constructRecords(keys, values);
  }

  private async get(tokenId: string, keys: string[] = []): Promise<DomainData> {
    const [resolver, owner, values] = await this.readerContract.call(
      'getData',
      [keys, tokenId],
    );
    return {owner, resolver, records: constructRecords(keys, values)};
  }

  private isLegacyResolver(resolverAddress: string): boolean {
    return this.isWellKnownLegacyResolver(resolverAddress);
  }

  private isWellKnownLegacyResolver(resolverAddress: string): boolean {
    const legacyAddresses =
      UnsConfig?.networks[this.network]?.contracts?.Resolver?.legacyAddresses;
    if (!legacyAddresses || legacyAddresses.length === 0) {
      return false;
    }
    return (
      legacyAddresses.findIndex((address) => {
        return address.toLowerCase() === resolverAddress.toLowerCase();
      }) > -1
    );
  }

  private isUpToDateResolver(resolverAddress: string): boolean {
    const address =
      UnsConfig?.networks[this.network]?.contracts?.Resolver?.address;
    if (!address) {
      return false;
    }
    return address.toLowerCase() === resolverAddress.toLowerCase();
  }

  private async getStartingBlock(
    contract: EthereumContract,
    tokenId: string,
  ): Promise<string | undefined> {
    const defaultStartingBlock =
      UnsConfig?.networks[this.network]?.contracts?.Resolver?.deploymentBlock;
    const logs = await contract.fetchLogs('ResetRecords', tokenId);
    const lastResetEvent = logs[logs.length - 1];
    return lastResetEvent?.blockNumber || defaultStartingBlock;
  }

  private checkDomain(domain: string, passIfTokenID = false): boolean {
    if (passIfTokenID) {
      return true;
    }
    const tokens = domain.split('.');
    return (
      !!tokens.length &&
      tokens[tokens.length - 1] !== 'zil' &&
      !(
        domain === 'eth' ||
        /^[^-]*[^-]*\.(eth|luxe|xyz|kred|addr\.reverse)$/.test(domain)
      ) &&
      tokens.every((v) => !!v.length)
    );
  }

  private async getNewKeyEvents(
    resolverContract: EthereumContract,
    tokenId: string,
    startingBlock: string,
  ): Promise<EventData[]> {
    return resolverContract.fetchLogs('NewKey', tokenId, startingBlock);
  }

  private checkNetworkConfig(source: UnsSource): void {
    if (!source.network) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork, {
        method: this.name,
      });
    }
    if (!UnsSupportedNetwork.guard(source.network)) {
      this.checkCustomNetworkConfig(source);
    }
  }

  private checkCustomNetworkConfig(source: UnsSource): void {
    if (!this.isValidProxyReader(source.proxyReaderAddress)) {
      throw new ConfigurationError(
        ConfigurationErrorCode.InvalidConfigurationField,
        {
          method: this.name,
          field: 'proxyReaderAddress',
        },
      );
    }
    if (!source['url'] && !source['provider']) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: this.name,
          config: 'url or provider',
        },
      );
    }
  }

  private isValidProxyReader(address?: string): boolean {
    if (!address) {
      throw new ConfigurationError(
        ConfigurationErrorCode.CustomNetworkConfigMissing,
        {
          method: this.name,
          config: 'proxyReaderAddress',
        },
      );
    }
    const ethLikePattern = new RegExp('^0x[a-fA-F0-9]{40}$');
    return ethLikePattern.test(address);
  }
}

function getProxyReaderMap(): ProxyReaderMap {
  const map: ProxyReaderMap = {};
  for (const id of Object.keys(UnsConfig.networks)) {
    map[id] =
      UnsConfig.networks[id].contracts.ProxyReader.address.toLowerCase();
  }
  return map;
}
