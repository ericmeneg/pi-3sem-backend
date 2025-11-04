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
}

export const RecipesSchema = SchemaFactory.createForClass(Recipe);
