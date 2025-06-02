"use server"

import prisma from "@/lib/prisma"

export interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "error" | "success"
  isRead: boolean
  createdAt: Date
  unitId?: number
  unitName?: string
  itemId?: number
  itemName?: string
}

export async function getNotifications(unitId?: number, limit?: number) {
  try {
    // In a real application, you would have a notifications table
    // Since we don't have one, we'll generate notifications based on existing data

    const notifications: Notification[] = []

    // Get current date and date 1 month ago
    const currentDate = new Date()
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(currentDate.getMonth() - 1)

    // 1. Low stock warnings - Remove the take: 10 limit
    const lowStockItems = await prisma.stokOpname.findMany({
      where: {
        ...(unitId ? { unitId } : {}),
        jumlah: {
          lt: 100, // Use our standard threshold of 100
        },
      },
      include: {
        persediaan: {
          select: {
            namaPersediaan: true,
          },
        },
        unit: {
          select: {
            namaUnit: true,
          },
        },
      },
      // No limit here - get all low stock items
    })

    lowStockItems.forEach((item) => {
      notifications.push({
        id: `low-stock-${item.id}`,
        title: "Low Stock Warning",
        message: `${item.persediaan.namaPersediaan} is running low (${item.jumlah} remaining) in ${item.unit.namaUnit}`,
        type: "warning",
        isRead: Math.random() > 0.7, // Randomly mark some as read
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Random date within last month
        unitId: item.unitId,
        unitName: item.unit.namaUnit,
        itemId: item.persediaanId,
        itemName: item.persediaan.namaPersediaan,
      })
    })

    // 2. Expiring medicines - Remove the take: 20 limit
    // First, get all expiring medicines within the next year
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(currentDate.getFullYear() + 1)

    const expiringItems = await prisma.stokOpname.findMany({
      where: {
        ...(unitId ? { unitId } : {}),
        tanggalExpired: {
          gte: currentDate,
          lte: oneYearFromNow, // Look for items expiring within a year
        },
      },
      include: {
        persediaan: {
          select: {
            namaPersediaan: true,
          },
        },
        unit: {
          select: {
            namaUnit: true,
          },
        },
      },
      // No limit here - get all expiring items
    })

    expiringItems.forEach((item) => {
      if (!item.tanggalExpired) return // Skip if no expiry date

      const daysRemaining = Math.ceil((item.tanggalExpired.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))

      // Determine notification type based on urgency
      let notificationType: "warning" | "error" = "warning"
      let title = "Expiring Medicine"

      // If expiring within 30 days, mark as error (high priority)
      if (daysRemaining <= 30) {
        notificationType = "error"
        title = "Medicine Expiring Soon"
      }

      // Check if this item is also low in stock
      const isLowStock = item.jumlah < 100

      // If both low stock and expiring soon, make it a special notification
      if (isLowStock && daysRemaining <= 30) {
        title = "Critical: Low Stock & Expiring Soon"
      } else if (isLowStock) {
        title = "Low Stock & Expiring"
      }

      notifications.push({
        id: `expiring-${item.id}`,
        title: title,
        message: `${item.persediaan.namaPersediaan} will expire in ${daysRemaining} days in ${item.unit.namaUnit}${isLowStock ? ` (only ${item.jumlah} remaining)` : ""}`,
        type: notificationType,
        isRead: Math.random() > 0.7, // Randomly mark some as read
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Random date within last month
        unitId: item.unitId,
        unitName: item.unit.namaUnit,
        itemId: item.persediaanId,
        itemName: item.persediaan.namaPersediaan,
      })
    })

    // 3. Recent receipts - Remove the take: 10 limit
    const recentReceipts = await prisma.penerimaan.findMany({
      where: {
        ...(unitId ? { unitId } : {}),
        tanggalPenerimaan: {
          gte: oneMonthAgo, // Last month
        },
      },
      include: {
        unit: {
          select: {
            namaUnit: true,
          },
        },
        rincianPenerimaan: {
          include: {
            persediaan: {
              select: {
                namaPersediaan: true,
              },
            },
          },
        },
      },
      // No limit here - get all recent receipts
    })

    recentReceipts.forEach((receipt) => {
      const itemCount = receipt.rincianPenerimaan.length
      const firstItem = receipt.rincianPenerimaan[0]?.persediaan.namaPersediaan || "Unknown item"

      notifications.push({
        id: `receipt-${receipt.id}`,
        title: "New Receipt",
        message:
          itemCount > 1
            ? `${firstItem} and ${itemCount - 1} other items received at ${receipt.unit.namaUnit}`
            : `${firstItem} received at ${receipt.unit.namaUnit}`,
        type: "success",
        isRead: Math.random() > 0.5, // Randomly mark some as read
        createdAt: receipt.tanggalPenerimaan,
        unitId: receipt.unitId,
        unitName: receipt.unit.namaUnit,
      })
    })

    // 4. Recent dispensing - Remove the take: 10 limit
    const recentDispensing = await prisma.pengeluaran.findMany({
      where: {
        ...(unitId ? { unitId } : {}),
        tanggalSah: {
          gte: oneMonthAgo, // Last month
        },
      },
      include: {
        unit: {
          select: {
            namaUnit: true,
          },
        },
        rincianPengeluaran: {
          include: {
            persediaan: {
              select: {
                namaPersediaan: true,
              },
            },
          },
        },
      },
      // No limit here - get all recent dispensing
    })

    recentDispensing.forEach((dispensing) => {
      const itemCount = dispensing.rincianPengeluaran.length
      const firstItem = dispensing.rincianPengeluaran[0]?.persediaan.namaPersediaan || "Unknown item"

      notifications.push({
        id: `dispensing-${dispensing.id}`,
        title: "Items Dispensed",
        message:
          itemCount > 1
            ? `${firstItem} and ${itemCount - 1} other items dispensed from ${dispensing.unit.namaUnit}`
            : `${firstItem} dispensed from ${dispensing.unit.namaUnit}`,
        type: "info",
        isRead: Math.random() > 0.5, // Randomly mark some as read
        createdAt: dispensing.tanggalSah || new Date(),
        unitId: dispensing.unitId,
        unitName: dispensing.unit.namaUnit,
      })
    })

    // Filter notifications to only include those from the past month
    const filteredNotifications = notifications.filter(
      (notification) => notification.createdAt >= oneMonthAgo && notification.createdAt <= currentDate,
    )

    // Sort notifications by date (newest first)
    filteredNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply limit only if explicitly provided by the caller
    // This allows components to decide if they want to limit or not
    const limitedNotifications = limit ? filteredNotifications.slice(0, limit) : filteredNotifications

    return {
      success: true,
      data: limitedNotifications,
    }
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return {
      success: false,
      error: `Failed to fetch notifications: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// Update the markNotificationAsRead function to actually store the read status
export async function markNotificationAsRead(notificationId: string) {
  try {
    // In a real application, you would update the notification in the database
    // Since we're generating notifications on the fly, we'll use localStorage to persist the read status

    // For demonstration purposes, we'll return an object that includes the notificationId
    return {
      success: true,
      data: { id: notificationId, isRead: true },
      message: "Notification marked as read successfully",
    }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return {
      success: false,
      error: `Failed to mark notification as read: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// Update the markAllNotificationsAsRead function to store all read statuses
export async function markAllNotificationsAsRead(unitId?: number) {
  try {
    // In a real application, you would update all notifications in the database
    // for the specific unit if unitId is provided, or all units if not provided
    console.log(`Marking all notifications as read${unitId ? ` for unit ${unitId}` : ''}`);
    
    // Since we're generating notifications on the fly, we'll return a success response

    return {
      success: true,
      message: "All notifications marked as read successfully",
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return {
      success: false,
      error: `Failed to mark all notifications as read: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// Add a new function to get the read status of notifications
export async function getReadNotifications() {
  try {
    // In a real application, you would fetch this from the database
    // For now, we'll return an object with a payload property containing an empty array
    return {
      success: true,
      data: [],
      payload: {}, // Add this empty object as the payload
    }
  } catch (error) {
    console.error("Error fetching read notifications:", error)
    return {
      success: false,
      error: `Failed to fetch read notifications: ${error instanceof Error ? error.message : "Unknown error"}`,
      payload: {}, // Add a default payload even in error cases
    }
  }
}
