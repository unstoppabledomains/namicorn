import {  ResolutionMethod } from '../types/publicTypes';

export default interface NamingService {
  owner(domain: string): Promise<string>;
  resolver(domain: string): Promise<string>;
  namehash(domain: string): string;
  isSupportedDomain(domain: string): boolean;
  record(domain: string, key: string): Promise<string>;
  records(domain: string, keys: string[]): Promise<Record<string, string>>;
  serviceName(): ResolutionMethod;
  twitter(domain: string): Promise<string>;
  reverse(address: string, currencyTicker: string): Promise<string | null>;
  allRecords(domain: string): Promise<Record<string, string>>;
}
