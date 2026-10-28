// Data demo untuk frontend agar bisa dijelajahi tanpa backend/database.
// Dipakai sebagai fallback ketika API tidak tersedia.

export const dummyPackages = [
  { id: "p1", name: "Cuci Steam Reguler", vehicleType: "motor" as const, price: 15000, durationMin: 15, description: "Cuci luar + semprot", sortOrder: 1, active: true },
  { id: "p2", name: "Cuci Steam Komplit", vehicleType: "motor" as const, price: 25000, durationMin: 30, description: "Luar + dalam + wax", sortOrder: 2, active: true },
  { id: "p3", name: "Cuci Steam Premium", vehicleType: "motor" as const, price: 40000, durationMin: 45, description: "Komplit + poles", sortOrder: 3, active: true },
  { id: "p4", name: "Cuci Steam Reguler", vehicleType: "mobil" as const, price: 35000, durationMin: 20, description: "Cuci luar + semprot", sortOrder: 1, active: true },
  { id: "p5", name: "Cuci Steam Komplit", vehicleType: "mobil" as const, price: 50000, durationMin: 40, description: "Luar + dalam + wax", sortOrder: 2, active: true },
  { id: "p6", name: "Cuci Steam Premium", vehicleType: "mobil" as const, price: 75000, durationMin: 60, description: "Komplit + poles + interior", sortOrder: 3, active: true },
];

export const dummyAddons = [
  { id: "a1", name: "Semprot Wax", price: 10000, unitLabel: "pcs", vehicleTypes: ["motor", "mobil"], active: true },
  { id: "a2", name: "Ojek Ban", price: 5000, unitLabel: "ban", vehicleTypes: ["motor"], active: true },
  { id: "a3", name: "Semprot Interior", price: 15000, unitLabel: "pcs", vehicleTypes: ["mobil"], active: true },
  { id: "a4", name: "Poles Kaca", price: 8000, unitLabel: "pcs", vehicleTypes: ["motor", "mobil"], active: true },
];

export const dummyOutlet = {
  id: "o1",
  name: "Cuci Steam Bersama",
  address: "Jl. Contoh No. 12, Jakarta",
  phone: "0812-3456-7890",
  receiptFooter: "Terima kasih atas kunjungan Anda",
  taxPercent: 0,
};

export const dummyBanks = [
  { id: "b1", name: "BCA", accountNumber: "1234567890", accountName: "Cuci Steam Bersama", active: true },
  { id: "b2", name: "BRI", accountNumber: "0987654321", accountName: "Cuci Steam Bersama", active: true },
  { id: "b3", name: "Mandiri", accountNumber: "1122334455", accountName: "Cuci Steam Bersama", active: true },
];

export const dummyUsers = [
  { id: "u1", name: "Budi (Admin)", email: "admin@pos.test", role: "admin" as const, phone: "0812-0000-0001", dailyRate: 0, active: true, createdAt: new Date() },
  { id: "u2", name: "Siti Kasir", email: "siti@pos.test", role: "kasir" as const, phone: "0812-0000-0002", dailyRate: 50000, active: true, createdAt: new Date() },
  { id: "u3", name: "Andi Operator", email: "andi@pos.test", role: "operator" as const, phone: "0812-0000-0003", dailyRate: 40000, active: true, createdAt: new Date() },
  { id: "u4", name: "Rina Kasir", email: "rina@pos.test", role: "kasir" as const, phone: "0812-0000-0004", dailyRate: 50000, active: false, createdAt: new Date() },
];