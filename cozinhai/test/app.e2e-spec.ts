import {
    INestApplication,
    BadRequestException,
    ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthGuard } from '../src/auth/auth.guard';
import { AuthService } from '../src/auth/auth.service';
import { AuthController } from '../src/auth/auth.controller';
import { RecipesController } from '../src/recipes/recipes.controller';
import { RecipesService } from '../src/recipes/recipes.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('Backend endpoints (isolated e2e)', () => {
    let app: INestApplication<App>;

    const usersService = {
        createUser: jest.fn(),
        addFavoriteRecipe: jest.fn(),
        listFavoriteRecipes: jest.fn(),
        addReview: jest.fn(),
    };
    const recipesService = {
        listRecipeReviews: jest.fn(),
        getReviewSummary: jest.fn(),
    };
    const authService = {
        validateUser: jest.fn(),
        login: jest.fn(),
    };
    const jwtService = {
        verify: jest.fn((token: string) => {
            if (token !== 'valid-test-token') {
                throw new Error('Invalid test token');
            }
            return { id: 'test-user-id' };
        }),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [AuthController, RecipesController, UsersController],
            providers: [
                AuthGuard,
                { provide: AuthService, useValue: authService },
                { provide: JwtService, useValue: jwtService },
                { provide: RecipesService, useValue: recipesService },
                { provide: UsersService, useValue: usersService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
                exceptionFactory: (validationErrors) => {
                    const errors: Record<string, string[]> = {};
                    validationErrors.forEach((error) => {
                        errors[error.property] = Object.values(
                            error.constraints ?? {},
                        );
                    });
                    return new BadRequestException({
                        statusCode: 400,
                        message: 'Validação falhou',
                        errors,
                    });
                },
            }),
        );
        await app.init();
    });

    afterEach(async () => {
        await app.close();
        jest.restoreAllMocks();
    });

    it('creates a user using the service provider without connecting to a database', async () => {
        usersService.createUser.mockResolvedValue({});

        await request(app.getHttpServer())
            .post('/user')
            .send({
                name: 'Test User',
                email: 'test@example.test',
                password: 'SafeTest1!',
            })
            .expect(201)
            .expect('Usuário criado com sucesso');

        expect(usersService.createUser).toHaveBeenCalledWith({
            name: 'Test User',
            email: 'test@example.test',
            password: 'SafeTest1!',
        });
    });

    it('returns the configured validation error and rejects unknown fields', async () => {
        const response = await request(app.getHttpServer())
            .post('/user')
            .send({
                name: 'ab',
                email: 'invalid',
                password: 'weak',
                unexpected: true,
            })
            .expect(400);

        const responseBody: unknown = response.body;
        expect(responseBody).toMatchObject({
            statusCode: 400,
            message: 'Validação falhou',
        });
        const errors = (responseBody as { errors: Record<string, unknown> })
            .errors;
        expect(Object.keys(errors)).toEqual(
            expect.arrayContaining(['name', 'email', 'password', 'unexpected']),
        );
        expect(Array.isArray(errors.name)).toBe(true);
        expect(Array.isArray(errors.email)).toBe(true);
        expect(Array.isArray(errors.password)).toBe(true);
        expect(Array.isArray(errors.unexpected)).toBe(true);
        expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('returns unauthorized for validly shaped credentials that do not match', async () => {
        authService.validateUser.mockResolvedValue(null);

        await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: 'test@example.test',
                password: 'SafeTest1!',
            })
            .expect(401)
            .expect({ message: 'Usuário ou senha inválidos' });
    });

    it('returns the token and public user fields at the top-level login response', async () => {
        const user = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.test',
            status: true,
        };
        authService.validateUser.mockResolvedValue(user);
        authService.login.mockReturnValue({
            access_token: 'test-jwt',
            user,
        });

        await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: 'test@example.test',
                password: 'SafeTest1!',
            })
            .expect(200)
            .expect({
                access_token: 'test-jwt',
                user: {
                    id: 'test-user-id',
                    name: 'Test User',
                    email: 'test@example.test',
                },
            });
    });

    it('blocks protected endpoints without a bearer token', async () => {
        await request(app.getHttpServer())
            .patch('/user/test-user/favorites')
            .send({ id: 'recipe-1', title: 'Recipe' })
            .expect(403);

        expect(usersService.addFavoriteRecipe).not.toHaveBeenCalled();
    });

    it('blocks an invalid bearer token', async () => {
        await request(app.getHttpServer())
            .patch('/user/test-user/favorites')
            .set('Authorization', 'Bearer invalid-test-token')
            .send({ id: 'recipe-1', title: 'Recipe' })
            .expect(403);

        expect(jwtService.verify).toHaveBeenCalledWith('invalid-test-token');
        expect(usersService.addFavoriteRecipe).not.toHaveBeenCalled();
    });

    it('rejects malformed bearer headers', async () => {
        await request(app.getHttpServer())
            .patch('/user/test-user/favorites')
            .set('Authorization', 'Basic valid-test-token')
            .send({ id: 'recipe-1', title: 'Recipe' })
            .expect(403);

        expect(jwtService.verify).not.toHaveBeenCalled();
        expect(usersService.addFavoriteRecipe).not.toHaveBeenCalled();
    });

    it('accepts a valid test token and passes parsed pagination to the service', async () => {
        usersService.listFavoriteRecipes.mockResolvedValue([
            { recipeId: 'recipe-1', title: 'Recipe' },
        ]);

        await request(app.getHttpServer())
            .get('/user/test-user/favorites?limit=1&offset=0')
            .set('Authorization', 'Bearer valid-test-token')
            .expect(200)
            .expect([{ recipeId: 'recipe-1', title: 'Recipe' }]);

        expect(usersService.listFavoriteRecipes).toHaveBeenCalledWith(
            'test-user',
            1,
            0,
        );
    });

    it('returns a validation error for invalid pagination on a protected endpoint', async () => {
        await request(app.getHttpServer())
            .get('/user/test-user/favorites?limit=invalid')
            .set('Authorization', 'Bearer valid-test-token')
            .expect(400);

        expect(usersService.listFavoriteRecipes).not.toHaveBeenCalled();
    });

    it('returns the public recipe review summary from the service', async () => {
        const summary = {
            status: 'available',
            summary: 'Test summary',
            reviewCount: 5,
            pendingReviewCount: null,
            generatedAt: null,
            averageRating: 4.5,
            ratingCount: 2,
        };
        recipesService.getReviewSummary.mockResolvedValue(summary);

        await request(app.getHttpServer())
            .get('/recipe/recipe-1/review-summary')
            .expect(200)
            .expect(summary);

        expect(recipesService.getReviewSummary).toHaveBeenCalledWith(
            'recipe-1',
        );
    });

    it('uses default pagination for public recipe reviews', async () => {
        recipesService.listRecipeReviews.mockResolvedValue([]);

        await request(app.getHttpServer())
            .get('/recipe/recipe-1/reviews')
            .expect(200)
            .expect([]);

        expect(recipesService.listRecipeReviews).toHaveBeenCalledWith(
            'recipe-1',
            10,
            0,
        );
    });
});
