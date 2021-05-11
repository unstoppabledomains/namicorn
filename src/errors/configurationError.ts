import {ResolutionMethod} from '../types/publicTypes';
/** Alias for Resolution error handler function
 * @internal
 */
type ConfigurationErrorHandler = (error: ConfigurationErrorOptions) => string;
/** Explains Resolution Error options */
type ConfigurationErrorOptions = {
  method?: ResolutionMethod;
  dependency?: string;
  version?: string;
};

export enum ConfigurationErrorCode {
  IncorrectProvider = 'IncorrectProvider',
  UnsupportedNetwork = 'UnsupportedNetwork',
  UnspecifiedUrl = 'UnspecifiedUrl',
  DependencyMissing = 'DependencyMissing',
}

/**
 * @internal
 * Internal Mapping object from ConfigurationErrorCode to a ConfigurationErrorHandler
 */
const HandlersByCode = {
  [ConfigurationErrorCode.IncorrectProvider]: () =>
    "Provider doesn't implement sendAsync or send method",
  [ConfigurationErrorCode.UnsupportedNetwork]: (params: {
    method: ResolutionMethod;
  }) =>
    `Unspecified network in Resolution ${params.method || ''} configuration`,
  [ConfigurationErrorCode.UnspecifiedUrl]: (params: {
    method: ResolutionMethod;
  }) => `Unspecified url in Resolution ${params.method} configuration`,
  [ConfigurationErrorCode.DependencyMissing]: (params: {
    dependency: string;
    version: string;
  }) =>
    `Missing dependency for this functionality. Please install ${params.dependency} @ ${params.version} via npm or yarn`,
};

/**
 * Configuration Error class is designed to control every error being thrown by wrong configurations for objects
 * @param code - Error Code
 * - IncorrectProvider - When provider doesn't have implemented send or sendAsync methods
 * - UnsupportedNetwork - When network is not specified or not supported
 * - UnspecifiedUrl - When url is not specified for custom naming service configurations
 * @param method - optional param to specify which namingService errored out
 */
export class ConfigurationError extends Error {
  readonly code: ConfigurationErrorCode;
  readonly method?: string;

  constructor(
    code: ConfigurationErrorCode,
    options: ConfigurationErrorOptions = {},
  ) {
    const configurationErrorHandler: ConfigurationErrorHandler =
      HandlersByCode[code];
    super(configurationErrorHandler(options));
    this.code = code;
    this.method = options.method;
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
export default ConfigurationError;
