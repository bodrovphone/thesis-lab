import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Shared Nest bootstrap for production and e2e — keeps ValidationPipe / CORS
 * from drifting between `main.ts` and test suites.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService);
  const corsOrigin = config.get<string>('CORS_ORIGIN');
  if (corsOrigin?.trim()) {
    const origins = corsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (origins.length > 0) {
      app.enableCors({ origin: origins });
    }
  }

  return app;
}
