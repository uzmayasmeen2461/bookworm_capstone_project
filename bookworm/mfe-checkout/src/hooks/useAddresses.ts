import { useState, useEffect } from 'react';
import { addressApi, Address } from '../api/addressApi';

export const useAddresses = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading]     = useState(true);

  const refresh = () => {
    setLoading(true);
    addressApi.getAll()
      .then(res  => setAddresses(res.addresses))
      .catch(()  => {})
      .finally(()=> setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  return { addresses, loading, refresh };
};
