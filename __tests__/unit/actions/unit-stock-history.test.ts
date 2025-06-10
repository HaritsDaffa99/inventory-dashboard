import {
  getUnitStockHistory,
  getMedicinesApproachingExpiry,
  getTopMedicinesInUnit,
  getLowStockWarnings,
} from '@/lib/actions/unit-stock-history';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  pengeluaran: {
    findMany: jest.fn(),
  },
  stokOpname: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
}));

// Import the mocked prisma after mocking
import prisma from '@/lib/prisma';

// Mock console to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Unit Stock History Actions', () => {
  const mockCurrentDate = new Date('2024-06-01T00:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date for consistent calculations
    jest.useFakeTimers();
    jest.setSystemTime(mockCurrentDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('getUnitStockHistory', () => {
    it('successfully calculates 7-month stock history', async () => {
      const mockDispensingRecords = [
        {
          id: 1,
          unitId: 1,
          tanggalSah: new Date('2024-05-15'), // Last month
          rincianPengeluaran: [
            { banyak: 50 },
            { banyak: 30 },
          ],
        },
        {
          id: 2,
          unitId: 1,
          tanggalSah: new Date('2024-04-10'), // 2 months ago
          rincianPengeluaran: [
            { banyak: 40 },
          ],
        },
      ];

      const mockCurrentStock = { _sum: { jumlah: 1000 } };

      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue(mockDispensingRecords);
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue(mockCurrentStock);

      const result = await getUnitStockHistory(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(7); // 7 months of data
      
      // Check that months are properly ordered (6 months ago to current)
      const months = result.data!.map(item => item.month);
      expect(months).toEqual(['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
      
      // Current month (June) should have current stock value
      expect(result.data![6]).toEqual({
        month: 'Jun',
        value: 1000,
      });
    });

    it('calculates historical stock by adding back dispensed items', async () => {
      const mockDispensingRecords = [
        {
          id: 1,
          unitId: 1,
          tanggalSah: new Date('2024-05-15'), // May - last month
          rincianPengeluaran: [{ banyak: 100 }],
        },
      ];

      const mockCurrentStock = { _sum: { jumlah: 500 } };

      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue(mockDispensingRecords);
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue(mockCurrentStock);

      const result = await getUnitStockHistory(1);

      expect(result.success).toBe(true);
      
      // May should have stock + dispensed amount (500 + 100 = 600)
      const mayData = result.data!.find(item => item.month === 'May');
      expect(mayData?.value).toBe(600);
      
      // June (current) should have current stock (500)
      const juneData = result.data!.find(item => item.month === 'Jun');
      expect(juneData?.value).toBe(500);
    });

    it('filters dispensing records by date range (6 months)', async () => {
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 0 } });

      await getUnitStockHistory(1);

      const expectedSixMonthsAgo = new Date('2023-12-01T00:00:00Z');
      
      expect(prisma.pengeluaran.findMany).toHaveBeenCalledWith({
        where: {
          unitId: 1,
          tanggalSah: {
            gte: expectedSixMonthsAgo,
            lte: mockCurrentDate,
          },
        },
        include: {
          rincianPengeluaran: {
            include: {
              persediaan: true,
            },
          },
        },
      });
    });

    it('handles null current stock gracefully', async () => {
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: null } });

      const result = await getUnitStockHistory(1);

      expect(result.success).toBe(true);
      expect(result.data!.every(item => item.value === 0)).toBe(true);
    });

    it('rounds stock values to integers', async () => {
      const mockDispensingRecords = [
        {
          id: 1,
          unitId: 1,
          tanggalSah: new Date('2024-05-15'),
          rincianPengeluaran: [{ banyak: 33 }], // This creates fractional values
        },
      ];

      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue(mockDispensingRecords);
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 100.7 } });

      const result = await getUnitStockHistory(1);

      expect(result.success).toBe(true);
      result.data!.forEach(item => {
        expect(Number.isInteger(item.value)).toBe(true);
      });
    });

    it('handles database errors gracefully', async () => {
      (prisma.pengeluaran.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getUnitStockHistory(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch unit stock history');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching unit stock history:', expect.any(Error));
    });
  });

  describe('getMedicinesApproachingExpiry', () => {
    it('successfully returns medicines expiring within 1 year', async () => {
      const mockExpiringMedicines = [
        {
          id: 1,
          jumlah: 50,
          nusp: 'NUSP001',
          tanggalExpired: new Date('2024-08-01'), // 2 months from current date
          persediaan: {
            id: 10,
            namaPersediaan: 'Medicine A',
            kodePersediaan: 'MED001',
          },
          satuan: { satuan: 'tablets' },
        },
        {
          id: 2,
          jumlah: 75,
          nusp: 'NUSP002',
          tanggalExpired: new Date('2025-03-01'), // 9 months from current date
          persediaan: {
            id: 20,
            namaPersediaan: 'Medicine B',
            kodePersediaan: 'MED002',
          },
          satuan: { satuan: 'capsules' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockExpiringMedicines);

      const result = await getMedicinesApproachingExpiry(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      
      expect(result.data![0]).toEqual({
        id: 0,
        stokOpnameId: 1,
        name: 'Medicine A',
        code: 'MED001',
        quantity: 50,
        unit: 'tablets',
        daysRemaining: 61, // Days from June 1 to August 1
        expiryDate: new Date('2024-08-01'),
        nusp: 'NUSP001',
      });
    });

    it('filters by selected medicines when provided', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);

      await getMedicinesApproachingExpiry(1, [10, 20, 30]);

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith({
        where: {
          unitId: 1,
          tanggalExpired: {
            lte: expect.any(Date), // 1 year from now
            gt: mockCurrentDate, // After today
          },
          persediaanId: { in: [10, 20, 30] },
        },
        include: expect.any(Object),
        orderBy: { tanggalExpired: 'asc' },
      });
    });

    it('calculates correct days remaining until expiry', async () => {
      const mockMedicine = {
        id: 1,
        jumlah: 100,
        nusp: 'TEST001',
        tanggalExpired: new Date('2024-06-10'), // 9 days from current date
        persediaan: {
          id: 1,
          namaPersediaan: 'Test Medicine',
          kodePersediaan: 'TEST',
        },
        satuan: { satuan: 'units' },
      };

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([mockMedicine]);

      const result = await getMedicinesApproachingExpiry(1);

      expect(result.success).toBe(true);
      expect(result.data![0].daysRemaining).toBe(9);
    });

    it('handles medicines with null expiry dates', async () => {
      const mockMedicine = {
        id: 1,
        jumlah: 100,
        nusp: 'TEST001',
        tanggalExpired: null,
        persediaan: {
          id: 1,
          namaPersediaan: 'Test Medicine',
          kodePersediaan: 'TEST',
        },
        satuan: { satuan: 'units' },
      };

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([mockMedicine]);

      const result = await getMedicinesApproachingExpiry(1);

      expect(result.success).toBe(true);
      expect(result.data![0].daysRemaining).toBe(0);
    });

    it('generates sample data when no expiring medicines found', async () => {
      const mockUnitMedicines = [
        {
          id: 1,
          jumlah: 100,
          nusp: 'SAMPLE001',
          persediaan: {
            id: 1,
            namaPersediaan: 'Sample Medicine',
            kodePersediaan: 'SAMPLE',
          },
          satuan: { satuan: 'units' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // First call returns no expiring medicines
        .mockResolvedValueOnce(mockUnitMedicines); // Second call for sample data

      // Mock Math.random for predictable sample data
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Will generate ~183 days

      const result = await getMedicinesApproachingExpiry(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].daysRemaining).toBe(183); // Math.floor(0.5 * 365) + 1
      expect(result.data![0].name).toBe('Sample Medicine');

      jest.restoreAllMocks();
    });

    it('handles null quantities and units gracefully', async () => {
      const mockMedicine = {
        id: 1,
        jumlah: null,
        nusp: 'TEST001',
        tanggalExpired: new Date('2024-08-01'),
        persediaan: {
          id: 1,
          namaPersediaan: 'Test Medicine',
          kodePersediaan: 'TEST',
        },
        satuan: null,
      };

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([mockMedicine]);

      const result = await getMedicinesApproachingExpiry(1);

      expect(result.success).toBe(true);
      expect(result.data![0].quantity).toBe(0);
      expect(result.data![0].unit).toBe('Unit');
    });
  });

  describe('getTopMedicinesInUnit', () => {
    it('successfully returns top 5 medicines by quantity', async () => {
      const mockTopMedicines = [
        {
          id: 1,
          jumlah: 500,
          nusp: 'TOP001',
          persediaan: {
            namaPersediaan: 'High Stock Medicine',
            kodePersediaan: 'HSM001',
          },
          satuan: { satuan: 'tablets' },
        },
        {
          id: 2,
          jumlah: 300,
          nusp: 'TOP002',
          persediaan: {
            namaPersediaan: 'Medium Stock Medicine',
            kodePersediaan: 'MSM001',
          },
          satuan: { satuan: 'capsules' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockTopMedicines);

      const result = await getTopMedicinesInUnit(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      
      expect(result.data![0]).toEqual({
        id: 0,
        name: 'High Stock Medicine',
        code: 'TOP001',
        stock: 500,
        unit: 'tablets',
        status: 'Available',
      });
      
      expect(result.data![1]).toEqual({
        id: 1,
        name: 'Medium Stock Medicine',
        code: 'TOP002',
        stock: 300,
        unit: 'capsules',
        status: 'Available',
      });
    });

    it('queries for top 5 medicines ordered by quantity desc', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);

      await getTopMedicinesInUnit(1);

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith({
        where: { unitId: 1 },
        include: expect.any(Object),
        orderBy: { jumlah: 'desc' },
        take: 5,
      });
    });

    it('filters by selected medicines when provided', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);

      await getTopMedicinesInUnit(1, [10, 20]);

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith({
        where: {
          unitId: 1,
          persediaanId: { in: [10, 20] },
        },
        include: expect.any(Object),
        orderBy: { jumlah: 'desc' },
        take: 5,
      });
    });

    it('handles out of stock medicines', async () => {
      const mockMedicine = {
        id: 1,
        jumlah: 0,
        nusp: 'OUT001',
        persediaan: {
          namaPersediaan: 'Out of Stock Medicine',
          kodePersediaan: 'OOS001',
        },
        satuan: { satuan: 'units' },
      };

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([mockMedicine]);

      const result = await getTopMedicinesInUnit(1);

      expect(result.success).toBe(true);
      expect(result.data![0].status).toBe('Out of Stock');
      expect(result.data![0].stock).toBe(0);
    });

    it('handles null values gracefully', async () => {
      const mockMedicine = {
        id: 1,
        jumlah: null,
        nusp: null,
        persediaan: {
          namaPersediaan: 'Test Medicine',
          kodePersediaan: 'TEST',
        },
        satuan: null,
      };

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([mockMedicine]);

      const result = await getTopMedicinesInUnit(1);

      expect(result.success).toBe(true);
      expect(result.data![0]).toEqual({
        id: 0,
        name: 'Test Medicine',
        code: 'N/A',
        stock: 0,
        unit: 'Unit',
        status: 'Out of Stock',
      });
    });
  });

  describe('getLowStockWarnings', () => {
    it('successfully returns medicines with stock < 100', async () => {
      const mockMedicines = [
        {
          id: 1,
          jumlah: 50, // Low stock
          nusp: 'LOW001',
          tanggalExpired: new Date('2024-08-01'), // Expiring within 1 year
          persediaan: {
            namaPersediaan: 'Low Stock Medicine A',
            kodePersediaan: 'LSM001',
          },
          satuan: { satuan: 'tablets' },
        },
        {
          id: 2,
          jumlah: 150, // Not low stock - should be filtered out
          nusp: 'HIGH001',
          tanggalExpired: new Date('2024-12-01'),
          persediaan: {
            namaPersediaan: 'High Stock Medicine',
            kodePersediaan: 'HSM001',
          },
          satuan: { satuan: 'capsules' },
        },
        {
          id: 3,
          jumlah: 80, // Low stock
          nusp: 'LOW002',
          tanggalExpired: new Date('2026-01-01'), // Not expiring soon
          persediaan: {
            namaPersediaan: 'Low Stock Medicine B',
            kodePersediaan: 'LSM002',
          },
          satuan: { satuan: 'units' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockMedicines);

      const result = await getLowStockWarnings(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Only low stock items
      
      expect(result.data![0]).toEqual({
        id: 0,
        name: 'Low Stock Medicine A',
        code: 'LOW001',
        currentStock: 50,
        unit: 'tablets',
        minimumThreshold: 100,
        expiryDate: new Date('2024-08-01'),
        daysRemaining: 61,
        status: 'Low Stock & Expiring Soon',
      });
      
      // Calculate exact days for 2026-01-01
      const targetDate = new Date('2026-01-01');
      const currentDate = new Date('2024-06-01');
      const exactDaysRemaining = Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(result.data![1]).toEqual({
        id: 1,
        name: 'Low Stock Medicine B',
        code: 'LOW002',
        currentStock: 80,
        unit: 'units',
        minimumThreshold: 100,
        expiryDate: new Date('2026-01-01'),
        daysRemaining: exactDaysRemaining, // Use calculated value
        status: 'Low Stock',
      });
    });

    it('correctly identifies expiring soon status', async () => {
      const mockMedicine = {
        id: 1,
        jumlah: 50,
        nusp: 'TEST001',
        tanggalExpired: new Date('2024-08-01'), // Within 1 year
        persediaan: {
          namaPersediaan: 'Test Medicine',
          kodePersediaan: 'TEST',
        },
        satuan: { satuan: 'units' },
      };

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([mockMedicine]);

      const result = await getLowStockWarnings(1);

      expect(result.success).toBe(true);
      expect(result.data![0].status).toBe('Low Stock & Expiring Soon');
    });

    it('handles medicines with no expiry date', async () => {
      const mockMedicine = {
        id: 1,
        jumlah: 50,
        nusp: 'TEST001',
        tanggalExpired: null,
        persediaan: {
          namaPersediaan: 'Test Medicine',
          kodePersediaan: 'TEST',
        },
        satuan: { satuan: 'units' },
      };

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([mockMedicine]);

      const result = await getLowStockWarnings(1);

      expect(result.success).toBe(true);
      expect(result.data![0].status).toBe('Low Stock');
      expect(result.data![0].daysRemaining).toBeNull();
      expect(result.data![0].expiryDate).toBeNull();
    });

    it('filters by selected medicines when provided', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);

      await getLowStockWarnings(1, [10, 20]);

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith({
        where: {
          unitId: 1,
          persediaanId: { in: [10, 20] },
        },
        include: expect.any(Object),
      });
    });

    it('uses fixed threshold of 100 for all medicines', async () => {
      const mockMedicine = {
        id: 1,
        jumlah: 99, // Just below threshold
        nusp: 'TEST001',
        tanggalExpired: null,
        persediaan: {
          namaPersediaan: 'Test Medicine',
          kodePersediaan: 'TEST',
        },
        satuan: { satuan: 'units' },
      };

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([mockMedicine]);

      const result = await getLowStockWarnings(1);

      expect(result.success).toBe(true);
      expect(result.data![0].minimumThreshold).toBe(100);
      expect(result.data![0].currentStock).toBe(99);
    });
  });

  describe('Error handling for all functions', () => {
    const functions = [
      { name: 'getUnitStockHistory', fn: getUnitStockHistory },
      { name: 'getMedicinesApproachingExpiry', fn: getMedicinesApproachingExpiry },
      { name: 'getTopMedicinesInUnit', fn: getTopMedicinesInUnit },
      { name: 'getLowStockWarnings', fn: getLowStockWarnings },
    ];

    functions.forEach(({ name, fn }) => {
      it(`${name} handles database errors gracefully`, async () => {
        (prisma.pengeluaran.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));
        (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));
        (prisma.stokOpname.aggregate as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await fn(1);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to fetch');
      });
    });

    it('handles unknown errors', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue('Unknown error type');

      const result = await getTopMedicinesInUnit(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch top medicines in unit: Unknown error');
    });
  });
});