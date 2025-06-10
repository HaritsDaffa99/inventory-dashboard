import {
  getMedicine,
  getUnitMedicines,
  getStockOpnameByUnit,
  getItemConditionDistribution,
  getAllPersediaan,
  getUnits,
  getDashboardMetrics,
  getTopReceivedItems,
  getTopDispensedItems,
  getTopItemsByQuantity,
  getTopReceiptLocations,
  getTopDispensedLocations,
} from '@/lib/actions/medicine';

// Mock Prisma with proper initialization
jest.mock('@/lib/prisma', () => ({
  persediaan: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  stokOpname: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  kondisi: {
    findMany: jest.fn(),
  },
  rincianPenerimaan: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  rincianPengeluaran: {
    groupBy: jest.fn(),
  },
  unit: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  penerimaan: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  pengeluaran: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
}));

// Import the mocked prisma after mocking
import prisma from '@/lib/prisma';

// Mock console to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Medicine Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('getMedicine', () => {
    it('successfully returns a medicine by ID', async () => {
      const mockMedicine = {
        id: 1,
        namaPersediaan: 'Paracetamol 500mg',
        kodePersediaan: 'PAR500',
        tipe: 'Tablet',
      };

      (prisma.persediaan.findUnique as jest.Mock).mockResolvedValue(mockMedicine);

      const result = await getMedicine('1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: '1',
        medicine_name: 'Paracetamol 500mg',
        transaction_status: 'Current',
      });
      expect(prisma.persediaan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          namaPersediaan: true,
          kodePersediaan: true,
          tipe: true,
        },
      });
    });

    it('returns error when medicine not found', async () => {
      (prisma.persediaan.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getMedicine('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Medicine not found');
      expect(result.data).toBe(null);
    });

    it('handles database errors', async () => {
      (prisma.persediaan.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getMedicine('1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch medicine: Database error');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching medicine:', expect.any(Error));
    });
  });

  describe('getUnitMedicines', () => {
    it('successfully returns medicines for a unit', async () => {
      const mockStockItems = [
        { persediaanId: 1 },
        { persediaanId: 2 },
      ];

      const mockMedicines = [
        { id: 1, namaPersediaan: 'Medicine A', kodePersediaan: 'MED001', tipe: 'Tablet' },
        { id: 2, namaPersediaan: 'Medicine B', kodePersediaan: 'MED002', tipe: 'Capsule' },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockItems);
      (prisma.persediaan.findMany as jest.Mock).mockResolvedValue(mockMedicines);

      const result = await getUnitMedicines(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMedicines);
      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith({
        where: { unitId: 1 },
        select: { persediaanId: true },
        distinct: ['persediaanId'],
      });
    });

    it('handles database errors', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getUnitMedicines(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch unit medicines');
    });
  });

  describe('getStockOpnameByUnit', () => {
    it('successfully returns stock data by unit', async () => {
      const mockStockData = [
        {
          id: 1,
          unitId: 1,
          persediaan: {
            namaPersediaan: 'Medicine A',
            kodePersediaan: 'MED001',
            tipe: 'Tablet',
          },
          satuan: {
            satuan: 'box',
          },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockData);

      const result = await getStockOpnameByUnit(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStockData);
    });

    it('handles database errors', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getStockOpnameByUnit(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch stock data');
    });
  });

  describe('getItemConditionDistribution', () => {
    it('successfully returns condition distribution', async () => {
      const mockKondisiList = [
        { kondisi: 'Good' },
        { kondisi: 'Fair' },
        { kondisi: 'Poor' },
      ];

      const mockStockOpname = {
        _sum: {
          hilang: 5,
          rusakRingan: 10,
          usang: 15,
          rusakBerat: 20,
          jumlah: 200,
        },
      };

      (prisma.kondisi.findMany as jest.Mock).mockResolvedValue(mockKondisiList);
      (prisma.rincianPenerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue(mockStockOpname);

      const result = await getItemConditionDistribution();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            value: expect.any(Number),
            percentage: expect.any(Number),
          }),
        ])
      );
    });

    it('filters by unitId when provided', async () => {
      (prisma.kondisi.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.rincianPenerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 100 } });

      await getItemConditionDistribution(1);

      expect(prisma.rincianPenerimaan.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          unitId: 1,
        }),
        include: expect.any(Object),
      });
    });

    it('filters by persediaanIds when provided', async () => {
      (prisma.kondisi.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.rincianPenerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 100 } });

      await getItemConditionDistribution(undefined, [1, 2, 3]);

      expect(prisma.rincianPenerimaan.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          persediaanId: { in: [1, 2, 3] },
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('getAllPersediaan', () => {
    it('successfully returns all persediaan', async () => {
      const mockPersediaan = [
        { id: 1, namaPersediaan: 'Medicine A' },
        { id: 2, namaPersediaan: 'Medicine B' },
      ];

      (prisma.persediaan.findMany as jest.Mock).mockResolvedValue(mockPersediaan);

      const result = await getAllPersediaan();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPersediaan);
      expect(prisma.persediaan.findMany).toHaveBeenCalledWith({
        orderBy: { namaPersediaan: 'asc' },
      });
    });
  });

  describe('getUnits', () => {
    it('successfully returns active units', async () => {
      const mockUnits = [
        { id: 1, namaUnit: 'Unit A' },
        { id: 2, namaUnit: 'Unit B' },
      ];

      (prisma.unit.findMany as jest.Mock).mockResolvedValue(mockUnits);

      const result = await getUnits();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUnits);
      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        where: { temp: false },
        orderBy: { namaUnit: 'asc' },
      });
    });
  });

  describe('getDashboardMetrics', () => {
    it('successfully calculates dashboard metrics', async () => {
      const mockCurrentReceipts = [
        {
          rincianPenerimaan: [
            { jumlah: 100 },
            { jumlah: 50 },
          ],
        },
      ];

      const mockPreviousReceipts = [
        {
          rincianPenerimaan: [
            { jumlah: 80 },
          ],
        },
      ];

      const mockCurrentDispensed = [
        {
          rincianPengeluaran: [
            { banyak: 60 },
            { banyak: 40 },
          ],
        },
      ];

      const mockPreviousDispensed = [
        {
          rincianPengeluaran: [
            { banyak: 90 },
          ],
        },
      ];

      const mockCurrentStock = { _sum: { jumlah: 500 } };

      (prisma.penerimaan.findMany as jest.Mock)
        .mockResolvedValueOnce(mockCurrentReceipts)
        .mockResolvedValueOnce(mockPreviousReceipts);

      (prisma.pengeluaran.findMany as jest.Mock)
        .mockResolvedValueOnce(mockCurrentDispensed)
        .mockResolvedValueOnce(mockPreviousDispensed);

      (prisma.stokOpname.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockCurrentStock)
        .mockResolvedValueOnce(mockCurrentStock);

      const result = await getDashboardMetrics();

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data).toEqual(
          expect.objectContaining({
            totalReceipts: expect.objectContaining({
              value: expect.any(Number),
              change: expect.any(Number),
            }),
            totalDispensed: expect.objectContaining({
              value: expect.any(Number),
              change: expect.any(Number),
            }),
            availableStock: expect.objectContaining({
              value: expect.any(Number),
              change: null,
            }),
            stockToConsumptionRatio: expect.objectContaining({
              value: expect.any(Number),
              change: expect.any(Number),
            }),
          })
        );
      }
    });
  });

  describe('getTopReceivedItems', () => {
    it('successfully returns top received items', async () => {
      const mockTopItems = [
        { persediaanId: 1, _sum: { jumlah: 100 } },
        { persediaanId: 2, _sum: { jumlah: 80 } },
      ];

      const mockPersediaan = {
        namaPersediaan: 'Medicine A',
        kodePersediaan: 'MED001',
        tipe: 'Tablet',
      };

      (prisma.rincianPenerimaan.groupBy as jest.Mock).mockResolvedValue(mockTopItems);
      (prisma.persediaan.findUnique as jest.Mock).mockResolvedValue(mockPersediaan);

      const result = await getTopReceivedItems();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            value: expect.any(Number),
          }),
        ])
      );
    });

    it('filters by selected medicines when provided', async () => {
      (prisma.rincianPenerimaan.groupBy as jest.Mock).mockResolvedValue([]);

      await getTopReceivedItems([1, 2, 3]);

      expect(prisma.rincianPenerimaan.groupBy).toHaveBeenCalledWith({
        by: ['persediaanId'],
        where: expect.objectContaining({
          persediaanId: { in: [1, 2, 3] },
        }),
        _sum: { jumlah: true },
        orderBy: { _sum: { jumlah: 'desc' } },
        take: 10,
      });
    });
  });

  describe('getTopDispensedItems', () => {
    it('successfully returns top dispensed items', async () => {
      const mockTopItems = [
        { persediaanId: 1, _sum: { banyak: 80 } },
        { persediaanId: 2, _sum: { banyak: 60 } },
      ];

      const mockPersediaan = {
        namaPersediaan: 'Medicine A',
        kodePersediaan: 'MED001',
        tipe: 'Tablet',
      };

      (prisma.rincianPengeluaran.groupBy as jest.Mock).mockResolvedValue(mockTopItems);
      (prisma.persediaan.findUnique as jest.Mock).mockResolvedValue(mockPersediaan);

      const result = await getTopDispensedItems();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            value: expect.any(Number),
          }),
        ])
      );
    });
  });

  describe('getTopItemsByQuantity', () => {
    it('successfully returns top items by quantity', async () => {
      const mockTopItems = [
        { persediaanId: 1, _sum: { jumlah: 500 } },
        { persediaanId: 2, _sum: { jumlah: 300 } },
      ];

      const mockPersediaan = {
        namaPersediaan: 'Medicine A',
        kodePersediaan: 'MED001',
      };

      const mockStockOpname = {
        satuan: { satuan: 'box' },
        jumlah: 500,
        rusakRingan: 10,
        rusakBerat: 5,
        usang: 15,
        hilang: 20,
      };

      (prisma.stokOpname.groupBy as jest.Mock).mockResolvedValue(mockTopItems);
      (prisma.persediaan.findUnique as jest.Mock).mockResolvedValue(mockPersediaan);
      (prisma.stokOpname.findFirst as jest.Mock).mockResolvedValue(mockStockOpname);

      const result = await getTopItemsByQuantity();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            code: expect.any(String),
            quantity: expect.any(Number),
            unit: expect.any(String),
            status: expect.any(String),
          }),
        ])
      );
    });
  });

  describe('getTopReceiptLocations', () => {
    it('successfully returns top receipt locations', async () => {
      const mockTopUnits = [
        { unitId: 1, _count: { id: 50 } },
        { unitId: 2, _count: { id: 30 } },
      ];

      const mockUnit = { namaUnit: 'Emergency Department' };

      (prisma.penerimaan.groupBy as jest.Mock).mockResolvedValue(mockTopUnits);
      (prisma.penerimaan.count as jest.Mock).mockResolvedValue(100);
      (prisma.unit.findUnique as jest.Mock).mockResolvedValue(mockUnit);

      const result = await getTopReceiptLocations();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            count: expect.any(Number),
            percentage: expect.any(String),
          }),
        ])
      );
    });
  });

  describe('getTopDispensedLocations', () => {
    it('successfully returns top dispensed locations', async () => {
      const mockTopUnits = [
        { unitId: 1, _count: { id: 40 } },
        { unitId: 2, _count: { id: 25 } },
      ];

      const mockUnit = { namaUnit: 'Outpatient Pharmacy' };

      (prisma.pengeluaran.groupBy as jest.Mock).mockResolvedValue(mockTopUnits);
      (prisma.pengeluaran.count as jest.Mock).mockResolvedValue(80);
      (prisma.unit.findUnique as jest.Mock).mockResolvedValue(mockUnit);

      const result = await getTopDispensedLocations();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            count: expect.any(Number),
            percentage: expect.any(String),
          }),
        ])
      );
    });
  });

  describe('Error handling', () => {
    it('handles unknown errors gracefully', async () => {
      (prisma.persediaan.findUnique as jest.Mock).mockRejectedValue('Unknown error type');

      const result = await getMedicine('1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch medicine: Unknown error');
    });

    it('handles null aggregation results', async () => {
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: null } });
      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getDashboardMetrics();

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.availableStock.value).toBe(0);
      }
    });

    it('handles empty query results', async () => {
      (prisma.rincianPenerimaan.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await getTopReceivedItems();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});