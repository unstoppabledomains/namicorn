import DnsUtils from '../utils/DnsUtils';
import {DnsRecordsErrorCode} from '../errors/dnsRecordsError';
import {CryptoRecords, DnsRecord, DnsRecordType} from '../types/publicTypes';
import {expectDnsRecordErrorCode} from './helpers';

let dnsUtils: DnsUtils;
beforeAll(() => {
  dnsUtils = new DnsUtils();
});

describe('DnsUtils', () => {
  describe('toList', () => {
    it('should work', () => {
      const record: CryptoRecords = {
        'dns.ttl': '128',
        'dns.A': '["10.0.0.1","10.0.0.2"]',
        'dns.A.ttl': '90',
        'dns.AAAA': '["10.0.0.120"]',
      };
      const classic: DnsRecord[] = dnsUtils.toList(record);
      expect(classic).toStrictEqual([
        {TTL: 90, data: '10.0.0.1', type: 'A'},
        {TTL: 90, data: '10.0.0.2', type: 'A'},
        {TTL: 128, data: '10.0.0.120', type: 'AAAA'},
      ]);
    });

    it('dns.A = [] ', () => {
      const record: CryptoRecords = {
        'dns.ttl': '128',
        'dns.A': '[]',
        'dns.A.ttl': '90',
        'dns.AAAA': '["10.0.0.120"]',
      };
      const classic: DnsRecord[] = dnsUtils.toList(record);
      expect(classic).toStrictEqual([
        {TTL: 128, data: '10.0.0.120', type: 'AAAA'},
      ]);
    });

    it('should work ignoring other records', () => {
      const records: CryptoRecords = {
        'dns.ttl': '128',
        'dns.A': '["10.0.0.1","10.0.0.2"]',
        'dns.A.ttl': '90',
        'dns.AAAA': '["10.0.0.120"]',
        'something.ttl.weird': 'more weird',
        'something.ultra.weird': 'WOW',
      };
      const classic: DnsRecord[] = dnsUtils.toList(records);
      expect(classic).toStrictEqual([
        {TTL: 90, data: '10.0.0.1', type: 'A'},
        {TTL: 90, data: '10.0.0.2', type: 'A'},
        {TTL: 128, data: '10.0.0.120', type: 'AAAA'},
      ]);
    });

    it('dns.A with invalid json', () => {
      const record: CryptoRecords = {
        'dns.ttl': '128',
        'dns.A': '[',
        'dns.A.ttl': '90',
        'dns.AAAA': '["10.0.0.120"]',
      };
      expectDnsRecordErrorCode(
        () => dnsUtils.toList(record),
        DnsRecordsErrorCode.DnsRecordCorrupted,
      );
    });

    it('dns.ttl is not a number', () => {
      const record: CryptoRecords = {
        'dns.ttl': 'bh',
        'dns.A': '["10.0.0.1"]',
        'dns.A.ttl': '90',
        'dns.AAAA': '["10.0.0.120"]',
      };
      const classic: DnsRecord[] = dnsUtils.toList(record);
      expect(classic).toStrictEqual([
        {TTL: 90, data: '10.0.0.1', type: 'A'},
        {TTL: DnsUtils.DefaultTtl, data: '10.0.0.120', type: 'AAAA'},
      ]);
    });

    it('all ttls are wrong', () => {
      const record: CryptoRecords = {
        'dns.ttl': 'asdbasd',
        'dns.A': '["10.0.0.1", "10.0.0.2"]',
        'dns.A.ttl': 'sda2daf4',
      };
      const list: DnsRecord[] = dnsUtils.toList(record);
      expect(list).toStrictEqual([
        {TTL: DnsUtils.DefaultTtl, data: '10.0.0.1', type: 'A'},
        {TTL: DnsUtils.DefaultTtl, data: '10.0.0.2', type: 'A'},
      ]);
    });

    it('dns.A = valid json invalid format', () => {
      const record: CryptoRecords = {
        'dns.ttl': '90',
        'dns.A': JSON.stringify([[]]),
        'dns.AAAA': JSON.stringify(['10.0.0.5', '10.0.0.4']),
      };
      const list: DnsRecord[] = dnsUtils.toList(record);
      expect(list).toStrictEqual([
        {TTL: 90, data: '10.0.0.5', type: 'AAAA'},
        {TTL: 90, data: '10.0.0.4', type: 'AAAA'},
      ]);
    });
  });

  describe('toCrypto', () => {
    it('should work', () => {
      const classicalRecords: DnsRecord[] = [
        {TTL: 90, data: '10.0.0.1', type: 'A' as DnsRecordType},
        {TTL: 90, data: '10.0.0.2', type: 'A' as DnsRecordType},
        {TTL: 128, data: '10.0.0.120', type: 'AAAA' as DnsRecordType},
      ];
      const cryptoRecords: CryptoRecords = dnsUtils.toCrypto(classicalRecords);
      expect(cryptoRecords).toStrictEqual({
        'dns.A': JSON.stringify(['10.0.0.1', '10.0.0.2']),
        'dns.A.ttl': '90',
        'dns.AAAA': JSON.stringify(['10.0.0.120']),
        'dns.AAAA.ttl': '128',
      });
    });

    it('toCrypto with wrong ttl', () => {
      const classicalRecords: DnsRecord[] = [
        {TTL: 90, data: '10.0.0.20', type: 'A' as DnsRecordType},
        {TTL: 900, data: '10.0.0.20', type: 'A' as DnsRecordType},
      ];
      expectDnsRecordErrorCode(
        () => dnsUtils.toCrypto(classicalRecords),
        DnsRecordsErrorCode.InconsistentTtl,
      );
    });
  });
});
