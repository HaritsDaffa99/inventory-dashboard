"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// Get all units with coordinates for the map
export async function getUnitsForMap() {
  try {
    const units = await prisma.unit.findMany({
      where: {
        temp: false, // Only get active units
      },
      orderBy: {
        namaUnit: "asc",
      },
    })

    return {
      success: true,
      data: units,
    }
  } catch (error) {
    console.error("Error fetching units for map:", error)
    return {
      success: false,
      error: `Failed to fetch units: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// Get stock opname data for a specific unit
export async function getUnitStockOpname(unitId: number, page: number = 1, pageSize: number = 10, search?: string, filter?: string) {
  try {
    // Check if we should fetch all items (special case for alerts tab)
    const fetchAll = pageSize === -1;
    
    // Build the where clause using Prisma types
    let whereClause: Prisma.StokOpnameWhereInput = {
      unitId: unitId,
    };
    
    // Add search filter if provided
    if (search && search.trim() !== '') {
      whereClause = {
        ...whereClause,
        OR: [
          {
            persediaan: {
              namaPersediaan: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            nusp: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            persediaan: {
              tipe: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      };
    }
    
    // Add specific filters if provided
    if (filter && filter !== 'all') {
      const currentDate = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(currentDate.getFullYear() + 1);
      
      switch (filter) {
        case 'expired':
          whereClause = {
            ...whereClause,
            tanggalExpired: {
              lte: currentDate,
            },
          };
          break;
        case 'nearExpiry':
          whereClause = {
            ...whereClause,
            tanggalExpired: {
              gt: currentDate,
              lte: oneYearFromNow,
            },
          };
          break;
        case 'damaged':
          whereClause = {
            ...whereClause,
            OR: [
              { rusakRingan: { gt: 0 } },
              { rusakBerat: { gt: 0 } },
              { usang: { gt: 0 } },
              { hilang: { gt: 0 } },
            ],
          };
          break;
        case 'low':
          whereClause = {
            ...whereClause,
            jumlah: {
              lt: 100, // Low stock threshold
            },
          };
          break;
      }
    }

    // Determine the order by clause based on filter using Prisma types
    let orderBy: Prisma.StokOpnameOrderByWithRelationInput = {
      persediaan: {
        namaPersediaan: 'asc',
      },
    };
    
    if (filter) {
      switch (filter) {
        case 'expiryAsc':
          orderBy = {
            tanggalExpired: 'asc',
          };
          break;
        case 'expiryDesc':
          orderBy = {
            tanggalExpired: 'desc',
          };
          break;
        case 'quantityAsc':
          orderBy = {
            jumlah: 'asc',
          };
          break;
        case 'quantityDesc':
          orderBy = {
            jumlah: 'desc',
          };
          break;
      }
    }

    // Get total count for pagination info
    const totalCount = await prisma.stokOpname.count({
      where: whereClause,
    });

    // Get paginated data or all data
    const stockData = await prisma.stokOpname.findMany({
      where: whereClause,
      include: {
        persediaan: {
          select: {
            namaPersediaan: true,
            kodePersediaan: true,
            tipe: true,
          },
        },
        satuan: {
          select: {
            satuan: true,
          },
        },
      },
      orderBy: orderBy,
      // Skip pagination when fetchAll is true
      skip: fetchAll ? 0 : (page - 1) * pageSize,
      // Don't limit results when fetchAll is true
      take: fetchAll ? undefined : pageSize,
    });

    return {
      success: true,
      data: stockData,
      pagination: {
        totalItems: totalCount,
        totalPages: fetchAll ? 1 : Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize: pageSize
      }
    };
  } catch (error) {
    console.error("Error fetching unit stock opname:", error);
    return {
      success: false,
      error: `Failed to fetch stock data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Get units with critical inventory status
export async function getUnitsWithCriticalInventory() {
  try {
    // Find units with items that are expired, near expiry, or low in stock
    const currentDate = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30)

    const criticalUnits = await prisma.stokOpname.findMany({
      where: {
        OR: [
          // Expired items
          {
            tanggalExpired: {
              lte: currentDate,
            },
          },
          // Near expiry items
          {
            tanggalExpired: {
              gt: currentDate,
              lte: thirtyDaysFromNow,
            },
          },
          // Low stock items
          {
            jumlah: {
              lt: 10, // Arbitrary threshold
            },
          },
          // Damaged items
          {
            OR: [{ rusakRingan: { gt: 0 } }, { rusakBerat: { gt: 0 } }, { usang: { gt: 0 } }, { hilang: { gt: 0 } }],
          },
        ],
      },
      select: {
        unitId: true,
      },
      distinct: ["unitId"],
    })

    const unitIds = criticalUnits.map((item) => item.unitId)

    return {
      success: true,
      data: unitIds,
    }
  } catch (error) {
    console.error("Error fetching critical units:", error)
    return {
      success: false,
      error: `Failed to fetch critical units: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}