import {
  getUnitConditionDistribution,
  getUnitExpiryDistribution,
  getUnitTopReceivedItems,
  getUnitTopDispensedItems,
  getUnitTopItemsByQuantity,
  getUnitLowStockItems,
  getUnitMetrics,
  getUnitInventorySummary,
} from '@/lib/actions/unit-metrics';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  stokOpname: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  rincianPenerimaan: {
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
  rincianPengeluaran: {
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
  persediaan: {
    findUnique: jest.fn(),
  },
}));

// Import the mocked prisma after mocking
import prisma from '@/lib/prisma';

// Mock console to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Unit Metrics Actions', () => {
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
    consoleLogSpy.mockRestore();
  });

  describe('getUnitConditionDistribution', () => {
    it('successfully calculates condition distribution', async () => {
      const mockStockItems = [
        {
          rusakRingan: 0,
          rusakBerat: 0,
          jumlah: 100,
          tanggalExpired: new Date('2024-12-01'), // Not expired
        },
        {
          rusakRingan: 5,
          rusakBerat: 0,
          jumlah: 80,
          tanggalExpired: new Date('2024-12-01'), // Minor damage
        },
        {
          rusakRingan: 0,
          rusakBerat: 10,
          jumlah: 60,
          tanggalExpired: new Date('2024-12-01'), // Major damage
        },
        {
          rusakRingan: 0,
          rusakBerat: 0,
          jumlah: 40,
          tanggalExpired: new Date('2024-05-01'), // Expired
        },
      ];

      (prisma.stokOpname.count as jest.Mock).mockResolvedValue(4);
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockItems);

      const result = await getUnitConditionDistribution(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
      expect(result.data).toEqual([
        { name: 'Good', value: 1, percentage: 25 },
        { name: 'Minor Damage', value: 1, percentage: 25 },
        { name: 'Major Damage', value: 1, percentage: 25 },
        { name: 'Expired', value: 1, percentage: 25 },
      ]);
    });

    it('filters by selected medicines when provided', async () => {
      (prisma.stokOpname.count as jest.Mock).mockResolvedValue(0);
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);

      await getUnitConditionDistribution(1, [10, 20, 30]);

      expect(prisma.stokOpname.count).toHaveBeenCalledWith({
        where: {
          unitId: 1,
          persediaanId: { in: [10, 20, 30] },
        },
      });
    });

    it('handles empty data gracefully', async () => {
      (prisma.stokOpname.count as jest.Mock).mockResolvedValue(0);
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUnitConditionDistribution(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        { name: 'Good', value: 0, percentage: 0 },
        { name: 'Minor Damage', value: 0, percentage: 0 },
        { name: 'Major Damage', value: 0, percentage: 0 },
        { name: 'Expired', value: 0, percentage: 0 },
      ]);
    });

    it('handles null damage values', async () => {
      const mockStockWithNulls = [
        {
          rusakRingan: null,
          rusakBerat: null,
          jumlah: 100,
          tanggalExpired: new Date('2024-12-01'),
        },
      ];

      (prisma.stokOpname.count as jest.Mock).mockResolvedValue(1);
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockWithNulls);

      const result = await getUnitConditionDistribution(1);

      expect(result.success).toBe(true);
      expect(result.data[0]).toEqual({ name: 'Good', value: 1, percentage: 100 });
    });

    it('handles database errors', async () => {
      (prisma.stokOpname.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getUnitConditionDistribution(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch unit condition distribution');
      expect(result.data).toEqual([]);
    });
  });

  describe('getUnitExpiryDistribution', () => {
    it('successfully calculates expiry distribution', async () => {
      // Mock different counts for each expiry range
      (prisma.stokOpname.count as jest.Mock)
        .mockResolvedValueOnce(5) // < 1 month
        .mockResolvedValueOnce(10) // 1-3 months
        .mockResolvedValueOnce(15) // 3-6 months
        .mockResolvedValueOnce(20) // 6-12 months
        .mockResolvedValueOnce(25); // > 12 months

      const result = await getUnitExpiryDistribution(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(5);
      
      // Total = 75, so percentages should be calculated correctly
      expect(result.data).toEqual([
        { name: '< 1 Month', value: 5, percentage: (5/75)*100 },
        { name: '1-3 Months', value: 10, percentage: (10/75)*100 },
        { name: '3-6 Months', value: 15, percentage: (15/75)*100 },
        { name: '6-12 Months', value: 20, percentage: (20/75)*100 },
        { name: '> 12 Months', value: 25, percentage: (25/75)*100 },
      ]);
    });

    it('filters by selected medicines', async () => {
      (prisma.stokOpname.count as jest.Mock).mockResolvedValue(0);

      await getUnitExpiryDistribution(1, [10, 20]);

      // Should be called 5 times for different date ranges
      expect(prisma.stokOpname.count).toHaveBeenCalledTimes(5);
      expect(prisma.stokOpname.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            unitId: 1,
            persediaanId: { in: [10, 20] },
          }),
        })
      );
    });

    it('handles zero counts gracefully', async () => {
      (prisma.stokOpname.count as jest.Mock).mockResolvedValue(0);

      const result = await getUnitExpiryDistribution(1);

      expect(result.success).toBe(true);
      expect(result.data.every(item => item.percentage === 0)).toBe(true);
    });
  });

  describe('getUnitTopReceivedItems', () => {
    it('successfully returns top received items', async () => {
      const mockGroupedData = [
        { persediaanId: 1, _sum: { jumlah: 100 } },
        { persediaanId: 2, _sum: { jumlah: 80 } },
      ];

      const mockPersediaan = {
        namaPersediaan: 'Medicine A',
        kodePersediaan: 'MED001',
      };

      (prisma.rincianPenerimaan.groupBy as jest.Mock).mockResolvedValue(mockGroupedData);
      (prisma.persediaan.findUnique as jest.Mock).mockResolvedValue(mockPersediaan);

      const result = await getUnitTopReceivedItems(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 1,
        name: 'Medicine A',
        code: 'MED001',
        value: 100,
      });
    });

    it('handles items with no persediaan details', async () => {
      const mockGroupedData = [
        { persediaanId: 999, _sum: { jumlah: 50 } },
      ];

      (prisma.rincianPenerimaan.groupBy as jest.Mock).mockResolvedValue(mockGroupedData);
      (prisma.persediaan.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getUnitTopReceivedItems(1);

      expect(result.success).toBe(true);
      expect(result.data[0]).toEqual({
        id: 999,
        name: 'Item 999',
        code: 'Code-999',
        value: 50,
      });
    });

    it('filters by selected medicines and date range', async () => {
      (prisma.rincianPenerimaan.groupBy as jest.Mock).mockResolvedValue([]);

      await getUnitTopReceivedItems(1, [10, 20]);

      expect(prisma.rincianPenerimaan.groupBy).toHaveBeenCalledWith({
        by: ['persediaanId'],
        where: {
          unitId: 1,
          persediaanId: { in: [10, 20] },
          penerimaan: {
            tanggalPenerimaan: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        },
        _sum: { jumlah: true },
        orderBy: { _sum: { jumlah: 'desc' } },
        take: 10,
      });
    });
  });

  describe('getUnitTopDispensedItems', () => {
    it('successfully returns top dispensed items', async () => {
      const mockGroupedData = [
        { persediaanId: 1, _sum: { banyak: 60 } },
      ];

      const mockPersediaan = {
        namaPersediaan: 'Medicine B',
        kodePersediaan: 'MED002',
      };

      (prisma.rincianPengeluaran.groupBy as jest.Mock).mockResolvedValue(mockGroupedData);
      (prisma.persediaan.findUnique as jest.Mock).mockResolvedValue(mockPersediaan);

      const result = await getUnitTopDispensedItems(1);

      expect(result.success).toBe(true);
      expect(result.data[0]).toEqual({
        id: 1,
        name: 'Medicine B',
        code: 'MED002',
        value: 60,
      });
    });

    it('uses correct date range (30 days)', async () => {
      (prisma.rincianPengeluaran.groupBy as jest.Mock).mockResolvedValue([]);

      await getUnitTopDispensedItems(1);

      const expectedThirtyDaysAgo = new Date('2024-05-02T00:00:00Z');
      
      expect(prisma.rincianPengeluaran.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pengeluaran: expect.objectContaining({
              unitId: 1,
              tanggalSah: {
                gte: expectedThirtyDaysAgo,
                lte: mockCurrentDate,
              },
            }),
          }),
        })
      );
    });
  });

  describe('getUnitTopItemsByQuantity', () => {
    it('successfully returns top items by quantity with status', async () => {
      const mockStockItems = [
        {
          jumlah: 50, // Low stock
          tanggalExpired: new Date('2024-08-01'), // Expiring within 1 year
          persediaan: { id: 1, namaPersediaan: 'Medicine A', kodePersediaan: 'MED001' },
          satuan: { satuan: 'tablets' },
        },
        {
          jumlah: 200, // Good stock
          tanggalExpired: new Date('2026-06-01'), // Expiring beyond 1 year (not expiring soon)
          persediaan: { id: 2, namaPersediaan: 'Medicine B', kodePersediaan: 'MED002' },
          satuan: { satuan: 'capsules' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockItems);

      const result = await getUnitTopItemsByQuantity(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 1,
        name: 'Medicine A',
        code: 'MED001',
        stock: 50,
        unit: 'tablets',
        expiryDate: new Date('2024-08-01'),
        status: 'Low Stock & Expiring Soon',
      });
      expect(result.data[1]).toEqual({
        id: 2,
        name: 'Medicine B',
        code: 'MED002',
        stock: 200,
        unit: 'capsules',
        expiryDate: new Date('2026-06-01'),
        status: 'Available',
      });
    });

    it('correctly determines status based on stock and expiry', async () => {
      const mockItems = [
        {
          jumlah: 50,
          tanggalExpired: new Date('2026-06-01'), // Not expiring soon (beyond 1 year)
          persediaan: { id: 1, namaPersediaan: 'Med A', kodePersediaan: 'A001' },
          satuan: { satuan: 'units' },
        },
        {
          jumlah: 200,
          tanggalExpired: new Date('2024-08-01'), // Expiring soon (within 1 year)
          persediaan: { id: 2, namaPersediaan: 'Med B', kodePersediaan: 'B001' },
          satuan: { satuan: 'units' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockItems);

      const result = await getUnitTopItemsByQuantity(1);

      expect(result.data[0].status).toBe('Low Stock');
      expect(result.data[1].status).toBe('Expiring Soon');
    });
  });

  describe('getUnitLowStockItems', () => {
    it('successfully returns only low stock items (< 100)', async () => {
      const mockItems = [
        {
          jumlah: 50, // Low stock
          tanggalExpired: new Date('2024-08-01'), // Expiring within 1 year
          persediaan: { id: 1, namaPersediaan: 'Medicine A', kodePersediaan: 'MED001' },
          satuan: { satuan: 'tablets' },
        },
        {
          jumlah: 150, // Not low stock - should be filtered out
          tanggalExpired: new Date('2024-12-01'),
          persediaan: { id: 2, namaPersediaan: 'Medicine B', kodePersediaan: 'MED002' },
          satuan: { satuan: 'capsules' },
        },
        {
          jumlah: 80, // Low stock
          tanggalExpired: new Date('2026-06-01'), // Not expiring soon (beyond 1 year)
          persediaan: { id: 3, namaPersediaan: 'Medicine C', kodePersediaan: 'MED003' },
          satuan: { satuan: 'units' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockItems);

      const result = await getUnitLowStockItems(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Only low stock items
      expect(result.data[0]).toEqual({
        id: 1,
        name: 'Medicine A',
        code: 'MED001',
        currentStock: 50,
        unit: 'tablets',
        minimumThreshold: 100,
        expiryDate: new Date('2024-08-01'),
        status: 'Low Stock & Expiring Soon',
      });
      expect(result.data[1]).toEqual({
        id: 3,
        name: 'Medicine C',
        code: 'MED003',
        currentStock: 80,
        unit: 'units',
        minimumThreshold: 100,
        expiryDate: new Date('2026-06-01'),
        status: 'Low Stock',
      });
    });
  });

  describe('getUnitMetrics', () => {
    it('successfully calculates unit metrics with percentage changes', async () => {
      // Mock current month data
      (prisma.stokOpname.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { jumlah: 1000 } }); // Current inventory

      (prisma.rincianPenerimaan.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { jumlah: 200 } }) // Current month receipts
        .mockResolvedValueOnce({ _sum: { jumlah: 150 } }); // Previous month receipts

      (prisma.rincianPengeluaran.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { banyak: 100 } }) // Current month dispensed
        .mockResolvedValueOnce({ _sum: { banyak: 80 } }); // Previous month dispensed

      (prisma.stokOpname.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { jumlah: 50 } }) // Current expiring
        .mockResolvedValueOnce({ _sum: { jumlah: 40 } }); // Previous expiring

      const result = await getUnitMetrics(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalInventory: { value: 1000, change: expect.any(Number) },
        totalReceipts: { value: 200, change: 33.3 }, // (200-150)/150 * 100
        totalDispensed: { value: 100, change: 25.0 }, // (100-80)/80 * 100
        expiredMedicines: { value: 50, change: 25.0 }, // (50-40)/40 * 100
      });
    });

    it('handles string unitId by converting to number', async () => {
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 500 } });
      (prisma.rincianPenerimaan.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 0 } });
      (prisma.rincianPengeluaran.aggregate as jest.Mock).mockResolvedValue({ _sum: { banyak: 0 } });

      const result = await getUnitMetrics('1'); // String ID

      expect(result.success).toBe(true);
      expect(result.data.totalInventory.value).toBe(500);
    });

    it('handles invalid unitId', async () => {
      const result = await getUnitMetrics('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid unit ID');
      expect(result.data.totalInventory.value).toBe(0);
    });

    it('handles 100% increase when previous value was 0', async () => {
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 100 } });
      (prisma.rincianPenerimaan.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { jumlah: 50 } }) // Current month
        .mockResolvedValueOnce({ _sum: { jumlah: 0 } }); // Previous month was 0
      (prisma.rincianPengeluaran.aggregate as jest.Mock).mockResolvedValue({ _sum: { banyak: 0 } });

      const result = await getUnitMetrics(1);

      expect(result.data.totalReceipts.change).toBe(100);
    });

    it('filters by selected medicines when provided', async () => {
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 100 } });
      (prisma.rincianPenerimaan.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 0 } });
      (prisma.rincianPengeluaran.aggregate as jest.Mock).mockResolvedValue({ _sum: { banyak: 0 } });

      await getUnitMetrics(1, [10, 20, 30]);

      expect(prisma.stokOpname.aggregate).toHaveBeenCalledWith({
        where: {
          unitId: 1,
          persediaanId: { in: [10, 20, 30] },
        },
        _sum: { jumlah: true },
      });
    });
  });

  describe('getUnitInventorySummary', () => {
    it('successfully calculates inventory summary', async () => {
      const mockUniqueItems = [
        { persediaanId: 1 },
        { persediaanId: 2 },
        { persediaanId: 3 },
      ];

      (prisma.stokOpname.findMany as jest.Mock)
        .mockResolvedValueOnce(mockUniqueItems); // Unique medicines

      (prisma.stokOpname.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { jumlah: 1000 } }) // Total inventory
        .mockResolvedValueOnce({ _sum: { rusakRingan: 50, rusakBerat: 30 } }) // Damaged
        .mockResolvedValueOnce({ _sum: { jumlah: 100 } }) // Expired
        .mockResolvedValueOnce({ _sum: { hilang: 20 } }); // Lost

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        uniqueMedicines: 3,
        available: 800, // 1000 - (50+30) - 100 - 20 = 800
        damagedOrExpired: 180, // (50+30) + 100 = 180
      });
    });

    it('ensures available stock never goes negative', async () => {
      const mockUniqueItems = [{ persediaanId: 1 }];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValueOnce(mockUniqueItems);
      (prisma.stokOpname.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { jumlah: 100 } }) // Total inventory
        .mockResolvedValueOnce({ _sum: { rusakRingan: 80, rusakBerat: 50 } }) // High damage
        .mockResolvedValueOnce({ _sum: { jumlah: 50 } }) // Expired
        .mockResolvedValueOnce({ _sum: { hilang: 30 } }); // Lost

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(true);
      expect(result.data.available).toBe(0); // Should be 0, not negative
    });

    it('handles null aggregation values', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.stokOpname.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { jumlah: null } })
        .mockResolvedValueOnce({ _sum: { rusakRingan: null, rusakBerat: null } })
        .mockResolvedValueOnce({ _sum: { jumlah: null } })
        .mockResolvedValueOnce({ _sum: { hilang: null } });

      const result = await getUnitInventorySummary(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        uniqueMedicines: 0,
        available: 0,
        damagedOrExpired: 0,
      });
    });

    it('logs detailed calculation steps', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.stokOpname.aggregate as jest.Mock).mockResolvedValue({ _sum: { jumlah: 0 } });

      await getUnitInventorySummary(1);

      expect(consoleLogSpy).toHaveBeenCalledWith('Getting inventory summary for unit 1', { selectedMedicines: undefined });
      expect(consoleLogSpy).toHaveBeenCalledWith('Found 0 unique medicines');
    });
  });

  describe('Error handling for all functions', () => {
    const functions = [
      { name: 'getUnitConditionDistribution', fn: getUnitConditionDistribution },
      { name: 'getUnitExpiryDistribution', fn: getUnitExpiryDistribution },
      { name: 'getUnitTopReceivedItems', fn: getUnitTopReceivedItems },
      { name: 'getUnitTopItemsByQuantity', fn: getUnitTopItemsByQuantity },
      { name: 'getUnitLowStockItems', fn: getUnitLowStockItems },
      { name: 'getUnitInventorySummary', fn: getUnitInventorySummary },
    ];

    functions.forEach(({ name, fn }) => {
      it(`${name} handles database errors gracefully`, async () => {
        (prisma.stokOpname.count as jest.Mock).mockRejectedValue(new Error('DB Error'));
        (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));
        (prisma.stokOpname.aggregate as jest.Mock).mockRejectedValue(new Error('DB Error'));
        (prisma.rincianPenerimaan.groupBy as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await fn(1);

        expect(result.success).toBe(false);
        if ('error' in result) {
          expect(result.error).toContain('Failed to fetch');
        }
      });
    });

    it('getUnitTopDispensedItems handles database errors gracefully', async () => {
      (prisma.rincianPengeluaran.groupBy as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await getUnitTopDispensedItems(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch');
    });

    it('getUnitMetrics handles database errors with fallback data', async () => {
      (prisma.stokOpname.aggregate as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await getUnitMetrics(1);

      expect(result.success).toBe(false);
      expect(result.data).toEqual({
        totalInventory: { value: 0, change: 0 },
        totalReceipts: { value: 0, change: 0 },
        totalDispensed: { value: 0, change: 0 },
        expiredMedicines: { value: 0, change: 0 },
      });
    });
  });
});