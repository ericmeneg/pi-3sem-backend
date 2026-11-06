import {
    Body,
    Controller,
    Post,
    Logger,
    HttpStatus,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) {}

    @Post('login')
    async login(@Body() body: LoginDto, @Res() res: Response) {
        if (!body.email || !body.password) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Informe email e senha para efetuar o login',
            });
        }

        try {
            this.logger.debug('Tentativa de login.');
            const user = await this.authService.validateUser(
                body.email,
                body.password,
            );

            if (user) {
                this.logger.debug('Login bem sucedido');
                const { access_token } = this.authService.login(user);
                return res.status(HttpStatus.OK).json({
                    access_token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                    },
                });
            }

            return res.status(HttpStatus.UNAUTHORIZED).json({
                message: 'Usuário ou senha inválidos',
            });
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                this.logger.warn(`Login recusado: ${error.message}`);
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    message: error.message,
                });
            }

            if (error instanceof Error) {
                this.logger.error(
                    `Erro no login: ${error.message}`,
                    error.stack,
                );
            } else {
                this.logger.error('Erro no login: erro desconhecido');
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Erro interno no servidor',
            });
        }
    }
}
