'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts"

const data = [
  { location: "Pusk.1", Med1: 520, Med2: 150, Med3: 100, Med4: 800 },
  { location: "Pusk.2", Med1: 750, Med2: 750, Med3: 180, Med4: 820 },
  { location: "Pusk.3", Med1: 820, Med2: 400, Med3: 800, Med4: 100 },
  { location: "Pusk.4", Med1: 50, Med2: 550, Med3: 500, Med4: 80 },
];

const LOCATIONS = ['Pusk.1', 'Pusk.2', 'Pusk.3', 'Pusk.4']
const MEDICINES = ['Med1', 'Med2', 'Med3', 'Med4']

const medicineColors = {
  Med1: "#0DC3F4", 
  Med2: "#88C11F", 
  Med3: "#545447", 
  Med4: "#6D8147", 
};

interface FilterBadgeProps {
  label: string
  onRemove: () => void
}

function FilterBadge({ label, onRemove }: FilterBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded-full shadow-sm">
      <button
        onClick={onRemove}
        className="text-red-500 hover:text-red-700"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  )
}

export function StockChart() {
  const [selectedLocations, setSelectedLocations] = React.useState<string[]>([])
  const [selectedMedicines, setSelectedMedicines] = React.useState<string[]>([])
  const [locationSearch, setLocationSearch] = React.useState('')
  const [medicineSearch, setMedicineSearch] = React.useState('')
  const [locationOpen, setLocationOpen] = React.useState(false)
  const [medicineOpen, setMedicineOpen] = React.useState(false)

  const addLocation = (location: string) => {
    if (!selectedLocations.includes(location)) {
      setSelectedLocations([...selectedLocations, location])
    }
    setLocationOpen(false)
    setLocationSearch('')
  }

  const removeLocation = (location: string) => {
    setSelectedLocations(selectedLocations.filter(l => l !== location))
  }

  const addMedicine = (medicine: string) => {
    if (!selectedMedicines.includes(medicine)) {
      setSelectedMedicines([...selectedMedicines, medicine])
    }
    setMedicineOpen(false)
    setMedicineSearch('')
  }

  const removeMedicine = (medicine: string) => {
    setSelectedMedicines(selectedMedicines.filter(m => m !== medicine))
  }

  const filteredData = React.useMemo(() => {
    if (selectedLocations.length === 0) return data
    return data.filter(item => selectedLocations.includes(item.location))
  }, [selectedLocations])

  const medicineList = React.useMemo(() => {
    if (selectedMedicines.length === 0) return MEDICINES
    return selectedMedicines
  }, [selectedMedicines])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Stock Status</CardTitle>
        <CardDescription>Current stock levels across locations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-3">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={filteredData}>
                <XAxis dataKey="location" />
                <YAxis />
                <Legend />
                {medicineList.map((medicine) => (
                  <Bar
                    key={medicine}
                    dataKey={medicine}
                    fill={medicineColors[medicine as keyof typeof medicineColors]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-8">
            {/* Location Section */}
            <div className="space-y-4">
              <h2 className="text-base font-medium">Location</h2>
              <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input 
                      type="text"
                      placeholder="Filter by location..."
                      className="pl-8"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup>
                        {LOCATIONS.filter(location => 
                          location.toLowerCase().includes(locationSearch.toLowerCase()) &&
                          !selectedLocations.includes(location)
                        ).map((location) => (
                          <CommandItem
                            key={location}
                            onSelect={() => addLocation(location)}
                          >
                            {location}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2">
                {selectedLocations.map((location) => (
                  <FilterBadge
                    key={location}
                    label={location}
                    onRemove={() => removeLocation(location)}
                  />
                ))}
              </div>
            </div>

            {/* Medicine Section */}
            <div className="space-y-4">
              <h2 className="text-base font-medium">Medicine</h2>
              <Popover open={medicineOpen} onOpenChange={setMedicineOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input 
                      type="text"
                      placeholder="Filter by medicine..."
                      className="pl-8"
                      value={medicineSearch}
                      onChange={(e) => setMedicineSearch(e.target.value)}
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup>
                        {MEDICINES.filter(medicine => 
                          medicine.toLowerCase().includes(medicineSearch.toLowerCase()) &&
                          !selectedMedicines.includes(medicine)
                        ).map((medicine) => (
                          <CommandItem
                            key={medicine}
                            onSelect={() => addMedicine(medicine)}
                          >
                            {medicine}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2">
                {selectedMedicines.map((medicine) => (
                  <FilterBadge
                    key={medicine}
                    label={medicine}
                    onRemove={() => removeMedicine(medicine)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

