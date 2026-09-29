import { get } from '../../../shared/src/apiClient';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export const categoriesApi = {
  getAll: () => get<{ categories: Category[] }>('/categories'),
};
