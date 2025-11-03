import { workers } from './workers';

describe('workers', () => {
  it('should work', () => {
    expect(workers()).toEqual('workers');
  });
});
