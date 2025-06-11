"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Target, Zap, MapPin, Calendar, Search, X } from "lucide-react"
import { getAvailableUnits } from "@/lib/actions/disease-forecasting"

interface Unit {
  id: number
  namaUnit: string
  kodeUnit: string
}

interface ForecastControlsProps {
  onGenerate: (params: {
    selectedUnits: number[]
    forecastMonths: number
    useProphet: boolean
  }) => void
  isLoading?: boolean
  prophetStatus?: 'checking' | 'available' | 'unavailable'
}

export default function ForecastControls({ 
  onGenerate, 
  isLoading = false,
  prophetStatus = 'checking' 
}: ForecastControlsProps) {
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedUnits, setSelectedUnits] = useState<number[]>([])
  const [forecastMonths, setForecastMonths] = useState<number>(6)
  const [showAllUnits, setShowAllUnits] = useState(false)
  
  // Search functionality state
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([])

  // Load available units
  useEffect(() => {
    const loadUnits = async () => {
      const result = await getAvailableUnits()
      if (result.success && result.data) {
        setUnits(result.data)
        setFilteredUnits(result.data)
        // Auto-select first 3 units
        setSelectedUnits(result.data.slice(0, 3).map(u => u.id))
      }
    }
    loadUnits()
  }, [])

  // Filter units based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUnits(units)
    } else {
      const query = searchQuery.toLowerCase().trim()
      const filtered = units.filter(unit => 
        unit.namaUnit.toLowerCase().includes(query) ||
        unit.kodeUnit.toLowerCase().includes(query)
      )
      setFilteredUnits(filtered)
    }
  }, [searchQuery, units])

  const handleUnitToggle = (unitId: number) => {
    setSelectedUnits(prev =>
      prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    )
  }

  const handleGenerate = () => {
    if (selectedUnits.length === 0) {
      alert('Please select at least one unit')
      return
    }

    if (prophetStatus !== 'available') {
      alert('Prophet AI model is not available. Please try again later.')
      return
    }

    onGenerate({
      selectedUnits,
      forecastMonths,
      useProphet: true // Always true since we only have Prophet AI
    })
  }

  // Clear search function
  const clearSearch = () => {
    setSearchQuery("")
  }

  // Select all filtered units
  const selectAllFiltered = () => {
    const filteredIds = filteredUnits.map(u => u.id)
    const newSelected = [...new Set([...selectedUnits, ...filteredIds])]
    setSelectedUnits(newSelected)
  }

  // Clear all filtered units
  const clearAllFiltered = () => {
    const filteredIds = filteredUnits.map(u => u.id)
    setSelectedUnits(prev => prev.filter(id => !filteredIds.includes(id)))
  }

  const getMonthsText = (months: number) => {
    const today = new Date()
    const endDate = new Date(today.getFullYear(), today.getMonth() + months, 0)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const startMonth = monthNames[today.getMonth() + 1] || monthNames[0]
    const endMonth = monthNames[endDate.getMonth()]
    
    return `${startMonth} - ${endMonth} ${endDate.getFullYear()}`
  }

  // Use filteredUnits for display
  const displayUnits = showAllUnits ? filteredUnits : filteredUnits.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Disease Outbreak Forecast Controls
        </CardTitle>
        <p className="text-sm text-gray-600">
          Configure parameters for AI-powered disease outbreak prediction
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Forecast Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Forecast Period
            </label>
            <Select 
              value={forecastMonths.toString()} 
              onValueChange={(value) => setForecastMonths(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">
                  3 Months ({getMonthsText(3)})
                </SelectItem>
                <SelectItem value="6">
                  6 Months ({getMonthsText(6)})
                </SelectItem>
                <SelectItem value="12">
                  12 Months ({getMonthsText(12)})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Status */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Forecasting Model
              {prophetStatus === 'checking' && (
                <Badge variant="outline" className="ml-2 bg-gray-50 text-gray-600">
                  Checking...
                </Badge>
              )}
              {prophetStatus === 'available' && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-600">
                  Prophet Available
                </Badge>
              )}
              {prophetStatus === 'unavailable' && (
                <Badge variant="outline" className="ml-2 bg-red-50 text-red-600">
                  Prophet Offline
                </Badge>
              )}
            </label>
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Prophet AI</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              AI model: High accuracy, seasonal patterns
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex flex-col justify-end">
            <Button 
              onClick={handleGenerate}
              disabled={isLoading || selectedUnits.length === 0 || prophetStatus !== 'available'}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Generate Forecast
                </>
              )}
            </Button>
            <div className="text-xs text-gray-500 mt-1 text-center">
              {selectedUnits.length} units • {forecastMonths} months
            </div>
          </div>
        </div>

        {/* Unit Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Selected Units ({selectedUnits.length})
              {searchQuery && (
                <Badge variant="outline" className="ml-2">
                  {filteredUnits.length} found
                </Badge>
              )}
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                title={searchQuery ? "Select all filtered units" : "Select all units"}
              >
                Select {searchQuery ? 'Filtered' : 'All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={searchQuery ? clearAllFiltered : () => setSelectedUnits([])}
                title={searchQuery ? "Clear all filtered units" : "Clear all units"}
              >
                Clear {searchQuery ? 'Filtered' : 'All'}
              </Button>
              {units.length > 8 && !searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllUnits(!showAllUnits)}
                >
                  {showAllUnits ? 'Show Less' : `Show All (${units.length})`}
                </Button>
              )}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search units by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Show search results info */}
          {searchQuery && (
            <div className="text-sm text-gray-600 mb-2">
              {filteredUnits.length === 0 ? (
                <span className="text-amber-600">
                  ⚠️ No units found matching &quot;{searchQuery}&quot;
                </span>
              ) : (
                <span>
                  📋 Found {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
                </span>
              )}
            </div>
          )}

          {/* Unit List */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
            {displayUnits.map(unit => (
              <div key={unit.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`unit-${unit.id}`}
                  checked={selectedUnits.includes(unit.id)}
                  onCheckedChange={() => handleUnitToggle(unit.id)}
                />
                <label
                  htmlFor={`unit-${unit.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  title={`${unit.namaUnit} (${unit.kodeUnit})`}
                >
                  {unit.namaUnit.length > 20 
                    ? `${unit.namaUnit.substring(0, 20)}...` 
                    : unit.namaUnit
                  }
                  <span className="text-xs text-gray-500 block">
                    {unit.kodeUnit}
                  </span>
                </label>
              </div>
            ))}
          </div>

          {/* Show "Show More" button when search is active and results are limited */}
          {searchQuery && filteredUnits.length > 8 && !showAllUnits && (
            <div className="mt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllUnits(true)}
              >
                Show all {filteredUnits.length} results
              </Button>
            </div>
          )}

          {/* Empty search state */}
          {filteredUnits.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No units found matching your search.</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term or clear the search.</p>
            </div>
          )}
        </div>

        {/* Model Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Prophet AI Model
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Advanced ML model with seasonal pattern detection and trend analysis. 
                Provides high accuracy forecasting with automatic handling of seasonality and trends.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600">Expected Performance</div>
              <div className="text-xs text-blue-500">
                Speed: Fast (&lt;2s)<br/>
                Accuracy: Very High<br/>
                Features: Seasonality + AI
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}