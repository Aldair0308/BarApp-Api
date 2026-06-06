import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { IsEmail, IsIn, IsString, Length } from 'class-validator';
import { UserRole } from '../users/user.entity';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(4, 4)
  pin: string;
}

class SwitchRoleDto {
  @IsIn(['admin', 'mesero', 'cocina', 'barra'])
  role: UserRole;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.pin);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('switch-role')
  switchRole(@Req() req: any, @Body() dto: SwitchRoleDto) {
    return this.auth.switchRole(req.user.userId, dto.role);
  }
}
