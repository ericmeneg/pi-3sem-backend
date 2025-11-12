import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
    BadRequestException,
    ValidationError,
    ValidationPipe,
} from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bodyParser: true,
    });

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    app.enableCors({
        origin: process.env.CORS_ORIGIN || '*',
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

    await app.listen(process.env.PORT || 3001);
}

bootstrap();
