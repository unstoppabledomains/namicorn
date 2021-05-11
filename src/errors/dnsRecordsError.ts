import {DnsRecordType} from '../types/publicTypes';
type DnsRecordsErrorHandler = (error: DnsRecordsErrorOptions) => string;
/** Explains DnsRecords Error options */
type DnsRecordsErrorOptions = {
  recordType?: DnsRecordType;
};

export enum DnsRecordsErrorCode {
  InconsistentTtl = 'InconsistentTtl',
  DnsRecordCorrupted = 'DnsRecordCorrupted',
}

/**
 * @internal
 * Internal Mapping object from DnsRecordsErrorCode to a DnsRecordsErrorHandler
 */
const HandlersByCode = {
  [DnsRecordsErrorCode.InconsistentTtl]: (params: DnsRecordsErrorOptions) =>
    `ttl for record ${params.recordType} is different for other records of the same type`,
  [DnsRecordsErrorCode.DnsRecordCorrupted]: (params: DnsRecordsErrorOptions) =>
    `dns record ${params.recordType} is invalid json-string`,
};

/**
 * Configuration Error class is designed to control every error being thrown by wrong configurations for objects
 * @param code - Error Code
 * - IncorrectProvider - When provider doesn't have implemented send or sendAsync methods
 * - UnsupportedNetwork - When network is not specified or not supported
 * - UnspecifiedUrl - When url is not specified for custom naming service configurations
 * @param method - optional param to specify which namingService errored out
 */
export class DnsRecordsError extends Error {
  readonly code: DnsRecordsErrorCode;
  readonly method?: string;

  constructor(code: DnsRecordsErrorCode, options: DnsRecordsErrorOptions = {}) {
    const DnsRecordsErrorHandler: DnsRecordsErrorHandler = HandlersByCode[code];
    super(DnsRecordsErrorHandler(options));
    this.code = code;
    this.name = 'DnsRecordsError';
    Object.setPrototypeOf(this, DnsRecordsError.prototype);
  }
}
export default DnsRecordsError;
