import BN from 'bn.js';
import Ens from './Ens';
import Zns from './Zns';
import Uns from './Uns';
import UdApi from './UdApi';
import {
  Api,
  AutoNetworkConfigs,
  CryptoRecords,
  DnsRecord,
  DnsRecordType,
  EthersProvider,
  NamehashOptions,
  NamehashOptionsDefault,
  NamingServiceName,
  Provider,
  ResolutionMethod,
  SourceConfig,
  Web3Version0Provider,
  Web3Version1Provider,
  TokenUriMetadata,
} from './types/publicTypes';
import ResolutionError, {ResolutionErrorCode} from './errors/resolutionError';
import DnsUtils from './utils/DnsUtils';
import {findNamingServiceName, signedInfuraLink} from './utils';
import {Eip1993Factories as Eip1193Factories} from './utils/Eip1993Factories';
import {NamingService} from './NamingService';
import ConfigurationError from './errors/configurationError';
import {ConfigurationErrorCode} from './errors/configurationError';
import Networking from './utils/Networking';

/**
 * Blockchain domain Resolution library - Resolution.
 * @example
 * ```
 * import Resolution from '@unstoppabledomains/resolution';
 *
 * let resolution = new Resolution({ blockchain: {
 *        uns: {
 *           url: "https://mainnet.infura.io/v3/12351245223",
 *           network: "mainnet"
 *        }
 *      }
 *   });
 *
 * let domain = "brad.zil";
 * resolution.addr(domain, "eth").then(addr => console.log(addr));;
 * ```
 */
export default class Resolution {
  /**
   * @internal
   */
  readonly serviceMap: Record<NamingServiceName, NamingService>;

  constructor({sourceConfig = undefined}: {sourceConfig?: SourceConfig} = {}) {
    const ens = isApi(sourceConfig?.ens)
      ? new UdApi(sourceConfig?.ens)
      : new Ens(sourceConfig?.ens);
    const uns = isApi(sourceConfig?.uns)
      ? new UdApi(sourceConfig?.uns)
      : new Uns(sourceConfig?.uns);
    const zns = isApi(sourceConfig?.zns)
      ? new UdApi(sourceConfig?.zns)
      : new Zns(sourceConfig?.zns);
    this.serviceMap = {
      [NamingServiceName.UNS]: uns,
      [NamingServiceName.ZNS]: zns,
      [NamingServiceName.ENS]: ens,
    };
  }

  /**
   * AutoConfigure the blockchain network between different testnets for ENS and UNS
   * We make a "net_version" JSON RPC call to the blockchain either via url or with the help of given provider.
   * @param sourceConfig - configuration object for ens and uns
   * @returns configured Resolution object
   */
  static async autoNetwork(
    sourceConfig: AutoNetworkConfigs,
  ): Promise<Resolution> {
    const resolution = new this();
    if (!sourceConfig.uns && !sourceConfig.ens) {
      throw new ConfigurationError(ConfigurationErrorCode.UnsupportedNetwork);
    }

    if (sourceConfig.uns) {
      resolution.serviceMap[NamingServiceName.UNS] = await Uns.autoNetwork(
        sourceConfig.uns,
      );
    }

    if (sourceConfig.ens) {
      resolution.serviceMap[NamingServiceName.ENS] = await Ens.autoNetwork(
        sourceConfig.ens,
      );
    }

    return resolution;
  }

  /**
   * Creates a resolution with configured infura id for ens and uns
   * @param infura - infura project id
   * @param networks - an optional object that describes what network to use when connecting ENS or UNS default is mainnet
   */
  static infura(
    infura: string,
    networks?: {
      ens?: {
        network: string;
      };
      uns?: {
        network: string;
      };
    },
  ): Resolution {
    return new this({
      sourceConfig: {
        ens: {
          url: signedInfuraLink(infura, networks?.ens?.network),
          network: networks?.ens?.network || 'mainnet',
        },
        uns: {
          url: signedInfuraLink(infura, networks?.uns?.network),
          network: networks?.uns?.network || 'mainnet',
        },
      },
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param provider - any provider compatible with EIP-1193
   * @param networks - an object that describes what network to use when connecting ENS, UNS, or ZNS default is mainnet
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromResolutionProvider(
    provider: Provider,
    networks: {
      ens?: {
        network: string;
      };
      uns?: {
        network: string;
      };
      zns?: {
        network: string;
      };
    },
  ): Resolution {
    if (networks.ens || networks.uns) {
      return this.fromEthereumEip1193Provider(provider, networks);
    }
    if (networks.zns) {
      return this.fromZilliqaProvider(provider, networks);
    }
    throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
      providerMessage: 'Must specify network for ens, uns, or zns',
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param provider - any provider compatible with EIP-1193
   * @param networks - an optional object that describes what network to use when connecting ENS or UNS default is mainnet
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromEthereumEip1193Provider(
    provider: Provider,
    networks?: {
      ens?: {
        network: string;
      };
      uns?: {
        network: string;
      };
    },
  ): Resolution {
    return new this({
      sourceConfig: {
        ens: {provider, network: networks?.ens?.network || 'mainnet'},
        uns: {provider, network: networks?.uns?.network || 'mainnet'},
      },
    });
  }

  /**
   * Creates a resolution instance with configured provider
   * @param provider - any provider compatible with EIP-1193
   * @param networks - an optional object that describes what network to use when connecting ZNS default is mainnet
   * @see https://eips.ethereum.org/EIPS/eip-1193
   */
  static fromZilliqaProvider(
    provider: Provider,
    networks?: {
      zns?: {
        network: string;
      };
    },
  ): Resolution {
    return new this({
      sourceConfig: {
        zns: {provider, network: networks?.zns?.network || 'mainnet'},
      },
    });
  }

  /**
   * Create a resolution instance from web3 0.x version provider
   * @param provider - an 0.x version provider from web3 ( must implement sendAsync(payload, callback) )
   * @param networks - Ethereum network configuration
   * @see https://github.com/ethereum/web3.js/blob/0.20.7/lib/web3/httpprovider.js#L116
   */
  static fromWeb3Version0Provider(
    provider: Web3Version0Provider,
    networks?: {
      ens?: {
        network: string;
      };
      uns?: {
        network: string;
      };
    },
  ): Resolution {
    return this.fromEthereumEip1193Provider(
      Eip1193Factories.fromWeb3Version0Provider(provider),
      networks,
    );
  }

  /**
   * Create a resolution instance from web3 1.x version provider
   * @param provider - an 1.x version provider from web3 ( must implement send(payload, callback) )
   * @param networks - an optional object that describes what network to use when connecting ENS or UNS default is mainnet
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L165
   * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-providers-http/src/index.js#L95
   */
  static fromWeb3Version1Provider(
    provider: Web3Version1Provider,
    networks?: {
      ens?: {
        network: string;
      };
      uns?: {
        network: string;
      };
    },
  ): Resolution {
    return this.fromEthereumEip1193Provider(
      Eip1193Factories.fromWeb3Version1Provider(provider),
      networks,
    );
  }

  /**
   * Creates instance of resolution from provider that implements Ethers Provider#call interface.
   * This wrapper support only `eth_call` method for now, which is enough for all the current Resolution functionality
   * @param provider - provider object
   * @param networks - an optional object that describes what network to use when connecting ENS or UNS default is mainnet
   * @see https://github.com/ethers-io/ethers.js/blob/v4-legacy/providers/abstract-provider.d.ts#L91
   * @see https://github.com/ethers-io/ethers.js/blob/v5.0.4/packages/abstract-provider/src.ts/index.ts#L224
   * @see https://docs.ethers.io/ethers.js/v5-beta/api-providers.html#jsonrpcprovider-inherits-from-provider
   * @see https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts
   */
  static fromEthersProvider(
    provider: EthersProvider,
    networks?: {
      ens?: {
        network: string;
      };
      uns?: {
        network: string;
      };
    },
  ): Resolution {
    return this.fromEthereumEip1193Provider(
      Eip1193Factories.fromEthersProvider(provider),
      networks,
    );
  }

  /**
   * Resolves given domain name to a specific currency address if exists
   * @async
   * @param domain - domain name to be resolved
   * @param ticker - currency ticker like BTC, ETH, ZIL
   * @throws [[ResolutionError]] if address is not found
   * @returns A promise that resolves in an address
   */
  async addr(domain: string, ticker: string): Promise<string> {
    return await this.record(domain, `crypto.${ticker.toUpperCase()}.address`);
  }

  /**
   * Read multi-chain currency address if exists
   * @async
   * @param domain - domain name to be resolved
   * @param ticker - currency ticker (USDT, FTM, etc.)
   * @param chain - chain version, usually means blockchain ( ERC20, BEP2, OMNI, etc. )
   * @throws [[ResolutionError]] if address is not found
   * @returns A promise that resolves in an adress
   */
  async multiChainAddr(
    domain: string,
    ticker: string,
    chain: string,
  ): Promise<string> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    if (method.serviceName() === NamingServiceName.ENS) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
        methodName: NamingServiceName.ENS,
        domain,
      });
    }

    const recordKey = `crypto.${ticker.toUpperCase()}.version.${chain.toUpperCase()}.address`;
    return await method.record(domain, recordKey);
  }

  /**
   * Resolves given domain name to a verified twitter handle
   * @async
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]] if twitter is not found
   * @returns A promise that resolves in a verified twitter handle
   */
  async twitter(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return method.twitter(domain);
  }

  /**
   * Resolve a chat id from the domain record
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]]
   * @returns A promise that resolves in chatId
   */
  async chatId(domain: string): Promise<string> {
    return await this.record(domain, 'gundb.username.value');
  }

  /**
   * Resolve a gundb public key from the domain record
   * @param domain - domain name to be resolved
   * @throws [[ResolutionError]]
   * @returns a promise that resolves in gundb public key
   */
  async chatPk(domain: string): Promise<string> {
    return await this.record(domain, 'gundb.public_key.value');
  }

  /**
   * Resolves the IPFS hash configured for domain records on ZNS
   * @param domain - domain name
   * @throws [[ResolutionError]]
   */
  async ipfsHash(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    return await this.getPreferableNewRecord(
      domain,
      'dweb.ipfs.hash',
      'ipfs.html.value',
    );
  }

  /**
   * Resolves the httpUrl attached to domain
   * @param domain - domain name
   */
  async httpUrl(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    return await this.getPreferableNewRecord(
      domain,
      'browser.redirect_url',
      'ipfs.redirect_domain.value',
    );
  }

  /**
   * Resolves the ipfs email field from whois configurations
   * @param domain - domain name
   * @throws [[ResolutionError]]
   * @returns A Promise that resolves in an email address configured for this domain whois
   */
  async email(domain: string): Promise<string> {
    return await this.record(domain, 'whois.email.value');
  }

  /**
   * @returns the resolver address for a specific domain
   * @param domain - domain to look for
   */
  async resolver(domain: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const resolver = await this.getNamingMethodOrThrow(domain).resolver(domain);
    if (!resolver) {
      throw new ResolutionError(ResolutionErrorCode.UnspecifiedResolver, {
        domain,
      });
    }
    return resolver;
  }

  /**
   * @param domain - domain name
   * @returns An owner address of the domain
   */
  async owner(domain: string): Promise<string | null> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return (await method.owner(domain)) || null;
  }

  /**
   * @param domain - domain name
   * @param recordKey - a name of a record to be resolved
   * @returns A record value promise for a given record name
   */
  async record(domain: string, recordKey: string): Promise<string> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.record(domain, recordKey);
  }

  /**
   * @param domain domain name
   * @param keys Array of record keys to be resolved
   * @returns A Promise with key-value mapping of domain records
   */
  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.records(domain, keys);
  }

  /**
   * @param domain domain name
   * @returns A Promise of whether or not the domain belongs to a wallet
   */
  async isRegistered(domain: string): Promise<Boolean> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.isRegistered(domain);
  }

  /**
   * @param domain domain name
   * @returns A Promise of whether or not the domain is available
   */
  async isAvailable(domain: string): Promise<Boolean> {
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    return await method.isAvailable(domain);
  }

  /**
   * This method is only for ens at the moment. Reverse the ens address to a ens registered domain name
   * @async
   * @param address - address you wish to reverse
   * @param currencyTicker - currency ticker like BTC, ETH, ZIL
   * @returns Domain name attached to this address
   */
  async reverse(
    address: string,
    currencyTicker: string,
  ): Promise<string | null> {
    return this.serviceMap[NamingServiceName.ENS].reverse(
      address,
      currencyTicker,
    );
  }

  /**
   * @returns Produces a namehash from supported naming service in hex format with 0x prefix.
   * Corresponds to ERC721 token id in case of Ethereum based naming service like ENS or UNS.
   * @param domain domain name to be converted
   * @param options formatting options
   * @throws [[ResolutionError]] with UnsupportedDomain error code if domain extension is unknown
   */
  namehash(
    domain: string,
    options: NamehashOptions = NamehashOptionsDefault,
  ): string {
    domain = this.prepareDomain(domain);
    return this.formatNamehash(
      this.getNamingMethodOrThrow(domain).namehash(domain),
      options,
    );
  }

  /**
   * @returns a namehash of a subdomain with name label
   * @param parent namehash of a parent domain
   * @param label subdomain name
   * @param namingService "ENS", "UNS" or "ZNS"
   * @param options formatting options
   */
  childhash(
    parent: string,
    label: string,
    namingService: NamingServiceName,
    options: NamehashOptions = NamehashOptionsDefault,
  ): string {
    const service = this.serviceMap[namingService];
    if (!service) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedService, {
        namingService,
      });
    }
    return this.formatNamehash(service.childhash(parent, label), options);
  }

  private formatNamehash(hash, options: NamehashOptions) {
    hash = hash.replace('0x', '');
    if (options.format === 'dec') {
      return new BN(hash, 'hex').toString(10);
    } else {
      return options.prefix ? '0x' + hash : hash;
    }
  }

  /**
   * Checks weather the domain name matches the hash
   * @param domain - domain name to check againt
   * @param hash - hash obtained from the blockchain
   */
  isValidHash(domain: string, hash: string): boolean {
    domain = this.prepareDomain(domain);
    return this.namehash(domain) === hash;
  }

  /**
   * Checks if the domain name is valid according to naming service rules
   * for valid domain names.
   * Example: ENS doesn't allow domains that start from '-' symbol.
   * @param domain - domain name to be checked
   */
  async isSupportedDomain(domain: string): Promise<boolean> {
    domain = this.prepareDomain(domain);
    const namingMethod = this.getNamingMethod(domain);
    return namingMethod ? await namingMethod.isSupportedDomain(domain) : false;
  }

  /**
   * Returns the name of the service for a domain ENS | UNS | ZNS
   * @param domain - domain name to look for
   */
  serviceName(domain: string): ResolutionMethod {
    domain = this.prepareDomain(domain);
    return this.getNamingMethodOrThrow(domain).serviceName();
  }

  /**
   * Returns all record keys of the domain.
   * This method is strongly unrecommended for production use due to lack of support for many ethereum service providers and low performance
   * Method is not supported by ENS
   * @param domain - domain name
   */
  async allRecords(domain: string): Promise<CryptoRecords> {
    domain = this.prepareDomain(domain);
    return await this.getNamingMethodOrThrow(domain).allRecords(domain);
  }

  async dns(domain: string, types: DnsRecordType[]): Promise<DnsRecord[]> {
    const dnsUtils = new DnsUtils();
    domain = this.prepareDomain(domain);
    const method = this.getNamingMethodOrThrow(domain);
    const dnsRecordKeys = this.getDnsRecordKeys(types);
    const blockchainData = await method.records(domain, dnsRecordKeys);
    return dnsUtils.toList(blockchainData);
  }

  /**
   * Retrieves the tokenURI from the registry smart contract.
   * @returns the ERC721Metadata#tokenURI contract method result
   * @param domain - domain name
   */
  async tokenURI(domain: string): Promise<string> {
    const namehash = this.namehash(domain);
    return this.getNamingMethodOrThrow(domain).getTokenUri(namehash);
  }

  /**
   * Retrieves the data from the endpoint provided by tokenURI from the registry smart contract.
   * @returns the JSON response of the token URI endpoint
   * @param domain - domain name
   */
  async tokenURIMetadata(domain: string): Promise<TokenUriMetadata> {
    const tokenUri = await this.tokenURI(domain);
    return this.getMetadataFromTokenURI(tokenUri);
  }

  /**
   * Retrieves the domain name from token metadata that is provided by tokenURI from the registry smart contract.
   * The function will throw an error if the domain in the metadata does not match the hash (e.g. if the metadata is outdated).
   * @returns the domain name retrieved from token metadata
   * @param hash - domain hash
   * @param service - nameservice which is used for lookup
   */
  async unhash(hash: string, service: NamingServiceName): Promise<string> {
    const tokenUri = await this.serviceMap[service].getTokenUri(hash);
    const metadata = await this.getMetadataFromTokenURI(tokenUri);
    const receivedHash = this.namehash(metadata.name);
    if (receivedHash !== hash) {
      throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
        methodName: 'unhash',
        domain: metadata.name,
        providerMessage: 'Service provider returned an invalid domain name',
      });
    }
    return metadata.name;
  }

  private async getMetadataFromTokenURI(
    tokenUri: string,
  ): Promise<TokenUriMetadata> {
    const resp = await Networking.fetch(tokenUri, {});
    if (resp.ok) {
      return await resp.json();
    }

    throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
      providerMessage: await resp.text(),
      method: 'UDAPI',
      methodName: 'tokenURIMetadata',
    });
  }

  async registryAddress(domain: string): Promise<string> {
    const method = this.getNamingMethodOrThrow(domain);
    return method.registryAddress(domain);
  }

  private getDnsRecordKeys(types: DnsRecordType[]): string[] {
    const records = ['dns.ttl'];
    types.forEach((type) => {
      records.push(`dns.${type}`);
      records.push(`dns.${type}.ttl`);
    });
    return records;
  }

  private async getPreferableNewRecord(
    domain: string,
    newRecord: string,
    oldRecord: string,
  ): Promise<string> {
    const records = await this.records(domain, [newRecord, oldRecord]);
    if (!records[newRecord] && !records[oldRecord]) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: newRecord,
        domain: domain,
      });
    }
    return records[newRecord] || records[oldRecord];
  }

  private getNamingMethod(domain: string): NamingService | undefined {
    return this.serviceMap[findNamingServiceName(domain)];
  }

  private getNamingMethodOrThrow(domain: string): NamingService {
    const method = this.getNamingMethod(domain);
    if (!method) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, {
        domain,
      });
    }

    return method;
  }

  private prepareDomain(domain: string): string {
    return domain ? domain.trim().toLowerCase() : '';
  }
}

export {Resolution};

function isApi(obj: any): obj is Api {
  return obj && obj.api;
}
