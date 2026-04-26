import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

export const useAutoFillAddress = (setCheckoutData: (data: any) => void) => {
  const { user } = useAuth();

  useEffect(() => {
    const fetchAndAutoFill = async () => {
      if (user) {
        // Initial user basic info
        setCheckoutData((prev: any) => ({
          ...prev,
          name: user.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''),
          email: user.email || '',
          phoneNumber: user.phoneNumber || ''
        }));

        try {
          // Fetch saved addresses
          const addresses = await userAPI.getAddresses();
          if (addresses && addresses.length > 0) {
            const primary = addresses.find(a => a.isDefault) || addresses[0];
            setCheckoutData((prev: any) => ({
              ...prev,
              street: primary.street || prev.street,
              city: primary.city || prev.city,
              state: primary.state || prev.state,
              country: primary.country || prev.country,
              zipCode: primary.zipCode || prev.zipCode
            }));
          }
        } catch (err) {
          console.error('Failed to auto-fill address:', err);
        }
      }
    };

    fetchAndAutoFill();
  }, [user, setCheckoutData]);
};
