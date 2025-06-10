import { getUnitsForMap, getUnitStockOpname, getUnitsWithCriticalInventory } from '@/lib/actions/map';
import prisma from '@/lib/prisma';

// Mock the Prisma client
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    unit: {
      findMany: jest.fn(),
    },
    stokOpname: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Map Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('getUnitsForMap', () => {
    const mockUnits = [
      {
        id: 1,
        namaUnit: 'Unit A',
        latitude: -6.200000,
        longitude: 106.816666,
        temp: false,
      },
      {
        id: 2,
        namaUnit: 'Unit B',
        latitude: -6.175110,
        longitude: 106.865039,
        temp: false,
      },
      {
        id: 3,
        namaUnit: 'Unit C',
        latitude: -6.208763,
        longitude: 106.845599,
        temp: false,
      },
    ];

    it('successfully fetches active units ordered by name', async () => {
      (prisma.unit.findMany as jest.Mock).mockResolvedValue(mockUnits);

      const result = await getUnitsForMap();

      expect(result).toEqual({
        success: true,
        data: mockUnits,
      });

      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        where: {
          temp: false,
        },
        orderBy: {
          namaUnit: 'asc',
        },
      });
    });

    it('returns empty array when no units found', async () => {
      (prisma.unit.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUnitsForMap();

      expect(result).toEqual({
        success: true,
        data: [],
      });
    });

    it('handles database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.unit.findMany as jest.Mock).mockRejectedValue(dbError);

      const result = await getUnitsForMap();

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch units: Database connection failed',
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching units for map:',
        dbError
      );
    });

    it('handles non-Error exceptions', async () => {
      (prisma.unit.findMany as jest.Mock).mockRejectedValue('String error');

      const result = await getUnitsForMap();

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch units: Unknown error',
      });
    });

    it('filters out temporary units', async () => {
      await getUnitsForMap();

      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        where: {
          temp: false, // Ensures temp units are excluded
        },
        orderBy: {
          namaUnit: 'asc',
        },
      });
    });
  });

  describe('getUnitStockOpname', () => {
    const mockStockData = [
      {
        id: 1,
        unitId: 1,
        nusp: 'NUSP001',
        jumlah: 150,
        tanggalExpired: new Date('2025-12-31'),
        rusakRingan: 0,
        rusakBerat: 0,
        usang: 0,
        hilang: 0,
        persediaan: {
          namaPersediaan: 'Paracetamol 500mg',
          kodePersediaan: 'PAR500',
          tipe: 'Analgesics',
        },
        satuan: {
          satuan: 'Tablet',
        },
      },
      {
        id: 2,
        unitId: 1,
        nusp: 'NUSP002',
        jumlah: 50,
        tanggalExpired: new Date('2024-06-30'),
        rusakRingan: 5,
        rusakBerat: 0,
        usang: 0,
        hilang: 0,
        persediaan: {
          namaPersediaan: 'Amoxicillin 250mg',
          kodePersediaan: 'AMX250',
          tipe: 'Antibiotics',
        },
        satuan: {
          satuan: 'Capsule',
        },
      },
    ];

    beforeEach(() => {
      (prisma.stokOpname.count as jest.Mock).mockResolvedValue(2);
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockStockData);
    });

    describe('Basic functionality', () => {
      it('successfully fetches stock opname data with default pagination', async () => {
        const result = await getUnitStockOpname(1);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockStockData);
        expect(result.pagination).toEqual({
          totalItems: 2,
          totalPages: 1,
          currentPage: 1,
          pageSize: 10,
        });

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith({
          where: { unitId: 1 },
          include: {
            persediaan: {
              select: {
                namaPersediaan: true,
                kodePersediaan: true,
                tipe: true,
              },
            },
            satuan: {
              select: {
                satuan: true,
              },
            },
          },
          orderBy: {
            persediaan: {
              namaPersediaan: 'asc',
            },
          },
          skip: 0,
          take: 10,
        });
      });

      it('handles custom pagination parameters', async () => {
        await getUnitStockOpname(1, 2, 5);

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 5, // (page 2 - 1) * pageSize 5
            take: 5,
          })
        );
      });

      it('fetches all items when pageSize is -1', async () => {
        const result = await getUnitStockOpname(1, 1, -1);

        expect(result.pagination).toEqual({
          totalItems: 2,
          totalPages: 1,
          currentPage: 1,
          pageSize: -1,
        });

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
            take: undefined, // No limit when fetching all
          })
        );
      });
    });

    describe('Search functionality', () => {
      it('searches by medicine name', async () => {
        await getUnitStockOpname(1, 1, 10, 'Paracetamol');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              unitId: 1,
              OR: [
                {
                  persediaan: {
                    namaPersediaan: {
                      contains: 'Paracetamol',
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  nusp: {
                    contains: 'Paracetamol',
                    mode: 'insensitive',
                  },
                },
                {
                  persediaan: {
                    tipe: {
                      contains: 'Paracetamol',
                      mode: 'insensitive',
                    },
                  },
                },
              ],
            },
          })
        );
      });

      it('searches by NUSP code', async () => {
        await getUnitStockOpname(1, 1, 10, 'NUSP001');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              unitId: 1,
              OR: expect.arrayContaining([
                {
                  nusp: {
                    contains: 'NUSP001',
                    mode: 'insensitive',
                  },
                },
              ]),
            },
          })
        );
      });

      it('searches by medicine type', async () => {
        await getUnitStockOpname(1, 1, 10, 'Analgesics');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              unitId: 1,
              OR: expect.arrayContaining([
                {
                  persediaan: {
                    tipe: {
                      contains: 'Analgesics',
                      mode: 'insensitive',
                    },
                  },
                },
              ]),
            },
          })
        );
      });

      it('ignores empty search strings', async () => {
        await getUnitStockOpname(1, 1, 10, '   ');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { unitId: 1 }, // No OR clause for empty search
          })
        );
      });
    });

    describe('Filter functionality', () => {
      beforeEach(() => {
        // Mock current date for consistent testing
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-06-01'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('filters expired items', async () => {
        await getUnitStockOpname(1, 1, 10, undefined, 'expired');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              unitId: 1,
              tanggalExpired: {
                lte: new Date('2024-06-01'),
              },
            },
          })
        );
      });

      it('filters near expiry items', async () => {
        await getUnitStockOpname(1, 1, 10, undefined, 'nearExpiry');

        const expectedEndDate = new Date('2025-06-01'); // One year from current date

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              unitId: 1,
              tanggalExpired: {
                gt: new Date('2024-06-01'),
                lte: expectedEndDate,
              },
            },
          })
        );
      });

      it('filters damaged items', async () => {
        await getUnitStockOpname(1, 1, 10, undefined, 'damaged');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              unitId: 1,
              OR: [
                { rusakRingan: { gt: 0 } },
                { rusakBerat: { gt: 0 } },
                { usang: { gt: 0 } },
                { hilang: { gt: 0 } },
              ],
            },
          })
        );
      });

      it('filters low stock items', async () => {
        await getUnitStockOpname(1, 1, 10, undefined, 'low');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              unitId: 1,
              jumlah: {
                lt: 100,
              },
            },
          })
        );
      });

      it('ignores "all" filter', async () => {
        await getUnitStockOpname(1, 1, 10, undefined, 'all');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { unitId: 1 }, // No additional filters
          })
        );
      });
    });

    describe('Sorting functionality', () => {
      it('sorts by expiry date ascending', async () => {
        await getUnitStockOpname(1, 1, 10, undefined, 'expiryAsc');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: {
              tanggalExpired: 'asc',
            },
          })
        );
      });

      it('sorts by expiry date descending', async () => {
        await getUnitStockOpname(1, 1, 10, undefined, 'expiryDesc');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: {
              tanggalExpired: 'desc',
            },
          })
        );
      });

      it('sorts by quantity ascending', async () => {
        await getUnitStockOpname(1, 1, 10, undefined, 'quantityAsc');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: {
              jumlah: 'asc',
            },
          })
        );
      });

      it('sorts by quantity descending', async () => {
        await getUnitStockOpname(1, 1, 10, undefined, 'quantityDesc');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: {
              jumlah: 'desc',
            },
          })
        );
      });

      it('uses default sort by medicine name when no sort filter provided', async () => {
        await getUnitStockOpname(1, 1, 10);

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: {
              persediaan: {
                namaPersediaan: 'asc',
              },
            },
          })
        );
      });
    });

    describe('Combined filters', () => {
      it('combines search and filter', async () => {
        await getUnitStockOpname(1, 1, 10, 'Paracetamol', 'low');

        expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              unitId: 1,
              OR: [
                {
                  persediaan: {
                    namaPersediaan: {
                      contains: 'Paracetamol',
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  nusp: {
                    contains: 'Paracetamol',
                    mode: 'insensitive',
                  },
                },
                {
                  persediaan: {
                    tipe: {
                      contains: 'Paracetamol',
                      mode: 'insensitive',
                    },
                  },
                },
              ],
              jumlah: {
                lt: 100,
              },
            },
          })
        );
      });
    });

    describe('Pagination calculations', () => {
      it('calculates correct pagination for multiple pages', async () => {
        (prisma.stokOpname.count as jest.Mock).mockResolvedValue(25);

        const result = await getUnitStockOpname(1, 2, 10);

        expect(result.pagination).toEqual({
          totalItems: 25,
          totalPages: 3, // Math.ceil(25 / 10)
          currentPage: 2,
          pageSize: 10,
        });
      });

      it('handles edge case with exact page division', async () => {
        (prisma.stokOpname.count as jest.Mock).mockResolvedValue(20);

        const result = await getUnitStockOpname(1, 1, 10);

        expect(result.pagination).toEqual({
          totalItems: 20,
          totalPages: 2, // Math.ceil(20 / 10)
          currentPage: 1,
          pageSize: 10,
        });
      });
    });

    describe('Error handling', () => {
      it('handles database errors gracefully', async () => {
        const dbError = new Error('Database query failed');
        (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue(dbError);

        const result = await getUnitStockOpname(1);

        expect(result).toEqual({
          success: false,
          error: 'Failed to fetch stock data: Database query failed',
        });

        expect(mockConsoleError).toHaveBeenCalledWith(
          'Error fetching unit stock opname:',
          dbError
        );
      });

      it('handles non-Error exceptions', async () => {
        (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue('String error');

        const result = await getUnitStockOpname(1);

        expect(result).toEqual({
          success: false,
          error: 'Failed to fetch stock data: Unknown error',
        });
      });
    });
  });

  describe('getUnitsWithCriticalInventory', () => {
    const mockCriticalData = [
      { unitId: 1 },
      { unitId: 3 },
      { unitId: 5 },
    ];

    beforeEach(() => {
      // Mock current date for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('successfully fetches units with critical inventory', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockCriticalData);

      const result = await getUnitsWithCriticalInventory();

      expect(result).toEqual({
        success: true,
        data: [1, 3, 5],
      });

      const currentDate = new Date('2024-06-01');
      const thirtyDaysFromNow = new Date('2024-07-01');

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            // Expired items
            {
              tanggalExpired: {
                lte: currentDate,
              },
            },
            // Near expiry items (30 days)
            {
              tanggalExpired: {
                gt: currentDate,
                lte: thirtyDaysFromNow,
              },
            },
            // Low stock items
            {
              jumlah: {
                lt: 10,
              },
            },
            // Damaged items
            {
              OR: [
                { rusakRingan: { gt: 0 } },
                { rusakBerat: { gt: 0 } },
                { usang: { gt: 0 } },
                { hilang: { gt: 0 } },
              ],
            },
          ],
        },
        select: {
          unitId: true,
        },
        distinct: ['unitId'],
      });
    });

    it('returns empty array when no critical units found', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUnitsWithCriticalInventory();

      expect(result).toEqual({
        success: true,
        data: [],
      });
    });

    it('handles single critical unit', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([{ unitId: 7 }]);

      const result = await getUnitsWithCriticalInventory();

      expect(result).toEqual({
        success: true,
        data: [7],
      });
    });

    it('uses correct date calculations', async () => {
      jest.setSystemTime(new Date('2024-12-15'));

      await getUnitsWithCriticalInventory();

      const currentDate = new Date('2024-12-15');
      const thirtyDaysFromNow = new Date('2025-01-14'); // 30 days later

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              {
                tanggalExpired: {
                  lte: currentDate,
                },
              },
              {
                tanggalExpired: {
                  gt: currentDate,
                  lte: thirtyDaysFromNow,
                },
              },
            ]),
          },
        })
      );
    });

    it('includes all damage types in filter', async () => {
      await getUnitsWithCriticalInventory();

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              {
                OR: [
                  { rusakRingan: { gt: 0 } },
                  { rusakBerat: { gt: 0 } },
                  { usang: { gt: 0 } },
                  { hilang: { gt: 0 } },
                ],
              },
            ]),
          },
        })
      );
    });

    it('uses correct low stock threshold', async () => {
      await getUnitsWithCriticalInventory();

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              {
                jumlah: {
                  lt: 10, // Low stock threshold
                },
              },
            ]),
          },
        })
      );
    });

    it('ensures distinct unit IDs are returned', async () => {
      await getUnitsWithCriticalInventory();

      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['unitId'],
        })
      );
    });

    it('handles database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue(dbError);

      const result = await getUnitsWithCriticalInventory();

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch critical units: Database connection failed',
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching critical units:',
        dbError
      );
    });

    it('handles non-Error exceptions', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue('String error');

      const result = await getUnitsWithCriticalInventory();

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch critical units: Unknown error',
      });
    });
  });

  describe('Integration scenarios', () => {
    it('handles multiple functions being called sequentially', async () => {
      // Mock responses for all functions
      (prisma.unit.findMany as jest.Mock).mockResolvedValue([
        { id: 1, namaUnit: 'Unit A', temp: false },
      ]);
      (prisma.stokOpname.count as jest.Mock).mockResolvedValue(5);
      (prisma.stokOpname.findMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 1,
            unitId: 1,
            jumlah: 50,
            persediaan: { namaPersediaan: 'Medicine A' },
            satuan: { satuan: 'Tablet' },
          },
        ])
        .mockResolvedValueOnce([{ unitId: 1 }]);

      // Call all functions
      const unitsResult = await getUnitsForMap();
      const stockResult = await getUnitStockOpname(1);
      const criticalResult = await getUnitsWithCriticalInventory();

      // Verify all succeed
      expect(unitsResult.success).toBe(true);
      expect(stockResult.success).toBe(true);
      expect(criticalResult.success).toBe(true);

      // Verify correct number of calls
      expect(prisma.unit.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.stokOpname.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.stokOpname.count).toHaveBeenCalledTimes(1);
    });
  });
});