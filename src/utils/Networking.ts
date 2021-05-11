import nodeFetch, {Response as FetchResponse} from 'node-fetch';

export default class Networking {
  static isNode(): boolean {
    if (typeof process === 'object') {
      // eslint-disable-next-line no-undef
      if (typeof process.versions === 'object') {
        // eslint-disable-next-line no-undef
        if (typeof process.versions.node !== 'undefined') {
          return true;
        }
      }
    }

    return false;
  }

  static getEnv(): 'NODE' | 'BROWSER' {
    return this.isNode() ? 'NODE' : 'BROWSER';
  }

  static async fetch(
    url: string,
    options: {body?: string; headers?: Record<string, string>; method?: string},
  ): Promise<FetchResponse | Response> {
    return this.isNode() ? nodeFetch(url, options) : window.fetch(url, options);
  }
}
