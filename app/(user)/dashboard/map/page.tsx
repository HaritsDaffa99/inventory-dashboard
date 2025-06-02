import MapPage from "@/components/map/MapPage"
import { getUnitsForMap } from "@/lib/actions/map"

export default async function MapLayout() {
  // Fetch units with coordinates for the map
  const unitsResponse = await getUnitsForMap()
  const units = unitsResponse.success ? unitsResponse.data : []

  return (
    <div className="p-4">
      <MapPage units={units || []} />
    </div>
  )
}
