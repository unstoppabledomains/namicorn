import ConfigurationError, {
  ConfigurationErrorCode,
} from '../errors/configurationError';

/**
 * Function tries to require module and throw error if module is not found.
 * @param module - Module name or path
 * @param dependencyName NPM name of the requested module
 * @param allowedVersions Allowed versions of requested module
 * @throws ConfigurationError
 */
export function requireOrFail(
  module: string,
  dependencyName: string,
  allowedVersions: string,
): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(module);
  } catch (e) {
    throw new ConfigurationError(ConfigurationErrorCode.DependencyMissing, {
      dependency: dependencyName,
      version: allowedVersions,
    });
  }
}
