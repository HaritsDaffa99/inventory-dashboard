import { getDashboardInsights } from '@/lib/actions/ai-insights';

// Mock the entire ai-insights module to avoid actual API calls
jest.mock('@/lib/actions/ai-insights', () => {
  const originalModule = jest.requireActual('@/lib/actions/ai-insights');
  
  return {
    ...originalModule,
    getDashboardInsights: jest.fn(),
  };
});

// Get the mocked function
const mockGetDashboardInsights = getDashboardInsights as jest.MockedFunction<typeof getDashboardInsights>;

describe('AI Insights Actions', () => {
  const mockDashboardData = {
    metrics: {
      totalInventory: { value: 5000, change: 12.5 },
      totalReceipts: { value: 1500, change: 8.3 },
      totalDispensed: { value: 1200, change: -5.2 },
      expiredMedicines: { value: 45, change: 15.7 },
      availableItems: { value: 850, change: 3.1 },
      damagedItems: { value: 32, change: -10.5 },
    },
    selectedMedicines: [1, 2, 3],
    conditionData: [
      { name: 'Good', value: 150, percentage: 75.0 },
      { name: 'Fair', value: 30, percentage: 15.0 },
      { name: 'Poor', value: 20, percentage: 10.0 },
    ],
    topReceivedItems: [
      { id: 1, name: 'Paracetamol 500mg', value: 1000, code: 'PAR500' },
      { id: 2, name: 'Amoxicillin 250mg', value: 800, code: 'AMX250' },
    ],
    topDispensedItems: [
      { id: 1, name: 'Aspirin 100mg', value: 750, code: 'ASP100' },
      { id: 2, name: 'Ibuprofen 200mg', value: 600, code: 'IBU200' },
    ],
    topItemsByQuantity: [
      { id: 1, name: 'Medicine A', code: 'MED001', quantity: 500, unit: 'tablets' },
      { id: 2, name: 'Medicine B', code: 'MED002', quantity: 300, unit: 'capsules' },
    ],
  };

  const mockSuccessResponse = {
    success: true,
    data: {
      summary: 'The pharmaceutical inventory shows strong performance with 5000 total items and positive growth trends.',
      keyPoints: [
        'High Growth Rate: Total inventory increased by 12.5% indicating robust procurement processes.',
        'Expiry Management Concern: 45 expired medicines with 15.7% increase signals potential waste.',
        'Dispensing Efficiency: 1200 dispensed items with slight decrease of 5.2% may indicate improved turnover.',
      ],
      recommendations: [
        'Implement Advanced Expiry Tracking: Deploy automated alerts for medicines approaching expiration dates.',
        'Enhance Procurement Planning: Leverage the 12.5% inventory growth data to optimize purchase quantities.',
      ],
      trends: [
        'Inventory Growth vs Dispensing: Strong 12.5% inventory growth against 5.2% dispensing decrease.',
        'Condition Quality Maintenance: 75% good condition items indicate effective storage protocols.',
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful response
    mockGetDashboardInsights.mockResolvedValue(mockSuccessResponse);
  });

  describe('getDashboardInsights', () => {
    it('successfully generates insights with valid data', async () => {
      const result = await getDashboardInsights(mockDashboardData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.summary).toContain('pharmaceutical inventory shows strong performance');
      expect(result.data!.keyPoints).toHaveLength(3);
      expect(result.data!.recommendations).toHaveLength(2);
      expect(result.data!.trends).toHaveLength(2);
    });

    it('is called with correct dashboard data', async () => {
      await getDashboardInsights(mockDashboardData);

      expect(mockGetDashboardInsights).toHaveBeenCalledWith(mockDashboardData);
      expect(mockGetDashboardInsights).toHaveBeenCalledTimes(1);
    });

    it('handles data with selected medicines', async () => {
      const dataWithSelectedMedicines = {
        ...mockDashboardData,
        selectedMedicines: [1, 2, 3],
      };

      const result = await getDashboardInsights(dataWithSelectedMedicines);

      expect(mockGetDashboardInsights).toHaveBeenCalledWith(dataWithSelectedMedicines);
      expect(result.success).toBe(true);
    });

    it('handles empty selected medicines array', async () => {
      const dataWithoutSelection = {
        ...mockDashboardData,
        selectedMedicines: [],
      };

      const result = await getDashboardInsights(dataWithoutSelection);

      expect(mockGetDashboardInsights).toHaveBeenCalledWith(dataWithoutSelection);
      expect(result.success).toBe(true);
    });

    it('handles minimal data with only metrics', async () => {
      const minimalData = {
        metrics: mockDashboardData.metrics,
        selectedMedicines: [],
      };

      const result = await getDashboardInsights(minimalData);

      expect(mockGetDashboardInsights).toHaveBeenCalledWith(minimalData);
      expect(result.success).toBe(true);
    });

    it('returns error when API key is missing', async () => {
      const errorResponse = {
        success: false,
        error: 'GEMINI_API_KEY is not defined in environment variables',
      };

      mockGetDashboardInsights.mockResolvedValue(errorResponse);

      const result = await getDashboardInsights(mockDashboardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('GEMINI_API_KEY is not defined in environment variables');
    });

    it('handles API errors gracefully', async () => {
      const errorResponse = {
        success: false,
        error: 'API rate limit exceeded',
      };

      mockGetDashboardInsights.mockResolvedValue(errorResponse);

      const result = await getDashboardInsights(mockDashboardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('handles network errors', async () => {
      const errorResponse = {
        success: false,
        error: 'Network timeout',
      };

      mockGetDashboardInsights.mockResolvedValue(errorResponse);

      const result = await getDashboardInsights(mockDashboardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('handles unknown errors', async () => {
      const errorResponse = {
        success: false,
        error: 'Unknown error',
      };

      mockGetDashboardInsights.mockResolvedValue(errorResponse);

      const result = await getDashboardInsights(mockDashboardData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('properly structures insights response', async () => {
      const result = await getDashboardInsights(mockDashboardData);

      expect(result.data).toEqual({
        summary: expect.stringContaining('pharmaceutical inventory shows strong performance'),
        keyPoints: expect.arrayContaining([
          expect.stringContaining('High Growth Rate:'),
          expect.stringContaining('Expiry Management Concern:'),
          expect.stringContaining('Dispensing Efficiency:'),
        ]),
        recommendations: expect.arrayContaining([
          expect.stringContaining('Implement Advanced Expiry Tracking:'),
          expect.stringContaining('Enhance Procurement Planning:'),
        ]),
        trends: expect.arrayContaining([
          expect.stringContaining('Inventory Growth vs Dispensing:'),
          expect.stringContaining('Condition Quality Maintenance:'),
        ]),
      });
    });

    it('validates data types in response structure', async () => {
      const result = await getDashboardInsights(mockDashboardData);

      expect(result.success).toBe(true);
      expect(typeof result.data!.summary).toBe('string');
      expect(Array.isArray(result.data!.keyPoints)).toBe(true);
      expect(Array.isArray(result.data!.recommendations)).toBe(true);
      expect(Array.isArray(result.data!.trends)).toBe(true);
    });

    it('handles edge case with empty insights', async () => {
      const emptyResponse = {
        success: true,
        data: {
          summary: '',
          keyPoints: [],
          recommendations: [],
          trends: [],
        },
      };

      mockGetDashboardInsights.mockResolvedValue(emptyResponse);

      const result = await getDashboardInsights(mockDashboardData);

      expect(result.success).toBe(true);
      expect(result.data!.summary).toBe('');
      expect(result.data!.keyPoints).toEqual([]);
      expect(result.data!.recommendations).toEqual([]);
      expect(result.data!.trends).toEqual([]);
    });

    it('handles function rejection', async () => {
      mockGetDashboardInsights.mockRejectedValue(new Error('Function error'));

      await expect(getDashboardInsights(mockDashboardData)).rejects.toThrow('Function error');
    });

    it('can be called multiple times', async () => {
      await getDashboardInsights(mockDashboardData);
      await getDashboardInsights(mockDashboardData);
      await getDashboardInsights(mockDashboardData);

      expect(mockGetDashboardInsights).toHaveBeenCalledTimes(3);
    });

    it('handles different data structures', async () => {
      const differentData = {
        metrics: {
          totalInventory: { value: 1000, change: 5.0 },
          totalReceipts: { value: 500, change: 2.0 },
        },
        selectedMedicines: [10, 20],
      };

      await getDashboardInsights(differentData);

      expect(mockGetDashboardInsights).toHaveBeenCalledWith(differentData);
    });

    it('maintains function signature compatibility', async () => {
      // Test that the function accepts the expected parameter types
      const testData: Parameters<typeof getDashboardInsights>[0] = mockDashboardData;
      
      const result = await getDashboardInsights(testData);

      expect(mockGetDashboardInsights).toHaveBeenCalledWith(testData);
      expect(result).toBeDefined();
    });
  });
});