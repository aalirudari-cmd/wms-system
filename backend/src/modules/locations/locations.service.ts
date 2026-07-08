import { NotFoundError, ConflictError } from '../../core/errors.js';
import { locationsRepository } from './locations.repository.js';

export const locationsService = {
  list: (params: Parameters<typeof locationsRepository.findMany>[0]) => locationsRepository.findMany(params),

  async get(id: number) {
    const location = await locationsRepository.findById(id);
    if (!location) throw new NotFoundError('Location');
    return location;
  },

  async scan(code: string) {
    const location = await locationsRepository.findByCodeOrBarcode(code);
    if (!location) throw new NotFoundError('Location');
    return location;
  },

  create: (data: Parameters<typeof locationsRepository.create>[0]) => locationsRepository.create(data),

  async update(id: number, data: Parameters<typeof locationsRepository.update>[1]) {
    await this.get(id);
    return locationsRepository.update(id, data);
  },

  async remove(id: number) {
    const location = await this.get(id);
    if (location.children.length > 0) {
      throw new ConflictError('Cannot delete a location that has child locations.');
    }
    return locationsRepository.softDelete(id);
  },
};
