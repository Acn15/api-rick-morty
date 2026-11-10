import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserResponseDto } from '../users/dto/user-response.dto';
export interface AuthTokensBundle {
  access_token: string;
  refresh_token: string;
  user: UserResponseDto;
}
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  private signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }
  private signRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: '30d' },
    );
  }
  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.usersService.setRefreshTokenHash(
      userId,
      this.hashRefreshToken(refreshToken),
    );
  }
  async issueAuthBundleForUser(user: User): Promise<AuthTokensBundle> {
    const access_token = this.signAccessToken(user);
    const refresh_token = this.signRefreshToken(user.id);
    await this.persistRefreshToken(user.id, refresh_token);
    return {
      access_token,
      refresh_token,
      user: this.usersService.toUserResponseDto(user),
    };
  }
  async login(loginDto: LoginDto): Promise<AuthTokensBundle> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.issueAuthBundleForUser(user);
  }
  async refresh(refreshToken: string): Promise<AuthTokensBundle> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    const user = await this.usersService.findUserById(payload.sub);
    if (!user?.refreshToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    const expectedHash = this.hashRefreshToken(refreshToken);
    const storedBuf = Buffer.from(user.refreshToken, 'utf8');
    const expectedBuf = Buffer.from(expectedHash, 'utf8');
    if (
      storedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(storedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    return this.issueAuthBundleForUser(user);
  }
  async logout(userId: string): Promise<void> {
    await this.usersService.clearRefreshToken(userId);
  }
  async validateUser(userId: string): Promise<UserResponseDto | null> {
    const user = await this.usersService.findUserById(userId);
    if (!user) {
      return null;
    }
    const { password: _password, ...userData } = user;
    return userData as UserResponseDto;
  }
}
