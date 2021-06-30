import {RequestArguments} from './types';
import ResolutionError, {ResolutionErrorCode} from './errors/resolutionError';
import {ResolutionMethod, Provider} from './types/publicTypes';
import Networking from './utils/Networking';

export default class FetchProvider implements Provider {
  readonly url: string;
  readonly name: ResolutionMethod;

  constructor(name: ResolutionMethod, url: string) {
    this.url = url;
    this.name = name;
  }

  // This is used for test mocking
  static factory(name: ResolutionMethod, url: string): FetchProvider {
    return new this(name, url);
  }

  async request(args: RequestArguments): Promise<unknown> {
    const json = await this.fetchJson(args);
    if (json.error) {
      throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
        providerMessage: json.error.message,
      });
    }
    return json.result;
  }

  protected async fetchJson(
    args: RequestArguments,
  ): Promise<
    | {error: {message: string}; result: undefined}
    | {error: undefined; result: unknown}
  > {
    const response = await Networking.fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: args.method,
        params: args.params || [],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.status !== 200) {
      throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
        providerMessage: `Request to ${this.url} failed with responce status ${response.status}`,
      });
    }
    return response.json();
  }
}
