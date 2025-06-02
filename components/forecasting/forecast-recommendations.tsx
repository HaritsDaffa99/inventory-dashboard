"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ForecastResult } from "@/lib/forecasting/types";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  RefreshCw,
} from "lucide-react";

interface ForecastRecommendationsProps {
  forecastResult: ForecastResult;
}

export function ForecastRecommendations({
  forecastResult,
}: ForecastRecommendationsProps) {
  const { recommendations, summary } = forecastResult;

  // Generate insights based on the data
  const insights = [];

  if (summary.avg_monthly > summary.historical_avg * 1.2) {
    insights.push({
      type: "warning",
      icon: AlertTriangle,
      title: "Increasing Demand",
      description:
        "Forecasted usage is significantly higher than historical average. Consider increasing stock levels.",
    });
  } else if (summary.avg_monthly < summary.historical_avg * 0.8) {
    insights.push({
      type: "info",
      icon: Info,
      title: "Decreasing Demand",
      description:
        "Forecasted usage is lower than historical average. You may reduce stock levels.",
    });
  } else {
    insights.push({
      type: "success",
      icon: CheckCircle,
      title: "Stable Demand",
      description: "Forecasted usage is consistent with historical patterns.",
    });
  }

  if (summary.data_points < 12) {
    insights.push({
      type: "warning",
      icon: AlertTriangle,
      title: "Limited Historical Data",
      description: `Only ${summary.data_points} months of data available. Forecast accuracy may be limited.`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Inventory Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Safety Stock */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Safety Stock</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {recommendations.safety_stock.toFixed(0)}
              </div>
              <p className="text-sm text-muted-foreground">
                Buffer stock for {recommendations.service_level} service level
              </p>
            </div>

            {/* Reorder Point */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Reorder Point</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {recommendations.reorder_point.toFixed(0)}
              </div>
              <p className="text-sm text-muted-foreground">
                Trigger reorder when stock reaches this level
              </p>
            </div>

            {/* Lead Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" />
                <span className="font-medium">Lead Time</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {recommendations.lead_time_months}
              </div>
              <p className="text-sm text-muted-foreground">
                Months to receive new stock
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights and Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <Alert
                key={index}
                className={
                  insight.type === "warning"
                    ? "border-orange-200 bg-orange-50"
                    : insight.type === "success"
                    ? "border-green-200 bg-green-50"
                    : "border-blue-200 bg-blue-50"
                }
              >
                <Icon
                  className={`h-4 w-4 ${
                    insight.type === "warning"
                      ? "text-orange-600"
                      : insight.type === "success"
                      ? "text-green-600"
                      : "text-blue-600"
                  }`}
                />
                <AlertDescription>
                  <div className="font-medium mb-1">{insight.title}</div>
                  <div className="text-sm">{insight.description}</div>
                </AlertDescription>
              </Alert>
            );
          })}
        </CardContent>
      </Card>

      {/* Forecast Table */}
    </div>
  );
}
