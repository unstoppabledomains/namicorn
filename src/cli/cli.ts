#!/usr/bin/env node
import program from 'commander';
import pckg from '../package.json';
import {NamingServiceName} from '../types/publicTypes';
import {
  buildResolutionPackage,
  commaSeparatedList,
  tryInfo,
} from './cli-helpers.js';

(async () => {
  program
    .storeOptionsAsProperties(false)
    .version(pckg.version)
    .option(
      '-c, --currencies <currencies>',
      'comma separated list of currency tickers',
      commaSeparatedList,
    )
    .option(
      '--usdt-versions <usdtVersions>',
      'comma separated list of USDT token versions (OMNI, TRON, ERC20, EOS)',
      commaSeparatedList,
    )
    .option('-s, --service', 'returns you a service name from the domain')
    .option('-i, --ipfs', 'get IpfsHash')
    .option('-r, --resolver', 'get resolver address')
    .option('-e, --email', 'get email')
    .option('-n, --namehash', `returns domain's namehash (hex)`)
    .option('-N, --namehash-decimal', `returns domain's namehash (decimal)`)
    .option('-o, --owner', `returns domain's owner`)
    .option('-g, --gundb', `returns gundb chat id`)
    .option('-m, --meta', 'shortcut for all meta data options (-siren)')
    .option(
      '-t, --twitter',
      'returns verified Twitter handle (only available for uns domains)',
    )
    .option('-d, --domain <domain>', 'domain you wish to resolve')
    .option('-k, --recordKey <recordkey>', 'custom domain record')
    .option('-a, --all', 'get all keys stored under a domain')
    .option(
      '--ethereum-url <ethereumUrl>',
      'specify custom ethereum provider/url',
    )
    .option('--token-uri', `returns the token metadata URI`)
    .option(
      '--token-uri-meta',
      `returns the token metadata retrieved from the metadata URI`,
    )
    .option(
      '-u, --unhash <hash>',
      `gets the domain name by hash from token metadata (only for UNS)`,
    )
    .option('--supported', `checks if the domain name is supported`)
    .description(
      'resolution cli exports main usage of @unstoppabledomains/resolution library',
    );

  // eslint-disable-next-line no-undef
  program.parse(process.argv);

  const options = program.opts();
  if (options.meta) {
    options.service = true;
    options.ipfs = true;
    options.resolver = true;
    options.email = true;
    options.namehash = true;
    options.owner = true;
    options.gundb = true;
    delete options.meta;
  }

  if (!options.domain && !options.unhash) {
    return;
  }

  const {domain} = options;
  delete options.domain;

  const resolution = buildResolutionPackage(options.ethereumUrl);
  const response = {};

  const commandTable = {
    ipfs: () =>
      tryInfo(
        async () => {
          const result = {};
          result['ipfsHash'] = await resolution
            .ipfsHash(domain)
            .catch((err) => err.code);
          result['redirect_url'] = await resolution
            .httpUrl(domain)
            .catch((err) => err.code);
          return result;
        },
        response,
        'ipfs',
      ),
    email: () =>
      tryInfo(async () => await resolution.email(domain), response, 'email'),
    resolver: () =>
      tryInfo(
        async () => await resolution.resolver(domain),
        response,
        'resolver',
      ),
    service: () =>
      tryInfo(() => resolution.serviceName(domain), response, 'service'),
    namehash: () =>
      tryInfo(() => resolution.namehash(domain), response, 'namehash'),
    namehashDecimal: () =>
      tryInfo(
        () => resolution.namehash(domain, {format: 'dec'}),
        response,
        'namehash-decimal',
      ),
    owner: () =>
      tryInfo(async () => await resolution.owner(domain), response, 'owner'),
    gundb: () =>
      tryInfo(
        async () => {
          const result = {};
          result['id'] = await resolution.chatId(domain);
          result['public_key'] = await resolution.chatPk(domain);
          return result;
        },
        response,
        'gundb',
      ),
    recordKey: () =>
      tryInfo(
        async () => await resolution.record(domain, options.recordKey),
        response,
        options.recordKey,
      ),
    gunPk: () =>
      tryInfo(async () => await resolution.chatPk(domain), response, 'gundbPk'),
    all: () =>
      tryInfo(
        async () => {
          const records = await resolution.allRecords(domain);
          Object.entries(records).forEach(
            ([key, value]) => key && !value && delete records[key],
          );
          return records;
        },
        response,
        'records',
      ),
    twitter: () =>
      tryInfo(
        async () => await resolution.twitter(domain),
        response,
        'twitter',
      ),
    tokenUri: () =>
      tryInfo(
        async () => await resolution.tokenURI(domain),
        response,
        'token-uri',
      ),
    tokenUriMeta: () =>
      tryInfo(
        async () => await resolution.tokenURIMetadata(domain),
        response,
        'token-uri-meta',
      ),
    unhash: () =>
      tryInfo(
        async () =>
          await resolution.unhash(options.unhash, NamingServiceName.UNS),
        response,
        'unhash',
      ),
    supported: () =>
      tryInfo(
        async () => await resolution.isSupportedDomain(domain),
        response,
        'supported',
      ),
  };

  const resolutionProcess: Promise<boolean>[] = [];
  // Execute resolution for each currency
  if (options.currencies) {
    options.currencies.forEach((currency: string) => {
      resolutionProcess.push(
        tryInfo(
          async () => await resolution.addr(domain, currency),
          response,
          currency,
        ),
      );
    });
    delete options.currencies;
  }
  if (options.usdtVersions) {
    options.usdtVersions.forEach((usdtVersion: string) => {
      resolutionProcess.push(
        tryInfo(
          async () =>
            await resolution.multiChainAddr(domain, 'usdt', usdtVersion),
          response,
          usdtVersion,
        ),
      );
    });
    delete options.usdtVersions;
  }
  delete options.ethereumUrl;
  // Execute the rest of options
  Object.keys(options).forEach((option) =>
    resolutionProcess.push(commandTable[option]()),
  );

  await Promise.all(resolutionProcess);
  console.log(JSON.stringify(response, undefined, 4));
})();
