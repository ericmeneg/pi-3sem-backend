import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './users.schema';
import { Recipe, RecipeDocument } from 'src/recipes/recipe.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateNameDto } from './dto/update/update-name.dto';
import { UpdatePasswordDto } from './dto/update/update-password.dto';
import { CreateFavoritesDto } from './dto/create/create-favorites.dto';
import { CreateReviewDto } from './dto/create/create-review.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
        @InjectModel(Recipe.name)
        private recipeModel: Model<RecipeDocument>,
    ) { }

    async findOneByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).exec();
    }

    async createUser(createUserDto: CreateUserDto): Promise<User> {
        const existingEmail = await this.userModel.findOne({
            email: createUserDto.email,
        });
        if (existingEmail) {
            throw new BadRequestException('Email já está em uso');
        }
        const salt = createUserDto.email + '$';
        const { password, ...userData } = createUserDto;
        const hashedPassword: string = await bcrypt.hash(salt + password, 10);
        const createdUser = new this.userModel({
            ...userData,
            passwordHash: hashedPassword,
        });

        return createdUser.save();
    }

    async updateName(
        userId: string,
        updateNameDto: UpdateNameDto,
    ): Promise<User> {
        const user = await this.userModel
            .findByIdAndUpdate(
                userId,
                { name: updateNameDto.name },
                { new: true },
            )
            .select('name');

        if (!user) throw new NotFoundException('Usuário não encontrado');
        return user;
    }

    async updatePassword(
        userId: string,
        updatePasswordDto: UpdatePasswordDto,
    ): Promise<User> {
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('Usuário não encontrado');
        const salt = user.email + '$';
        const isPasswordValid = await bcrypt.compare(
            salt + updatePasswordDto.currentPassword,
            user.passwordHash,
        );
        if (!isPasswordValid) {
            throw new BadRequestException('Senha atual incorreta');
        }
        const hashedPassword = await bcrypt.hash(
            salt + updatePasswordDto.newPassword,
            10,
        );
        user.passwordHash = hashedPassword;

        return user.save();
    }

    async addFavoriteRecipe(
        userId: string,
        createFavoritesDto: CreateFavoritesDto,
    ): Promise<User> {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        const recipeAlreadyExists = user.favoriteRecipes.some(
            (fav) => fav.recipeId === createFavoritesDto.id,
        );
        if (recipeAlreadyExists) {
            throw new BadRequestException('Receita já está nos favoritos');
        }
        user.favoriteRecipes.unshift({
            recipeId: createFavoritesDto.id,
            title: createFavoritesDto.title,
            recipeImage: createFavoritesDto.recipeImage ?? '',
        });
        return user.save();
    }

    async removeFavoriteRecipe(
        userId: string,
        recipeId: string,
    ): Promise<User> {
        const updatedUser = await this.userModel.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    favoriteRecipes: { recipeId },
                },
            },
            { new: true },
        );

        if (!updatedUser) {
            throw new NotFoundException('Usuário não encontrado');
        }
        const stillExists = updatedUser.favoriteRecipes.some(
            (fav) => fav.recipeId === recipeId,
        );
        if (stillExists) {
            throw new BadRequestException('Falha ao remover favorito');
        }
        return updatedUser;
    }

    async addReview(
        userId: string,
        recipeId: string,
        createReviewDto: CreateReviewDto,
    ): Promise<{ user: User; recipe: Recipe }> {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }
        if (!recipeId.trim()) {
            throw new BadRequestException('ID da receita inválido');
        }

        let recipe = await this.recipeModel.findOne({ recipeId });

        if (!recipe) {
            recipe = new this.recipeModel({
                recipeId,
                title: createReviewDto.title ?? 'Receita sem título',
                reviews: [],
            });
        }

        const existingReview = user.reviewRecipes.find(
            (review) => review.recipeId === recipeId,
        );

        if (
            !existingReview &&
            (createReviewDto.grade === null ||
                createReviewDto.grade === undefined)
        ) {
            throw new BadRequestException(
                'A nota é obrigatória para criar um review',
            );
        }

        const finalGrade = createReviewDto.grade ?? existingReview?.grade;
        if (finalGrade === undefined || finalGrade === null) {
            throw new BadRequestException('Nota inválida');
        }

        const reviewData = {
            userId,
            recipeId,
            title: createReviewDto.title ?? '',
            recipeImage: createReviewDto.recipeImage ?? '',
            date: new Date(),
            comment: createReviewDto.comment ?? '',
            grade: finalGrade,
            imageBase64: createReviewDto.imageBase64 ?? '',
        };

        if (existingReview) {
            user.reviewRecipes = user.reviewRecipes.map((review) =>
                review.recipeId === recipeId
                    ? {
                        ...review,
                        ...reviewData,
                        title: createReviewDto.title ?? review.title,
                        recipeImage:
                            createReviewDto.recipeImage ?? review.recipeImage,
                    }
                    : review,
            );
        } else {
            user.reviewRecipes.push(reviewData);
        }

        const reviewIndex = recipe.reviews.findIndex(
            (review) => review.userId === userId,
        );

        if (reviewIndex !== -1) {
            recipe.reviews[reviewIndex] = reviewData;
        } else {
            recipe.reviews.push(reviewData);
        }

        await user.save();
        await recipe.save();

        return { user, recipe };
    }

    async listFavoriteRecipes(
        userId: string,
        limit: number,
        offset: number,
    ): Promise<{ recipeId: string; title: string; recipeImage: string }[]> {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        return user.favoriteRecipes
            .slice(offset, offset + limit)
            .map((fav) => ({
                recipeId: fav.recipeId,
                title: fav.title,
                recipeImage: fav.recipeImage,
            }));
    }

    async listUserReviews(
        userId: string,
        limit: number,
        offset: number,
    ): Promise<User['reviewRecipes']> {
        const user = await this.userModel.findById(userId);

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        const orderedReviews = user.reviewRecipes.sort(
            (a, b) => b.date.getTime() - a.date.getTime(),
        );

        return orderedReviews.slice(offset, offset + limit);
    }

    async deactivateUser(userId: string): Promise<User> {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        user.status = false;
        await user.save();

        return user;
    }
}
