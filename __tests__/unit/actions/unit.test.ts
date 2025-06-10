import {
  getUnits,
  getUnitById,
  getUnitInventorySummary,
} from '@/lib/actions/unit';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  unit: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  stokOpname: {
    findMany: jest.fn(),
  },
  rincianPenerimaan: {
    count: jest.fn(),
  },
  rincianPengeluaran: {
    count: jest.fn(),
  },
}));

// Import the mocked prisma after mocking
import prisma from '@/lib/prisma';

// Mock console to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Unit Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('getUnits', () => {
    it('successfully returns active units sorted by name', async () => {
      const mockUnits = [
        {
          id: 1,
          namaUnit: 'Emergency Department',
          kodeUnit: 'ED001',
          akronim: 'ED',
          alamat: '1st Floor, Main Building',
          temp: false,
        },
        {
          id: 2,
          namaUnit: 'Internal Medicine',
          kodeUnit: 'IM001',
          akronim: 'IM',
          alamat: '2nd Floor, West Wing',
          temp: false,
        },
      ];

      (prisma.unit.findMany as jest.Mock).mockResolvedValue(mockUnits);

      const result = await getUnits();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUnits);
      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        where: {
          temp: false,
        },
        orderBy: {
          namaUnit: 'asc',
        },
      });
    });

    it('filters out temporary units', async () => {
      await getUnits();

      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        where: {
          temp: false, // Should only get active units
        },
        orderBy: {
          namaUnit: 'asc',
        },
      });
    });

    it('returns empty array when no units found', async () => {
      (prisma.unit.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUnits();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('handles database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.unit.findMany as jest.Mock).mockRejectedValue(dbError);

      const result = await getUnits();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch units: Database connection failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching units:', dbError);
    });

    it('handles unknown errors', async () => {
      (prisma.unit.findMany as jest.Mock).mockRejectedValue('Unknown error type');

      const result = await getUnits();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch units: Unknown error');
    });
  });

  describe('getUnitById', () => {
    const mockUnit = {
      id: 1,
      namaUnit: 'Emergency Department',
      kodeUnit: 'ED001',
      akronim: 'ED',
      alamat: '1st Floor, Main Building',
      temp: false,
    };

    it('successfully returns unit by ID with location', async () => {
      (prisma.unit.findUnique as jest.Mock).mockResolvedValue(mockUnit);

      const result = await getUnitById(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...mockUnit,
        lokasi: '1st Floor, Main Building', // Uses alamat as lokasi
      });
      expect(prisma.unit.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
    });

    it('creates location from kodeUnit and akronim when alamat is null', async () => {
      const unitWithoutAlamat = {
        ...mockUnit,
        alamat: null,
      };

      (prisma.unit.findUnique as jest.Mock).mockResolvedValue(unitWithoutAlamat);

      const result = await getUnitById(1);

      expect(result.success).toBe(true);
      expect(result.data?.lokasi).toBe('ED001 - ED');
    });

    it('creates location from kodeUnit when both alamat and akronim are null', async () => {
      const unitMinimal = {
        ...mockUnit,
        alamat: null,
        akronim: null,
      };

      (prisma.unit.findUnique as jest.Mock).mockResolvedValue(unitMinimal);

      const result = await getUnitById(1);

      expect(result.success).toBe(true);
      expect(result.data?.lokasi).toBe('ED001 - ');
    });

    it('returns error when unit not found', async () => {
      (prisma.unit.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getUnitById(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unit with ID 999 not found');
      expect(result.data).toBeUndefined();
    });

    it('handles database errors gracefully', async () => {
      const dbError = new Error('Database query failed');
      (prisma.unit.findUnique as jest.Mock).mockRejectedValue(dbError);

      const result = await getUnitById(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch unit: Database query failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching unit:', dbError);
    });

    it('handles different unit ID types', async () => {
      (prisma.unit.findUnique as jest.Mock).mockResolvedValue(mockUnit);

      await getUnitById(1);
      await getUnitById(999);

      expect(prisma.unit.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prisma.unit.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
    });
  });

  describe('getUnitInventorySummary', () => {
    const mockCurrentDate = new Date('2024-06-01T00:00:00Z');

    beforeEach(() => {
      // Mock current date for consistent expired medicine calculations
      jest.useFakeTimers();
      jest.setSystemTime(mockCurrentDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('successfully calculates inventory summary', async () => {
      const mockStockData = [
        {
          jumlah: 100,
          rusakRingan: 5,
          rusakBerat: 3,
          usang: 2,
          hilang: 1,
          tanggalExpired: new Date('2024-12-01'), // Future date
        },
        {
          jumlah: 200,
          rusakRingan: 10,
          rusakBerat: 5,
          usang: 3,
          hilang: 2,
          tanggalExpired: new Date('2024-05-01'), // Past date (expired)
        },
        {
          jumlah: 150,
          rusakRingan: 0,
          rusakBerat: 0,
          usang: 0,
          hilang: 0,
          tanggalExpired: null, // No expiry date
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockData);
      (prisma.rincianPenerimaan.count as jest.Mock).mockResolvedValue(25);
      (prisma.rincianPengeluaran.count as jest.Mock).mockResolvedValue(18);

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalInventory: 450, // 100 + 200 + 150
        available: 419, // 450 - (11 + 20 + 0) = 450 - 31
        damagedOrExpired: 31, // (5+3+2+1) + (10+5+3+2) + (0+0+0+0)
        totalReceipts: 25,
        totalDispensed: 18,
        expiredMedicines: 200, // Only the second item is expired
      });
    });

    it('calls correct database queries with unitId', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.rincianPenerimaan.count as jest.Mock).mockResolvedValue(0);
      (prisma.rincianPengeluaran.count as jest.Mock).mockResolvedValue(0);

      await getUnitInventorySummary(1);

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith({
        where: { unitId: 1 },
        select: {
          jumlah: true,
          rusakRingan: true,
          rusakBerat: true,
          usang: true,
          hilang: true,
          tanggalExpired: true,
        },
      });

      expect(prisma.rincianPenerimaan.count).toHaveBeenCalledWith({
        where: { unitId: 1 },
      });

      expect(prisma.rincianPengeluaran.count).toHaveBeenCalledWith({
        where: {
          pengeluaran: { unitId: 1 },
        },
      });
    });

    it('handles null values in stock data', async () => {
      const mockStockDataWithNulls = [
        {
          jumlah: null,
          rusakRingan: null,
          rusakBerat: null,
          usang: null,
          hilang: null,
          tanggalExpired: null,
        },
        {
          jumlah: 100,
          rusakRingan: null,
          rusakBerat: 5,
          usang: null,
          hilang: 2,
          tanggalExpired: new Date('2024-12-01'),
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockDataWithNulls);
      (prisma.rincianPenerimaan.count as jest.Mock).mockResolvedValue(10);
      (prisma.rincianPengeluaran.count as jest.Mock).mockResolvedValue(5);

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalInventory: 100, // null is treated as 0
        available: 93, // 100 - 7 (null + 5 + null + 2)
        damagedOrExpired: 7,
        totalReceipts: 10,
        totalDispensed: 5,
        expiredMedicines: 0, // No expired items
      });
    });

    it('handles empty stock data', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.rincianPenerimaan.count as jest.Mock).mockResolvedValue(0);
      (prisma.rincianPengeluaran.count as jest.Mock).mockResolvedValue(0);

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalInventory: 0,
        available: 0,
        damagedOrExpired: 0,
        totalReceipts: 0,
        totalDispensed: 0,
        expiredMedicines: 0,
      });
    });

    it('ensures available stock never goes negative', async () => {
      const mockStockDataHighDamage = [
        {
          jumlah: 50,
          rusakRingan: 30,
          rusakBerat: 20,
          usang: 10,
          hilang: 5, // Total damage: 65 > 50
          tanggalExpired: new Date('2024-12-01'),
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockDataHighDamage);
      (prisma.rincianPenerimaan.count as jest.Mock).mockResolvedValue(5);
      (prisma.rincianPengeluaran.count as jest.Mock).mockResolvedValue(3);

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(true);
      expect(result.data?.available).toBe(0); // Should be 0, not negative
      expect(result.data?.totalInventory).toBe(50);
      expect(result.data?.damagedOrExpired).toBe(65);
    });

    it('correctly identifies expired medicines', async () => {
      const mockStockWithExpired = [
        {
          jumlah: 100,
          rusakRingan: 0,
          rusakBerat: 0,
          usang: 0,
          hilang: 0,
          tanggalExpired: new Date('2024-05-15'), // Expired
        },
        {
          jumlah: 150,
          rusakRingan: 0,
          rusakBerat: 0,
          usang: 0,
          hilang: 0,
          tanggalExpired: new Date('2024-03-01'), // Expired
        },
        {
          jumlah: 200,
          rusakRingan: 0,
          rusakBerat: 0,
          usang: 0,
          hilang: 0,
          tanggalExpired: new Date('2024-12-01'), // Not expired
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockWithExpired);
      (prisma.rincianPenerimaan.count as jest.Mock).mockResolvedValue(0);
      (prisma.rincianPengeluaran.count as jest.Mock).mockResolvedValue(0);

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(true);
      expect(result.data?.expiredMedicines).toBe(250); // 100 + 150 (expired items)
    });

    it('handles database errors gracefully', async () => {
      const dbError = new Error('Stock query failed');
      (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue(dbError);

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch inventory summary: Stock query failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching unit inventory summary:', dbError);
    });

    it('handles unknown errors', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue('Unknown error');

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch inventory summary: Unknown error');
    });

    it('handles different unit IDs', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.rincianPenerimaan.count as jest.Mock).mockResolvedValue(0);
      (prisma.rincianPengeluaran.count as jest.Mock).mockResolvedValue(0);

      await getUnitInventorySummary(1);
      await getUnitInventorySummary(999);

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { unitId: 1 } })
      );
      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { unitId: 999 } })
      );
    });
  });

  describe('Data validation and edge cases', () => {
    it('validates return structure for getUnits', async () => {
      (prisma.unit.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUnits();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('validates return structure for getUnitById', async () => {
      const mockUnit = { id: 1, namaUnit: 'Test Unit', kodeUnit: 'T001' };
      (prisma.unit.findUnique as jest.Mock).mockResolvedValue(mockUnit);

      const result = await getUnitById(1);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(typeof result.success).toBe('boolean');
      expect(result.data).toHaveProperty('lokasi');
    });

    it('validates return structure for getUnitInventorySummary', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.rincianPenerimaan.count as jest.Mock).mockResolvedValue(0);
      (prisma.rincianPengeluaran.count as jest.Mock).mockResolvedValue(0);

      const result = await getUnitInventorySummary(1);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('totalInventory');
      expect(result.data).toHaveProperty('available');
      expect(result.data).toHaveProperty('damagedOrExpired');
      expect(result.data).toHaveProperty('totalReceipts');
      expect(result.data).toHaveProperty('totalDispensed');
      expect(result.data).toHaveProperty('expiredMedicines');
    });
  });
});