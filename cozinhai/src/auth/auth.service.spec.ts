import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { UserDocument } from '../users/users.schema';

describe('AuthService', () => {
    let service: AuthService;
    let findOneByEmail: jest.Mock;
    let sign: jest.Mock;
    let user: UserDocument;
    let userId: Types.ObjectId;

    beforeEach(async () => {
        userId = new Types.ObjectId();
        user = {
            _id: userId,
            id: userId,
            email: 'test@example.test',
            name: 'Test User',
            status: true,
            passwordHash: await bcrypt.hash('test@example.test$SafeTest1!', 4),
            toObject: () => ({
                _id: userId,
                email: 'test@example.test',
                name: 'Test User',
                status: true,
                passwordHash: user.passwordHash,
            }),
        } as unknown as UserDocument;
        findOneByEmail = jest.fn().mockResolvedValue(user);
        sign = jest.fn().mockReturnValue('test-jwt');

        service = new AuthService(
            { findOneByEmail } as unknown as UsersService,
            { sign } as unknown as JwtService,
        );
    });

    it('validates active users without exposing the password hash', async () => {
        const result = await service.validateUser(
            'test@example.test',
            'SafeTest1!',
        );

        expect(result).toEqual({
            id: userId,
            email: user.email,
            name: user.name,
            status: true,
        });
        expect(result).not.toHaveProperty('passwordHash');
    });

    it('returns null when the user does not exist or the password is wrong', async () => {
        findOneByEmail.mockResolvedValueOnce(null);
        await expect(
            service.validateUser('missing@example.test', 'SafeTest1!'),
        ).resolves.toBeNull();

        await expect(
            service.validateUser('test@example.test', 'WrongTest1!'),
        ).resolves.toBeNull();
    });

    it('rejects inactive users before checking the password', async () => {
        user.status = false;

        await expect(
            service.validateUser('test@example.test', 'SafeTest1!'),
        ).rejects.toThrow(new UnauthorizedException('Conta desativada.'));
    });

    it('signs the identity and returns user data without password material', () => {
        const token = service.login({
            id: userId,
            email: user.email,
            name: user.name,
            status: user.status,
        });

        expect(sign).toHaveBeenCalledWith({
            email: user.email,
            id: userId,
        });
        expect(token).toEqual({
            access_token: 'test-jwt',
            user: {
                id: userId,
                email: user.email,
                name: user.name,
                status: true,
            },
        });
        expect(JSON.stringify(token)).not.toContain('passwordHash');
    });
});
