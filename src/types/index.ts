import {Provider} from './publicTypes';

export type Dictionary<T> = {[k: string]: T};
export type EnsNetworkIdMap = {
  [key: number]: string;
};
export interface BlockhanNetworkUrlMap {
  [key: string]: string | undefined;
}
export interface ProxyReaderMap {
  [key: string]: string;
}
export type NetworkIdMap = {
  [key: number]: string;
};

export type ProviderParams = unknown[] | object;
export interface RequestArguments {
  method: string;
  params?: ProviderParams;
}
export type TransactionRequest = {
  to?: unknown;
  from?: unknown;
  nonce?: unknown;

  gasLimit?: unknown;
  gasPrice?: unknown;

  data?: unknown;
  value?: unknown;
  chainId?: unknown;
};
export interface EventData {
  address: string;
  blockHash?: string;
  blockNumber?: string;
  data: string;
  logIndex?: string;
  removed?: boolean;
  topics: string[];
  transactionHash?: string;
  transactionIndex: string;
}
export interface EventFilter {
  address?: string;
  topics?: Array<string>;
  fromBlock?: string;
  toBlock?: string;
}
export type RpcProviderTestCase = {
  name?: string;
  request: RpcProviderRequestBody;
  response: string | RpcProviderLogEntry[];
}[];
export interface RpcProviderRequestBody {
  data?: string;
  to?: string;
  fromBlock?: string | number;
  toBlock?: string;
  address?: string;
  topics?: string[];
}

export interface RpcProviderLogEntry {
  blockNumber?: number;
  blockHash?: string;
  transactionIndex?: number;
  removed?: boolean;
  address: string;
  data: string;
  topics: string[];
  transactionHash?: string;
  logIndex?: number;
}
/**
 * Default structure of ZnsResolution records
 * @typedef {object} ZnsResolution
 */
export type ZnsResolution = {
  crypto?: Dictionary<{address?: string; [key: string]: any}>;
  ttl?: string;
  [key: string]: any;
};
export type Bip44Constants = [number, string, string];
export type owner = string;
export type ttl = string;
export type nodeHash = string;
export const NullAddress = '0x0000000000000000000000000000000000000000';
export enum NullAddresses {
  '0x',
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000000000000000000000000000',
}

export const EthCoinIndex = '60';

// TypeScript will infer a string union type from the literal values passed to
// this function. Without `extends string`, it would instead generalize them
// to the common string type.
// @see https://stackoverflow.com/questions/36836011/checking-validity-of-string-literal-union-type-at-runtime
const StringUnion = <UnionType extends string>(...values: UnionType[]) => {
  Object.freeze(values);
  const valueSet: Set<string> = new Set(values);

  const guard = (value: string): value is UnionType => {
    return valueSet.has(value);
  };

  const check = (value: string): UnionType => {
    if (!guard(value)) {
      const actual = JSON.stringify(value);
      const expected = values.map((s) => JSON.stringify(s)).join(' | ');
      throw new TypeError(
        `Value '${actual}' is not assignable to type '${expected}'.`,
      );
    }
    return value;
  };

  const unionNamespace = {guard, check, values};
  return Object.freeze(
    unionNamespace as typeof unionNamespace & {type: UnionType},
  );
};

export const CnsSupportedNetwork = StringUnion('mainnet', 'rinkeby');
export const EnsSupportedNetwork = StringUnion(
  'mainnet',
  'rinkeby',
  'goerli',
  'ropsten',
);
export const ZnsSupportedNetwork = StringUnion('mainnet');

export function hasProvider(obj: any): obj is {provider: Provider} {
  return obj && !!obj.provider;
}
