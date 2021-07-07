import {toBech32Address} from './utils/znsUtils';
import {ResolutionError, ResolutionErrorCode} from './errors/resolutionError';
import pckg from './package.json';
import {isValidTwitterSignature} from './utils/TwitterSignatureValidator';
import {
  CryptoRecords,
  ResolutionResponse,
  ResolutionMethod,
  NamingServiceName,
  Api,
} from './types/publicTypes';
import Networking from './utils/Networking';
import {constructRecords, findNamingServiceName, isNullAddress} from './utils';
import {znsNamehash, eip137Namehash} from './utils/namehash';
import {NamingService} from './NamingService';

/**
 * @internal
 */
export default class Udapi extends NamingService {
  private readonly name: ResolutionMethod;
  private readonly url: string;
  private readonly headers: {
    [key: string]: string;
  };
  static readonly ZnsRegistryMap = {
    1: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
  };
  readonly network: number;

  constructor(api?: Api) {
    super();
    this.name = 'UDAPI';
    this.url = api?.url || 'https://unstoppabledomains.com/api/v1';
    const DefaultUserAgent = Networking.isNode()
      ? 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'
      : navigator.userAgent;
    const version = pckg.version;
    const CustomUserAgent = `${DefaultUserAgent} Resolution/${version}`;
    this.headers = {'X-user-agent': CustomUserAgent};
    this.network = api?.network || 1;
  }

  async isSupportedDomain(domain: string): Promise<boolean> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'isSupportedDomain',
    });
  }

  namehash(domain: string): string {
    const serviceName = findNamingServiceName(domain);
    if (serviceName === NamingServiceName.ZNS) {
      return znsNamehash(domain);
    }

    return eip137Namehash(domain);
  }

  childhash(parentHash: string, label: string): string {
    throw new Error('Unsupported method whe using UD Resolution API');
  }

  async record(domain: string, key: string): Promise<string> {
    return (await this.records(domain, [key]))[key];
  }

  async records(domain: string, keys: string[]): Promise<CryptoRecords> {
    const records = await this.allRecords(domain);
    return constructRecords(keys, records);
  }

  async owner(domain: string): Promise<string> {
    const {owner} = (await this.resolve(domain)).meta;
    if (!owner) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }

    if (domain.endsWith('.zil')) {
      return owner.startsWith('zil1') ? owner : toBech32Address(owner);
    }
    return owner;
  }

  async twitter(domain: string): Promise<string> {
    const serviceName = findNamingServiceName(domain);
    if (serviceName !== NamingServiceName.UNS) {
      throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
        domain,
        methodName: 'twitter',
      });
    }

    const domainMetaData = await this.resolve(domain);
    if (!domainMetaData.meta.owner) {
      throw new ResolutionError(ResolutionErrorCode.UnregisteredDomain, {
        domain,
      });
    }
    const owner = domainMetaData.meta.owner;
    const records = domainMetaData.records || {};
    const validationSignature = records['validation.social.twitter.username'];
    const twitterHandle = records['social.twitter.username'];

    if (!validationSignature) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: 'validation.social.twitter.username',
        domain: domain,
      });
    }
    if (!twitterHandle) {
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: 'social.twitter.username',
        domain: domain,
      });
    }

    if (
      !isValidTwitterSignature({
        tokenId: domainMetaData.meta.namehash,
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

  async allRecords(domain: string): Promise<CryptoRecords> {
    return (await this.resolve(domain)).records || {};
  }

  getDomainFromTokenId(tokenId: string): Promise<string> {
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      methodName: 'isSupportedDomain',
    });
  }

  async resolve(domain: string): Promise<ResolutionResponse> {
    const response = await Networking.fetch(`${this.url}/${domain}`, {
      method: 'GET',
      headers: this.headers,
    });
    return response.json();
  }

  serviceName(): ResolutionMethod {
    return this.name;
  }

  async resolver(domain: string): Promise<string> {
    const record = await this.resolve(domain);
    return record.meta.resolver;
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
    const record = await this.resolve(domain);

    return !isNullAddress(record.meta.owner);
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
    throw new ResolutionError(ResolutionErrorCode.UnsupportedMethod, {
      domain,
      methodName: 'registryAddress',
    });
  }
}
