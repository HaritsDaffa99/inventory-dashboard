"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";

interface MetricValue {
  value: number;
  change: number | null;
}

interface OverviewMetrics {
  totalReceipts: MetricValue;
  totalDispensed: MetricValue;
  availableStock: MetricValue;
  stockToConsumptionRatio: MetricValue;
}

interface OverviewCardsProps {
  metrics: OverviewMetrics | null;
  isLoading: boolean;
}

export function OverviewCards({ metrics, isLoading }: OverviewCardsProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatChange = (change: number | null) => {
    if (change === null) return <span className="text-xs text-muted-foreground"></span>;
    const isPositive = change >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <div
        className={`flex items-center text-xs ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {isPositive ? "+" : ""}
        {change.toFixed(1)}%
      </div>
    );
  };

  const formatNumber = (num: number) => {
    if (!isMounted) {
      // Use simple formatting for SSR
      return num.toLocaleString();
    }
    // Use locale-specific formatting only on client
    try {
      return new Intl.NumberFormat("id-ID").format(num);
    } catch {
      // Fallback if locale is not supported
      return num.toLocaleString();
    }
  };

  const formatStockRatio = (value: number) => {
    return value.toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(metrics.totalReceipts.value)}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Items received</p>
            {formatChange(metrics.totalReceipts.change)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Dispensed</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(metrics.totalDispensed.value)}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Items dispensed</p>
            {formatChange(metrics.totalDispensed.change)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(metrics.availableStock.value)}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Items in stock</p>
            {formatChange(metrics.availableStock.change)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Ratio</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatStockRatio(metrics.stockToConsumptionRatio.value)}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Stock to consumption
            </p>
            {formatChange(metrics.stockToConsumptionRatio.change)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}