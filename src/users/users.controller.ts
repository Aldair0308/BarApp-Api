import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';
import { Roles, RolesGuard } from '../auth/roles.guard';

class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @Length(4, 4) pin: string;
  @IsIn(['admin', 'mesero', 'cocina', 'barra']) role: UserRole;
  @IsOptional() @IsString() avatar?: string;
}

class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() @Length(4, 4) pin?: string;
  @IsOptional() @IsIn(['admin', 'mesero', 'cocina', 'barra']) role?: UserRole;
  @IsOptional() @IsString() avatar?: string;
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Patch(':id/toggle-active')
  toggle(@Param('id') id: string) {
    return this.users.toggleActive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
