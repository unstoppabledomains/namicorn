import DnsRecordsError, {DnsRecordsErrorCode} from '../errors/dnsRecordsError';
import {CryptoRecords, DnsRecord, DnsRecordType} from '../types/publicTypes';
export default class DnsUtils {
  static readonly DefaultTtl: number = 300; // 5 minutes

  public toList(record: CryptoRecords): DnsRecord[] {
    const dnsTypes = this.getAllDnsTypes(record);
    return ([] as DnsRecord[]).concat(
      ...dnsTypes.map((type) => this.constructDnsRecords(record, type)),
    );
  }

  public toCrypto(records: DnsRecord[]): CryptoRecords {
    const cryptoRecords: CryptoRecords = {};
    for (const record of records) {
      const {type, TTL, data} = record;
      const ttlInRecord = this.getJsonNumber(cryptoRecords[`dns.${type}.ttl`]);
      const dnsInRecord = this.getJsonArray(cryptoRecords, `dns.${type}`);
      if (dnsInRecord) {
        dnsInRecord.push(data);
        cryptoRecords[`dns.${type}`] = JSON.stringify(dnsInRecord);
      } else {
        cryptoRecords[`dns.${type}`] = JSON.stringify([data]);
        cryptoRecords[`dns.${type}.ttl`] = TTL.toString(10);
      }

      if (!!ttlInRecord && ttlInRecord !== TTL) {
        throw new DnsRecordsError(DnsRecordsErrorCode.InconsistentTtl, {
          recordType: type,
        });
      }
    }
    return cryptoRecords;
  }

  private protectFromCorruptRecord(
    rawRecord: string | undefined,
    type: DnsRecordType,
  ): string[] | undefined {
    try {
      return rawRecord ? JSON.parse(rawRecord) : undefined;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new DnsRecordsError(DnsRecordsErrorCode.DnsRecordCorrupted, {
          recordType: type,
        });
      }
      throw err;
    }
  }

  private getJsonArray(
    cryptoRecrods: CryptoRecords,
    key: string,
  ): string[] | undefined {
    const rawRecord = cryptoRecrods[key];
    const type = key.split('.')[1] as DnsRecordType;
    return this.protectFromCorruptRecord(rawRecord, type);
  }

  private getJsonNumber(rawRecord: string | undefined): number | undefined {
    return rawRecord ? parseInt(rawRecord, 10) : undefined;
  }

  private getAllDnsTypes(records: CryptoRecords): DnsRecordType[] {
    const keys = new Set<DnsRecordType>();
    Object.keys(records).forEach((key) => {
      const chunks = key.split('.');
      const type = chunks[1] && chunks[1] !== 'ttl';
      if (type) {
        keys.add(DnsRecordType[chunks[1]]);
      }
    });
    return Array.from(keys);
  }

  private constructDnsRecords(
    cryptoData: CryptoRecords,
    type: DnsRecordType,
  ): DnsRecord[] {
    const TTL = this.parseTtl(cryptoData, type);
    const jsonValueString = cryptoData[`dns.${type}`];
    if (!jsonValueString) {
      return [];
    }
    const typeData = this.protectFromCorruptRecord(jsonValueString, type);
    if (!this.isStringArray(typeData)) {
      return [];
    }
    return typeData.map((data) => ({TTL, data, type}));
  }

  private parseTtl(data: CryptoRecords, type: DnsRecordType): number {
    const defaultTtl = data['dns.ttl'];
    const recordTtl = data[`dns.${type}.ttl`];
    if (recordTtl) {
      const parsedInt = this.parseIfNumber(recordTtl);
      if (parsedInt) {
        return parsedInt;
      }
    }
    if (defaultTtl) {
      const parsedInt = this.parseIfNumber(defaultTtl);
      if (parsedInt) {
        return parsedInt;
      }
    }
    return DnsUtils.DefaultTtl;
  }

  private parseIfNumber(str: string): number | undefined {
    const parsedInt = parseInt(str, 10);
    if (!isNaN(parsedInt)) {
      return parsedInt;
    }
  }

  private isStringArray(value: any): value is string[] {
    if (value instanceof Array) {
      return value.every((item) => typeof item === 'string');
    }
    return false;
  }
}
