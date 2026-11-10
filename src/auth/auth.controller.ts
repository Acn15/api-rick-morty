import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  private setAccessCookie(response: Response, accessToken: string): void {
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body()
    loginDto: LoginDto,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const bundle = await this.authService.login(loginDto);
    this.setAccessCookie(response, bundle.access_token);
    response.type('application/json');
    return {
      message: 'Login successful',
      access_token: bundle.access_token,
      refresh_token: bundle.refresh_token,
      user: bundle.user,
    };
  }
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body()
    dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(dto.refreshToken);
  }
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req()
    req: AuthenticatedRequest,
    @Res({ passthrough: true })
    response: Response,
  ) {
    await this.authService.logout(req.user.userId);
    response.clearCookie('access_token');
    response.type('application/json');
    return { message: 'Logout successful' };
  }
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return {
      user: req.user,
    };
  }
}
