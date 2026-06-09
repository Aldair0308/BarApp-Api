import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { v4 as uuid } from 'uuid';
import { ProductsService } from './products.service';
import { ProductCategory, ProductDestination } from './product.entity';
import { Roles, RolesGuard } from '../auth/roles.guard';

class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() price: number;
  @IsIn(['cocina', 'barra', 'otros'])
  category: ProductCategory;
  @IsOptional() @IsIn(['cocina', 'barra', 'otros']) destination?: ProductDestination;
  @IsOptional() available?: boolean;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsIn(['cocina', 'barra', 'otros'])
  category?: ProductCategory;
  @IsOptional() @IsIn(['cocina', 'barra', 'otros']) destination?: ProductDestination;
  @IsOptional() available?: boolean;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

class OptionDto {
  @IsOptional() @IsString() id?: string;
  @IsString() name: string;
  @IsNumber() extraPrice: number;
  @IsBoolean() isDefault: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
}

class GroupDto {
  @IsOptional() @IsString() id?: string;
  @IsString() name: string;
  @IsBoolean() required: boolean;
  @IsIn(['single', 'multiple']) type: 'single' | 'multiple';
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OptionDto)
  options: OptionDto[];
}

class ReplaceConfigurationsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => GroupDto)
  configurations: GroupDto[];
}

class CreateGroupDto {
  @IsString() name: string;
  @IsBoolean() required: boolean;
  @IsIn(['single', 'multiple']) type: 'single' | 'multiple';
}

class UpdateGroupDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsIn(['single', 'multiple']) type?: 'single' | 'multiple';
  @IsOptional() @IsNumber() sortOrder?: number;
}

class CreateOptionDto {
  @IsString() name: string;
  @IsNumber() extraPrice: number;
  @IsBoolean() isDefault: boolean;
}

class UpdateOptionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() extraPrice?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
}

class ReorderItemDto {
  @IsString() id: string;
  @IsNumber() sortOrder: number;
}

class ReorderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}

@UseGuards(AuthGuard('jwt'))
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(
    @Query('category') category?: string,
    @Query('destination') destination?: string,
    @Query('available') available?: string,
    @Query('search') search?: string,
  ) {
    return this.products.findAll({ category, destination, available, search });
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/update')
  updatePost(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/remove')
  removePost(@Param('id') id: string) {
    return this.products.remove(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/toggle-available')
  toggle(@Param('id') id: string) {
    return this.products.toggleAvailable(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/toggle-available')
  togglePost(@Param('id') id: string) {
    return this.products.toggleAvailable(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.products.reorder(dto.items);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('reorder')
  reorderPost(@Body() dto: ReorderDto) {
    return this.products.reorder(dto.items);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'uploads', 'products'),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${uuid()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Solo se permiten imágenes'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo no recibido');
    return { url: `/uploads/products/${file.filename}` };
  }

  @Get(':id/configurations')
  getConfigs(@Param('id') id: string) {
    return this.products.getConfigurations(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id/configurations')
  replaceConfigs(
    @Param('id') id: string,
    @Body() dto: ReplaceConfigurationsDto,
  ) {
    return this.products.replaceConfigurations(id, dto.configurations);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/configurations/replace')
  replaceConfigsPost(
    @Param('id') id: string,
    @Body() dto: ReplaceConfigurationsDto,
  ) {
    return this.products.replaceConfigurations(id, dto.configurations);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/configurations')
  addGroup(@Param('id') id: string, @Body() dto: CreateGroupDto) {
    return this.products.addConfigurationGroup(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id/configurations/:groupId')
  updateGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.products.updateConfigurationGroup(id, groupId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id/configurations/:groupId')
  deleteGroup(@Param('id') id: string, @Param('groupId') groupId: string) {
    return this.products.deleteConfigurationGroup(id, groupId);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/configurations/:groupId/options')
  addOption(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() dto: CreateOptionDto,
  ) {
    return this.products.addOption(id, groupId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id/configurations/:groupId/options/:optionId')
  updateOption(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.products.updateOption(id, groupId, optionId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id/configurations/:groupId/options/:optionId')
  deleteOption(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.products.deleteOption(id, groupId, optionId);
  }
}
