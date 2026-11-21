import type { User } from '../types';

export type RootStackParamList = {
  Main: undefined;
  Absensi: { users: User[] };
  Tampilan: undefined;
  Paket: undefined;
  Addon: undefined;
  Bank: undefined;
  Pengguna: undefined;
};
