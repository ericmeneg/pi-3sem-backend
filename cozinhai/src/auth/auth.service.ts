import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';

interface SafeUser {
    id: Types.ObjectId;
    email: string;
    name: string;
    status: boolean;
}

@Injectable()
export class AuthService {
    constructor(
        private userService: UsersService,
        private jwtService: JwtService,
    ) {}

    async validateUser(
        email: string,
        password: string,
    ): Promise<SafeUser | null> {
        const user = await this.userService.findOneByEmail(email);
        if (!user) {
            return null;
        }

        if (!user.status) {
            throw new UnauthorizedException('Conta desativada.');
        }

        const salt = user.email + '$';

        const passwordValid = await bcrypt.compare(
            salt + password,
            user.passwordHash,
        );
        if (!passwordValid) {
            return null;
        }

        const userWithoutPassword = user.toObject();

        const safeUser: SafeUser = {
            id: userWithoutPassword._id,
            email: userWithoutPassword.email,
            name: userWithoutPassword.name,
            status: userWithoutPassword.status,
        };

        return safeUser;
    }

    login(user: SafeUser) {
        const payload = { email: user.email, id: user.id };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                status: user.status,
            },
        };
    }
}
