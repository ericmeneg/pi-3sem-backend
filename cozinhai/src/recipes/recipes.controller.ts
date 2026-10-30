import {
    Controller,
    DefaultValuePipe,
    Get,
    Param,
    ParseIntPipe,
    Query,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import type { RecipeReviewSummary } from './review-summary.service';

@Controller('recipe')
export class RecipesController {
    constructor(private readonly recipesService: RecipesService) { }

    @Get('/:recipeId/reviews')
    async listRecipeReviews(
        @Param('recipeId') recipeId: string,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ): Promise<{
        date: Date;
        comment: string;
        grade: number;
        imageBase64: string
    }[]> {
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
