"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnitMetricsCards } from "@/components/unit/unit-metrics-card";
import { UnitConditionSection } from "@/components/unit/unit-condition-section";
import { UnitInventorySummary } from "@/components/unit/unit-inventory-summary";
import { UnitChartsSection } from "@/components/unit/unit-charts-section";
import { UnitTablesSection } from "@/components/unit/unit-tables-section";
import { NotificationBell } from "@/components/notification/notification-bell";
import { UnitExportReport } from "@/components/unit/unit-export-report";
import { UnitAIInsightsPanel } from "@/components/unit/unit-ai-insights-panel"; // Import the new component
import { getUnits } from "@/lib/actions/medicine";
import { getUnitMetrics } from "@/lib/actions/unit-metrics"; // Import to fetch metrics
import { getItemConditionDistribution } from "@/lib/actions/medicine"; // Import to fetch condition data
import { getUnitStockHistory } from "@/lib/actions/unit-stock-history"; // Import to fetch stock history
import { getMedicinesApproachingExpiry } from "@/lib/actions/unit-stock-history"; // Import to fetch expiry data
import { getTopMedicinesInUnit } from "@/lib/actions/unit-stock-history"; // Import to fetch top medicines
import { getLowStockWarnings } from "@/lib/actions/unit-stock-history"; // Import to fetch low stock items
import { getUnitInventorySummary } from "@/lib/actions/unit-metrics"; // Import to fetch inventory summary

interface UnitDetailPageProps {
  unit: {
    id: number;
    namaUnit: string;
    kodeUnit: string;
    akronim: string;
    levelUnit: number;
    lokasi?: string;
    alamat?: string;
  };
}

interface Unit {
  id: number;
  namaUnit: string;
  kodeUnit: string;
  akronim: string;
  levelUnit: number;
}

// Update interfaces to match the AI insights panel expected types
interface Metric {
  label: string;
  value: number;
  change: number;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
}

interface ConditionDataItem {
  name: string;
  value: number;
  percentage: number;
  category: string;
}

interface StockHistoryPoint {
  date: string;
  quantity: number;
}

interface ExpiryDataItem {
  id: number;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  daysRemaining: number;
  expiryDate: string;
}

interface TopMedicineItem {
  id: number;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  usage: number;
}

interface LowStockItem {
  id: number;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  minRequired: number;
}

export function UnitDetailPage({ unit }: UnitDetailPageProps) {
  const [mounted, setMounted] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    unit.id.toString()
  );
  const [selectedMedicines, setSelectedMedicines] = useState<number[]>([]);

  // Update states to use the correct types expected by AI insights panel
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [conditionData, setConditionData] = useState<ConditionDataItem[] | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistoryPoint[] | null>(null);
  const [expiryData, setExpiryData] = useState<ExpiryDataItem[] | null>(null);
  const [topMedicines, setTopMedicines] = useState<TopMedicineItem[] | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[] | null>(null);
  const [inventorySummary, setInventorySummary] = useState<InventoryItem[] | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all units for the dropdown
  useEffect(() => {
    if (!mounted) return;

    async function fetchUnits() {
      try {
        const unitsResponse = await getUnits();
        if (unitsResponse.success && unitsResponse.data) {
          setUnits(unitsResponse.data);
        }
      } catch (error) {
        console.error("Error fetching units:", error);
      }
    }

    fetchUnits();
  }, [mounted]);

  // Fetch data for AI insights
  useEffect(() => {
    if (!mounted) return;

    async function fetchDataForInsights() {
      setIsDataLoading(true);
      try {
        // Fetch unit metrics and transform to expected format
        const metricsResponse = await getUnitMetrics(unit.id);
        if (metricsResponse.success && metricsResponse.data) {
          const transformedMetrics: Metric[] = [
            {
              label: "Total Inventory",
              value: metricsResponse.data.totalInventory.value,
              change: metricsResponse.data.totalInventory.change,
            },
            {
              label: "Total Receipts",
              value: metricsResponse.data.totalReceipts.value,
              change: metricsResponse.data.totalReceipts.change,
            },
            {
              label: "Total Dispensed",
              value: metricsResponse.data.totalDispensed.value,
              change: metricsResponse.data.totalDispensed.change,
            },
            {
              label: "Expired Medicines",
              value: metricsResponse.data.expiredMedicines.value,
              change: metricsResponse.data.expiredMedicines.change,
            },
          ];
          setMetrics(transformedMetrics);
        }

        // Fetch inventory summary and transform to expected format
        const inventorySummaryResponse = await getUnitInventorySummary(unit.id);
        if (inventorySummaryResponse.success && inventorySummaryResponse.data) {
          const transformedInventory: InventoryItem[] = [
            {
              id: 1,
              name: "Unique Medicines",
              quantity: inventorySummaryResponse.data.uniqueMedicines,
            },
            {
              id: 2,
              name: "Available",
              quantity: inventorySummaryResponse.data.available,
            },
            {
              id: 3,
              name: "Damaged/Expired",
              quantity: inventorySummaryResponse.data.damagedOrExpired,
            },
          ];
          setInventorySummary(transformedInventory);
        }

        // Fetch condition distribution and transform to expected format
        const conditionResponse = await getItemConditionDistribution(
          unit.id,
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        );
        if (conditionResponse.success && conditionResponse.data) {
          const transformedConditions: ConditionDataItem[] = conditionResponse.data.map((item) => ({
            ...item,
            category: item.name.toLowerCase(), // Add category field
          }));
          setConditionData(transformedConditions);
        }

        // Fetch stock history and transform to expected format
        const stockHistoryResponse = await getUnitStockHistory(unit.id);
        if (stockHistoryResponse.success && stockHistoryResponse.data) {
          const transformedStockHistory: StockHistoryPoint[] = stockHistoryResponse.data.map((item) => ({
            date: item.month,
            quantity: item.value,
          }));
          setStockHistory(transformedStockHistory);
        }

        // Fetch expiry data and transform to expected format
        const expiryResponse = await getMedicinesApproachingExpiry(
          unit.id,
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        );
        if (expiryResponse.success && expiryResponse.data) {
          const transformedExpiry: ExpiryDataItem[] = expiryResponse.data.map((item) => ({
            id: item.id,
            name: item.name,
            code: item.code,
            quantity: item.quantity,
            unit: item.unit,
            daysRemaining: item.daysRemaining,
            expiryDate: item.expiryDate.toISOString(), // Convert Date to string
          }));
          setExpiryData(transformedExpiry);
        }

        // Fetch top medicines and transform to expected format
        const topMedicinesResponse = await getTopMedicinesInUnit(
          unit.id,
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        );
        if (topMedicinesResponse.success && topMedicinesResponse.data) {
          const transformedTopMedicines: TopMedicineItem[] = topMedicinesResponse.data.map((item) => ({
            id: item.id,
            name: item.name,
            code: item.code,
            quantity: item.stock, // Map stock to quantity
            unit: item.unit,
            usage: 0, // Default value since not provided by API
          }));
          setTopMedicines(transformedTopMedicines);
        }

        // Fetch low stock items and transform to expected format
        const lowStockResponse = await getLowStockWarnings(
          unit.id,
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        );
        if (lowStockResponse.success && lowStockResponse.data) {
          const transformedLowStock: LowStockItem[] = lowStockResponse.data.map((item) => ({
            id: item.id,
            name: item.name,
            code: item.code,
            quantity: item.currentStock, // Map currentStock to quantity
            unit: item.unit,
            minRequired: item.minimumThreshold, // Map minimumThreshold to minRequired
          }));
          setLowStockItems(transformedLowStock);
        }
      } catch (error) {
        console.error("Error fetching data for insights:", error);
      } finally {
        setIsDataLoading(false);
      }
    }

    fetchDataForInsights();
  }, [unit.id, selectedMedicines, mounted]);

  // Handle unit selection
  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);

    if (unitId === "overview") {
      window.location.href = `/dashboard`;
    } else {
      window.location.href = `/dashboard/unit/${unitId}`;
    }
  };

  // Handle medicine selection from filter
  const handleMedicineSelectionChange = (medicineIds: number[]) => {
    setSelectedMedicines(medicineIds);
  };

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return null;
  }

  // Determine location display text
  const locationText =
    unit.lokasi || unit.alamat || `Unit Code: ${unit.kodeUnit}`;

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">
              {unit.namaUnit}
            </h2>
            <p className="text-muted-foreground">{locationText}</p>
          </div>
          <div className="flex items-center gap-2">
            <UnitExportReport
              unitId={unit.id}
              unitName={unit.namaUnit}
              selectedMedicines={selectedMedicines}
            />
            <NotificationBell />
            <Select value={selectedUnitId} onValueChange={handleUnitChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id.toString()}>
                    {unit.namaUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Inventory Summary */}
        <UnitInventorySummary unitId={unit.id} />

        {/* Unit Metrics Cards */}
        <div className="mt-6">
          <UnitMetricsCards unitId={unit.id} />
        </div>

        {/* Unit Condition Section with Chart and Filter */}
        <div className="mt-6">
          <UnitConditionSection
            unitId={unit.id}
            onMedicineSelectionChange={handleMedicineSelectionChange}
          />
        </div>

        {/* Stock History and Expiry Charts */}
        <div className="mt-6">
          <UnitChartsSection
            unitId={unit.id}
            selectedMedicines={selectedMedicines}
          />
        </div>

        {/* Tables Section with Top Medicines and Low Stock */}
        <div className="mt-6">
          <UnitTablesSection
            unitId={unit.id}
            selectedMedicines={selectedMedicines}
            unitName={unit.namaUnit}
          />
        </div>

        {/* Add AI Insights Panel at the bottom */}
        <div className="mt-6">
          <UnitAIInsightsPanel
            unitId={unit.id}
            unitName={unit.namaUnit}
            metrics={metrics || []}
            selectedMedicines={selectedMedicines}
            inventorySummary={inventorySummary || []}
            conditionData={conditionData || []}
            stockHistory={stockHistory || []}
            expiryData={expiryData || []}
            topMedicines={topMedicines || []}
            lowStockItems={lowStockItems || []}
            isLoading={isDataLoading}
          />
        </div>
      </div>
    </div>
  );
}