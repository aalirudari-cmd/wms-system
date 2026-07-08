import { NotFoundError } from '../../core/errors.js';
import { productsRepository } from './products.repository.js';

export const productsService = {
  list: (params: Parameters<typeof productsRepository.findMany>[0]) => productsRepository.findMany(params),

  async get(id: number) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError('Product');
    return product;
  },

  async scan(code: string) {
    const product = await productsRepository.findByBarcodeOrSku(code);
    if (!product) throw new NotFoundError('Product');
    return product;
  },

  create: (data: Parameters<typeof productsRepository.create>[0]) => productsRepository.create(data),

  async update(id: number, data: Parameters<typeof productsRepository.update>[1]) {
    await this.get(id);
    return productsRepository.update(id, data);
  },

  async remove(id: number) {
    await this.get(id);
    return productsRepository.softDelete(id);
  },
};
