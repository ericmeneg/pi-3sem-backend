import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RecipeDocument = HydratedDocument<Recipe>;

@Schema()
export class Recipe {
    @Prop({ required: true, unique: true })
    recipeId!: string;

    @Prop()
    title?: string;

    @Prop({
        type: [
            {
                userId: String,
                date: Date,
                comment: String,
                grade: Number,
                imageBase64: String,
            },
        ],
        default: [],
    })
    reviews!: {
        userId: string;
        date: Date;
        comment?: string;
        grade: number;
        imageBase64: string;
    }[];

    @Prop({ type: String, default: null })
    reviewSummary!: string | null;

    @Prop({ type: Number, default: 0 })
    reviewSummaryReviewCount!: number;

    @Prop({ type: Date, default: null })
    reviewSummaryUpdatedAt!: Date | null;

    @Prop({ type: Number, default: null })
    reviewSummaryPendingCount!: number | null;
}

export const RecipesSchema = SchemaFactory.createForClass(Recipe);
