import { Type } from 'class-transformer';
import {
    IsString,
    MinLength,
    MaxLength,
    IsInt,
    Min,
    Max,
    IsOptional,
    IsDate,
    IsUrl,
} from 'class-validator';

export class CreateReviewDto {
    @IsOptional()
    @Type(() => Date)
    @IsDate({ message: 'Data deve ser válida' })
    date?: Date;

    @IsOptional()
    @MinLength(3, { message: 'Título deve ter no mínimo 3 caracteres' })
    @MaxLength(100, { message: 'Título deve ter no máximo 100 caracteres' })
    title?: string;

    @IsOptional()
    @IsUrl({}, { message: 'A imagem da receita deve ser uma URL válida' })
    recipeImage?: string;

    @IsOptional()
    @IsInt({ message: 'Nota deve ser um número inteiro' })
    @Min(1, { message: 'Nota mínima é 1' })
    @Max(5, { message: 'Nota máxima é 5' })
    grade?: number;

    @IsOptional()
    @IsString({ message: 'Comentário deve ser uma string' })
    @MinLength(3, { message: 'Comentário deve ter no mínimo 3 caracteres' })
    @MaxLength(1000, {
        message: 'Comentário deve ter no máximo 1000 caracteres',
    })
    comment?: string;

    @IsOptional()
    @IsString({ message: 'A imagem Base64 deve ser uma string' })
    imageBase64?: string;
}
