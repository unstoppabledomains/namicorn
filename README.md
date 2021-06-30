# Resolution

[![NPM version](https://img.shields.io/npm/v/@unstoppabledomains/resolution.svg?style=flat)](https://www.npmjs.com/package/@unstoppabledomains/resolution)
![CI](https://github.com/unstoppabledomains/resolution/workflows/CI/badge.svg?branch=master)
[![Bundle Size Minified](https://img.shields.io/bundlephobia/min/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)
[![Bundle Size Minified Zipped](https://img.shields.io/bundlephobia/minzip/@unstoppabledomains/resolution.svg)](https://bundlephobia.com/result?p=@unstoppabledomains/resolution)
[![Unstoppable Domains Documentation](https://img.shields.io/badge/Documentation-unstoppabledomains.com-blue)](https://docs.unstoppabledomains.com/)
[![Get help on Discord](https://img.shields.io/badge/Get%20help%20on-Discord-blueviolet)](https://discord.gg/b6ZVxSZ9Hn)

- [Installing Resolution](README.md#installing-resolution)
- [Using Resolution](README.md#using-resolution)
- [Default Ethereum Providers](README.md#default-ethereum-providers)
- [Error Handling](README.md#error-handling)
- [Free advertising for integrated apps](README.md#free-advertising-for-integrated-apps)

Resolution is a library for interacting with blockchain domain names. It can be
used to retrieve
[payment addresses](https://unstoppabledomains.com/features#Add-Crypto-Addresses),
IPFS hashes for
[decentralized websites](https://unstoppabledomains.com/features#Build-Website),
and GunDB usernames for
[decentralized chat](https://unstoppabledomains.com/chat).

Resolution is primarily built and maintained by
[Unstoppable Domains](https://unstoppabledomains.com/).

Resolution supports decentralized domains across three main zones:

- Zilliqa Name Service (ZNS)
  - `.zil`

- Ethereum Name Service (ENS)
  - `.eth`
  - `.kred`
  - `.xyz`
  - `.luxe`

- Unstoppable Name Service (UNS)
  - `.crypto`
  - `.nft`
  - `.blockchain`
  - `.bitcoin`
  - `.coin`
  - `.wallet`
  - `.888`
  - `.dao`
  - `.x`
  - ...

For more information, see our detailed
[API Referrence](https://unstoppabledomains.github.io/resolution/).

### ENS support
**Note: Ethereum Name Service requires installing additional packages 
otherwise library throws error when trying to resolve ENS domain.**

#### Required packages
- `"bip44-constants": "^8.0.5"`
- `"@ensdomains/address-encoder": ">= 0.1.x <= 0.2.x"`
- `"content-hash": "^2.5.2"`

## Installing Resolution

Resolution can be installed with either `yarn` or `npm`.

```shell
yarn add @unstoppabledomains/resolution
```

```shell
npm install @unstoppabledomains/resolution --save
```

If you're interested in resolving domains via the command line, see our
[CLI section](#command-line-interface).

## Using Resolution

Create a new project.

```shell
mkdir resolution && cd $_
yarn init -y
yarn add @unstoppabledomains/resolution
```

### Look up a domain's crypto address

Create a new file in your project, `address.js`.

```javascript
const { default: Resolution } = require('@unstoppabledomains/resolution');
const resolution = new Resolution();

function resolve(domain, currency) {
  resolution
    .addr(domain, currency)
    .then((address) => console.log(domain, 'resolves to', address))
    .catch(console.error);
}

function resolveMultiChain(domain, currency, chain) {
  resolution
    .multiChainAddr(domain, currency, chain)
    .then((address) => console.log(domain, 'resolves to', address, version))
    .catch(console.error);
}

resolve('brad.crypto', 'ETH');
resolve('brad.zil', 'ZIL');
resolveMultiChain('brad.crypto', 'USDT', 'ERC20');
resolveMultiChain('brad.crypto', 'USDT', 'OMNI');
```

Execute the script.

```shell
$ node address.js
brad.crypto resolves to 0x8aaD44321A86b170879d7A244c1e8d360c99DdA8
brad.zil resolves to zil1yu5u4hegy9v3xgluweg4en54zm8f8auwxu0xxj
```

### Find the IPFS hash for a decentralized website

Create a new file in your project, `ipfs_hash.js`.

```javascript
const { default: Resolution } = require('@unstoppabledomains/resolution');
const resolution = new Resolution();

function resolveIpfsHash(domain) {
  resolution
    .ipfsHash(domain)
    .then((hash) =>
      console.log(
        `You can access this website via a public IPFS gateway: https://gateway.ipfs.io/ipfs/${hash}`,
      ),
    )
    .catch(console.error);
}

resolveIpfsHash('homecakes.crypto');
```

Execute the script.

```shell
$ node ipfs_hash.js
You can access this website via a public IPFS gateway: https://gateway.ipfs.io/ipfs/QmVJ26hBrwwNAPVmLavEFXDUunNDXeFSeMPmHuPxKe6dJv
```

### Find a custom record

Create a new file in your project, `custom-resolution.js`.

```javascript
const { default: Resolution } = require('@unstoppabledomains/resolution');
const resolution = new Resolution();

function resolveCustomRecord(domain, record) {
  resolution
    .records(domain, [record])
    .then((value) => console.log(`Domain ${domain} ${record} is: ${value}`))
    .catch(console.error);
}

resolveCustomRecord('homecakes.crypto', 'custom.record.value');
```

### Command Line Interface

To use resolution via the command line install the package globally.

```shell
yarn global add @unstoppabledomains/resolution
```

```shell
npm install -g @unstoppabledomains/resolution
```

By default, the CLI uses Infura as its primary gateway to the Ethereum
blockchain. If you'd like to override this default and set another provider you
can do so using the `--ethereum-url` flag.

For example:

```shell
resolution --ethereum-url https://mainnet.infura.io/v3/${secret} -d udtestdev-usdt.crypto -a
```

Use the `-h` or `--help` flag to see all the available CLI options.

## Default Ethereum Providers

Resolution provides zero-configuration experience by using built-in
production-ready [Infura](http://infura.io/) endpoint by default.  
Default Ethereum provider is free to use without restrictions and rate-limits
for `CNS (.crypto domains)` resolution.  
To resolve `ENS` domains on production it's recommended to change Ethereum
provider.  
Default provider can be changed by changing constructor options
`new Resolution(options)` or by using one of the factory methods:

- `Resolution.infura()`
- `Resolution.fromWeb3Version1Provider()`
- `Resolution.fromEthersProvider()`
- etc.

To see all constructor options and factory methods check
[Unstoppable API reference](https://unstoppabledomains.github.io/resolution).

## Autoconfiguration of blockchain network
In some scenarios system might not be flexible enough to easy distinguish between various Ethereum testnets on compile time.
For this case Resolution library provide a special async constructor which should be waited for 
`await Resolution.autonetwork(options)`. This method makes a JSON RPC "net_version" call to the provider to get the network id.

This method configures only Ens and Cns, Zns is supported only on Zilliqa mainnet which is going to be used in any cases.
You can provide a configured provider or a blockchain url as in the following example:
```
await Resolution.autonetwork({
  cns: {provider},
  ens: {url}
});
```
## Error Handling

When resolution encounters an error it returns the error code instead of
stopping the process. Keep an eye out for return values like `RECORD_NOT_FOUND`.

## Development

Use these commands to set up a local development environment (**macOS Terminal**
or **Linux shell**).

1. Install `nvm`

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.36.0/install.sh | bash
   ```

2. Install concrete version of `node.js`

   ```bash
   nvm install 12.12.0
   ```

3. Install `yarn`
   ```bash
   npm install -g yarn
   ```
4. Clone the repository

   ```bash
   git clone https://github.com/unstoppabledomains/resolution.git
   cd resolution
   ```

5. Install dependencies
   ```bash
   yarn install
   ```

### Internal config

#### To update:
- Network config: `$ yarn network-config:pull`
- Supported keys: `$ yarn supported-keys:pull`
- Both configs: `$ yarn config:pull`

## Free advertising for integrated apps

Once your app has a working Unstoppable Domains integration,
[register it here](https://unstoppabledomains.com/app-submission). Registered
apps appear on the Unstoppable Domains
[homepage](https://unstoppabledomains.com/) and
[Applications](https://unstoppabledomains.com/apps) page — putting your app in
front of tens of thousands of potential customers per day.

Also, every week we select a newly-integrated app to feature in the Unstoppable
Update newsletter. This newsletter is delivered to straight into the inbox of
~100,000 crypto fanatics — all of whom could be new customers to grow your
business.

## Get help

[Join our discord community](https://discord.com/invite/b6ZVxSZ9Hn) and ask
questions.
