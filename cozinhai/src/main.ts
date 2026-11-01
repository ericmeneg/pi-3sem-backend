import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
    BadRequestException,
    ValidationError,
    ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bodyParser: true,
    });

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    const configService = app.get(ConfigService);
    const allowedOrigins =
        configService
            .get<string>('CORS_ORIGINS')
            ?.split(',')
            .map((origin) => origin.trim())
            .filter(Boolean) ?? ['http://localhost:3000'];

    app.enableCors({
        origin: allowedOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: 'Content-Type, Authorization',
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            exceptionFactory: (validationErrors: ValidationError[]) => {
                const errors: Record<string, string[]> = {};
                validationErrors.forEach((error) => {
                    errors[error.property] = Object.values(
                        error.constraints ?? {},
                    );
                });
                return new BadRequestException({
                    statusCode: 400,
                    message: 'Validação falhou',
                    errors: errors,
                });
            },
        }),
    );

    const port = Number(configService.get<string>('PORT') ?? 3001);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid PORT value: ${configService.get('PORT')}`);
    }

    await app.listen(port, '0.0.0.0');
}

bootstrap();
