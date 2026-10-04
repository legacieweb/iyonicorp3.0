import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

export const useAutoFillAddress = (setCheckoutData: (data: any) => void) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Auto-fill contact info from logged-in user
      setCheckoutData((prev: any) => ({
        ...prev,
        name: user.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''),
        email: user.email || '',
        phone: user.phoneNumber || ''
      }));

      // Fetch saved addresses if available
      userAPI.getAddresses()
        .then(addresses => {
          if (addresses && addresses.length > 0) {
            const primary = addresses.find(a => a.isDefault) || addresses[0];
            const fullAddress = [primary.street, primary.city, primary.state, primary.country, primary.zipCode]
              .filter(Boolean).join(', ');
            setCheckoutData((prev: any) => ({
              ...prev,
              address: fullAddress || prev.address
            }));
          }
        })
        .catch(err => console.error('Failed to auto-fill address:', err));
    }
  }, [user, setCheckoutData]);
};
