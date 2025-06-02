import { UnitDetailPage } from "@/components/unit/unit-detail-page"
import { notFound } from "next/navigation"
import { getUnitById } from "@/lib/actions/unit"

interface UnitPageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function UnitPage({ params }: UnitPageProps) {
  try {
    // Await the params Promise to get the actual values
    const { id } = await params
    
    // Convert the id to a number
    const unitId = Number.parseInt(id, 10)

    // If the id is not a valid number, return 404
    if (isNaN(unitId)) {
      notFound()
    }

    // Fetch unit data
    const unitResponse = await getUnitById(unitId)

    // If unit not found, return 404
    if (!unitResponse.success || !unitResponse.data) {
      notFound()
    }

    return <UnitDetailPage unit={unitResponse.data} />
  } catch (error) {
    console.error("Error in unit page:", error)
    notFound()
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: UnitPageProps) {
  try {
    const { id } = await params
    const unitId = Number.parseInt(id, 10)
    
    if (isNaN(unitId)) {
      return {
        title: 'Unit Not Found - Medicine Dashboard',
        description: 'The requested unit could not be found.',
      }
    }

    // Optionally fetch unit data for more specific metadata
    const unitResponse = await getUnitById(unitId)
    
    if (unitResponse.success && unitResponse.data) {
      return {
        title: `${unitResponse.data.namaUnit} - Unit Dashboard`,
        description: `Inventory management dashboard for ${unitResponse.data.namaUnit} (${unitResponse.data.kodeUnit}). View stock levels, expiry dates, and dispensing history.`,
        keywords: ['medicine', 'inventory', 'unit', 'dashboard', 'healthcare', unitResponse.data.namaUnit],
      }
    }

    return {
      title: `Unit ${id} Dashboard - Medicine Inventory`,
      description: `Inventory management dashboard for medical unit ${id}. View stock levels, expiry dates, and dispensing history.`,
      keywords: ['medicine', 'inventory', 'unit', 'dashboard', 'healthcare'],
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: 'Unit Dashboard - Medicine Inventory',
      description: 'Inventory management dashboard for medical units.',
    }
  }
}

// Generate static params for known units (optional)
export async function generateStaticParams() {
  // You can fetch unit IDs from your database here if you want to pre-generate pages
  // For now, returning empty array means all params will be generated dynamically
  return []
  
  // If you want to pre-generate specific unit pages, you could fetch from your database:
  // try {
  //   const units = await getAllUnits() // You'd need to create this function
  //   return units.map((unit) => ({
  //     id: unit.id.toString()
  //   }))
  // } catch (error) {
  //   console.error("Error generating static params:", error)
  //   return []
  // }
}

// Optional: Configure the page behavior
export const dynamic = 'force-dynamic' // Always server-render for fresh data
export const revalidate = 0 // Don't cache the page