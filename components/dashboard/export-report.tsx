"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import {
  getItemConditionDistribution,
  getTopReceivedItems,
  getTopDispensedItems,
  getTopItemsByQuantity,
  getTopReceiptLocations,
  getTopDispensedLocations,
} from "@/lib/actions/medicine";

interface Metric {
  value: number;
  change: number | null;
}

interface DashboardMetrics {
  totalReceipts: Metric;
  totalDispensed: Metric;
  availableStock: Metric;
  stockToConsumptionRatio: Metric;
}

interface ConditionItem {
  name: string;
  value: number;
  percentage: number;
}

interface TopItem {
  name: string;
  value: number;
}

interface InventoryItem {
  name: string;
  code: string;
  quantity: number;
  unit: string;
  status: string;
}

interface LocationItem {
  id?: number;
  name: string;
  count: number;
  percentage: string | number;
}

interface ExportData {
  conditionData?: ConditionItem[];
  receivedItems?: TopItem[];
  dispensedItems?: TopItem[];
  topItems?: InventoryItem[];
  receiptLocations?: LocationItem[];
  dispensedLocations?: LocationItem[];
}

interface ExportReportProps {
  metrics: DashboardMetrics;
  selectedMedicines: number[];
}

export function ExportReport({
  metrics,
  selectedMedicines,
}: ExportReportProps) {
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeTopItems, setIncludeTopItems] = useState(true);
  const [includeConditionData, setIncludeConditionData] = useState(true);
  const [includeLocationData, setIncludeLocationData] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Format date for filename
  const formatDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Fetch data for export
  const fetchExportData = async (): Promise<ExportData> => {
    const data: ExportData = {};

    // Fetch condition data
    if (includeConditionData) {
      const conditionResponse = await getItemConditionDistribution(
        undefined,
        selectedMedicines.length > 0 ? selectedMedicines : undefined
      );
      if (conditionResponse.success) {
        data.conditionData = conditionResponse.data;
      }
    }

    // Fetch top received items
    if (includeTopItems) {
      const receivedResponse = await getTopReceivedItems(
        selectedMedicines.length > 0 ? selectedMedicines : undefined
      );
      if (receivedResponse.success) {
        data.receivedItems = receivedResponse.data;
      }

      // Fetch top dispensed items
      const dispensedResponse = await getTopDispensedItems(
        selectedMedicines.length > 0 ? selectedMedicines : undefined
      );
      if (dispensedResponse.success) {
        data.dispensedItems = dispensedResponse.data;
      }

      // Fetch top items by quantity
      const quantityResponse = await getTopItemsByQuantity(
        selectedMedicines.length > 0 ? selectedMedicines : undefined
      );
      if (quantityResponse.success) {
        data.topItems = quantityResponse.data;
      }
    }

    // Fetch location data
    if (includeLocationData) {
      const receiptLocationsResponse = await getTopReceiptLocations();
      if (receiptLocationsResponse.success) {
        data.receiptLocations = receiptLocationsResponse.data;
      }

      const dispensedLocationsResponse = await getTopDispensedLocations();
      if (dispensedLocationsResponse.success) {
        data.dispensedLocations = dispensedLocationsResponse.data;
      }
    }

    return data;
  };

  // Export to CSV
  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      // Fetch data for export
      const exportData = await fetchExportData();

      // Create arrays to hold all the data
      const csvData: string[][] = [];

      // Add report title and date
      csvData.push(["Medicine Inventory Dashboard Report"]);
      csvData.push(["Generated on:", new Date().toLocaleString()]);
      csvData.push([]); // Empty row for spacing

      // Add metrics if selected
      if (includeMetrics && metrics) {
        csvData.push([
          "Total Receipts",
          metrics.totalReceipts.value.toString(),
          metrics.totalReceipts.change !== null
            ? metrics.totalReceipts.change.toFixed(1)
            : "N/A",
        ]);
        csvData.push([
          "Total Dispensed",
          metrics.totalDispensed.value.toString(),
          metrics.totalDispensed.change !== null
            ? metrics.totalDispensed.change.toFixed(1)
            : "N/A",
        ]);
        csvData.push([
          "Available Stock",
          metrics.availableStock.value.toString(),
          metrics.availableStock.change !== null
            ? metrics.availableStock.change.toFixed(1)
            : "N/A",
        ]);
        csvData.push([
          "Stock-to-Consumption Ratio",
          metrics.stockToConsumptionRatio.value.toString(),
          metrics.stockToConsumptionRatio.change !== null
            ? metrics.stockToConsumptionRatio.change.toFixed(1)
            : "N/A",
        ]);
      }

      // Add condition data if selected
      if (includeConditionData && exportData.conditionData) {
        csvData.push(["Item Condition Distribution"]);
        csvData.push(["Condition", "Count", "Percentage (%)"]);
        exportData.conditionData.forEach((item: ConditionItem) => {
          csvData.push([
            item.name,
            item.value.toString(),
            item.percentage.toFixed(1),
          ]);
        });
        csvData.push([]); // Empty row for spacing
      }

      // Add top received items if selected
      if (includeTopItems && exportData.receivedItems) {
        csvData.push(["Top 10 Received Items"]);
        csvData.push(["Item Name", "Quantity"]);
        exportData.receivedItems.forEach((item: TopItem) => {
          csvData.push([item.name, item.value.toString()]);
        });
        csvData.push([]); // Empty row for spacing
      }

      // Add top dispensed items if selected
      if (includeTopItems && exportData.dispensedItems) {
        csvData.push(["Top 10 Dispensed Items"]);
        csvData.push(["Item Name", "Quantity"]);
        exportData.dispensedItems.forEach((item: TopItem) => {
          csvData.push([item.name, item.value.toString()]);
        });
        csvData.push([]); // Empty row for spacing
      }

      // Add top items by quantity if selected
      if (includeTopItems && exportData.topItems) {
        csvData.push(["Top 10 Items by Quantity"]);
        csvData.push(["Item Name", "Code", "Quantity", "Unit", "Status"]);
        exportData.topItems.forEach((item: InventoryItem) => {
          csvData.push([
            item.name,
            item.code,
            item.quantity.toString(),
            item.unit,
            item.status,
          ]);
        });
        csvData.push([]); // Empty row for spacing
      }

      // Add location data if selected
      if (includeLocationData) {
        if (exportData.receiptLocations) {
          csvData.push(["Top 10 Receipt Locations"]);
          csvData.push(["Unit Name", "Count", "Percentage (%)"]);
          exportData.receiptLocations.forEach((item: LocationItem) => {
            csvData.push([item.name, item.count.toString(), item.percentage.toString()]);
          });
          csvData.push([]); // Empty row for spacing
        }

        if (exportData.dispensedLocations) {
          csvData.push(["Top 10 Dispensed Locations"]);
          csvData.push(["Unit Name", "Count", "Percentage (%)"]);
          exportData.dispensedLocations.forEach((item: LocationItem) => {
            csvData.push([item.name, item.count.toString(), item.percentage.toString()]);
          });
        }
      }

      // Convert the data to CSV format
      const csvContent = csvData
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      // Create a blob and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `inventory-report-${formatDate()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Close the dialog
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Dashboard Report</DialogTitle>
          <DialogDescription>
            Choose the content to include in your CSV report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="metrics-csv"
              checked={includeMetrics}
              onCheckedChange={(checked) =>
                setIncludeMetrics(checked as boolean)
              }
            />
            <Label htmlFor="metrics-csv">Include metrics summary</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="items-csv"
              checked={includeTopItems}
              onCheckedChange={(checked) =>
                setIncludeTopItems(checked as boolean)
              }
            />
            <Label htmlFor="items-csv">Include top items data</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="condition-csv"
              checked={includeConditionData}
              onCheckedChange={(checked) =>
                setIncludeConditionData(checked as boolean)
              }
            />
            <Label htmlFor="condition-csv">
              Include condition distribution
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="location-csv"
              checked={includeLocationData}
              onCheckedChange={(checked) =>
                setIncludeLocationData(checked as boolean)
              }
            />
            <Label htmlFor="location-csv">Include location data</Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={exportToCSV}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}