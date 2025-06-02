"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TrendingUp, AlertCircle, Calendar, Zap, Brain, Target, Loader2, Search, Check } from "lucide-react"
import { getAvailableUnits, getUnitMedicines, generateForecast } from "@/lib/actions/forecasting"
import type { Unit, Medicine, ForecastResult } from "@/lib/forecasting/types"
import { Input } from "@/components/ui/input"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ForecastFiltersProps {
  onForecastGenerated: (result: ForecastResult) => void
}

export function ForecastFilters({ onForecastGenerated }: ForecastFiltersProps) {
  const [units, setUnits] = useState<Unit[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)
  const [selectedMedicine, setSelectedMedicine] = useState<number | null>(null)
  const [forecastPeriods, setForecastPeriods] = useState([6]) // Default 6 months
  const [includeHolidays, setIncludeHolidays] = useState(false)
  const [modelMode, setModelMode] = useState("fast") // Default to fast mode
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [unitSearch, setUnitSearch] = useState<string>("")
  const [medicineSearch, setMedicineSearch] = useState<string>("")
  const [unitOpen, setUnitOpen] = useState(false)
  const [medicineOpen, setMedicineOpen] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")

  // Define loadUnits function
  const loadUnits = async () => {
    try {
      const result = await getAvailableUnits()
      if (result.success && result.data) {
        // Sort units alphabetically by namaUnit
        const sortedUnits = [...result.data].sort((a, b) => 
          a.namaUnit.localeCompare(b.namaUnit)
        );
        setUnits(sortedUnits)
        setDebugInfo(`Units loaded: ${sortedUnits.length}`)
      } else {
        setError(result.error || "Failed to load units")
      }
    } catch (error) {
      setError("Error loading units")
      console.error("Error loading units:", error)
    }
  }

  // Define loadMedicines function with useCallback
  const loadMedicines = useCallback(async (unitId: number) => {
    try {
      const result = await getUnitMedicines(unitId)
      if (result.success && result.data) {
        // Sort medicines alphabetically by namaPersediaan
        const sortedMedicines = [...result.data].sort((a, b) => 
          a.namaPersediaan.localeCompare(b.namaPersediaan)
        );
        setMedicines(sortedMedicines)
        setDebugInfo(`Units loaded: ${units.length} | Selected unit: ${unitId} | Medicines: ${sortedMedicines.length}`)
      } else {
        setError(result.error || "Failed to load medicines")
        setMedicines([])
      }
    } catch (error) {
      setError("Error loading medicines")
      setMedicines([])
      console.error("Error loading medicines:", error)
    }
  }, [units.length]);

  // Load units on component mount
  useEffect(() => {
    loadUnits()
  }, [])

  // Load medicines when unit changes
  useEffect(() => {
    if (selectedUnit) {
      loadMedicines(selectedUnit)
    } else {
      setMedicines([])
      setSelectedMedicine(null)
    }
  }, [selectedUnit, loadMedicines])

  const handleGenerateForecast = async () => {
    if (!selectedUnit || !selectedMedicine) {
      setError("Please select both unit and medicine")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log(
        `Generating forecast: Unit ${selectedUnit}, Medicine ${selectedMedicine}, Periods ${forecastPeriods[0]}, Mode: ${modelMode}, Holidays: ${includeHolidays}`,
      )

      // Set processing steps based on the chosen model mode
      const processingSteps = getProcessingSteps(modelMode);
      let stepIndex = 0;
      
      // Start processing status updates
      const statusInterval = setInterval(() => {
        if (stepIndex < processingSteps.length) {
          setProcessingStatus(processingSteps[stepIndex]);
          stepIndex++;
        } else {
          stepIndex = 0; // Loop through steps until forecast completes
        }
      }, 3000);

      const result = await generateForecast(
        selectedUnit,
        selectedMedicine,
        forecastPeriods[0],
        includeHolidays,
        modelMode,
      )

      clearInterval(statusInterval);
      setProcessingStatus("");

      if (result.success) {
        onForecastGenerated(result)
        setError(null)
      } else {
        setError(result.error || "Forecast generation failed")
      }
    } catch (error) {
      setError("Error generating forecast")
      console.error("Error generating forecast:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getProcessingSteps = (mode: string): string[] => {
    const commonSteps = [
      "Loading historical data...",
      "Preprocessing time series data...",
      "Identifying seasonality patterns...",
    ];
    
    if (mode === "fast") {
      return [
        ...commonSteps,
        "Fitting Prophet model with default parameters...",
        "Generating forecasts...",
        "Preparing visualization data..."
      ];
    } else if (mode === "enhanced") {
      return [
        ...commonSteps,
        "Analyzing trend components...",
        "Optimizing seasonality parameters...",
        "Fitting enhanced Prophet model...",
        "Calculating prediction intervals...",
        "Generating detailed forecasts...",
        "Preparing visualization data..."
      ];
    } else {
      return [
        ...commonSteps,
        "Performing initial model fit...",
        "Starting cross-validation process...",
        "Optimizing hyperparameters...",
        "Testing multiple seasonality configurations...",
        "Evaluating model performance metrics...",
        "Selecting optimal model configuration...",
        "Fitting final Prophet model...",
        "Calculating comprehensive prediction intervals...",
        "Generating detailed forecast projections...",
        "Preparing visualization data..."
      ];
    }
  };

  const selectedUnitName = units.find((u) => u.id === selectedUnit)?.namaUnit || ""
  const selectedMedicineName = medicines.find((m) => m.id === selectedMedicine)?.namaPersediaan || ""

  // Get estimated runtime based on model mode
  const getEstimatedRuntime = (mode: string) => {
    switch (mode) {
      case "fast":
        return "~10 seconds"
      case "enhanced":
        return "~1-2 minutes"
      case "comprehensive":
        return "~5+ minutes"
      default:
        return "Unknown"
    }
  }

  // Filter units based on search
  const filteredUnits = unitSearch === "" 
    ? units 
    : units.filter((unit) => 
        unit.namaUnit.toLowerCase().includes(unitSearch.toLowerCase()) || 
        unit.kodeUnit.toLowerCase().includes(unitSearch.toLowerCase())
      );

  // Filter medicines based on search
  const filteredMedicines = medicineSearch === "" 
    ? medicines 
    : medicines.filter((medicine) => 
        medicine.namaPersediaan.toLowerCase().includes(medicineSearch.toLowerCase()) || 
        medicine.kodePersediaan.toLowerCase().includes(medicineSearch.toLowerCase())
      );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Prophet Forecast Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unit Selection with Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Unit</label>
          <Popover open={unitOpen} onOpenChange={setUnitOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={unitOpen}
                className="w-full justify-between"
              >
                {selectedUnit
                  ? units.find((unit) => unit.id === selectedUnit)?.namaUnit
                  : "Select Unit"}
                <TrendingUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <div className="px-3 py-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search units..."
                    className="pl-8 h-9"
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                  />
                </div>
              </div>
              <Command className="overflow-hidden rounded-none">
                <CommandGroup className="max-h-64">
                  {filteredUnits.length > 0 ? (
                    filteredUnits.map((unit) => (
                      <CommandItem
                        key={unit.id}
                        onSelect={() => {
                          setSelectedUnit(unit.id)
                          setUnitOpen(false)
                        }}
                        className="flex items-center gap-2 cursor-pointer py-2"
                      >
                        {selectedUnit === unit.id && <Check className="h-4 w-4" />}
                        <span className={selectedUnit === unit.id ? "font-medium" : ""}>
                          {unit.namaUnit} ({unit.kodeUnit})
                        </span>
                      </CommandItem>
                    ))
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">No units found</p>
                  )}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Medicine Selection with Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Medicine</label>
          <Popover open={medicineOpen} onOpenChange={setMedicineOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={medicineOpen}
                disabled={!selectedUnit}
                className="w-full justify-between"
              >
                {selectedMedicine
                  ? medicines.find((medicine) => medicine.id === selectedMedicine)?.namaPersediaan
                  : selectedUnit ? "Select Medicine" : "Select a unit first"}
                <TrendingUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <div className="px-3 py-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search medicines..."
                    className="pl-8 h-9"
                    value={medicineSearch}
                    onChange={(e) => setMedicineSearch(e.target.value)}
                  />
                </div>
              </div>
              <Command className="overflow-hidden rounded-none">
                <CommandGroup className="max-h-64">
                  {filteredMedicines.length > 0 ? (
                    filteredMedicines.map((medicine) => (
                      <CommandItem
                        key={medicine.id}
                        onSelect={() => {
                          setSelectedMedicine(medicine.id)
                          setMedicineOpen(false)
                        }}
                        className="flex items-center gap-2 cursor-pointer py-2"
                      >
                        {selectedMedicine === medicine.id && <Check className="h-4 w-4" />}
                        <span className={selectedMedicine === medicine.id ? "font-medium" : ""}>
                          {medicine.namaPersediaan} ({medicine.kodePersediaan})
                        </span>
                      </CommandItem>
                    ))
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">No medicines found</p>
                  )}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Forecast Period Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Forecast Period: {forecastPeriods[0]} months</label>
            <span className="text-xs text-muted-foreground">1-12 months</span>
          </div>
          <Slider
            value={forecastPeriods}
            onValueChange={setForecastPeriods}
            max={12}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 month</span>
            <span>12 months</span>
          </div>
        </div>

        {/* Model Mode Selection */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Model Type</label>
          <RadioGroup value={modelMode} onValueChange={setModelMode} className="space-y-3">
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="fast" id="fast" />
              <div className="flex-1">
                <Label htmlFor="fast" className="flex items-center gap-2 cursor-pointer">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Fast</span>
                  <span className="text-xs text-muted-foreground">({getEstimatedRuntime("fast")})</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">Default parameters, good for quick exploration</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="enhanced" id="enhanced" />
              <div className="flex-1">
                <Label htmlFor="enhanced" className="flex items-center gap-2 cursor-pointer">
                  <Brain className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Enhanced</span>
                  <span className="text-xs text-muted-foreground">({getEstimatedRuntime("enhanced")})</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Data-driven parameters with enhanced seasonality modeling
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="comprehensive" id="comprehensive" />
              <div className="flex-1">
                <Label htmlFor="comprehensive" className="flex items-center gap-2 cursor-pointer">
                  <Target className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Comprehensive</span>
                  <span className="text-xs text-muted-foreground">({getEstimatedRuntime("comprehensive")})</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">Full cross-validation for maximum accuracy</p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Holiday Effects Toggle */}
        <div className="flex items-center space-x-2">
          <Switch id="holiday-mode" checked={includeHolidays} onCheckedChange={setIncludeHolidays} />
          <Label htmlFor="holiday-mode" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Include holiday effects
          </Label>
        </div>

        {/* Generate Button with Loading State */}
        <Button
          onClick={handleGenerateForecast}
          disabled={!selectedUnit || !selectedMedicine || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Generate Prophet Forecast
            </>
          )}
        </Button>

        {/* Processing Status Detail */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-blue-800 font-medium">
                  Processing forecast ({modelMode} mode)
                </p>
                <p className="text-sm text-blue-700">
                  {processingStatus || "Initializing..."}
                </p>
                <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-xs text-blue-600">
                  Estimated time remaining: {getEstimatedRuntime(modelMode)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && <p className="text-xs text-muted-foreground">{debugInfo}</p>}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-800">
                  {error.includes("Python API") ? "Python API not available" : "Forecast failed"}: {error}
                </p>
                <div className="text-xs text-red-600 space-y-1">
                  <p className="font-medium">Troubleshooting tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check if Python service is running on port 8000</li>
                    <li>Ensure Prophet is properly installed</li>
                    <li>Ensure sufficient historical data exists</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selection Summary */}
        {selectedUnit && selectedMedicine && !isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Selected:</strong> {selectedUnitName} → {selectedMedicineName} → {forecastPeriods[0]} months
              <br />
              <strong>Mode:</strong> {modelMode.charAt(0).toUpperCase() + modelMode.slice(1)} (
              {getEstimatedRuntime(modelMode)}){includeHolidays && " (with holiday effects)"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}