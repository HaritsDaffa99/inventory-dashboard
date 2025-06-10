import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getReadNotifications,
  Notification,
} from '@/lib/actions/notification';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  stokOpname: {
    findMany: jest.fn(),
  },
  penerimaan: {
    findMany: jest.fn(),
  },
  pengeluaran: {
    findMany: jest.fn(),
  },
}));

// Import the mocked prisma after mocking
import prisma from '@/lib/prisma';

// Mock console to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Notification Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Math.random to have predictable results
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterAll(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('getNotifications', () => {
    const mockCurrentDate = new Date('2024-06-01T00:00:00Z');
    const mockOneMonthAgo = new Date('2024-05-01T00:00:00Z');

    beforeEach(() => {
      // Mock current date
      jest.useFakeTimers();
      jest.setSystemTime(mockCurrentDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('successfully generates notifications from database data', async () => {
      const mockLowStockItems = [
        {
          id: 1,
          unitId: 1,
          persediaanId: 10,
          jumlah: 50,
          tanggalExpired: new Date('2024-12-01'),
          persediaan: { namaPersediaan: 'Paracetamol 500mg' },
          unit: { namaUnit: 'Emergency Department' },
        },
      ];

      const mockExpiringItems = [
        {
          id: 2,
          unitId: 2,
          persediaanId: 20,
          jumlah: 200,
          tanggalExpired: new Date('2024-06-15'), // 14 days from mock current date
          persediaan: { namaPersediaan: 'Amoxicillin 250mg' },
          unit: { namaUnit: 'Internal Medicine' },
        },
      ];

      const mockRecentReceipts = [
        {
          id: 1,
          unitId: 1,
          tanggalPenerimaan: new Date('2024-05-15'),
          unit: { namaUnit: 'Emergency Department' },
          rincianPenerimaan: [
            { persediaan: { namaPersediaan: 'Medicine A' } },
            { persediaan: { namaPersediaan: 'Medicine B' } },
          ],
        },
      ];

      const mockRecentDispensing = [
        {
          id: 1,
          unitId: 1,
          tanggalSah: new Date('2024-05-20'),
          unit: { namaUnit: 'Emergency Department' },
          rincianPengeluaran: [
            { persediaan: { namaPersediaan: 'Medicine C' } },
          ],
        },
      ];

      // Setup mock responses
      (prisma.stokOpname.findMany as jest.Mock)
        .mockResolvedValueOnce(mockLowStockItems) // First call for low stock
        .mockResolvedValueOnce(mockExpiringItems); // Second call for expiring items

      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue(mockRecentReceipts);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue(mockRecentDispensing);

      const result = await getNotifications();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);

      // Check that we have different types of notifications
      const notificationTypes = result.data!.map(n => n.type);
      expect(notificationTypes).toContain('warning'); // Low stock
      expect(notificationTypes).toContain('success'); // Recent receipts
      expect(notificationTypes).toContain('info'); // Recent dispensing
    });

    it('filters notifications by unitId when provided', async () => {
      const mockLowStockItems = [
        {
          id: 1,
          unitId: 1,
          persediaanId: 10,
          jumlah: 50,
          tanggalExpired: new Date('2024-12-01'),
          persediaan: { namaPersediaan: 'Medicine A' },
          unit: { namaUnit: 'Unit 1' },
        },
        {
          id: 2,
          unitId: 2,
          persediaanId: 20,
          jumlah: 30,
          tanggalExpired: new Date('2024-12-01'),
          persediaan: { namaPersediaan: 'Medicine B' },
          unit: { namaUnit: 'Unit 2' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockLowStockItems);
      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      await getNotifications(1);

      // Check that unitId filter is applied to all database queries
      expect(prisma.stokOpname.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unitId: 1 }),
        })
      );
      expect(prisma.penerimaan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unitId: 1 }),
        })
      );
      expect(prisma.pengeluaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unitId: 1 }),
        })
      );
    });

    it('applies limit when provided', async () => {
      const mockLowStockItems = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        unitId: 1,
        persediaanId: i + 10,
        jumlah: 50,
        tanggalExpired: new Date('2024-12-01'),
        persediaan: { namaPersediaan: `Medicine ${i + 1}` },
        unit: { namaUnit: 'Test Unit' },
      }));

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockLowStockItems);
      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getNotifications(undefined, 5);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeLessThanOrEqual(5);
    });

    it('generates different notification types based on urgency', async () => {
      const mockExpiringItems = [
        {
          id: 1,
          unitId: 1,
          persediaanId: 10,
          jumlah: 200,
          tanggalExpired: new Date('2024-06-05'), // 4 days from mock current date
          persediaan: { namaPersediaan: 'Critical Medicine' },
          unit: { namaUnit: 'ICU' },
        },
        {
          id: 2,
          unitId: 1,
          persediaanId: 20,
          jumlah: 300,
          tanggalExpired: new Date('2024-09-01'), // 3 months from mock current date
          persediaan: { namaPersediaan: 'Regular Medicine' },
          unit: { namaUnit: 'General Ward' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // Low stock query
        .mockResolvedValueOnce(mockExpiringItems); // Expiring items query

      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getNotifications();

      expect(result.success).toBe(true);
      
      const criticalNotification = result.data!.find(n => 
        n.message.includes('Critical Medicine')
      );
      const regularNotification = result.data!.find(n => 
        n.message.includes('Regular Medicine')
      );

      expect(criticalNotification?.type).toBe('error'); // Expiring within 30 days
      expect(regularNotification?.type).toBe('warning'); // Expiring later
    });

    it('handles combined low stock and expiring notifications', async () => {
      const mockCombinedItems = [
        {
          id: 1,
          unitId: 1,
          persediaanId: 10,
          jumlah: 50, // Low stock (< 100)
          tanggalExpired: new Date('2024-06-05'), // Expiring soon (< 30 days)
          persediaan: { namaPersediaan: 'Critical Low Stock Medicine' },
          unit: { namaUnit: 'Emergency' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock)
        .mockResolvedValueOnce(mockCombinedItems) // Low stock query
        .mockResolvedValueOnce(mockCombinedItems); // Expiring items query

      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getNotifications();

      expect(result.success).toBe(true);
      
      const criticalNotification = result.data!.find(n => 
        n.title.includes('Critical: Low Stock & Expiring Soon')
      );

      expect(criticalNotification).toBeDefined();
      expect(criticalNotification?.type).toBe('error');
      expect(criticalNotification?.message).toContain('only 50 remaining');
    });

    it('handles items without expiry dates', async () => {
      const mockItemsWithoutExpiry = [
        {
          id: 1,
          unitId: 1,
          persediaanId: 10,
          jumlah: 200,
          tanggalExpired: null, // No expiry date
          persediaan: { namaPersediaan: 'No Expiry Medicine' },
          unit: { namaUnit: 'Pharmacy' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // Low stock query
        .mockResolvedValueOnce(mockItemsWithoutExpiry); // Expiring items query

      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getNotifications();

      expect(result.success).toBe(true);
      
      // Should not generate expiry notifications for items without expiry dates
      const expiryNotifications = result.data!.filter(n => 
        n.message.includes('expire')
      );
      expect(expiryNotifications).toHaveLength(0);
    });

    it('filters notifications by date range', async () => {
      const mockOldReceipts = [
        {
          id: 1,
          unitId: 1,
          tanggalPenerimaan: new Date('2024-03-01'), // Too old (before one month ago)
          unit: { namaUnit: 'Test Unit' },
          rincianPenerimaan: [
            { persediaan: { namaPersediaan: 'Old Medicine' } },
          ],
        },
      ];

      const mockRecentReceipts = [
        {
          id: 2,
          unitId: 1,
          tanggalPenerimaan: new Date('2024-05-15'), // Within last month
          unit: { namaUnit: 'Test Unit' },
          rincianPenerimaan: [
            { persediaan: { namaPersediaan: 'Recent Medicine' } },
          ],
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue([
        ...mockOldReceipts,
        ...mockRecentReceipts,
      ]);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getNotifications();

      expect(result.success).toBe(true);
      
      // Should only include recent notifications
      const oldNotifications = result.data!.filter(n => 
        n.message.includes('Old Medicine')
      );
      const recentNotifications = result.data!.filter(n => 
        n.message.includes('Recent Medicine')
      );

      expect(oldNotifications).toHaveLength(0);
      expect(recentNotifications).toHaveLength(1);
    });

    it('sorts notifications by date (newest first)', async () => {
      const mockReceipts = [
        {
          id: 1,
          unitId: 1,
          tanggalPenerimaan: new Date('2024-05-10'),
          unit: { namaUnit: 'Test Unit' },
          rincianPenerimaan: [
            { persediaan: { namaPersediaan: 'Medicine A' } },
          ],
        },
        {
          id: 2,
          unitId: 1,
          tanggalPenerimaan: new Date('2024-05-20'),
          unit: { namaUnit: 'Test Unit' },
          rincianPenerimaan: [
            { persediaan: { namaPersediaan: 'Medicine B' } },
          ],
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue(mockReceipts);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getNotifications();

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(1);
      
      // Check that notifications are sorted by date (newest first)
      for (let i = 1; i < result.data!.length; i++) {
        expect(result.data![i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          result.data![i].createdAt.getTime()
        );
      }
    });

    it('handles database errors gracefully', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getNotifications();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch notifications: Database error');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching notifications:', expect.any(Error));
    });

    it('handles unknown errors', async () => {
      (prisma.stokOpname.findMany as jest.Mock).mockRejectedValue('Unknown error type');

      const result = await getNotifications();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch notifications: Unknown error');
    });

    it('generates proper notification structure', async () => {
      const mockLowStockItems = [
        {
          id: 1,
          unitId: 1,
          persediaanId: 10,
          jumlah: 50,
          tanggalExpired: new Date('2024-12-01'),
          persediaan: { namaPersediaan: 'Test Medicine' },
          unit: { namaUnit: 'Test Unit' },
        },
      ];

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue(mockLowStockItems);
      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getNotifications();

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);

      const notification = result.data![0];
      expect(notification).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          message: expect.any(String),
          type: expect.stringMatching(/^(info|warning|error|success)$/),
          isRead: expect.any(Boolean),
          createdAt: expect.any(Date),
          unitId: expect.any(Number),
          unitName: expect.any(String),
          itemId: expect.any(Number),
          itemName: expect.any(String),
        })
      );
    });
  });

  describe('markNotificationAsRead', () => {
    it('successfully marks notification as read', async () => {
      const result = await markNotificationAsRead('test-notification-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'test-notification-1',
        isRead: true,
      });
      expect(result.message).toBe('Notification marked as read successfully');
    });

    it('validates notification ID parameter', async () => {
      const result = await markNotificationAsRead('valid-id-123');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('valid-id-123');
      expect(result.data?.isRead).toBe(true);
    });

    it('handles empty notification ID', async () => {
      const result = await markNotificationAsRead('');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('');
      expect(result.data?.isRead).toBe(true);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('successfully marks all notifications as read', async () => {
      const result = await markAllNotificationsAsRead();

      expect(result.success).toBe(true);
      expect(result.message).toBe('All notifications marked as read successfully');
    });

    it('handles unitId parameter', async () => {
      const result = await markAllNotificationsAsRead(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('All notifications marked as read successfully');
    });

    it('handles different unit IDs', async () => {
      const result1 = await markAllNotificationsAsRead(1);
      const result2 = await markAllNotificationsAsRead(999);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('handles undefined unitId', async () => {
      const result = await markAllNotificationsAsRead(undefined);

      expect(result.success).toBe(true);
      expect(result.message).toBe('All notifications marked as read successfully');
    });
  });

  describe('getReadNotifications', () => {
    it('successfully returns read notifications', async () => {
      const result = await getReadNotifications();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.payload).toEqual({});
    });

    it('returns consistent structure', async () => {
      const result1 = await getReadNotifications();
      const result2 = await getReadNotifications();

      expect(result1).toEqual(result2);
      expect(result1.success).toBe(true);
      expect(result1.data).toEqual([]);
      expect(result1.payload).toEqual({});
    });

    it('validates return structure', async () => {
      const result = await getReadNotifications();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('payload');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.payload).toBe('object');
    });
  });

  describe('Notification interface compliance', () => {
    it('validates notification interface structure', async () => {
      const mockLowStockItem = {
        id: 1,
        unitId: 1,
        persediaanId: 10,
        jumlah: 50,
        tanggalExpired: new Date('2024-12-01'),
        persediaan: { namaPersediaan: 'Test Medicine' },
        unit: { namaUnit: 'Test Unit' },
      };

      (prisma.stokOpname.findMany as jest.Mock).mockResolvedValue([mockLowStockItem]);
      (prisma.penerimaan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getNotifications();

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);

      const notification: Notification = result.data![0];
      
      // Verify all required properties exist and have correct types
      expect(typeof notification.id).toBe('string');
      expect(typeof notification.title).toBe('string');
      expect(typeof notification.message).toBe('string');
      expect(['info', 'warning', 'error', 'success']).toContain(notification.type);
      expect(typeof notification.isRead).toBe('boolean');
      expect(notification.createdAt).toBeInstanceOf(Date);
      expect(typeof notification.unitId).toBe('number');
      expect(typeof notification.unitName).toBe('string');
      expect(typeof notification.itemId).toBe('number');
      expect(typeof notification.itemName).toBe('string');
    });
  });
});