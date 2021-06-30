import {
  ResolutionError,
  ResolutionErrorCode,
} from '../../errors/resolutionError';
import {default as newResolver} from './newResolver';
import {default as oldResolver} from './oldResolver';
import {EthCoinIndex} from '../../types';
import {NamingServiceName} from '../../types/publicTypes';
import {JsonFragment} from '@ethersproject/abi';

export const OldResolverAddresses = [
  '0x5ffc014343cd971b7eb70732021e26c35b744cc4',
  '0x1da022710df5002339274aadee8d58218e9d6ab5',
  '0xda1756bb923af5d1a05e277cb1e54f1d0a127890',
];

export default (addr: string, coinType?: string): JsonFragment[] => {
  if (coinType === undefined || coinType === EthCoinIndex) {
    // Old interface is only compatible to output the ETH address
    // New interface is compatible to that API
    // So we prefer old interface when currency is ETH
    return oldResolver;
  } else {
    if (OldResolverAddresses.includes(addr.toLowerCase())) {
      throw new ResolutionError(
        ResolutionErrorCode.IncorrectResolverInterface,
        {method: NamingServiceName.ENS},
      );
    }

    return newResolver;
  }
};
