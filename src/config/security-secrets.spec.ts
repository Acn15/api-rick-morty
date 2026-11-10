import {
  isCsrfEnabled,
  requireCsrfSecret,
  requireJwtSecret,
  validateSecuritySecrets,
} from './security-secrets';
describe('security-secrets', () => {
  describe('isCsrfEnabled', () => {
    it('should enable CSRF in production by default', () => {
      expect(isCsrfEnabled({ NODE_ENV: 'production' })).toBe(true);
    });
    it('should disable CSRF in production when DISABLE_CSRF=true', () => {
      expect(
        isCsrfEnabled({ NODE_ENV: 'production', DISABLE_CSRF: 'true' }),
      ).toBe(false);
    });
    it('should disable CSRF in development by default', () => {
      expect(isCsrfEnabled({ NODE_ENV: 'development' })).toBe(false);
    });
    it('should enable CSRF in development when ENABLE_CSRF=true', () => {
      expect(
        isCsrfEnabled({ NODE_ENV: 'development', ENABLE_CSRF: 'true' }),
      ).toBe(true);
    });
  });
  describe('validateSecuritySecrets', () => {
    it('should throw when JWT_SECRET is missing', () => {
      expect(() =>
        validateSecuritySecrets({
          NODE_ENV: 'development',
          DISABLE_CSRF: 'true',
        }),
      ).toThrow(/JWT_SECRET is required/);
    });
    it('should throw when JWT_SECRET is blank', () => {
      expect(() =>
        validateSecuritySecrets({
          NODE_ENV: 'development',
          JWT_SECRET: '   ',
          DISABLE_CSRF: 'true',
        }),
      ).toThrow(/JWT_SECRET is required/);
    });
    it('should accept valid JWT_SECRET when CSRF is explicitly disabled', () => {
      const env = {
        NODE_ENV: 'production',
        JWT_SECRET: 'unit-test-jwt-secret',
        DISABLE_CSRF: 'true',
      };
      expect(validateSecuritySecrets(env)).toEqual(env);
    });
    it('should throw when CSRF is enabled and CSRF_SECRET is missing', () => {
      expect(() =>
        validateSecuritySecrets({
          NODE_ENV: 'production',
          JWT_SECRET: 'unit-test-jwt-secret',
        }),
      ).toThrow(/CSRF_SECRET is required/);
    });
    it('should throw when CSRF is enabled and CSRF_SECRET is blank', () => {
      expect(() =>
        validateSecuritySecrets({
          NODE_ENV: 'development',
          ENABLE_CSRF: 'true',
          JWT_SECRET: 'unit-test-jwt-secret',
          CSRF_SECRET: '',
        }),
      ).toThrow(/CSRF_SECRET is required/);
    });
    it('should accept valid JWT_SECRET and CSRF_SECRET when CSRF is enabled', () => {
      const env = {
        NODE_ENV: 'production',
        JWT_SECRET: 'unit-test-jwt-secret',
        CSRF_SECRET: 'unit-test-csrf-secret',
      };
      expect(validateSecuritySecrets(env)).toEqual(env);
    });
    it('should not require CSRF_SECRET in development when CSRF is not enabled', () => {
      const env = {
        NODE_ENV: 'development',
        JWT_SECRET: 'unit-test-jwt-secret',
      };
      expect(validateSecuritySecrets(env)).toEqual(env);
    });
    it('should never include secret values in error messages', () => {
      const leaked = 'super-leaky-secret-value';
      expect(() =>
        validateSecuritySecrets({
          NODE_ENV: 'production',
          JWT_SECRET: leaked,
        }),
      ).toThrow(/CSRF_SECRET is required/);
      try {
        validateSecuritySecrets({
          NODE_ENV: 'production',
          JWT_SECRET: leaked,
        });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).not.toContain(leaked);
      }
    });
  });
  describe('requireJwtSecret / requireCsrfSecret', () => {
    it('should return JWT_SECRET when present', () => {
      expect(requireJwtSecret({ JWT_SECRET: 'unit-test-jwt-secret' })).toBe(
        'unit-test-jwt-secret',
      );
    });
    it('should return CSRF_SECRET when present', () => {
      expect(requireCsrfSecret({ CSRF_SECRET: 'unit-test-csrf-secret' })).toBe(
        'unit-test-csrf-secret',
      );
    });
  });
});
