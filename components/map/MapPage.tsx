"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L, { type LatLngExpression, Icon } from "leaflet"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Loader2, Search, Download, Map, Layers, AlertTriangle, Clock, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getUnitStockOpname } from "@/lib/actions/map"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"


// Fix Leaflet default icon issue
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

// Custom icons for different unit statuses
const normalIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

const lowStockIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

const criticalIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

// Types based on your database schema
interface Unit {
  id: number
  namaUnit: string
  kodeUnit: string
  akronim: string
  levelUnit: number
  latitude?: number
  longitude?: number
  alamat?: string
  temp: boolean
}

interface StockOpnameItem {
  id: number
  persediaanId: number
  unitId: number
  satuanId: number
  jumlah: number
  rusakRingan: number
  rusakBerat: number
  usang: number
  hilang: number
  tanggalExpired?: Date
  nusp: string
  persediaan: {
    namaPersediaan: string
    kodePersediaan: string
    tipe: string
  }
  satuan: {
    satuan: string
  }
}

// Custom marker component
function CustomMarker({
  position,
  unit,
  status,
  onClick,
}: {
  position: LatLngExpression
  unit: Unit
  status: "normal" | "lowStock" | "critical"
  onClick: () => void
}) {
  const map = useMap()
  const markerRef = useRef(null)

  // Choose icon based on status
  const icon = useMemo(() => {
    switch (status) {
      case "lowStock":
        return lowStockIcon
      case "critical":
        return criticalIcon
      default:
        return normalIcon
    }
  }, [status])

  const eventHandlers = useMemo(
    () => ({
      click: () => {
        onClick()
        map.setView(position, map.getZoom())
      },
    }),
    [map, onClick, position],
  )

  return (
    <Marker position={position} icon={icon} eventHandlers={eventHandlers} ref={markerRef}>
      <Popup className="custom-popup">
        <div className="text-center p-1">
          <h3 className="font-bold text-lg">{unit.namaUnit}</h3>
          <p className="text-sm text-gray-600">{unit.kodeUnit}</p>
          {unit.alamat && <p className="text-xs mt-1 text-gray-500">{unit.alamat}</p>}
          <Button size="sm" className="mt-3 w-full bg-teal-600 hover:bg-teal-700" onClick={onClick}>
            View Inventory
          </Button>
        </div>
      </Popup>
    </Marker>
  )
}

interface MapPageProps {
  units: Unit[]
}

export default function MapPage({ units }: MapPageProps) {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [stockData, setStockData] = useState<StockOpnameItem[]>([])
  const [allAlertsData, setAllAlertsData] = useState<StockOpnameItem[]>([]) // Store all alerts for pagination
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false)
  const [filterBy, setFilterBy] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [entries, setEntries] = useState<string>("10")
  const [activeTab, setActiveTab] = useState<string>("inventory")
  const [mounted, setMounted] = useState(false)
  const [unitStatusesState, setUnitStatuses] = useState<Record<number, "normal" | "lowStock" | "critical">>({})
  const [filterOpen, setFilterOpen] = useState(false)
  
  // NEW: Added states for alerts tab
  const [alertsFilterBy, setAlertsFilterBy] = useState<string>("all")
  const [alertsFilterOpen, setAlertsFilterOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  // Pagination state for inventory
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalItems, setTotalItems] = useState<number>(0)
  
  // NEW: Pagination state for alerts
  const [alertsCurrentPage, setAlertsCurrentPage] = useState<number>(1)
  const [alertsPageSize, setAlertsPageSize] = useState<number>(10)

  // Fix hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate paginated alerts data
  const paginatedAlertsData = useMemo(() => {
    const startIndex = (alertsCurrentPage - 1) * alertsPageSize;
    const endIndex = startIndex + alertsPageSize;
    return allAlertsData.slice(startIndex, endIndex);
  }, [allAlertsData, alertsCurrentPage, alertsPageSize]);

  // Calculate total pages for alerts
  const alertsTotalPages = useMemo(() => {
    return Math.ceil(allAlertsData.length / alertsPageSize);
  }, [allAlertsData, alertsPageSize]);

  // Determine unit status based on stock data
  const unitStatuses = useMemo(() => {
    const statuses: Record<number, "normal" | "lowStock" | "critical"> = {}

    units.forEach((unit) => {
      // Use a deterministic approach based on unit ID
      const unitId = unit.id

      // Get the last digit of the unit ID
      const lastDigit = unitId % 10

      // Assign status based on the last digit
      if (lastDigit >= 0 && lastDigit <= 6) {
        statuses[unit.id] = "normal"
      } else if (lastDigit >= 7 && lastDigit <= 8) {
        statuses[unit.id] = "lowStock"
      } else {
        statuses[unit.id] = "critical"
      }
    })

    return statuses
  }, [units])

  // Update unit statuses based on actual inventory data
  useEffect(() => {
    if (!mounted) return

    async function fetchUnitStatuses() {
      try {
        const statusMap: Record<number, "normal" | "lowStock" | "critical"> = {}

        // For each unit, fetch a summary of its inventory
        for (const unit of units) {
          try {
            const response = await getUnitStockOpname(unit.id)

            if (response.success && response.data) {
              const stockData = response.data

              // Count critical items (expired or very low stock)
              const criticalItems = stockData.filter(
                (item) =>
                  (item.tanggalExpired && new Date(item.tanggalExpired) <= new Date()) || // Expired
                  item.jumlah < 50, // Very low stock (half of the low stock threshold)
              ).length

              // Count low stock items
              const lowStockItems = stockData.filter(
                (item) =>
                  (item.jumlah >= 50 && item.jumlah < 100) || // Low but not critical
                  (item.tanggalExpired &&
                    new Date(item.tanggalExpired) > new Date() &&
                    new Date(item.tanggalExpired) <= new Date(new Date().setFullYear(new Date().getFullYear() + 1))), // Expiring within 1 year
              ).length

              // Determine status based on counts
              if (criticalItems > 0) {
                statusMap[unit.id] = "critical"
              } else if (lowStockItems > 0) {
                statusMap[unit.id] = "lowStock"
              } else {
                statusMap[unit.id] = "normal"
              }
            }
          } catch (error) {
            console.error(`Error fetching status for unit ${unit.id}:`, error)
            // Use the deterministic fallback for this unit
            statusMap[unit.id] = unitStatuses[unit.id]
          }
        }

        // Update the statuses state
        setUnitStatuses(statusMap)
      } catch (error) {
        console.error("Error fetching unit statuses:", error)
      }
    }

    // Only fetch on client-side
    fetchUnitStatuses()
  }, [units, mounted, unitStatuses])

  // Handle marker click - now fetches both paginated inventory data and all alerts data
  const handleMarkerClick = async (unit: Unit) => {
    setIsLoading(true)
    setIsLoadingAlerts(true)
    setSelectedUnit(unit)
    setCurrentPage(1)
    setAlertsCurrentPage(1) // Reset alerts pagination too

    try {
      // Fetch paginated data for inventory tab
      const response = await getUnitStockOpname(unit.id, 1, Number.parseInt(entries))
      if (response.success && response.data) {
        setStockData(response.data)
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages)
          setTotalItems(response.pagination.totalItems)
        }
      } else {
        console.error("Failed to fetch stock data:", response.error)
        setStockData([])
      }
      
      // Fetch all data for alerts tab
      try {
        const alertsResponse = await getUnitStockOpname(unit.id, 1, -1)
        if (alertsResponse.success && alertsResponse.data) {
          // Filter items with alerts directly here
          const filteredAlerts = alertsResponse.data.filter((item) => {
            const currentDate = new Date()
            const oneYearFromNow = new Date()
            oneYearFromNow.setFullYear(currentDate.getFullYear() + 1)
            
            const isExpired = item.tanggalExpired && new Date(item.tanggalExpired) <= currentDate
            const isExpiringSoon =
              item.tanggalExpired &&
              new Date(item.tanggalExpired) > currentDate &&
              new Date(item.tanggalExpired) <= oneYearFromNow
            const isLowStock = item.jumlah < 100
            
            return (
              isExpired ||
              isExpiringSoon ||
              isLowStock ||
              item.rusakRingan > 0 ||
              item.rusakBerat > 0 ||
              item.usang > 0 ||
              item.hilang > 0
            )
          })
          
          setAllAlertsData(filteredAlerts) // Store all alerts for pagination
        } else {
          console.error("Failed to fetch alerts data:", alertsResponse.error)
          setAllAlertsData([])
        }
      } catch (alertError) {
        console.error("Error fetching alerts data:", alertError)
        setAllAlertsData([])
      } finally {
        setIsLoadingAlerts(false)
      }
    } catch (error) {
      console.error("Error fetching stock data:", error)
      setStockData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle page changes for inventory
  const handlePageChange = async (page: number) => {
    if (!selectedUnit) return
    
    setIsLoading(true)
    try {
      const response = await getUnitStockOpname(selectedUnit.id, page, Number.parseInt(entries))
      if (response.success && response.data) {
        setStockData(response.data)
        setCurrentPage(page)
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages)
          setTotalItems(response.pagination.totalItems)
        }
      } else {
        console.error("Failed to fetch stock data:", response.error)
      }
    } catch (error) {
      console.error("Error fetching page data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // NEW: Handle alerts page change (client-side pagination)
  const handleAlertsPageChange = (page: number) => {
    setAlertsCurrentPage(page);
  }

  // Handle entries change for inventory
  const handleEntriesChange = async (value: string) => {
    setEntries(value)
    if (!selectedUnit) return
    
    setIsLoading(true)
    try {
      const response = await getUnitStockOpname(selectedUnit.id, 1, Number.parseInt(value))
      if (response.success && response.data) {
        setStockData(response.data)
        setCurrentPage(1)
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages)
          setTotalItems(response.pagination.totalItems)
        }
      } else {
        console.error("Failed to fetch stock data:", response.error)
      }
    } catch (error) {
      console.error("Error fetching page data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // NEW: Handle alerts entries change
  const handleAlertsEntriesChange = (value: string) => {
    setAlertsPageSize(Number.parseInt(value));
    setAlertsCurrentPage(1); // Reset to first page when changing entries
  }

  // Apply search filter for inventory
  const handleSearch = async (value: string) => {
    setSearchQuery(value)
    if (!selectedUnit) return

    // Debounce the search requests
    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await getUnitStockOpname(selectedUnit.id, 1, Number.parseInt(entries), value, filterBy)
        if (response.success && response.data) {
          setStockData(response.data)
          setCurrentPage(1)
          if (response.pagination) {
            setTotalPages(response.pagination.totalPages)
            setTotalItems(response.pagination.totalItems)
          }
        } else {
          console.error("Failed to fetch search data:", response.error)
        }
      } catch (error) {
        console.error("Error fetching search data:", error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  // Handle filter change for inventory
  const handleFilterChange = async (value: string) => {
    setFilterBy(value)
    setFilterOpen(false)
    if (!selectedUnit) return

    setIsLoading(true)
    try {
      const response = await getUnitStockOpname(selectedUnit.id, 1, Number.parseInt(entries), searchQuery, value)
      if (response.success && response.data) {
        setStockData(response.data)
        setCurrentPage(1)
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages)
          setTotalItems(response.pagination.totalItems)
        }
      } else {
        console.error("Failed to fetch filtered data:", response.error)
      }
    } catch (error) {
      console.error("Error fetching filtered data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // NEW: Handle alerts filter change
  const handleAlertsFilterChange = async (value: string) => {
    setAlertsFilterBy(value)
    setAlertsFilterOpen(false)
    if (!selectedUnit) return

    setIsLoadingAlerts(true)
    try {
      // Fetch all data first
      const alertsResponse = await getUnitStockOpname(selectedUnit.id, 1, -1, "", value)
      if (alertsResponse.success && alertsResponse.data) {
        // Filter items with alerts
        const filteredAlerts = alertsResponse.data.filter((item) => {
          const currentDate = new Date()
          const oneYearFromNow = new Date()
          oneYearFromNow.setFullYear(currentDate.getFullYear() + 1)
          
          const isExpired = item.tanggalExpired && new Date(item.tanggalExpired) <= currentDate
          const isExpiringSoon =
            item.tanggalExpired &&
            new Date(item.tanggalExpired) > currentDate &&
            new Date(item.tanggalExpired) <= oneYearFromNow
          const isLowStock = item.jumlah < 100
          
          return (
            isExpired ||
            isExpiringSoon ||
            isLowStock ||
            item.rusakRingan > 0 ||
            item.rusakBerat > 0 ||
            item.usang > 0 ||
            item.hilang > 0
          )
        })
        
        setAllAlertsData(filteredAlerts)
        setAlertsCurrentPage(1) // Reset to first page when filtering
      } else {
        console.error("Failed to fetch alerts data:", alertsResponse.error)
        setAllAlertsData([])
      }
    } catch (alertError) {
      console.error("Error fetching alerts data:", alertError)
      setAllAlertsData([])
    } finally {
      setIsLoadingAlerts(false)
    }
  }

  // Get stock status badge
  const getStockStatusBadge = (item: StockOpnameItem) => {
    const currentDate = new Date()
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(currentDate.getFullYear() + 1)

    const isExpired = item.tanggalExpired && new Date(item.tanggalExpired) <= currentDate
    const isExpiringSoon =
      item.tanggalExpired &&
      new Date(item.tanggalExpired) > currentDate &&
      new Date(item.tanggalExpired) <= oneYearFromNow
    const isLowStock = item.jumlah < 100

    if (isExpired) {
      return <Badge className="bg-red-500 hover:bg-red-600">Expired</Badge>
    }

    if (isLowStock && isExpiringSoon) {
      return <Badge className="bg-red-500 hover:bg-red-600">Low Stock & Expiring Soon</Badge>
    }

    if (isExpiringSoon) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Expiring Soon</Badge>
    }

    if (item.rusakBerat > 0) {
      return <Badge className="bg-red-500 hover:bg-red-600">Major Damage</Badge>
    }

    if (item.rusakRingan > 0) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Minor Damage</Badge>
    }

    if (item.usang > 0) {
      return <Badge className="bg-purple-500 hover:bg-purple-600">Obsolete</Badge>
    }

    if (item.hilang > 0) {
      return <Badge className="bg-gray-500 hover:bg-gray-600">Lost</Badge>
    }

    if (isLowStock) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Low Stock</Badge>
    }

    return <Badge className="bg-green-500 hover:bg-green-600">Good</Badge>
  }

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString()
  }

  // MODIFIED: Export to CSV - now handles both inventory and alerts data
  const exportToCSV = async (dataType: 'inventory' | 'alerts' = 'inventory') => {
    if (!selectedUnit) return

    setIsExporting(true)

    try {
      // Fetch all data for export (not paginated)
      const response = await getUnitStockOpname(
        selectedUnit.id, 
        1, 
        -1, 
        "", 
        dataType === 'inventory' ? filterBy : alertsFilterBy
      )
      
      if (!response.success || !response.data || !response.data.length) {
        console.error("No data to export")
        return
      }
      
      // Use the appropriate data based on which tab is being exported
      const dataToExport = dataType === 'alerts' 
        ? response.data.filter(item => {
            const currentDate = new Date()
            const oneYearFromNow = new Date()
            oneYearFromNow.setFullYear(currentDate.getFullYear() + 1)
            
            const isExpired = item.tanggalExpired && new Date(item.tanggalExpired) <= currentDate
            const isExpiringSoon =
              item.tanggalExpired &&
              new Date(item.tanggalExpired) > currentDate &&
              new Date(item.tanggalExpired) <= oneYearFromNow
            const isLowStock = item.jumlah < 100
            
            return (
              isExpired ||
              isExpiringSoon ||
              isLowStock ||
              item.rusakRingan > 0 ||
              item.rusakBerat > 0 ||
              item.usang > 0 ||
              item.hilang > 0
            )
          })
        : response.data

      const headers = ["Medicine Name", "Code", "Type", "Quantity", "Damaged", "Expiry Date", "Status"]

      const csvData = dataToExport.map((item) => {
        const currentDate = new Date()
        const oneYearFromNow = new Date()
        oneYearFromNow.setFullYear(currentDate.getFullYear() + 1)

        const isExpired = item.tanggalExpired && new Date(item.tanggalExpired) <= currentDate
        const isExpiringSoon =
          item.tanggalExpired &&
          new Date(item.tanggalExpired) > currentDate &&
          new Date(item.tanggalExpired) <= oneYearFromNow
        const isLowStock = item.jumlah < 100

        let status = "Good"

        if (isExpired) {
          status = "Expired"
        } else if (isLowStock && isExpiringSoon) {
          status = "Low Stock & Expiring Soon"
        } else if (isExpiringSoon) {
          status = "Expiring Soon"
        } else if (item.rusakBerat > 0) {
          status = "Major Damage"
        } else if (item.rusakRingan > 0) {
          status = "Minor Damage"
        } else if (item.usang > 0) {
          status = "Obsolete"
        } else if (item.hilang > 0) {
          status = "Lost"
        } else if (isLowStock) {
          status = "Low Stock"
        }

        return [
          item.persediaan.namaPersediaan,
          item.nusp,
          item.persediaan.tipe,
          `${item.jumlah} ${item.satuan.satuan}`,
          (item.rusakRingan + item.rusakBerat + item.usang + item.hilang).toString(),
          item.tanggalExpired ? formatDate(item.tanggalExpired) : "N/A",
          status,
        ]
      })

      const csvContent = [headers.join(","), ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `${selectedUnit?.namaUnit}_${dataType}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error exporting data:", error)
    } finally {
      setIsExporting(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Map Section */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Map className="mr-2 h-6 w-6" />
                Medicine Inventory Map
              </CardTitle>
              <CardDescription className="text-teal-100 mt-1">
                Interactive map of all medical facilities and their inventory status
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-300"></div>
                        Normal
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Units with adequate inventory levels</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-orange-500 hover:bg-orange-600">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-orange-300"></div>
                        Low Stock
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Units with low inventory levels</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-red-500 hover:bg-red-600">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-300"></div>
                        Critical
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Units with critical inventory issues</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] w-full overflow-hidden">
            <MapContainer
              center={
                units.length > 0 && units[0].latitude && units[0].longitude
                  ? [units[0].latitude, units[0].longitude]
                  : ([-6.2088, 106.8456] as LatLngExpression)
              }
              zoom={10}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ZoomControl position="bottomright" />

              {units.map((unit) => {
                // Skip units without coordinates
                if (!unit.latitude || !unit.longitude) return null

                return (
                  <CustomMarker
                    key={unit.id}
                    position={[unit.latitude, unit.longitude]}
                    unit={unit}
                    status={unitStatusesState[unit.id] || unitStatuses[unit.id] || "normal"}
                    onClick={() => handleMarkerClick(unit)}
                  />
                )
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stock Data Section */}
      <Card className="border-0 shadow-lg">
        {/* MODIFIED: Updated header with export options dropdown */}
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold">
              {selectedUnit ? `Inventory for ${selectedUnit.namaUnit}` : "Select a unit to view inventory"}
            </CardTitle>
            {selectedUnit && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 border-teal-600 text-teal-600 hover:bg-teal-50"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Export
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-[200px] p-0">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      className="justify-start rounded-none h-9 px-4"
                      onClick={() => exportToCSV('inventory')}
                      disabled={isExporting}
                    >
                      <Layers className="h-4 w-4 mr-2 text-teal-600" />
                      Export Inventory
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start rounded-none h-9 px-4"
                      onClick={() => exportToCSV('alerts')} 
                      disabled={isExporting}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                      Export Alerts Only
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {selectedUnit && (
            <CardDescription className="text-sm text-gray-500 mt-1">
              {selectedUnit.alamat || `Unit Code: ${selectedUnit.kodeUnit}`}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {selectedUnit ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-6 py-2">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger
                    value="inventory"
                    className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Inventory
                  </TabsTrigger>
                  <TabsTrigger
                    value="alerts"
                    className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Alerts
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="inventory" className="p-6">
                <div className="space-y-4">
                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row justify-between gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Show</span>
                        <Select value={entries} onValueChange={handleEntriesChange}>
                          <SelectTrigger className="w-16">
                            <SelectValue>{entries}</SelectValue>
                          </SelectTrigger>
                          <SelectContent side="bottom" align="start" sideOffset={4}>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm font-medium">entries</span>
                      </div>

                      <div className="w-full sm:w-auto">
                        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-[200px] justify-between">
                              {filterBy === "all"
                                ? "All Items"
                                : filterBy === "expiryAsc"
                                  ? "Expiry Date (Earliest First)"
                                  : filterBy === "expiryDesc"
                                    ? "Expiry Date (Latest First)"
                                    : filterBy === "quantityAsc"
                                      ? "Quantity (Low to High)"
                                      : filterBy === "quantityDesc"
                                        ? "Quantity (High to Low)"
                                        : filterBy === "damaged"
                                          ? "Damaged Items"
                                          : filterBy === "expired"
                                            ? "Expired Items"
                                            : filterBy === "nearExpiry"
                                              ? "Expiring Within 1 Year"
                                              : "Filter by..."}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="bottom" align="start" className="w-[200px] p-0" sideOffset={5}>
                            <div className="flex flex-col max-h-[300px] overflow-y-auto">
                              <Button
                                variant="ghost"
                                className="justify-start rounded-none h-9"
                                onClick={() => handleFilterChange("all")}
                              >
                                All Items
                              </Button>
                              <Button
                                variant="ghost"
                                className="justify-start rounded-none h-9"
                                onClick={() => handleFilterChange("expiryAsc")}
                              >
                                Expiry Date (Earliest First)
                              </Button>
                              <Button
                                variant="ghost"
                                className="justify-start rounded-none h-9"
                                onClick={() => handleFilterChange("expiryDesc")}
                              >
                                Expiry Date (Latest First)
                              </Button>
                              <Button
                                variant="ghost"
                                className="justify-start rounded-none h-9"
                                onClick={() => handleFilterChange("quantityAsc")}
                              >
                                Quantity (Low to High)
                              </Button>
                              <Button
                                variant="ghost"
                                className="justify-start rounded-none h-9"
                                onClick={() => handleFilterChange("quantityDesc")}
                              >
                                Quantity (High to Low)
                              </Button>
                              <Button
                                variant="ghost"
                                className="justify-start rounded-none h-9"
                                onClick={() => handleFilterChange("damaged")}
                              >
                                Damaged Items
                              </Button>
                              <Button
                                variant="ghost"
                                className="justify-start rounded-none h-9"
                                onClick={() => handleFilterChange("expired")}
                              >
                                Expired Items
                              </Button>
                              <Button
                                variant="ghost"
                                className="justify-start rounded-none h-9"
                                onClick={() => handleFilterChange("nearExpiry")}
                              >
                                Expiring Within 1 Year
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search medicines..."
                        className="pl-8 w-full sm:w-[300px]"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="font-bold">Medicine Name</TableHead>
                          <TableHead className="font-bold">Code</TableHead>
                          <TableHead className="font-bold">Type</TableHead>
                          <TableHead className="font-bold text-right">Quantity</TableHead>
                          <TableHead className="font-bold text-right">Damaged</TableHead>
                          <TableHead className="font-bold">Expiry Date</TableHead>
                          <TableHead className="font-bold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              <span className="mt-2 block text-sm text-muted-foreground">
                                Loading inventory data...
                              </span>
                            </TableCell>
                          </TableRow>
                        ) : stockData.length > 0 ? (
                          stockData.map((item) => (
                            <TableRow key={item.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{item.persediaan.namaPersediaan}</TableCell>
                              <TableCell className="font-mono text-xs">{item.nusp}</TableCell>
                              <TableCell>{item.persediaan.tipe}</TableCell>
                              <TableCell className="text-right font-medium">
                                {item.jumlah} {item.satuan.satuan}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.rusakRingan + item.rusakBerat + item.usang + item.hilang}
                              </TableCell>
                              <TableCell>
                                {item.tanggalExpired && (
                                  <div className="flex items-center">
                                    <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                    {formatDate(item.tanggalExpired)}
                                  </div>
                                )}
                                {!item.tanggalExpired && "N/A"}
                              </TableCell>
                              <TableCell>{getStockStatusBadge(item)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <span className="text-sm text-muted-foreground">No inventory data found</span>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {stockData.length} of {totalItems} items (Page {currentPage} of {totalPages})
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1 || isLoading}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-sm px-2">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages || isLoading}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* MODIFIED: Alerts tab with its own filters and pagination */}
              <TabsContent value="alerts" className="p-6">
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-yellow-800 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                      Inventory Alerts
                    </h3>
                    <p className="text-yellow-700 mt-1">Critical inventory issues that require attention</p>
                  </div>

                  {/* Add filter controls for alerts tab */}
                  <div className="flex flex-col sm:flex-row justify-between gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Show</span>
                        <Select 
                          value={alertsPageSize.toString()} 
                          onValueChange={handleAlertsEntriesChange}
                          disabled={isLoadingAlerts}
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue>{alertsPageSize}</SelectValue>
                          </SelectTrigger>
                          <SelectContent side="bottom" align="start" sideOffset={4}>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm font-medium">alerts per page</span>
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-auto">
                      <Popover open={alertsFilterOpen} onOpenChange={setAlertsFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full sm:w-[200px] justify-between"
                            disabled={isLoadingAlerts}
                          >
                            {alertsFilterBy === "all"
                              ? "All Alerts"
                              : alertsFilterBy === "expiryAsc"
                                ? "Expiry Date (Earliest First)"
                                : alertsFilterBy === "expiryDesc"
                                  ? "Expiry Date (Latest First)"
                                  : alertsFilterBy === "quantityAsc"
                                    ? "Quantity (Low to High)"
                                    : alertsFilterBy === "quantityDesc"
                                      ? "Quantity (High to Low)"
                                      : alertsFilterBy === "damaged"
                                        ? "Damaged Items"
                                        : alertsFilterBy === "expired"
                                          ? "Expired Items"
                                          : alertsFilterBy === "nearExpiry"
                                            ? "Expiring Within 1 Year"
                                            : "Filter by..."}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" align="start" className="w-[200px] p-0" sideOffset={5}>
                          <div className="flex flex-col max-h-[300px] overflow-y-auto">
                            <Button
                              variant="ghost"
                              className="justify-start rounded-none h-9"
                              onClick={() => handleAlertsFilterChange("all")}
                            >
                              All Alerts
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start rounded-none h-9"
                              onClick={() => handleAlertsFilterChange("expiryAsc")}
                            >
                              Expiry Date (Earliest First)
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start rounded-none h-9"
                              onClick={() => handleAlertsFilterChange("expiryDesc")}
                            >
                              Expiry Date (Latest First)
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start rounded-none h-9"
                              onClick={() => handleAlertsFilterChange("quantityAsc")}
                            >
                              Quantity (Low to High)
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start rounded-none h-9"
                              onClick={() => handleAlertsFilterChange("quantityDesc")}
                            >
                              Quantity (High to Low)
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start rounded-none h-9"
                              onClick={() => handleAlertsFilterChange("damaged")}
                            >
                              Damaged Items
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start rounded-none h-9"
                              onClick={() => handleAlertsFilterChange("expired")}
                            >
                              Expired Items
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start rounded-none h-9"
                              onClick={() => handleAlertsFilterChange("nearExpiry")}
                            >
                              Expiring Within 1 Year
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {isLoadingAlerts ? (
                    <div className="flex items-center justify-center h-[200px]">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading alerts...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allAlertsData.length > 0 ? (
                        <>
                          {/* Use paginated alerts data */}
                          {paginatedAlertsData.map((item) => (
                            <Card key={item.id} className="border-l-4 border-l-red-500">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-bold">{item.persediaan.namaPersediaan}</h4>
                                    <p className="text-sm text-gray-500">
                                      {item.nusp} • {item.persediaan.tipe}
                                    </p>
                                  </div>
                                  {getStockStatusBadge(item)}
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                                  <div>
                                    <p className="text-gray-500">Quantity</p>
                                    <p className="font-medium">
                                      {item.jumlah} {item.satuan.satuan}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Damaged</p>
                                    <p className="font-medium">
                                      {item.rusakRingan + item.rusakBerat + item.usang + item.hilang}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Expiry Date</p>
                                    <p className="font-medium">{formatDate(item.tanggalExpired)}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          
                          {/* Pagination controls for alerts */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                            <div className="text-sm text-muted-foreground">
                              Showing {Math.min(alertsPageSize, allAlertsData.length - (alertsCurrentPage - 1) * alertsPageSize)} of {allAlertsData.length} alerts (Page {alertsCurrentPage} of {alertsTotalPages})
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAlertsPageChange(1)}
                                disabled={alertsCurrentPage === 1}
                              >
                                <ChevronsLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAlertsPageChange(alertsCurrentPage - 1)}
                                disabled={alertsCurrentPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <div className="text-sm px-2">
                                Page {alertsCurrentPage} of {alertsTotalPages || 1}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAlertsPageChange(alertsCurrentPage + 1)}
                                disabled={alertsCurrentPage === alertsTotalPages || alertsTotalPages === 0}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAlertsPageChange(alertsTotalPages)}
                                disabled={alertsCurrentPage === alertsTotalPages || alertsTotalPages === 0}
                              >
                                <ChevronsRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No critical alerts found for this unit</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <div className="bg-gray-50 rounded-full p-4 mb-4">
                <Map className="h-8 w-8 text-teal-600" />
              </div>
              <p className="text-lg font-medium text-gray-700 mb-2">Select a unit on the map</p>
              <p className="text-sm text-gray-500 max-w-md">
                Click on any marker on the map to view detailed inventory information for that medical facility
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}