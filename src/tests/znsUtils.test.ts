import {toChecksumAddress} from '../utils/znsUtils';
describe('utils', () => {
  it('should work', () => {
    const checksum = toChecksumAddress(
      '0xb17c35e557a8c13a730696c92d716a58421e36ca',
    );
    expect(checksum).toEqual('0xB17C35e557a8c13a730696C92D716A58421e36cA');
  });
});
