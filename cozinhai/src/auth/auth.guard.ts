import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface CustomRequest extends Request {
    user?: object;
}

@Injectable()
export class AuthGuard implements CanActivate {
    private readonly logger = new Logger(AuthGuard.name);

    constructor(private jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<CustomRequest>();
        const authHeader = request.headers['authorization'];
        const bearerMatch =
            typeof authHeader === 'string'
                ? /^Bearer\s+(\S+)\s*$/i.exec(authHeader)
                : null;
        const token = bearerMatch?.[1];
        if (!token) {
            this.logger.warn('Token Bearer ausente ou malformado.');
            return false;
        }
        try {
            const payload = this.jwtService.verify<object>(token);
            request.user = payload;
            return true;
        } catch {
            this.logger.warn('Token Bearer inválido ou expirado.');
            return false;
        }
    }
}
