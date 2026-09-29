import { getAuth, postAuth } from '../../../shared/src/apiClient';

export interface Address {
  id: string;
  first_name: string;
  last_name: string;
  address_line: string;
  city: string;
  state: string;
  pin: string;
  country: string;
  email: string;
  phone: string;
  is_default: boolean;
}

export interface NewAddress {
  firstName: string;
  lastName: string;
  addressLine: string;
  city: string;
  state: string;
  pin: string;
  country?: string;
  email: string;
  phone: string;
  isDefault?: boolean;
}

export const addressApi = {
  getAll: () => getAuth<{ addresses: Address[] }>('/addresses'),
  save:   (data: NewAddress) => postAuth<Address>('/addresses', data),
};
