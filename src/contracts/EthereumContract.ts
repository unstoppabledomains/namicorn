import {Interface, JsonFragment} from '@ethersproject/abi';
import {RequestArguments, EventData} from '../types';
import {Provider} from '../types/publicTypes';

export default class EthereumContract {
  readonly abi: JsonFragment[];
  readonly coder: Interface;
  readonly address: string;
  readonly provider: Provider;

  constructor(abi: JsonFragment[], address: string, provider: Provider) {
    this.abi = abi;
    this.address = address;
    this.provider = provider;
    this.coder = new Interface(this.abi);
  }

  async call(
    method: string,
    args: (string | string[])[],
  ): Promise<ReadonlyArray<any>> {
    const inputParam = this.coder.encodeFunctionData(method, args);
    const response = (await this.callEth(inputParam)) as string;
    if (!response || response === '0x') {
      return [];
    }

    return this.coder.decodeFunctionResult(method, response);
  }

  async fetchLogs(
    eventName: string,
    tokenId: string,
    fromBlock = 'earliest',
  ): Promise<EventData[]> {
    const topic = this.coder.getEventTopic(eventName);
    const params = [
      {
        fromBlock,
        toBlock: 'latest',
        address: this.address,
        topics: [topic, tokenId],
      },
    ];
    const request: RequestArguments = {
      method: 'eth_getLogs',
      params,
    };
    return (await this.provider.request(request)) as Promise<EventData[]>;
  }

  private async callEth(data: string): Promise<unknown> {
    const params = [
      {
        data,
        to: this.address,
      },
      'latest',
    ];
    const request: RequestArguments = {
      method: 'eth_call',
      params,
    };
    return await this.provider.request(request);
  }
}
