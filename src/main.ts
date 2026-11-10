import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import compression from 'compression';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { isCsrfEnabled, requireCsrfSecret } from './config/security-secrets';
function buildCorsOptions(): CorsOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const allowedList =
    process.env.CORS_ORIGINS?.split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0) ?? [];
  const base: CorsOptions = {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  };
  if (allowedList.length > 0) {
    return {
      ...base,
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedList.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
    };
  }
  if (isProd) {
    console.warn(
      '⚠ CORS: defina CORS_ORIGINS em produção (ex.: https://app.seudominio.com) para restringir browsers.',
    );
  }
  return {
    ...base,
    origin: true,
  };
}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors(buildCorsOptions());
  if (!isProd) {
    app.use((req, _res, next) => {
      console.log(
        `[HTTP] ${req.method} ${req.url} origin=${req.headers.origin ?? '—'}`,
      );
      next();
    });
  }
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    compression({
      threshold: 1024,
    }),
  );
  app.use(cookieParser());
  const csrfEnabled = isCsrfEnabled();
  if (csrfEnabled) {
    const csrfSecret = requireCsrfSecret();
    const { doubleCsrfProtection } = doubleCsrf({
      getSecret: () => csrfSecret,
      getSessionIdentifier: (req) => req.ip ?? 'anonymous-session',
      cookieName: '__Host-psifi.x-csrf-token',
      cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      },
    });
    app.use(doubleCsrfProtection);
    console.log('✓ CSRF Protection enabled');
  } else {
    console.warn('⚠ CSRF Protection disabled (development mode)');
  }
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
