import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import type { UserDocument } from '../users/users.schema';
import type { RecipeDocument } from './recipe.schema';
import { ReviewSummaryService } from './review-summary.service';

describe('ReviewSummaryService', () => {
    let service: ReviewSummaryService;
    let recipeModel: jest.Mocked<Pick<Model<RecipeDocument>, 'findOne'>>;
    let userModel: jest.Mocked<Pick<Model<UserDocument>, 'find'>>;
    let recipe: RecipeDocument;
    let activeUsers: { _id: string }[];
    let fetchMock: jest.SpyInstance;
    let saveMock: jest.Mock;

    beforeEach(() => {
        recipe = {
            recipeId: 'recipe-1',
            reviews: Array.from({ length: 5 }, (_, index) => ({
                userId: `user-${index + 1}`,
                date: new Date(),
                comment: `Comentário ${index + 1}`,
                grade: 5,
                imageBase64: '',
            })),
            reviewSummary: null,
            reviewSummaryReviewCount: 0,
            reviewSummaryUpdatedAt: null,
            reviewSummaryPendingCount: null,
            save: (saveMock = jest.fn().mockResolvedValue(undefined)),
        } as unknown as RecipeDocument;
        activeUsers = recipe.reviews.map(({ userId }) => ({ _id: userId }));
        fetchMock = jest.spyOn(global, 'fetch');

        recipeModel = {
            findOne: jest.fn().mockResolvedValue(recipe),
        } as unknown as typeof recipeModel;
        userModel = {
            find: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    exec: jest
                        .fn()
                        .mockImplementation(() => Promise.resolve(activeUsers)),
                }),
            }),
        } as unknown as typeof userModel;

        const configService = {
            get: jest.fn((key: string) =>
                key === 'GEMINI_API_KEY' ? 'test-api-key' : undefined,
            ),
        } as unknown as ConfigService;
        service = new ReviewSummaryService(
            recipeModel as unknown as Model<RecipeDocument>,
            userModel as unknown as Model<UserDocument>,
            configService,
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('generates and persists a summary at five active non-empty comments', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: 'Resumo da receita.' }],
                            },
                        },
                    ],
                }),
        } as Response);

        await service.updateForNewComment('recipe-1', true);

        expect(recipe.reviewSummary).toBe('Resumo da receita.');
        expect(recipe.reviewSummaryReviewCount).toBe(5);
        expect(recipe.reviewSummaryUpdatedAt).toBeInstanceOf(Date);
        expect(recipe.reviewSummaryPendingCount).toBeNull();
        expect(saveMock).toHaveBeenCalledTimes(2);
    });

    it('does not regenerate a summary for an edited review', async () => {
        await service.updateForNewComment('recipe-1', false);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(saveMock).not.toHaveBeenCalled();
    });

    it('returns the saved summary while indicating a pending update', async () => {
        recipe.reviewSummary = 'Resumo de cinco comentários';
        recipe.reviewSummaryReviewCount = 5;
        recipe.reviewSummaryPendingCount = 10;

        await expect(service.getSummary('recipe-1')).resolves.toEqual({
            status: 'pending',
            summary: 'Resumo de cinco comentários',
            reviewCount: 5,
            pendingReviewCount: 10,
            generatedAt: null,
            averageRating: 5,
            ratingCount: 5,
        });
    });

    it('returns the average active rating rounded to one decimal place', async () => {
        recipe.reviews[0].grade = 5;
        recipe.reviews[1].grade = 4;
        recipe.reviews[2].grade = 4;
        recipe.reviews[3].grade = 4;
        recipe.reviews[4].grade = 1;
        activeUsers = activeUsers.slice(0, 4);

        await expect(service.getSummary('recipe-1')).resolves.toMatchObject({
            averageRating: 4.3,
            ratingCount: 4,
        });
    });

    it('returns a null average when there are no active ratings', async () => {
        recipe.reviews = [];
        activeUsers = [];

        await expect(service.getSummary('recipe-1')).resolves.toMatchObject({
            averageRating: null,
            ratingCount: 0,
        });
    });

    it('does not count comments by inactive users', async () => {
        activeUsers = activeUsers.slice(0, 4);
        userModel.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(activeUsers),
            }),
        } as never);

        await service.updateForNewComment('recipe-1', true);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('updates the stored summary at ten comments', async () => {
        recipe.reviewSummary = 'Resumo de cinco comentários';
        recipe.reviewSummaryReviewCount = 5;
        const additionalReviews = Array.from({ length: 5 }, (_, index) => ({
            userId: `user-${index + 6}`,
            date: new Date(),
            comment: `Comentário ${index + 6}`,
            grade: 4,
            imageBase64: '',
        }));
        recipe.reviews.push(...additionalReviews);
        activeUsers.push(
            ...additionalReviews.map(({ userId }) => ({ _id: userId })),
        );
        fetchMock.mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: 'Resumo atualizado.' }],
                            },
                        },
                    ],
                }),
        } as Response);

        await service.updateForNewComment('recipe-1', true);

        expect(recipe.reviewSummary).toBe('Resumo atualizado.');
        expect(recipe.reviewSummaryReviewCount).toBe(10);
        expect(saveMock).toHaveBeenCalledTimes(2);
    });

    it('keeps the previous summary and records the pending milestone on failure', async () => {
        recipe.reviewSummary = 'Resumo anterior';
        recipe.reviewSummaryReviewCount = 5;
        const additionalReviews = Array.from({ length: 5 }, (_, index) => ({
            userId: `user-${index + 6}`,
            date: new Date(),
            comment: `Comentário ${index + 6}`,
            grade: 4,
            imageBase64: '',
        }));
        recipe.reviews.push(...additionalReviews);
        activeUsers.push(
            ...additionalReviews.map(({ userId }) => ({ _id: userId })),
        );
        fetchMock.mockResolvedValue({
            ok: false,
            status: 429,
        } as Response);
        const errorLogger = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);

        await expect(
            service.updateForNewComment('recipe-1', true),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);

        expect(recipe.reviewSummary).toBe('Resumo anterior');
        expect(recipe.reviewSummaryPendingCount).toBe(10);
        expect(saveMock).toHaveBeenCalledTimes(1);
        expect(errorLogger).toHaveBeenCalled();
    });
});
