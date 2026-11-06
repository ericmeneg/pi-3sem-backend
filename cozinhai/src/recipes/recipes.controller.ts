import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import type { RecipeReviewSummary } from './review-summary.service';

@Controller('recipe')
export class RecipesController {
    constructor(private readonly recipesService: RecipesService) {}

    @Get('/:recipeId/reviews')
    async listRecipeReviews(
        @Param('recipeId') recipeId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
        @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
    ): Promise<
        {
            date: Date;
            comment: string;
            grade: number;
            imageBase64: string;
        }[]
    > {
        return await this.recipesService.listRecipeReviews(
            recipeId,
            limit,
            offset,
        );
    }

    @Get('/:recipeId/review-summary')
    async getReviewSummary(
        @Param('recipeId') recipeId: string,
    ): Promise<RecipeReviewSummary> {
        return this.recipesService.getReviewSummary(recipeId);
    }
}
