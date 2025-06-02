"use server";

import prisma from "@/lib/prisma";

// Type definitions for better type safety
interface StokOpnameWhereClause {
  unitId: number;
  persediaanId?: {
    in: number[];
  };
  tanggalExpired?: {
    lt?: Date;
    gte?: Date;
    lte?: Date;
  };
}

export async function getUnitConditionDistribution(
  unitId: number,
  selectedMedicines?: number[]
) {
  try {
    // Build the query
    const whereClause: StokOpnameWhereClause = {
      unitId: unitId,
    };

    // Add medicine filter if provided
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      };
    }

    // Get total count of items in this unit
    const totalCount = await prisma.stokOpname.count({
      where: whereClause,
    });

    // Based on your schema, StokOpname doesn't have a 'kondisi' field
    // Instead, we'll calculate condition based on the damage fields
    
    // Count items by damage level
    const items = await prisma.stokOpname.findMany({
      where: whereClause,
      select: {
        rusakRingan: true,
        rusakBerat: true,
        jumlah: true,
        tanggalExpired: true,
      },
    });

    const currentDate = new Date();
    let goodCondition = 0;
    let minorDamage = 0;
    let majorDamage = 0;
    let expiredCount = 0;

    items.forEach(item => {
      const isExpired = item.tanggalExpired && item.tanggalExpired < currentDate;
      
      if (isExpired) {
        expiredCount++;
      } else if ((item.rusakBerat || 0) > 0) {
        majorDamage++;
      } else if ((item.rusakRingan || 0) > 0) {
        minorDamage++;
      } else {
        goodCondition++;
      }
    });

    // Calculate percentages
    const goodPercentage = totalCount > 0 ? (goodCondition / totalCount) * 100 : 0;
    const minorDamagePercentage = totalCount > 0 ? (minorDamage / totalCount) * 100 : 0;
    const majorDamagePercentage = totalCount > 0 ? (majorDamage / totalCount) * 100 : 0;
    const expiredPercentage = totalCount > 0 ? (expiredCount / totalCount) * 100 : 0;

    return {
      success: true,
      data: [
        { name: "Good", value: goodCondition, percentage: goodPercentage },
        {
          name: "Minor Damage",
          value: minorDamage,
          percentage: minorDamagePercentage,
        },
        {
          name: "Major Damage",
          value: majorDamage,
          percentage: majorDamagePercentage,
        },
        { name: "Expired", value: expiredCount, percentage: expiredPercentage },
      ],
    };
  } catch (error) {
    console.error("Error fetching unit condition distribution:", error);
    return {
      success: false,
      error: `Failed to fetch unit condition distribution: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      data: [],
    };
  }
}

export async function getUnitExpiryDistribution(
  unitId: number,
  selectedMedicines?: number[]
) {
  try {
    // Build the query
    const whereClause: StokOpnameWhereClause = {
      unitId: unitId,
    };

    // Add medicine filter if provided
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      };
    }

    // Get current date
    const currentDate = new Date();

    // Calculate date ranges
    const oneMonthFromNow = new Date(currentDate);
    oneMonthFromNow.setMonth(currentDate.getMonth() + 1);

    const threeMonthsFromNow = new Date(currentDate);
    threeMonthsFromNow.setMonth(currentDate.getMonth() + 3);

    const sixMonthsFromNow = new Date(currentDate);
    sixMonthsFromNow.setMonth(currentDate.getMonth() + 6);

    const twelveMonthsFromNow = new Date(currentDate);
    twelveMonthsFromNow.setMonth(currentDate.getMonth() + 12);

    // Count items in each expiry range
    const lessThanOneMonth = await prisma.stokOpname.count({
      where: {
        ...whereClause,
        tanggalExpired: {
          gte: currentDate,
          lt: oneMonthFromNow,
        },
      },
    });

    const oneToThreeMonths = await prisma.stokOpname.count({
      where: {
        ...whereClause,
        tanggalExpired: {
          gte: oneMonthFromNow,
          lt: threeMonthsFromNow,
        },
      },
    });

    const threeToSixMonths = await prisma.stokOpname.count({
      where: {
        ...whereClause,
        tanggalExpired: {
          gte: threeMonthsFromNow,
          lt: sixMonthsFromNow,
        },
      },
    });

    const sixToTwelveMonths = await prisma.stokOpname.count({
      where: {
        ...whereClause,
        tanggalExpired: {
          gte: sixMonthsFromNow,
          lt: twelveMonthsFromNow,
        },
      },
    });

    const moreThanTwelveMonths = await prisma.stokOpname.count({
      where: {
        ...whereClause,
        tanggalExpired: {
          gte: twelveMonthsFromNow,
        },
      },
    });

    // Calculate total
    const total =
      lessThanOneMonth +
      oneToThreeMonths +
      threeToSixMonths +
      sixToTwelveMonths +
      moreThanTwelveMonths;

    // Calculate percentages
    const lessThanOneMonthPercentage = total > 0 ? (lessThanOneMonth / total) * 100 : 0;
    const oneToThreeMonthsPercentage = total > 0 ? (oneToThreeMonths / total) * 100 : 0;
    const threeToSixMonthsPercentage = total > 0 ? (threeToSixMonths / total) * 100 : 0;
    const sixToTwelveMonthsPercentage = total > 0 ? (sixToTwelveMonths / total) * 100 : 0;
    const moreThanTwelveMonthsPercentage = total > 0 ? (moreThanTwelveMonths / total) * 100 : 0;

    return {
      success: true,
      data: [
        {
          name: "< 1 Month",
          value: lessThanOneMonth,
          percentage: lessThanOneMonthPercentage,
        },
        {
          name: "1-3 Months",
          value: oneToThreeMonths,
          percentage: oneToThreeMonthsPercentage,
        },
        {
          name: "3-6 Months",
          value: threeToSixMonths,
          percentage: threeToSixMonthsPercentage,
        },
        {
          name: "6-12 Months",
          value: sixToTwelveMonths,
          percentage: sixToTwelveMonthsPercentage,
        },
        {
          name: "> 12 Months",
          value: moreThanTwelveMonths,
          percentage: moreThanTwelveMonthsPercentage,
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching unit expiry distribution:", error);
    return {
      success: false,
      error: `Failed to fetch unit expiry distribution: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      data: [],
    };
  }
}

export async function getUnitTopReceivedItems(
  unitId: number,
  selectedMedicines?: number[]
) {
  try {
    // Get current date
    const currentDate = new Date();

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    // Build the query with join to Penerimaan to get the date
    const topReceivedItems = await prisma.rincianPenerimaan.groupBy({
      by: ["persediaanId"],
      where: {
        unitId: unitId,
        ...(selectedMedicines && selectedMedicines.length > 0
          ? { persediaanId: { in: selectedMedicines } }
          : {}),
        penerimaan: {
          tanggalPenerimaan: {
            gte: thirtyDaysAgo,
            lte: currentDate,
          },
        },
      },
      _sum: {
        jumlah: true,
      },
      orderBy: {
        _sum: {
          jumlah: "desc",
        },
      },
      take: 10,
    });

    // Get item details
    const itemDetails = await Promise.all(
      topReceivedItems.map(async (item) => {
        const persediaan = await prisma.persediaan.findUnique({
          where: {
            id: item.persediaanId,
          },
          select: {
            namaPersediaan: true,
            kodePersediaan: true,
          },
        });

        return {
          id: item.persediaanId,
          name: persediaan?.namaPersediaan || `Item ${item.persediaanId}`,
          code: persediaan?.kodePersediaan || `Code-${item.persediaanId}`,
          value: item._sum.jumlah || 0,
        };
      })
    );

    return {
      success: true,
      data: itemDetails,
    };
  } catch (error) {
    console.error("Error fetching unit top received items:", error);
    return {
      success: false,
      error: `Failed to fetch unit top received items: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      data: [],
    };
  }
}

export async function getUnitTopDispensedItems(
  unitId: number,
  selectedMedicines?: number[]
) {
  try {
    // Get current date
    const currentDate = new Date();

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    // Build the query with join to Pengeluaran to get the date
    const topDispensedItems = await prisma.rincianPengeluaran.groupBy({
      by: ["persediaanId"],
      where: {
        pengeluaran: {
          unitId: unitId,
          tanggalSah: {
            gte: thirtyDaysAgo,
            lte: currentDate,
          },
        },
        ...(selectedMedicines && selectedMedicines.length > 0
          ? { persediaanId: { in: selectedMedicines } }
          : {}),
      },
      _sum: {
        banyak: true,
      },
      orderBy: {
        _sum: {
          banyak: "desc",
        },
      },
      take: 10,
    });

    // Get item details
    const itemDetails = await Promise.all(
      topDispensedItems.map(async (item) => {
        const persediaan = await prisma.persediaan.findUnique({
          where: {
            id: item.persediaanId,
          },
          select: {
            namaPersediaan: true,
            kodePersediaan: true,
          },
        });

        return {
          id: item.persediaanId,
          name: persediaan?.namaPersediaan || `Item ${item.persediaanId}`,
          code: persediaan?.kodePersediaan || `Code-${item.persediaanId}`,
          value: item._sum.banyak || 0,
        };
      })
    );

    return {
      success: true,
      data: itemDetails,
    };
  } catch (error) {
    console.error("Error fetching unit top dispensed items:", error);
    return {
      success: false,
      error: `Failed to fetch unit top dispensed items: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      data: [],
    };
  }
}

export async function getUnitTopItemsByQuantity(
  unitId: number,
  selectedMedicines?: number[]
) {
  try {
    // Build the query
    const whereClause: StokOpnameWhereClause = {
      unitId: unitId,
    };

    // Add medicine filter if provided
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      };
    }

    // Get top items by quantity
    const topItems = await prisma.stokOpname.findMany({
      where: whereClause,
      include: {
        persediaan: {
          select: {
            id: true,
            namaPersediaan: true,
            kodePersediaan: true,
          },
        },
        satuan: {
          select: {
            satuan: true,
          },
        },
      },
      orderBy: {
        jumlah: "desc",
      },
      take: 10,
    });

    // Get current date
    const currentDate = new Date();

    // Calculate date 1 year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(currentDate.getFullYear() + 1);

    // Format the data
    const result = topItems.map((item) => {
      const isLowStock = (item.jumlah || 0) < 100;
      const isExpiringSoon =
        item.tanggalExpired &&
        item.tanggalExpired > currentDate &&
        item.tanggalExpired <= oneYearFromNow;

      let status = "Available";
      if (isLowStock && isExpiringSoon) {
        status = "Low Stock & Expiring Soon";
      } else if (isLowStock) {
        status = "Low Stock";
      } else if (isExpiringSoon) {
        status = "Expiring Soon";
      }

      return {
        id: item.persediaan.id,
        name: item.persediaan.namaPersediaan,
        code: item.persediaan.kodePersediaan,
        stock: item.jumlah || 0,
        unit: item.satuan?.satuan || "Unit",
        expiryDate: item.tanggalExpired,
        status: status,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching unit top items by quantity:", error);
    return {
      success: false,
      error: `Failed to fetch unit top items by quantity: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      data: [],
    };
  }
}

export async function getUnitLowStockItems(
  unitId: number,
  selectedMedicines?: number[]
) {
  try {
    // Build the query
    const whereClause: StokOpnameWhereClause = {
      unitId: unitId,
    };

    // Add medicine filter if provided
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      };
    }

    // Get all medicines in this unit
    const medicines = await prisma.stokOpname.findMany({
      where: whereClause,
      include: {
        persediaan: {
          select: {
            id: true,
            namaPersediaan: true,
            kodePersediaan: true,
          },
        },
        satuan: {
          select: {
            satuan: true,
          },
        },
      },
    });

    // Get current date
    const currentDate = new Date();

    // Calculate date 1 year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(currentDate.getFullYear() + 1);

    // Filter to only include medicines with low stock (under 100)
    const lowStockMedicines = medicines.filter((medicine) => {
      // Simplified threshold - always 100 units regardless of type
      return (medicine.jumlah || 0) < 100;
    });

    // Format the data
    const result = lowStockMedicines.map((medicine) => {
      // Check if medicine is also expiring soon
      const isExpiringSoon =
        medicine.tanggalExpired &&
        medicine.tanggalExpired > currentDate &&
        medicine.tanggalExpired <= oneYearFromNow;

      return {
        id: medicine.persediaan.id,
        name: medicine.persediaan.namaPersediaan,
        code: medicine.persediaan.kodePersediaan,
        currentStock: medicine.jumlah || 0,
        unit: medicine.satuan?.satuan || "Unit",
        minimumThreshold: 100, // Fixed threshold
        expiryDate: medicine.tanggalExpired,
        status: isExpiringSoon ? "Low Stock & Expiring Soon" : "Low Stock",
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching low stock items:", error);
    return {
      success: false,
      error: `Failed to fetch low stock items: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      data: [],
    };
  }
}

export async function getUnitMetrics(
  unitId: number | string,
  selectedMedicines?: number[]
) {
  try {
    // Convert unitId to number if it's a string
    const numericUnitId =
      typeof unitId === "string" ? Number.parseInt(unitId, 10) : unitId;

    if (isNaN(numericUnitId)) {
      console.error("Invalid unit ID:", unitId);
      return {
        success: false,
        error: "Invalid unit ID",
        data: {
          totalInventory: { value: 0, change: 0 },
          totalReceipts: { value: 0, change: 0 },
          totalDispensed: { value: 0, change: 0 },
          expiredMedicines: { value: 0, change: 0 },
        },
      };
    }

    // Get current date
    const currentDate = new Date();

    // Get first day of current month
    const firstDayCurrentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    // Get last day of current month
    const lastDayCurrentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    // Get first day of previous month
    const firstDayPreviousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );

    // Get last day of previous month
    const lastDayPreviousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0
    );

    // Calculate date 90 days from now for expiring medicines
    const ninetyDaysFromNow = new Date(currentDate);
    ninetyDaysFromNow.setDate(currentDate.getDate() + 90);

    // Calculate date 90 days from the first day of previous month
    const ninetyDaysFromPreviousMonth = new Date(firstDayPreviousMonth);
    ninetyDaysFromPreviousMonth.setDate(firstDayPreviousMonth.getDate() + 90);

    // Build the base where clause for filtering by selected medicines
    const medicineFilter =
      selectedMedicines && selectedMedicines.length > 0
        ? { persediaanId: { in: selectedMedicines } }
        : {};

    // 1. TOTAL INVENTORY
    // Get current total inventory for this unit
    const currentInventoryResult = await prisma.stokOpname.aggregate({
      where: {
        unitId: numericUnitId,
        ...medicineFilter,
      },
      _sum: {
        jumlah: true,
      },
    });

    const totalInventory = currentInventoryResult._sum.jumlah || 0;

    // For inventory change, we need to compare with last month's data
    // Since we don't have historical inventory data, we'll compare with receipts and dispensed
    // Get items received in the current month
    const currentMonthReceiptsResult = await prisma.rincianPenerimaan.aggregate(
      {
        where: {
          unitId: numericUnitId,
          penerimaan: {
            tanggalPenerimaan: {
              gte: firstDayCurrentMonth,
              lte: lastDayCurrentMonth,
            },
          },
          ...medicineFilter,
        },
        _sum: {
          jumlah: true,
        },
      }
    );

    // Get items dispensed in the current month
    const currentMonthDispensedResult =
      await prisma.rincianPengeluaran.aggregate({
        where: {
          pengeluaran: {
            unitId: numericUnitId,
            tanggalSah: {
              gte: firstDayCurrentMonth,
              lte: lastDayCurrentMonth,
            },
          },
          ...medicineFilter,
        },
        _sum: {
          banyak: true,
        },
      });

    // Get items received in the previous month
    const previousMonthReceiptsResult =
      await prisma.rincianPenerimaan.aggregate({
        where: {
          unitId: numericUnitId,
          penerimaan: {
            tanggalPenerimaan: {
              gte: firstDayPreviousMonth,
              lte: lastDayPreviousMonth,
            },
          },
          ...medicineFilter,
        },
        _sum: {
          jumlah: true,
        },
      });

    // Get items dispensed in the previous month
    const previousMonthDispensedResult =
      await prisma.rincianPengeluaran.aggregate({
        where: {
          pengeluaran: {
            unitId: numericUnitId,
            tanggalSah: {
              gte: firstDayPreviousMonth,
              lte: lastDayPreviousMonth,
            },
          },
          ...medicineFilter,
        },
        _sum: {
          banyak: true,
        },
      });

    // Calculate net change in inventory
    const currentMonthNetChange =
      (currentMonthReceiptsResult._sum.jumlah || 0) -
      (currentMonthDispensedResult._sum.banyak || 0);
    const previousMonthNetChange =
      (previousMonthReceiptsResult._sum.jumlah || 0) -
      (previousMonthDispensedResult._sum.banyak || 0);

    // Calculate inventory change percentage
    let inventoryChange = 0;
    if (previousMonthNetChange !== 0) {
      inventoryChange =
        ((currentMonthNetChange - previousMonthNetChange) /
          Math.abs(previousMonthNetChange)) *
        100;
    } else if (currentMonthNetChange !== 0) {
      // If previous month had no change but current month does, set to 100% increase
      inventoryChange = 100;
    }

    // 2. RECEIVED ITEMS (Current Month)
    // Get items received in the current month
    const totalReceipts = currentMonthReceiptsResult._sum.jumlah || 0;
    const previousReceipts = previousMonthReceiptsResult._sum.jumlah || 0;

    // Calculate receipts change percentage
    let receiptsChange = 0;
    if (previousReceipts !== 0) {
      receiptsChange =
        ((totalReceipts - previousReceipts) / previousReceipts) * 100;
    } else if (totalReceipts > 0) {
      // If previous month had no receipts but current month does, set to 100% increase
      receiptsChange = 100;
    }

    // 3. DISPENSED ITEMS (Current Month)
    // Get items dispensed in the current month
    const totalDispensed = currentMonthDispensedResult._sum.banyak || 0;
    const previousDispensed = previousMonthDispensedResult._sum.banyak || 0;

    // Calculate dispensed change percentage
    let dispensedChange = 0;
    if (previousDispensed !== 0) {
      dispensedChange =
        ((totalDispensed - previousDispensed) / previousDispensed) * 100;
    } else if (totalDispensed > 0) {
      // If previous month had no dispensed but current month does, set to 100% increase
      dispensedChange = 100;
    }

    // 4. EXPIRING MEDICINES (Within 90 days)
    // Get medicines expiring within 90 days
    const expiringMedicinesResult = await prisma.stokOpname.aggregate({
      where: {
        unitId: numericUnitId,
        tanggalExpired: {
          gte: currentDate,
          lte: ninetyDaysFromNow,
        },
        ...medicineFilter,
      },
      _sum: {
        jumlah: true,
      },
    });

    // Get medicines that were expiring within 90 days as of the beginning of the previous month
    const previousExpiringMedicinesResult = await prisma.stokOpname.aggregate({
      where: {
        unitId: numericUnitId,
        tanggalExpired: {
          gte: firstDayPreviousMonth,
          lte: ninetyDaysFromPreviousMonth,
        },
        ...medicineFilter,
      },
      _sum: {
        jumlah: true,
      },
    });

    const totalExpiringMedicines = expiringMedicinesResult._sum.jumlah || 0;
    const previousExpiringMedicines =
      previousExpiringMedicinesResult._sum.jumlah || 0;

    // Calculate expiring medicines change percentage
    let expiringMedicinesChange = 0;
    if (previousExpiringMedicines !== 0) {
      expiringMedicinesChange =
        ((totalExpiringMedicines - previousExpiringMedicines) /
          previousExpiringMedicines) *
        100;
    } else if (totalExpiringMedicines > 0) {
      // If previous month had no expiring medicines but current month does, set to 100% increase
      expiringMedicinesChange = 100;
    }

    console.log("Metrics results:", {
      totalInventory,
      inventoryChange,
      totalReceipts,
      receiptsChange,
      totalDispensed,
      dispensedChange,
      totalExpiringMedicines,
      expiringMedicinesChange,
    });

    return {
      success: true,
      data: {
        totalInventory: {
          value: totalInventory,
          change: parseFloat(inventoryChange.toFixed(1)),
        },
        totalReceipts: {
          value: totalReceipts,
          change: parseFloat(receiptsChange.toFixed(1)),
        },
        totalDispensed: {
          value: totalDispensed,
          change: parseFloat(dispensedChange.toFixed(1)),
        },
        expiredMedicines: {
          value: totalExpiringMedicines,
          change: parseFloat(expiringMedicinesChange.toFixed(1)),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return {
      success: false,
      error: `Failed to fetch metrics: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      data: {
        totalInventory: { value: 0, change: 0 },
        totalReceipts: { value: 0, change: 0 },
        totalDispensed: { value: 0, change: 0 },
        expiredMedicines: { value: 0, change: 0 },
      },
    };
  }
}

export async function getUnitInventorySummary(
  unitId: number,
  selectedMedicines?: number[]
) {
  try {
    console.log(`Getting inventory summary for unit ${unitId}`, {
      selectedMedicines,
    });

    // Build the query with proper unit filtering
    const whereClause: StokOpnameWhereClause = {
      unitId: unitId,
    };

    // Add medicine filter if provided
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      };
    }

    // Get current date
    const currentDate = new Date();
    console.log("Current date:", currentDate);

    // Count unique medicines in this unit
    const uniqueMedicines = await prisma.stokOpname.findMany({
      where: whereClause,
      distinct: ["persediaanId"],
      select: {
        persediaanId: true,
      },
    });

    console.log(`Found ${uniqueMedicines.length} unique medicines`);

    // Get total inventory for this specific unit
    const totalInventory = await prisma.stokOpname.aggregate({
      _sum: {
        jumlah: true,
      },
      where: whereClause,
    });
    console.log("Total inventory:", totalInventory._sum.jumlah);

    // Get damaged items for this specific unit
    const damagedItems = await prisma.stokOpname.aggregate({
      _sum: {
        rusakRingan: true,
        rusakBerat: true,
      },
      where: whereClause,
    });

    // Calculate total damaged (sum of minor and major damage)
    const totalDamaged =
      (damagedItems._sum.rusakRingan || 0) +
      (damagedItems._sum.rusakBerat || 0);
    console.log("Damaged items:", totalDamaged);

    // Get expired items for this specific unit
    const expiredItems = await prisma.stokOpname.aggregate({
      _sum: {
        jumlah: true,
      },
      where: {
        ...whereClause,
        tanggalExpired: {
          lt: currentDate,
        },
      },
    });
    console.log("Expired items:", expiredItems._sum.jumlah || 0);

    // Get lost/missing items for this specific unit
    const lostItems = await prisma.stokOpname.aggregate({
      _sum: {
        hilang: true,
      },
      where: whereClause,
    });
    console.log("Lost items:", lostItems._sum.hilang || 0);

    // Calculate available items correctly:
    // Available = Total - (Damaged + Expired + Lost)
    const totalInventoryValue = totalInventory._sum.jumlah || 0;
    const expiredItemsValue = expiredItems._sum.jumlah || 0;
    const lostItemsValue = lostItems._sum.hilang || 0;

    // Important: We need to calculate available properly
    // Available items should be those that are not damaged, expired, or lost
    const availableItems = Math.max(
      0,
      totalInventoryValue - totalDamaged - expiredItemsValue - lostItemsValue
    );
    console.log("Available items:", availableItems);

    // Calculate total damaged or expired (for display purposes)
    const totalDamagedOrExpired = totalDamaged + expiredItemsValue;
    console.log("Total damaged or expired:", totalDamagedOrExpired);

    const result = {
      success: true,
      data: {
        uniqueMedicines: uniqueMedicines.length,
        available: availableItems,
        damagedOrExpired: totalDamagedOrExpired,
      },
    };

    console.log("Returning inventory summary:", result);
    return result;
  } catch (error) {
    console.error("Error fetching unit inventory summary:", error);
    return {
      success: false,
      error: `Failed to fetch unit inventory summary: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      data: {
        uniqueMedicines: 0,
        available: 0,
        damagedOrExpired: 0,
      },
    };
  }
}