/**
 * Simple test to verify Jest is working
 */

describe('Simple Test', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });
});
