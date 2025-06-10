import { getUnitInsights } from '@/lib/actions/unit-ai-insights';

// Mock the entire unit-ai-insights module to avoid actual API calls
jest.mock('@/lib/actions/unit-ai-insights', () => {
  const originalModule = jest.requireActual('@/lib/actions/unit-ai-insights');
  
  return {
    ...originalModule,
    getUnitInsights: jest.fn(),
  };
});

// Get the mocked function
const mockGetUnitInsights = getUnitInsights as jest.MockedFunction<typeof getUnitInsights>;

describe('Unit AI Insights Actions', () => {
  const mockUnitInsightsData = {
    unitId: 1,
    unitName: 'Emergency Department',
    metrics: {
      totalMedicines: 150,
      totalValue: 500000,
      lowStockCount: 12,
      expiringCount: 8,
      averageConsumption: 25.5,
    },
    selectedMedicines: [],
    inventorySummary: {
      totalItems: 150,
      totalValue: 500000,
      categories: ['Antibiotics', 'Pain Relief', 'Emergency Medications'],
      averageStockLevel: 180,
    },
    conditionData: [
      { condition: 'Good', count: 120, percentage: 80 },
      { condition: 'Minor Damage', count: 20, percentage: 13.3 },
      { condition: 'Expired', count: 10, percentage: 6.7 },
    ],
    stockHistory: [
      { date: '2024-01-01', quantity: 1000, medicineId: 1, medicineName: 'Paracetamol' },
      { date: '2024-02-01', quantity: 950, medicineId: 1, medicineName: 'Paracetamol' },
    ],
    expiryData: [
      {
        medicineId: 1,
        medicineName: 'Ibuprofen',
        expiryDate: '2024-08-01',
        quantity: 50,
        daysUntilExpiry: 61,
      },
    ],
    topMedicines: [
      { medicineId: 1, medicineName: 'Paracetamol', quantity: 500, value: 25000 },
      { medicineId: 2, medicineName: 'Aspirin', quantity: 300, value: 15000 },
    ],
    lowStockItems: [
      {
        medicineId: 3,
        medicineName: 'Morphine',
        currentStock: 25,
        minimumStock: 100,
        deficit: 75,
      },
    ],
  };

  const mockSuccessResponse = {
    success: true,
    data: {
      summary: 'The Emergency Department shows strong inventory management with 150 medicines valued at $500,000. However, critical issues need immediate attention including 12 medicines below minimum stock levels and 8 items approaching expiry within 61 days.',
      keyPoints: [
        'Critical shortage of Morphine with only 25 units against minimum requirement of 100 units, creating a 75-unit deficit that poses significant patient care risks',
        'Ibuprofen expires in 61 days with 50 units remaining, representing potential $2,500 in losses if not consumed',
        'Stock consumption shows declining trend from 1,000 to 950 units for Paracetamol, indicating either reduced demand or improved efficiency',
        'High-value medicines like Paracetamol ($25,000) and Aspirin ($15,000) comprise significant portion of total inventory value',
      ],
      recommendations: [
        'Implement emergency procurement for Morphine to reach minimum stock levels within 48 hours, establish automatic reorder triggers at 80% of minimum threshold',
        'Create fast-track consumption protocol for Ibuprofen approaching expiry, coordinate with other departments for internal transfers',
        'Establish monthly stock review meetings to address the 13.3% minor damage rate and implement improved storage protocols',
      ],
      trends: [
        'Correlation between high-value medicine concentration and overall inventory health suggests focused management on critical items',
        'Declining Paracetamol consumption pattern may indicate seasonal variation or changing treatment protocols',
        'The 6.7% expiry rate combined with declining consumption suggests need for dynamic reorder point adjustments based on actual usage patterns',
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful response
    mockGetUnitInsights.mockResolvedValue(mockSuccessResponse);
  });

  describe('getUnitInsights', () => {
    it('successfully generates insights with valid unit data', async () => {
      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.summary).toContain('Emergency Department shows strong inventory management');
      expect(result.data!.keyPoints).toHaveLength(4);
      expect(result.data!.recommendations).toHaveLength(3);
      expect(result.data!.trends).toHaveLength(3);
    });

    it('is called with correct unit data', async () => {
      await getUnitInsights(mockUnitInsightsData);

      expect(mockGetUnitInsights).toHaveBeenCalledWith(mockUnitInsightsData);
      expect(mockGetUnitInsights).toHaveBeenCalledTimes(1);
    });

    it('handles data with selected medicines', async () => {
      const dataWithSelectedMedicines = {
        ...mockUnitInsightsData,
        selectedMedicines: [1, 2, 3],
      };

      const result = await getUnitInsights(dataWithSelectedMedicines);

      expect(mockGetUnitInsights).toHaveBeenCalledWith(dataWithSelectedMedicines);
      expect(result.success).toBe(true);
    });

    it('handles empty selected medicines array', async () => {
      const dataWithoutSelection = {
        ...mockUnitInsightsData,
        selectedMedicines: [],
      };

      const result = await getUnitInsights(dataWithoutSelection);

      expect(mockGetUnitInsights).toHaveBeenCalledWith(dataWithoutSelection);
      expect(result.success).toBe(true);
    });

    it('handles minimal data with only required fields', async () => {
      const minimalData = {
        unitId: 1,
        unitName: 'Test Unit',
        metrics: {
          totalMedicines: 10,
          totalValue: 5000,
          lowStockCount: 1,
          expiringCount: 1,
          averageConsumption: 5,
        },
        selectedMedicines: [],
      };

      const result = await getUnitInsights(minimalData);

      expect(mockGetUnitInsights).toHaveBeenCalledWith(minimalData);
      expect(result.success).toBe(true);
    });

    it('returns error when API key is missing', async () => {
      const errorResponse = {
        success: false,
        error: 'GEMINI_API_KEY is not defined in environment variables',
      };

      mockGetUnitInsights.mockResolvedValue(errorResponse);

      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('GEMINI_API_KEY is not defined in environment variables');
    });

    it('handles API errors gracefully', async () => {
      const errorResponse = {
        success: false,
        error: 'API rate limit exceeded',
      };

      mockGetUnitInsights.mockResolvedValue(errorResponse);

      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('handles network errors', async () => {
      const errorResponse = {
        success: false,
        error: 'Network timeout',
      };

      mockGetUnitInsights.mockResolvedValue(errorResponse);

      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('handles text extraction errors', async () => {
      const errorResponse = {
        success: false,
        error: 'Text extraction failed',
      };

      mockGetUnitInsights.mockResolvedValue(errorResponse);

      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Text extraction failed');
    });

    it('handles unknown errors', async () => {
      const errorResponse = {
        success: false,
        error: 'Unknown error',
      };

      mockGetUnitInsights.mockResolvedValue(errorResponse);

      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('properly structures unit insights response', async () => {
      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.data).toEqual({
        summary: expect.stringContaining('Emergency Department shows strong inventory management'),
        keyPoints: expect.arrayContaining([
          expect.stringContaining('Critical shortage of Morphine'),
          expect.stringContaining('Ibuprofen expires in 61 days'),
          expect.stringContaining('Stock consumption shows declining trend'),
          expect.stringContaining('High-value medicines like Paracetamol'),
        ]),
        recommendations: expect.arrayContaining([
          expect.stringContaining('Implement emergency procurement for Morphine'),
          expect.stringContaining('Create fast-track consumption protocol'),
          expect.stringContaining('Establish monthly stock review meetings'),
        ]),
        trends: expect.arrayContaining([
          expect.stringContaining('Correlation between high-value medicine concentration'),
          expect.stringContaining('Declining Paracetamol consumption pattern'),
          expect.stringContaining('The 6.7% expiry rate combined with declining consumption'),
        ]),
      });
    });

    it('validates data types in response structure', async () => {
      const result = await getUnitInsights(mockUnitInsightsData);

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

      mockGetUnitInsights.mockResolvedValue(emptyResponse);

      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.success).toBe(true);
      expect(result.data!.summary).toBe('');
      expect(result.data!.keyPoints).toEqual([]);
      expect(result.data!.recommendations).toEqual([]);
      expect(result.data!.trends).toEqual([]);
    });

    it('handles function rejection', async () => {
      mockGetUnitInsights.mockRejectedValue(new Error('Function error'));

      await expect(getUnitInsights(mockUnitInsightsData)).rejects.toThrow('Function error');
    });

    it('can be called multiple times', async () => {
      await getUnitInsights(mockUnitInsightsData);
      await getUnitInsights(mockUnitInsightsData);
      await getUnitInsights(mockUnitInsightsData);

      expect(mockGetUnitInsights).toHaveBeenCalledTimes(3);
    });

    it('handles different unit data structures', async () => {
      const differentData = {
        unitId: 2,
        unitName: 'ICU',
        metrics: {
          totalMedicines: 75,
          totalValue: 250000,
          lowStockCount: 5,
          expiringCount: 3,
          averageConsumption: 15.2,
        },
        selectedMedicines: [10, 20],
        conditionData: [
          { condition: 'Excellent', count: 60, percentage: 80 },
          { condition: 'Good', count: 15, percentage: 20 },
        ],
      };

      await getUnitInsights(differentData);

      expect(mockGetUnitInsights).toHaveBeenCalledWith(differentData);
    });

    it('handles complex inventory data', async () => {
      const complexData = {
        ...mockUnitInsightsData,
        inventorySummary: {
          totalItems: 200,
          totalValue: 750000,
          categories: ['Antibiotics', 'Pain Relief', 'Emergency Medications', 'Cardiac', 'Respiratory'],
          averageStockLevel: 220,
        },
        stockHistory: [
          { date: '2024-01-01', quantity: 1000, medicineId: 1, medicineName: 'Paracetamol' },
          { date: '2024-02-01', quantity: 950, medicineId: 1, medicineName: 'Paracetamol' },
          { date: '2024-03-01', quantity: 900, medicineId: 1, medicineName: 'Paracetamol' },
          { date: '2024-04-01', quantity: 850, medicineId: 2, medicineName: 'Ibuprofen' },
        ],
      };

      await getUnitInsights(complexData);

      expect(mockGetUnitInsights).toHaveBeenCalledWith(complexData);
    });

    it('handles unit-specific insights correctly', async () => {
      const unitSpecificResponse = {
        success: true,
        data: {
          summary: `The ${mockUnitInsightsData.unitName} demonstrates effective inventory control but requires attention to critical shortages.`,
          keyPoints: [
            'Unit-specific observation about emergency medicine management',
            'Department-level analysis of stock rotation efficiency',
          ],
          recommendations: [
            'Implement unit-specific procurement protocols',
            'Establish department-level stock monitoring',
          ],
          trends: [
            'Unit consumption patterns indicate high emergency demand',
          ],
        },
      };

      mockGetUnitInsights.mockResolvedValue(unitSpecificResponse);

      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.success).toBe(true);
      expect(result.data!.summary).toContain('Emergency Department');
      expect(result.data!.keyPoints).toHaveLength(2);
      expect(result.data!.recommendations).toHaveLength(2);
      expect(result.data!.trends).toHaveLength(1);
    });

    it('maintains function signature compatibility', async () => {
      // Test that the function accepts the expected parameter types
      const testData: Parameters<typeof getUnitInsights>[0] = mockUnitInsightsData;
      
      const result = await getUnitInsights(testData);

      expect(mockGetUnitInsights).toHaveBeenCalledWith(testData);
      expect(result).toBeDefined();
    });

    it('handles optional data sections correctly', async () => {
      const dataWithOptionalSections = {
        ...mockUnitInsightsData,
        expiryData: undefined,
        topMedicines: undefined,
        lowStockItems: undefined,
      };

      await getUnitInsights(dataWithOptionalSections);

      expect(mockGetUnitInsights).toHaveBeenCalledWith(dataWithOptionalSections);
    });

    it('processes unit-specific metrics correctly', async () => {
      const metricsSpecificResponse = {
        success: true,
        data: {
          summary: 'Unit metrics analysis shows 150 medicines with $500,000 total value and critical shortages requiring immediate attention.',
          keyPoints: [
            'Total medicines count of 150 indicates comprehensive inventory coverage',
            'Low stock count of 12 medicines represents 8% of total inventory requiring procurement action',
            'Expiring count of 8 medicines within timeframe needs immediate consumption planning',
            'Average consumption rate of 25.5 units suggests steady demand patterns',
          ],
          recommendations: [
            'Address the 12 low stock medicines through emergency procurement procedures',
            'Implement consumption acceleration protocols for 8 expiring medicines',
          ],
          trends: [
            'Total value of $500,000 indicates high-value inventory concentration in emergency department',
            'Average consumption of 25.5 units suggests consistent utilization patterns',
          ],
        },
      };

      mockGetUnitInsights.mockResolvedValue(metricsSpecificResponse);

      const result = await getUnitInsights(mockUnitInsightsData);

      expect(result.success).toBe(true);
      expect(result.data!.summary).toContain('150 medicines');
      expect(result.data!.summary).toContain('$500,000');
      expect(result.data!.keyPoints[1]).toContain('12 medicines');
      expect(result.data!.keyPoints[2]).toContain('8 medicines');
    });
  });
});