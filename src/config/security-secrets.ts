export type SecurityEnv = {
  NODE_ENV?: string;
  JWT_SECRET?: string;
  CSRF_SECRET?: string;
  DISABLE_CSRF?: string;
  ENABLE_CSRF?: string;
  [key: string]: string | undefined;
};
export function isCsrfEnabled(env: SecurityEnv = process.env): boolean {
  const isProd = env.NODE_ENV === 'production';
  return isProd ? env.DISABLE_CSRF !== 'true' : env.ENABLE_CSRF === 'true';
}
function readRequiredSecret(
  env: Record<string, unknown>,
  key: 'JWT_SECRET' | 'CSRF_SECRET',
): string {
  const value = env[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `${key} is required and must be a non-empty string. Application cannot start.`,
    );
  }
  return value;
}
export function validateSecuritySecrets(
  config: Record<string, unknown>,
): Record<string, unknown> {
  readRequiredSecret(config, 'JWT_SECRET');
  if (isCsrfEnabled(config as SecurityEnv)) {
    readRequiredSecret(config, 'CSRF_SECRET');
  }
  return config;
}
export function requireJwtSecret(
  env: Record<string, unknown> = process.env,
): string {
  return readRequiredSecret(env, 'JWT_SECRET');
}
export function requireCsrfSecret(
  env: Record<string, unknown> = process.env,
): string {
  return readRequiredSecret(env, 'CSRF_SECRET');
}
