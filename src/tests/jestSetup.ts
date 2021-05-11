import {isLive} from './helpers';
import nock from 'nock';

beforeAll(() => {
  if (!isLive()) {
    nock.disableNetConnect();
  }
});

afterAll(() => {
  nock.enableNetConnect();
});
