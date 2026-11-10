import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
// import cookieParser from 'cookie-parser';
// import { doubleCsrf } from 'csrf-csrf';
// import compression from 'compression';
// import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
// import { isCsrfEnabled, requireCsrfSecret } from './config/security-secrets';
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
  console.log('[boot] starting NestFactory.create');
  const app = await NestFactory.create(AppModule);
  console.log('[boot] NestFactory.create ok');
  app.enableCors(buildCorsOptions());
  // Middleware pesado comentado para isolar crash na Vercel
  // if (!isProd) {
  //   app.use((req, _res, next) => {
  //     console.log(
  //       `[HTTP] ${req.method} ${req.url} origin=${req.headers.origin ?? '—'}`,
  //     );
  //     next();
  //   });
  // }
  // app.use(
  //   helmet({
  //     contentSecurityPolicy: false,
  //     crossOriginResourcePolicy: { policy: 'cross-origin' },
  //   }),
  // );
  // app.use(
  //   compression({
  //     threshold: 1024,
  //   }),
  // );
  // app.use(cookieParser());
  // CSRF desligado junto com Auth/Users (Prisma off)
  // const csrfEnabled = isCsrfEnabled();
  // if (csrfEnabled) {
  //   const csrfSecret = requireCsrfSecret();
  //   const { doubleCsrfProtection } = doubleCsrf({
  //     getSecret: () => csrfSecret,
  //     getSessionIdentifier: (req) => req.ip ?? 'anonymous-session',
  //     cookieName: '__Host-psifi.x-csrf-token',
  //     cookieOptions: {
  //       httpOnly: true,
  //       sameSite: 'strict',
  //       secure: process.env.NODE_ENV === 'production',
  //     },
  //   });
  //   app.use(doubleCsrfProtection);
  //   console.log('✓ CSRF Protection enabled');
  // } else {
  //   console.warn('⚠ CSRF Protection disabled (development mode)');
  // }
  console.warn('⚠ CSRF/helmet/compression disabled (Vercel isolate)');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  // Vercel captura listen(PORT) — NÃO passar host (ex.: 0.0.0.0)
  console.log('[boot] calling app.listen');
  await app.listen(process.env.PORT ?? 3000);
  console.log('[boot] listen ok');
}
bootstrap().catch((error: unknown) => {
  console.error('[boot] FATAL', error);
  throw error;
});
