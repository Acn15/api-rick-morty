import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersRepository } from './users.repository';
@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;
  constructor(private readonly usersRepository: UsersRepository) {}
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        this.SALT_ROUNDS,
      );
      const user = await this.usersRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });
      return this.toUserResponse(user);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email já está em uso');
      }
      throw error;
    }
  }
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.toUserResponse(user));
  }
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }
    return this.toUserResponse(user);
  }
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      await this.findOne(id);
      const user = await this.usersRepository.update(id, updateUserDto);
      return this.toUserResponse(user);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email já está em uso');
      }
      throw error;
    }
  }
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.usersRepository.delete(id);
  }
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.usersRepository.updatePassword(userId, hashedPassword);
    await this.clearRefreshToken(userId);
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }
  async findUserById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }
  async setRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.usersRepository.updateRefreshToken(userId, refreshTokenHash);
  }
  async clearRefreshToken(userId: string): Promise<void> {
    await this.usersRepository.updateRefreshToken(userId, null);
  }
  toUserResponseDto(user: User): UserResponseDto {
    return this.toUserResponse(user);
  }
  private toUserResponse(user: User): UserResponseDto {
    const { password: _password, phone, birthday, ...rest } = user;
    return {
      ...rest,
      phone: phone ?? undefined,
      birthday: birthday ?? undefined,
      status: rest.status as unknown as UserResponseDto['status'],
    };
  }
  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
