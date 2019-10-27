/**
 * SourceDefinition object
 * @typedef {Object} SourceDefinition
 * @property {string} [url] - main blockchain api url
 * @property {string | number} [network] - blockchain network
 */

export interface SourceDefinition {
  url?: string;
  network?: string | number;
  registry?: string;
}

/**
 * NamicornResulution
 * @typedef {Object} NamicornResolution
 * @property {Object} addresses - resolution addresses for various currency addresses attached to the domain
 * @property {Object} meta - meta information about the owner of the domain 
 */

export type NamicornResolution = {
    addresses: {
      [key: string]: string
    },
    meta: {
      owner: string,
      type: string //available domain
      ttl: number,
    },
  }

/**
 * @ignore
 * Used internally to map network number to a string
 */
export type NetworkIdMap = {
  [key: number]: string;
};

/**
 * Main configurational object for Namicorn instance
 */
export type Blockchain =
  | boolean
  | {
      ens?: string | boolean | SourceDefinition;
      zns?: string | boolean | SourceDefinition;
    };
