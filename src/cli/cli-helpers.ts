import Resolution from '../Resolution';
import {ResolutionErrorCode} from '..';

export async function tryInfo(
  method: () => any,
  response: Record<string, string>,
  name: string,
): Promise<boolean> {
  const field = name;
  try {
    response[field] = await method();
    return true;
  } catch (err) {
    if (Object.values(ResolutionErrorCode).includes(err.code)) {
      response[field] = err.code;
    } else {
      response[field] = err.message;
    }
    return false;
  }
}

export function commaSeparatedList(value: string): string[] {
  return value.split(',').map((v: string) => v.toUpperCase());
}

export function buildResolutionPackage(ethereumUrl?: string): Resolution {
  if (ethereumUrl) {
    try {
      const url = new URL(ethereumUrl).toString();
      return new Resolution({
        sourceConfig: {
          uns: {url, network: 'mainnet'},
          ens: {url, network: 'mainnet'},
        },
      });
    } catch (e) {
      if (e instanceof TypeError) {
        console.warn(`--ethereum-url option is not valid URL`);
      } else {
        console.error(e);
      }
    }
  }
  return new Resolution();
}
