import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { ReviewSummaryService } from '../recipes/review-summary.service';
import type { RecipeDocument } from '../recipes/recipe.schema';
import { UserDocument } from './users.schema';
import { UsersService } from './users.service';

class RecipeModelStub {
    static findOne = jest.fn();
    recipeId = '';
    title = '';
    reviews: RecipeDocument['reviews'] = [];
    save = jest.fn().mockResolvedValue(this);

    constructor(data: Partial<RecipeDocument>) {
        Object.assign(this, data);
    }
}

describe('UsersService', () => {
    let service: UsersService;
    let userModel: {
        findById: jest.Mock;
        findByIdAndUpdate: jest.Mock;
    };
    let user: {
        favoriteRecipes: {
            recipeId: string;
            title: string;
            recipeImage: string;
        }[];
        reviewRecipes: {
            recipeId: string;
            title: string;
            recipeImage: string;
            date: Date;
            comment?: string;
            grade: number;
            imageBase64: string;
        }[];
        save: jest.Mock;
    };
    let recipe: RecipeDocument;
    let updateForNewComment: jest.Mock;

    beforeEach(() => {
        user = {
            favoriteRecipes: [],
            reviewRecipes: [],
            save: jest.fn().mockResolvedValue(undefined),
        };
        userModel = {
            findById: jest.fn().mockResolvedValue(user),
            findByIdAndUpdate: jest.fn(),
        };
        recipe = {
            recipeId: 'recipe-1',
            title: 'Recipe',
            reviews: [],
            save: jest.fn().mockResolvedValue(undefined),
        } as unknown as RecipeDocument;
        RecipeModelStub.findOne = jest.fn().mockResolvedValue(null);
        updateForNewComment = jest.fn().mockResolvedValue(undefined);
        service = new UsersService(
            userModel as unknown as Model<UserDocument>,
            RecipeModelStub as unknown as Model<RecipeDocument>,
            { updateForNewComment } as unknown as ReviewSummaryService,
        );
    });

    it('adds a favorite at the front and uses an empty image when omitted', async () => {
        await service.addFavoriteRecipe('user-1', {
            id: 'recipe-1',
            title: 'Recipe',
        });

        expect(user.favoriteRecipes).toEqual([
            { recipeId: 'recipe-1', title: 'Recipe', recipeImage: '' },
        ]);
        expect(user.save).toHaveBeenCalledTimes(1);
    });

    it('rejects a duplicate favorite without saving', async () => {
        user.favoriteRecipes.push({
            recipeId: 'recipe-1',
            title: 'Recipe',
            recipeImage: '',
        });

        await expect(
            service.addFavoriteRecipe('user-1', {
                id: 'recipe-1',
                title: 'Recipe',
            }),
        ).rejects.toThrow(
            new BadRequestException('Receita já está nos favoritos'),
        );
        expect(user.save).not.toHaveBeenCalled();
    });

    it('creates a review in both records and requests a summary for a new comment', async () => {
        RecipeModelStub.findOne.mockResolvedValueOnce(null);

        await service.addReview('user-1', 'recipe-1', {
            title: 'Recipe',
            grade: 5,
            comment: 'Great recipe!',
        });

        expect(user.reviewRecipes).toHaveLength(1);
        expect(user.reviewRecipes[0]).toMatchObject({
            recipeId: 'recipe-1',
            grade: 5,
            comment: 'Great recipe!',
        });
        expect(user.save).toHaveBeenCalledTimes(1);
        expect(updateForNewComment).toHaveBeenCalledWith('recipe-1', true);
    });

    it('updates an existing review without treating it as a new comment milestone', async () => {
        const previousDate = new Date('2026-01-01T00:00:00.000Z');
        user.reviewRecipes.push({
            recipeId: 'recipe-1',
            title: 'Original title',
            recipeImage: '',
            date: previousDate,
            comment: 'Old comment',
            grade: 4,
            imageBase64: '',
        });
        recipe.reviews.push({
            userId: 'user-1',
            date: previousDate,
            comment: 'Old comment',
            grade: 4,
            imageBase64: '',
        });
        RecipeModelStub.findOne.mockResolvedValueOnce(recipe);

        await service.addReview('user-1', 'recipe-1', {
            comment: 'Updated comment',
        });

        expect(user.reviewRecipes[0]).toMatchObject({
            comment: 'Updated comment',
            grade: 4,
            title: 'Original title',
        });
        expect(recipe.reviews[0]).toMatchObject({
            comment: 'Updated comment',
            grade: 4,
        });
        expect(updateForNewComment).toHaveBeenCalledWith('recipe-1', false);
    });
});
