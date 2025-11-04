import {
    Controller,
    Post,
    Body,
    Param,
    Patch,
    Delete,
    Get,
    Query,
    DefaultValuePipe,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create/create-user.dto';
import { UpdateNameDto } from './dto/update/update-name.dto';
import { User } from './users.schema';
import { UpdatePasswordDto } from './dto/update/update-password.dto';
import { CreateFavoritesDto } from './dto/create/create-favorites.dto';
import { CreateReviewDto } from './dto/create/create-review.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('user')
export class UsersController {
    constructor(private readonly UsersService: UsersService) {}

    @Post()
    async createUser(@Body() createUserDto: CreateUserDto): Promise<any> {
        const user = await this.UsersService.createUser(createUserDto);
        const userObj: Partial<User> = JSON.parse(
            JSON.stringify(user),
        ) as Partial<User>;
        delete userObj.passwordHash;
        return 'Usuário criado com sucesso';
    }

    @Patch(':id/name')
    @UseGuards(AuthGuard)
    async updateName(
        @Param('id') id: string,
        @Body() updateNameDto: UpdateNameDto,
    ): Promise<any> {
        await this.UsersService.updateName(id, updateNameDto);
        return { message: 'Nome atualizado com sucesso' };
    }

    @Patch(':id/password')
    @UseGuards(AuthGuard)
    async updatePassword(
        @Param('id') id: string,
        @Body() updatePasswordDto: UpdatePasswordDto,
    ): Promise<{ message: string }> {
        await this.UsersService.updatePassword(id, updatePasswordDto);
        return { message: 'Senha atualizada com sucesso' };
    }

    @Patch(':id/favorites')
    @UseGuards(AuthGuard)
    async addFavoriteRecipe(
        @Param('id') id: string,
        @Body() createFavoritesDto: CreateFavoritesDto,
    ): Promise<{ message: string }> {
        await this.UsersService.addFavoriteRecipe(id, createFavoritesDto);
        return {
            message: 'Receita adicionada ao livro de receitas com sucesso',
        };
    }

    @Delete(':id/favorites/:recipeId')
    @UseGuards(AuthGuard)
    async removeFavoriteRecipe(
        @Param('id') id: string,
        @Param('recipeId') recipeId: string,
    ): Promise<{ message: string }> {
        await this.UsersService.removeFavoriteRecipe(id, recipeId);
        return { message: 'Receita apagada do livro de receita com sucesso' };
    }

    @Post('/:userId/:recipeId/reviews')
    @UseGuards(AuthGuard)
    async addReview(
        @Param('userId') userId: string,
        @Param('recipeId') recipeId: string,
        @Body() createReviewDto: CreateReviewDto,
    ): Promise<{ message: string }> {
        await this.UsersService.addReview(userId, recipeId, createReviewDto);
        return { message: 'Avaliação adicionada/atualizada com sucesso' };
    }

    @Get('/:id/favorites')
    @UseGuards(AuthGuard)
    async listFavoriteRecipes(
        @Param('id') id: string,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ): Promise<{ recipeId: string; title: string }[]> {
        return await this.UsersService.listFavoriteRecipes(id, limit, offset);
    }

    @Get('/:id/reviews')
    @UseGuards(AuthGuard)
    async listUserReviews(
        @Param('id') id: string,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ): Promise<{ 
        recipeId: string; 
        title: string;
        recipeImage: string;
        date: Date;
        comment?: string;
        grade: number;
        imageBase64: string;
    }[]> {
        return await this.UsersService.listUserReviews(id, limit, offset);
    }

    @Patch(':id/deactivate')
    @UseGuards(AuthGuard)
    async deactivate(@Param('id') id: string): Promise<{ message: string }> {
        await this.UsersService.deactivateUser(id);
        return { message: 'Usuário desativado com sucesso' };
    }
}
