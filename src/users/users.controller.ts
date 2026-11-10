import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body()
    createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }
  @Get()
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }
  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id')
    id: string,
    @Body()
    dto: ChangePasswordDto,
    @Req()
    req: AuthenticatedRequest,
  ): Promise<{
    message: string;
  }> {
    if (req.user.userId !== id) {
      throw new ForbiddenException(
        'Só é possível alterar a própria senha neste endpoint',
      );
    }
    await this.usersService.changePassword(
      id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Senha atualizada' };
  }
  @Patch(':id')
  update(
    @Param('id')
    id: string,
    @Body()
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }
  @Delete(':id')
  async remove(
    @Param('id')
    id: string,
  ): Promise<void> {
    return this.usersService.remove(id);
  }
}
