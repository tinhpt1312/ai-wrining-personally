import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ENV } from './env.config';

const SWAGGER_PATH = 'docs';
const SWAGGER_CDN_VERSION = '5.11.0';
const SWAGGER_CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/${SWAGGER_CDN_VERSION}`;

/**
 * OpenAPI server URL for Swagger "Try it out".
 * - Default `/` → Swagger dùng đúng domain trình duyệt đang mở (prod, preview, local).
 * - Override: API_PUBLIC_URL=https://ai-wrining-personally.vercel.app
 */
function getSwaggerServerUrl(): string {
  const explicit = process.env.API_PUBLIC_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV !== 'production') {
    return `http://localhost:${ENV.APP_PORT ?? 8000}`;
  }

  return '/';
}

export const setupSwagger = (app: INestApplication) => {
  const options = new DocumentBuilder()
    .setTitle('AI Writing API')
    .setDescription('API cho ứng dụng Viết & Chấm Văn')
    .setVersion('1.0')
    .addServer(getSwaggerServerUrl())
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCssUrl: `${SWAGGER_CDN_BASE}/swagger-ui.min.css`,
    customJs: [
      `${SWAGGER_CDN_BASE}/swagger-ui-bundle.js`,
      `${SWAGGER_CDN_BASE}/swagger-ui-standalone-preset.js`,
    ],
  });
};

export const SWAGGER_DOCS_PATH = `/api/${SWAGGER_PATH}`;
