import { Zilliqa } from '@zilliqa-js/zilliqa';
import { Contract } from '@zilliqa-js/contract';
import { toChecksumAddress, toBech32Address } from '@zilliqa-js/crypto';
import namehash from './zns/namehash';
import _ from 'lodash';

const DefaultSource = 'https://api.zilliqa.com/';
const registryAddress = 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz';
const NullAddress = '0x0000000000000000000000000000000000000000';

type Resolution = {
  crypto?: { [key: string]: { address: string } };
  ttl?: string;
  [key: string]: any;
};

export default class {
  registry: Contract;
  zilliqa: Zilliqa;

  constructor(source: string | boolean = DefaultSource) {
    if (source == true) {
      source = DefaultSource;
    }
    source = source.toString();
    this.zilliqa = new Zilliqa(source);
    this.registry = this.zilliqa.contracts.at(registryAddress);
  }

  async getContractField(contract: Contract, field: string, keys: string[] = []): Promise<any> {
    let response = await this.zilliqa.provider.send(
      "GetSmartContractSubState",
      contract.address.replace("0x", "").toLowerCase(),
      field,
      keys.map(k => JSON.stringify(k))
    );
    return (response.result || {})[field];
  }

  async getContractMapValue(contract: Contract, field: string, key: string): Promise<any> {
    return (await this.getContractField(contract, field, [key]))[key];
  }

  async getResolverRecordsStructure(
    resolverAddress: string,
  ): Promise<Resolution> {
    if (resolverAddress == NullAddress) {
      return {};
    }
    const resolver = this.zilliqa.contracts.at(
      toChecksumAddress(resolverAddress),
    );
    const resolverRecords = (await this.getContractField(
      resolver,
      'records',
    )) as { [key: string]: string };
    return _.transform(
      resolverRecords,
      (result, value, key) => _.set(result, key, value),
      {},
    );
  }

  async resolve(domain: string): Promise<Resolution | null> {
    const registryRecord = await this.getContractMapValue(
      this.registry,
      'records',
      namehash(domain),
    );

    if (!registryRecord) return null;
    let [ownerAddress, resolverAddress] = registryRecord.arguments as [
      string,
      string
    ];
    const resolution = await this.getResolverRecordsStructure(resolverAddress);
    const addresses = _.mapValues(resolution.crypto, 'address');
    // at the moment ownerAddress is publicKey which starts with 0x 
    if (ownerAddress.startsWith('0x')) {

      // If it is uncompressed i have to compress it 
      if (/^(0x)?(04)?[a-f0-9]{128}$/i.test(ownerAddress)) {
        // How can i compress it? 
      }
      // at this point I should have compressed public key
      // if it is compressed i should transform it into zil format
      ownerAddress = `${toBech32Address(ownerAddress)}`;
    }
    return {
      addresses,
      meta: {
        owner: ownerAddress || null,
        type: 'zns',
        ttl: parseInt(resolution.ttl as string) || 0,
      },
    };
  }

  isSupportedDomain(domain: string): boolean {
    return domain.indexOf('.') > 0 && /^.{1,}\.(zil)$/.test(domain);
  }
}
