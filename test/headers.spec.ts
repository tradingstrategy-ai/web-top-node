import { convertHeadersToTuples, Tracker } from '../src/tracker';

describe('tracker', () => {
  describe('convertHeadersToTuples', () => {
    it('should convert headers correctly', () => {
      const nodeLikeHeaders = {
        'user-agent': 'Peas in a pot',
        'set-cookie': ['cookie1', 'cookie2'],
      };

      const massaged = convertHeadersToTuples(nodeLikeHeaders);

      const wsgiLikeHeaders = [
        ['USER-AGENT', 'Peas in a pot'],
        ['SET-COOKIE', 'cookie1'],
        ['SET-COOKIE', 'cookie2'],
      ];

      expect(massaged).toEqual(wsgiLikeHeaders);
    });
  });
});
