import type { User } from '../types';

export type RootStackParamList = {
  Main: undefined;
  Absensi: { users: User[] };
};
