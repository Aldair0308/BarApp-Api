import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Product, ProductCategory, ProductDestination } from './product.entity';
import { ConfigGroup } from './config-group.entity';
import { ConfigOption } from './config-option.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ConfigGroup)
    private readonly groups: Repository<ConfigGroup>,
    @InjectRepository(ConfigOption)
    private readonly options: Repository<ConfigOption>,
  ) {}

  async findAll(filters: {
    category?: string;
    destination?: string;
    available?: string;
    search?: string;
  }) {
    const qb = this.products
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.configurations', 'g')
      .leftJoinAndSelect('g.options', 'o')
      .orderBy('p.name', 'ASC')
      .addOrderBy('g.sort_order', 'ASC')
      .addOrderBy('o.sort_order', 'ASC');
    if (filters.category) qb.andWhere('p.category = :c', { c: filters.category });
    if (filters.destination)
      qb.andWhere('p.destination = :d', { d: filters.destination });
    if (filters.available)
      qb.andWhere('p.available = :a', { a: filters.available === 'true' ? 1 : 0 });
    if (filters.search)
      qb.andWhere('p.name LIKE :s', { s: `%${filters.search}%` });
    return qb.getMany();
  }

  async findOne(id: string) {
    const p = await this.products.findOne({
      where: { id },
      relations: ['configurations', 'configurations.options'],
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    if (p.configurations) {
      p.configurations.sort((a, b) => a.sortOrder - b.sortOrder);
      p.configurations.forEach((g) =>
        g.options.sort((a, b) => a.sortOrder - b.sortOrder),
      );
    }
    return p;
  }

  async create(data: {
    name: string;
    description?: string;
    price: number;
    category: ProductCategory;
    destination?: ProductDestination;
    available?: boolean;
    image?: string;
  }) {
    const p = this.products.create({
      id: uuid(),
      name: data.name,
      description: data.description || '',
      price: data.price,
      category: data.category,
      destination: data.destination || 'cocina',
      available: data.available === false ? 0 : 1,
      image: data.image || null,
    });
    return this.products.save(p);
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      category?: ProductCategory;
      destination?: ProductDestination;
      available?: boolean;
      image?: string;
    },
  ) {
    const p = await this.findOne(id);
    if (data.name !== undefined) p.name = data.name;
    if (data.description !== undefined) p.description = data.description;
    if (data.price !== undefined) p.price = data.price;
    if (data.category !== undefined) p.category = data.category;
    if (data.destination !== undefined) p.destination = data.destination;
    if (data.available !== undefined) p.available = data.available ? 1 : 0;
    if (data.image !== undefined) p.image = data.image;
    return this.products.save(p);
  }

  async toggleAvailable(id: string) {
    const p = await this.findOne(id);
    p.available = p.available === 1 ? 0 : 1;
    await this.products.save(p);
    return { id: p.id, available: p.available === 1 };
  }

  async remove(id: string) {
    const p = await this.findOne(id);
    await this.products.remove(p);
    return { id, deleted: true };
  }

  async getConfigurations(productId: string) {
    const groups = await this.groups.find({
      where: { productId },
      relations: ['options'],
      order: { sortOrder: 'ASC' },
    });
    groups.forEach((g) =>
      g.options.sort((a, b) => a.sortOrder - b.sortOrder),
    );
    return groups;
  }

  async replaceConfigurations(
    productId: string,
    configurations: Array<{
      id?: string;
      name: string;
      required: boolean;
      type: 'single' | 'multiple';
      sortOrder?: number;
      options: Array<{
        id?: string;
        name: string;
        extraPrice: number;
        isDefault: boolean;
        sortOrder?: number;
      }>;
    }>,
  ) {
    await this.findOne(productId);
    await this.groups.delete({ productId });
    const created: ConfigGroup[] = [];
    for (const g of configurations) {
      const group = this.groups.create({
        id: g.id || uuid(),
        productId,
        name: g.name,
        required: g.required ? 1 : 0,
        type: g.type,
        sortOrder: g.sortOrder || 0,
      });
      await this.groups.save(group);
      const opts = (g.options || []).map((o) =>
        this.options.create({
          id: o.id || uuid(),
          groupId: group.id,
          name: o.name,
          extraPrice: o.extraPrice || 0,
          isDefault: o.isDefault ? 1 : 0,
          sortOrder: o.sortOrder || 0,
        }),
      );
      if (opts.length) await this.options.save(opts);
      group.options = opts;
      created.push(group);
    }
    return created;
  }

  async addConfigurationGroup(
    productId: string,
    data: { name: string; required: boolean; type: 'single' | 'multiple' },
  ) {
    await this.findOne(productId);
    const g = this.groups.create({
      id: uuid(),
      productId,
      name: data.name,
      required: data.required ? 1 : 0,
      type: data.type,
      sortOrder: 0,
    });
    return this.groups.save(g);
  }

  async updateConfigurationGroup(
    productId: string,
    groupId: string,
    data: Partial<{ name: string; required: boolean; type: 'single' | 'multiple'; sortOrder: number }>,
  ) {
    const g = await this.groups.findOne({ where: { id: groupId, productId } });
    if (!g) throw new NotFoundException('Grupo no encontrado');
    if (data.name !== undefined) g.name = data.name;
    if (data.required !== undefined) g.required = data.required ? 1 : 0;
    if (data.type !== undefined) g.type = data.type;
    if (data.sortOrder !== undefined) g.sortOrder = data.sortOrder;
    return this.groups.save(g);
  }

  async deleteConfigurationGroup(productId: string, groupId: string) {
    const g = await this.groups.findOne({ where: { id: groupId, productId } });
    if (!g) throw new NotFoundException('Grupo no encontrado');
    await this.groups.remove(g);
    return { id: groupId, deleted: true };
  }

  async addOption(
    productId: string,
    groupId: string,
    data: { name: string; extraPrice: number; isDefault: boolean },
  ) {
    const g = await this.groups.findOne({ where: { id: groupId, productId } });
    if (!g) throw new NotFoundException('Grupo no encontrado');
    const o = this.options.create({
      id: uuid(),
      groupId,
      name: data.name,
      extraPrice: data.extraPrice || 0,
      isDefault: data.isDefault ? 1 : 0,
      sortOrder: 0,
    });
    return this.options.save(o);
  }

  async updateOption(
    productId: string,
    groupId: string,
    optionId: string,
    data: Partial<{ name: string; extraPrice: number; isDefault: boolean; sortOrder: number }>,
  ) {
    const o = await this.options.findOne({
      where: { id: optionId, groupId },
    });
    if (!o) throw new NotFoundException('Opción no encontrada');
    if (data.name !== undefined) o.name = data.name;
    if (data.extraPrice !== undefined) o.extraPrice = data.extraPrice;
    if (data.isDefault !== undefined) o.isDefault = data.isDefault ? 1 : 0;
    if (data.sortOrder !== undefined) o.sortOrder = data.sortOrder;
    return this.options.save(o);
  }

  async deleteOption(productId: string, groupId: string, optionId: string) {
    const o = await this.options.findOne({
      where: { id: optionId, groupId },
    });
    if (!o) throw new NotFoundException('Opción no encontrada');
    await this.options.remove(o);
    return { id: optionId, deleted: true };
  }
}
