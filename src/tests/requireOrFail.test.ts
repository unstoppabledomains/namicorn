import {requireOrFail} from '../utils/requireOrFail';

describe('requireOrFail', () => {
  it('should throw configuration error', () => {
    expect(() =>
      requireOrFail('non-existent-module', 'requested-module', '1'),
    ).toThrowError(
      'Missing dependency for this functionality. Please install requested-module @ 1 via npm or yarn',
    );
  });

  it('should succeed', () => {
    const module = requireOrFail(
      '../utils/requireOrFail',
      'require-or-fail',
      '1',
    );
    expect(module.requireOrFail).toEqual(requireOrFail);
  });
});
