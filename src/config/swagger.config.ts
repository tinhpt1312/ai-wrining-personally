import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ENV } from './env.config';

const SWAGGER_PATH = 'docs';
const SWAGGER_CDN_VERSION = '5.11.0';
const SWAGGER_CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/${SWAGGER_CDN_VERSION}`;

function getPublicBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return `http://localhost:${ENV.APP_PORT ?? 8000}`;
}

export const setupSwagger = (app: INestApplication) => {
  const options = new DocumentBuilder()
    .setTitle('AI Writing API')
    .setDescription('API cho ứng dụng Viết & Chấm Văn')
    .setVersion('1.0')
    .addServer(getPublicBaseUrl())
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
