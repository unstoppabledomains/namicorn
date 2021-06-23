## 2.2.0
* Allow custom network configuration for CNS and ZNS which could be useful for integration testing.

## 2.1.0
* Introduce new factory method Resolution#autonetwork. This factory is asynchronious and allows to skip the network configuration for either ens or cns. This method is making a "net_version" call to the blockchain provider in order to configure itself.

## 2.0.0
* Remove deprecated methods
  - Resolution#address
  - Resolution#ipfsRedirect
  - Resolution#addressOrThrow
  - ResolutionErrorCode.UnspecifiedCurrency
* Simplify constructor
  - remove type Blockchain
  - remove type API
  - Introduced single config type SourceConfig
    
## 1.20.0
* Introduced Resolution#multiChainAddr(domain: string, ticker: string, chain: string) - More general method to fetch multi chain records.
* Deprecated Resolution#usdt method in favor of multiChainAddr
* Deprecated TickerVersion 

## 1.19.0
* Update @ensdomains/address-encoder dependency to remove security audit issues
* Remove webpack dependency to remove security audit issues
## 1.18.0
* Use Infura Ethereum Provider by default
## 1.17.0
* Add support for TLOS
## 1.16.2
* Add support of USDT for CLI tool. Try `resolution --usdt-versions OMNI,ERC20 -d udtestdev-usdt.crypto` command  
## 1.16.1
* Fixed Fetch error display when used in browser env
## 1.16.0
* Fixed bug with infura.com -> infura.io
## 1.12.0
* Introduced Resolution#usdt(domain: string, version: TickerVersion) which resolves in various USDT records from different chains
* Introduced TickerVersion enum which holds all values for version parametr ar Resolution#usdt
## 1.10.4-1.11.1
* updated resolution cli, config option is depricated
* introduced --ethereum-url option to provide a non default blockchain provider
## 1.10.3
* provide valid json to the CLI output

## 1.10.2
* hotfix regarding incompatable types with Ethers InfuraProvider

## 1.10.1
* Fixed bug regarding incompatable types with Ethers InfuraProvider
* Remove ability to read from registry directly. `ProxyReader` address is now required. #105.
## 1.10.0

* No changes
## 1.9.0

* Add `Resolution#records` method to query multiple records #96
* Add formatting options for `Resolution#namehash` and `Resolution#childhash` #91
* Add `Resolution#dns` method to query dns records from blockchain #99
* Add DnsUtils as a helper class to convert from CryptoRecord type to DnsRecord and vice-versa #99
* Plug-in network config from dot-crypto library #101
* Removed elliptic from dependacy list. (when needed user should install it separately)

## 1.8.3

* Enhanced Log searched. Now getting all records from the last resetRecords event if available

## 1.8.2
* Update Twitter validation algorithm

## 1.8.0 - 1.8.1
* Added `Resolution#twitter` method that returns back the verified twitter handle

## 1.7.0
* Added `Resolution#addr` method that behaves consistently with other record getter methods.

## 1.6.2
* Deprecated Resolution#address Resolution#addressOrThrow ResolutionErrorCode.UnspecifiedCurrency

## 1.8.2
* Added ability to get verified twitter account connected to CNS domain via `Resolution#twitter` method.  

## 1.6.1
* Used ProxyReader(0x7ea9ee21077f84339eda9c80048ec6db678642b1) instead of Registry contract by default

## 1.6.0
* Added support of web3.js and ethers.js providers
* Throw `ConfigurationError` instead of basic `Error` when Resolution library is configured incorrectly so that it can be targeted within `catch` block.
* Use [@ethersproject/abi](https://www.npmjs.com/package/@ethersproject/abi) instead of custom abi encoder
* Change default ethereum provider from infura to linkpool #75

## 1.5.1
* fixing the version

## 1.4.1
* Resolution#chatPk -> get a gundb public key from domain's record
* Fix the bug with Resolution#chatId for ens domains

## 1.4.0
* Resolve custom records
* Resolution#chatId -> get a gundb chat id from domain's record
* Add kovan address of crypto registry
* Add support of more networks for ENS

## 1.3.6
* Add -o, --owner flag to CLI. Flag resolves in owner address.

## 1.3.5
* Fixed CLI config file persistent location issue
* All domains are trimmed and lowercased before proceed with the direct lookup

## 1.3.4
* Fixed wrong ResolutionErrorCode for unregistered .crypto domain in method cns#address

## 1.3.3
* CLI -n, --namehash flag
* CLI -m, --meta flag, shortcut for -siren flags
* Updated README

## 1.3.2
* domains like "hello..crypto", "hello..eth", "hello..zil" should throw ResolutionErrorCode.UnsupportedDomain

## 1.3.1
* fixed command line interface configuration with url

## 1.3.0
* Add support for .kred domains on ENS

## 1.2.0
* Added a command line interface

## 1.1.0
* Using flexible dependacies instead of locked versions
* Moved sizecheck to a separate dev dependacy
* Added web3Provider Support [#57]
* Added factories Resolution.infura, Resolution.provider, Resolution.jsonRPCprovider 

## 1.0.24
* Bug fix, namehash the domain before asking for a resolver on cns.
* Bug fix, ignore the resolutionErrorCode.RecordNotFound when looking up the crypto address.

## 1.0.23
* Updated ens registry address according to https://github.com/ensdomains/ens/security/advisories/GHSA-8f9f-pc5v-9r5h
* Removed test extension from ens resolvable tld's

## 1.0.22
* Added size check for the package with limit 500.00 KB

## 1.0.20
* Added Resolution#resolver(domain:string): Promise<string>
* Removed ethers keccak256 lodash from package.json

## 1.0.19
* Included the AbiEncoder from [ethers-js](https://github.com/ethers-io/ethers.js/blob/b288ad9ba791073df2768c580abe9173c6b851f6/src.ts/utils/abi-coder.ts)
* removed folowing packages
* * "eth-ens-namehash",

## 1.0.18
* Removed unused ethers.js 

## 1.0.17
* Fixed a bug with cns throws RecordNotFound instead of ResolutionErrorCode.UnregisteredDomain in Cns#address
* Added a way to connect Infura API secret key from .env files (should be INFURA=<SECRET KEY>)

## 1.0.16
* Resolution#childhash(parent: NodeHash, label: string) -> method to return a childhash

## 1.0.15
* Resolution#ipfsHash(domain:string): Promise<string> -> method to return an ipfsHash from the domain's records
* Deprecate Resolution#ipfsRedirect
* Resolution#httpUrl(domain:string): Promise<string> -> method to use instead of depricated Resolution#ipfsRedirect, returns an http url from the domain's records
* Resolution#email(domain:string): Promise<string> -> method to return an email from the domain's records

## 1.0.14

* Bugfix #namehash for ZNS

## 1.0.13

* Domain that starts and ends with '-' are not valid anymore in ENS.
* Bugfix Resolution#resolve on ENS domain when resolver has no address record
* Resolution#isValidHash method - checks wheather a domain name matches the given hash from the blockchain

## 1.0.9-1.0.10

* Revert back changes made for browser / node detection.

## 1.0.8

* Support Resolution#namehash of .crypto root node

## 1.0.7

* Fixed compatibility with some versions of hash.js library

## 1.0.5

* Instead of `NoRecordFound` returning `UnregisteredDomain` error for .crypto in situations when there is no resolver 

## 1.0.4

* Raise `ResolutionError` with `NamingServiceDown` code on error on ethereum RPC response
* BREAKING CHANGE: use capital letter for service name inside `Resolution#resolve => {meta: {type}}`
* NamingService#serviceName(domain: string): string

## 1.0.3

* Fixed bug with not having a ttl record on the blockchain. Now returns 0 instead of throwing an error
* Changed main registry address for CNS to 0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe

## 1.0.2

* Fixed bug with not finding cointypes when currency ticker is given as smallcase

## 1.0.1

* .crypto support with Resolution.cns

## 0.3.6

* Fix root tld support for ZNS

## 0.3.4

* Deprecated `UNCLAIMED_DOMAIN_RESPONSE` (use `UnclaimedDomainResponse` instead) 
* Excluded private, internal (public) and not exported symbols from the documentation
* Excluded internal (public) symbols from the declaration files
* Added ResolutionErrorCode enum for more convenient error handling

## 0.3.3 

* NamingService#record -> gets an arbitrary record from the corresponding naming service
* Resolution#ipfsHash -> gets IPFS hash for a specific supported domain
* Resolution#email -> gets ipfs email field of whois object for a specific supported domain
* Resolution#ipfsRedirect -> gets ipfs redirect url record for a specific supported domain

## 0.3.1 - 0.3.2

* Resolution#owner method - returns an owner address of the domain
* Fixed issue with user agent on browsers instances for Resolution
* Added docs generation scripts
* Unstoppable API is not initilized when blockchain param is true inside the Resolution configuration


## 0.3.0
* Resolution#addressOrThrow - new method that throws ResolutionError if currency address is not found
* Resolution#namehash - new method for namehashing the domain name. Name hash of a domain is an ID that is used to store the information about the domain on the blockchain. If you would browse the blockchain, you would never see domain names, just name hashes.
* Now throwing ResolutionError when ENS or ZNS naming service is down
* ENS multicoin support

## 0.2.43
* Resolution#addressOrThrow - new method that throws ResolutionError if currency address is not found
* Resolution#namehash - new method for namehashing the domain name. Name hash of a domain is an ID that is used to store the information about the domain on the blockchain. If you would browse the blockchain, you would never see domain names, just name hashes.
* Now throwing ResolutionError when ENS or ZNS naming service is down
* ENS multicoin support

## 0.2.42
* Added documentation to Resolution, ENS and ZNS files
* Connected typedoc to the project
* Added user-agent to fetch calls for https://unstoppabledomains.com/
* Specified scripts for automating generation of docs

## 0.2.41

* Make Zns#getContractField #getContractMapValue and #getResolverRecordsStructure pseudo-private methods by adding _ in front of the names
* Added Zns#Resolution method which returns everything what is stored on zilliqa for specific domain

## 0.2.39 - 0.2.40

* Zns network and url options support
* Ens and Zns support custom contracts registryAddress
* Adjust for breaking change at GetSmartContractSubState Zilliqa RPC call

## 0.2.38

* Updated zilliqa library to 0.8.1

## 0.2.37

* Support node 12
* Transform owner old zil address format to a new zil format

## 0.2.36

* Add return type for Ens#resolve
* Add isSupportedDomainInNetwork in Resolution
* Add isSupportedNetwork for ZNS 


## 0.2.35

* Make Ens#network and Ens#url public properties
* Change default ENS source protocol from wss (websocket) to https
* Make Ens `web3`, `ensContract` and `registrarContract` private properties
* Ability to provide ENS network configuration as string like `mainnet`, `testnet` etc.
* Make properties of `Resolution` class readonly

## 0.2.34 - 0.2.31

* Added isSupportedNetwork method for ens
* Make isSupportedNetwork configurable from outside by passing network agrument
* isSupportedDomain is no longer checks for supported network inside the ens

## 0.2.30 and earlier

* Changelog is not tracked
