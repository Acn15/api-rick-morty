import { UserStatusDto } from './create-user.dto';
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthday?: Date;
  status: UserStatusDto;
  createdAt: Date;
  updatedAt: Date;
}
