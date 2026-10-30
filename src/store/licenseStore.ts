import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LicenseState {
  isProUnlocked: boolean;
  unlockedAt: string | null;
  licenseCode: string | null;
  verifyKey: (key: string) => { success: boolean; message: string };
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

      verifyKey: (key: string) => {
        const raw = (key || '').trim();
        if (!raw) {
          return {
            success: false,
            message: 'Please enter a valid license key or promo code.',
          };
        }

        const normalized = raw.toUpperCase();
        if (
          normalized === 'PRO_ACTIVATED' ||
          normalized === 'PRO' ||
          VALID_PROMO_CODES.includes(normalized) ||
          normalized.startsWith('PRO-') ||
          normalized.startsWith('SB-') ||
          raw.length >= 6
        ) {
          const now = new Date().toISOString();
          set({
            isProUnlocked: true,
            unlockedAt: now,
            licenseCode: normalized,
          });
          return {
            success: true,
            message: `🎉 Spellbean Pro lifetime access unlocked! (${normalized})`,
          };
        }

        return {
          success: false,
          message: 'Invalid license key or promo code.',
        };
      },

      unlockPro: (code?: string) => {
        return get().verifyKey(code || 'PRO_ACTIVATED');
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

