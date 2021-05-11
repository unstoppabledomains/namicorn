import {ResolutionMethod} from '../types/publicTypes';
/**
 * Alias for Resolution error handler function
 * @internal
 */
type ResolutionErrorHandler = (error: ResolutionErrorOptions) => string;
/** Explains Resolution Error options */
type ResolutionErrorOptions = {
  providerMessage?: string;
  method?: ResolutionMethod;
  methodName?: string;
  domain?: string;
  currencyTicker?: string;
  recordName?: string;
  namingService?: string;
};

export enum ResolutionErrorCode {
  UnregisteredDomain = 'UnregisteredDomain',
  UnspecifiedResolver = 'UnspecifiedResolver',
  UnsupportedDomain = 'UnsupportedDomain',
  UnsupportedService = 'UnsupportedService',
  UnsupportedMethod = 'UnsupportedMethod',
  UnspecifiedCurrency = 'UnspecifiedCurrency',
  UnsupportedCurrency = 'UnsupportedCurrency',
  IncorrectResolverInterface = 'IncorrectResolverInterface',
  RecordNotFound = 'RecordNotFound',
  ServiceProviderError = 'ServiceProviderError',
  InvalidTwitterVerification = 'InvalidTwitterVerification',
}

/**
 * @internal
 * Internal Mapping object from ResolutionErrorCode to a ResolutionErrorHandler
 */
const HandlersByCode = {
  [ResolutionErrorCode.UnregisteredDomain]: (params: {domain: string}) =>
    `Domain ${params.domain} is not registered`,
  [ResolutionErrorCode.UnspecifiedResolver]: (params: {domain: string}) =>
    `Domain ${params.domain} is not configured`,
  [ResolutionErrorCode.UnsupportedDomain]: (params: {domain: string}) =>
    `Domain ${params.domain} is not supported`,
  [ResolutionErrorCode.UnsupportedMethod]: (params: {
    methodName: string;
    domain: string;
  }) => `Method ${params.methodName} is not supported for ${params.domain}`,

  [ResolutionErrorCode.InvalidTwitterVerification]: (params: {
    domain?: string;
  }) => `Domain ${params.domain} has invalid Twitter signature verification`,
  [ResolutionErrorCode.UnsupportedCurrency]: (params: {
    currencyTicker: string;
  }) => `${params.currencyTicker} is not supported`,
  [ResolutionErrorCode.IncorrectResolverInterface]: (params: {
    method: ResolutionMethod;
  }) => `Domain resolver is configured incorrectly for ${params.method}`,
  [ResolutionErrorCode.RecordNotFound]: (params: {
    recordName: string;
    domain: string;
  }) => `No ${params.recordName} record found for ${params.domain}`,
  [ResolutionErrorCode.ServiceProviderError]: (params: {
    providerMessage?: string;
  }) => `< ${params.providerMessage} >`,
  [ResolutionErrorCode.UnsupportedService]: (params: {namingService: string}) =>
    `Naming service ${params.namingService} is not supported`,
};

/**
 * Resolution Error class is designed to control every error being thrown by Resolution
 * @param code - Error Code
 * - UnsupportedDomain - domain is not supported by current Resolution instance
 * - UnregisteredDomain - domain is not owned by any address
 * - UnspecifiedResolver - domain has no resolver specified
 * - UnspecifiedCurrency - domain resolver doesn't have any address of specified currency
 * - UnsupportedCurrency - currency is not supported
 * - IncorrectResolverInterface - ResolverInterface is incorrected
 * - RecordNotFound - No record was found
 * @param domain - Domain name that was being used
 * @param method
 */
export class ResolutionError extends Error {
  readonly code: ResolutionErrorCode;
  readonly domain?: string;
  readonly method?: string;
  readonly currencyTicker?: string;

  constructor(code: ResolutionErrorCode, options: ResolutionErrorOptions = {}) {
    const resolutionErrorHandler: ResolutionErrorHandler = HandlersByCode[code];
    const {domain, method, currencyTicker} = options;
    const message = resolutionErrorHandler(options);

    super(message);
    this.code = code;
    this.domain = domain;
    this.method = method;
    this.currencyTicker = currencyTicker;
    this.name = 'ResolutionError';
    Object.setPrototypeOf(this, ResolutionError.prototype);
  }
}
export default ResolutionError;
