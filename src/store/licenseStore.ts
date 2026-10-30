import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LicenseState {
  isProUnlocked: boolean;
  unlockedAt: string | null;
  licenseCode: string | null;
  unlockPro: (code?: string) => { success: boolean; message: string };
  relockPro: () => void;
}

const VALID_PROMO_CODES = [
  'SPELLCHAMP2027',
  'CONVENTIONPRO',
  'SPELLBEAN2027',
  'LIFETIME',
  'CHAMPION',
  'VIP2027',
];

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      isProUnlocked: false,
      unlockedAt: null,
      licenseCode: null,

      unlockPro: (code?: string) => {
        // If direct simulated purchase without code
        if (!code || code.trim() === '') {
          const now = new Date().toISOString();
          set({
            isProUnlocked: true,
            unlockedAt: now,
            licenseCode: 'PURCHASE_SIMULATED',
          });
          return {
            success: true,
            message: '🎉 Spellbean Pro successfully activated! Lifetime document imports unlocked.',
          };
        }

        const normalized = code.trim().toUpperCase();
        if (VALID_PROMO_CODES.includes(normalized) || normalized.startsWith('PRO-')) {
          const now = new Date().toISOString();
          set({
            isProUnlocked: true,
            unlockedAt: now,
            licenseCode: normalized,
          });
          return {
            success: true,
            message: `🎉 Promo code "${normalized}" accepted! Spellbean Pro lifetime access unlocked.`,
          };
        }

        return {
          success: false,
          message: 'Invalid promo or license code. Try code "SPELLCHAMP2027".',
        };
      },

      relockPro: () => {
        set({
          isProUnlocked: false,
          unlockedAt: null,
          licenseCode: null,
        });
      },
    }),
    {
      name: 'spellbean_pro_license_v1',
    }
  )
);
