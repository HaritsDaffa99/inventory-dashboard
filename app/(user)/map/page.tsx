"use client";

import { useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { LatLngExpression, Icon } from "leaflet";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Fix Leaflet default icon
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const defaultIcon = new Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconSize: [30, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -45],
});

const criticalIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [30, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -45],
});

// Define marker locations
const markerPositions: LatLngExpression[] = [
  [-6.2088, 106.8456],
  [-6.2000, 106.8400],
  [-6.2100, 106.8500],
];

const markerNames = [
  "Distribution Center A",
  "Distribution Center B",
  "Distribution Center C",
];

// Custom marker component
function CustomMarker({ 
  position, 
  name,
  isCritical, 
  onClick 
}: { 
  position: LatLngExpression; 
  name: string;
  isCritical: boolean; 
  onClick: () => void;
}) {
  const map = useMap();
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      click: () => {
        onClick();
        map.setView(position, map.getZoom());
      },
    }),
    [map, onClick, position]
  );

  return (
    <Marker
      position={position}
      icon={isCritical ? criticalIcon : defaultIcon}
      eventHandlers={eventHandlers}
      ref={markerRef}
    >
      <Popup>
        <b>{name}</b>
        <br />
        Medicine Distribution Center
      </Popup>
    </Marker>
  );
}

// Dummy Medicine Data
const medicines = [
  {
    name: "Paracetamol",
    type: "Tablet",
    quantity: 100,
    status: "Incoming",
    stockStatus: "Normal",
    batch: "Batch 1",
    expiry: "2025-01-01",
  },
  {
    name: "Amoxicillin",
    type: "Capsule",
    quantity: 20,
    status: "Outgoing",
    stockStatus: "Low Stock",
    batch: "Batch 2",
    expiry: "2024-09-15",
  },
  {
    name: "Ibuprofen",
    type: "Tablet",
    quantity: 150,
    status: "Incoming",
    stockStatus: "Normal",
    batch: "Batch 3",
    expiry: "2025-03-20",
  },
];

export default function MapPage() {
  const [entries, setEntries] = useState<string>("10");
  const [filterBy, setFilterBy] = useState<string>("");
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [criticalMarkers, setCriticalMarkers] = useState<boolean[]>(new Array(markerPositions.length).fill(false));

  const handleMarkerClick = (index: number) => {
    setSelectedMarker(index);
  };

  const handleHighlightCritical = () => {
    if (selectedMarker !== null) {
      setCriticalMarkers(prev => {
        const newCriticalMarkers = [...prev];
        newCriticalMarkers[selectedMarker] = !newCriticalMarkers[selectedMarker];
        return newCriticalMarkers;
      });
    }
  };

  return (
    <div className="p-8">
      {/* Map Section */}
      <div className="rounded-lg border bg-white">
        <MapContainer
          center={[-6.2088, 106.8456] as LatLngExpression}
          zoom={13}
          className="h-[400px] w-full rounded-lg"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {markerPositions.map((position, index) => (
            <CustomMarker
              key={index}
              position={position}
              name={markerNames[index]}
              isCritical={criticalMarkers[index]}
              onClick={() => handleMarkerClick(index)}
            />
          ))}
        </MapContainer>
      </div>

      {/* Controls and Table Section */}
      <div className="mt-8 space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Show Entries Dropdown */}
            <span className="font-bold text-gray-700">Show</span>
            <Select value={entries} onValueChange={setEntries}>
              <SelectTrigger className="w-16">
                <SelectValue>{entries}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="font-bold text-gray-700">entries</span>

            {/* Filter Dropdown */}
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-60 ml-6">
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expiry">Expiry Date</SelectItem>
                <SelectItem value="incoming">
                  Transaction Status: Incoming
                </SelectItem>
                <SelectItem value="outgoing">
                  Transaction Status: Outgoing
                </SelectItem>
                <SelectItem value="quantityLowToHigh">
                  Quantity: Low to High
                </SelectItem>
                <SelectItem value="quantityHighToLow">
                  Quantity: High to Low
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            {/* Highlight Critical Button */}
            <Button 
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={handleHighlightCritical}
              disabled={selectedMarker === null}
            >
              Highlight Critical
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Medicine Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Transaction Status</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead>Delivery Batch</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((medicine, index) => (
                <TableRow key={index}>
                  <TableCell>{medicine.name}</TableCell>
                  <TableCell>{medicine.type}</TableCell>
                  <TableCell>{medicine.quantity}</TableCell>
                  <TableCell>{medicine.status}</TableCell>
                  <TableCell>{medicine.stockStatus}</TableCell>
                  <TableCell>{medicine.batch}</TableCell>
                  <TableCell>{medicine.expiry}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

