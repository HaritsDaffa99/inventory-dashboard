"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, AlertTriangle } from "lucide-react"
import { getNotifications, markNotificationAsRead, type Notification } from "@/lib/actions/notification"
import { cn } from "@/lib/utils"
import { getNotificationStore } from "@/lib/notification-store"
import { Pagination } from "@/components/ui/pagination"

// Create a global variable to store notification data across renders and page navigations
// This should be the same reference as in notification-bell.tsx
declare global {
  interface Window {
    __notificationCache: {
      allNotifications: Notification[]
      lastFetchTime: number
      unreadCount: number
    } | null
  }
}

// Initialize the global cache if it doesn't exist
if (typeof window !== "undefined") {
  window.__notificationCache = window.__notificationCache || null
}

export function NotificationsHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "read">("all")
  const [typeFilter, setTypeFilter] = useState<Notification["type"] | "all">("all")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  // Get the notification store
  const notificationStore = getNotificationStore()

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Function to fetch notifications wrapped in useCallback
  const fetchNotifications = useCallback(async (force = false) => {
    setIsLoading(true)
    try {
      // Check if we have cached data and it's recent (within the last minute)
      const now = Date.now()
      if (!force && window.__notificationCache && now - window.__notificationCache.lastFetchTime < 60000) {
        // Use cached data
        const updatedNotifications = window.__notificationCache.allNotifications.map((notification) => ({
          ...notification,
          isRead: notificationStore.isRead(notification.id),
        }))
        setNotifications(updatedNotifications)
      } else {
        // Fetch fresh data
        const response = await getNotifications()
        if (response.success && response.data) {
          // Apply read status from our persistent store
          const updatedNotifications = response.data.map((notification) => ({
            ...notification,
            isRead: notificationStore.isRead(notification.id),
          }))

          // Update global cache
          window.__notificationCache = {
            allNotifications: updatedNotifications,
            lastFetchTime: now,
            unreadCount: updatedNotifications.filter((n) => !n.isRead).length,
          }

          setNotifications(updatedNotifications)
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [notificationStore])

  // Fetch notifications when component mounts
  useEffect(() => {
    if (!mounted) return

    fetchNotifications()

    // Set up periodic refresh (every 5 minutes)
    const intervalId = setInterval(
      () => {
        fetchNotifications(true)
      },
      5 * 60 * 1000,
    )

    // Listen for notification read events from the bell component
    const handleNotificationRead = (event: CustomEvent) => {
      const { id } = event.detail
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification,
        ),
      )
    }

    const handleAllNotificationsRead = () => {
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => ({ ...notification, isRead: true })),
      )
    }

    window.addEventListener("notificationRead", handleNotificationRead as EventListener)
    window.addEventListener("allNotificationsRead", handleAllNotificationsRead)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("notificationRead", handleNotificationRead as EventListener)
      window.removeEventListener("allNotificationsRead", handleAllNotificationsRead)
    }
  }, [mounted, notificationStore, fetchNotifications])

  // Apply filters and search
  useEffect(() => {
    if (!mounted) return

    let filtered = [...notifications]

    // Apply read/unread filter
    if (activeFilter === "unread") {
      filtered = filtered.filter((notification) => !notification.isRead)
    } else if (activeFilter === "read") {
      filtered = filtered.filter((notification) => notification.isRead)
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((notification) => notification.type === typeFilter)
    }

    // Apply search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (notification) =>
          notification.title.toLowerCase().includes(query) ||
          notification.message.toLowerCase().includes(query) ||
          notification.unitName?.toLowerCase().includes(query) ||
          notification.itemName?.toLowerCase().includes(query),
      )
    }

    setFilteredNotifications(filtered)
    setTotalPages(Math.max(1, Math.ceil(filtered.length / itemsPerPage)))
    setCurrentPage(1) // Reset to first page when filters change
  }, [notifications, searchQuery, activeFilter, typeFilter, mounted])

  // Handle pagination
  useEffect(() => {
    if (!mounted) return

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setDisplayedNotifications(filteredNotifications.slice(startIndex, endIndex))
  }, [filteredNotifications, currentPage, mounted])

  // Handle marking a notification as read
  const handleMarkAsRead = async (notificationId: string, event?: React.MouseEvent) => {
    // Prevent event bubbling which can cause double-firing
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    // Prevent duplicate processing
    if (notificationStore.isRead(notificationId)) {
      return
    }

    try {
      // Add to persistent notification store first
      notificationStore.markAsRead(notificationId)

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification,
        ),
      )

      // Update global cache if it exists
      if (window.__notificationCache) {
        window.__notificationCache.allNotifications = window.__notificationCache.allNotifications.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification,
        )

        // Update unread count
        window.__notificationCache.unreadCount = window.__notificationCache.allNotifications.filter(
          (n) => !n.isRead,
        ).length
      }

      // Make the API call after UI is updated
      const result = await markNotificationAsRead(notificationId)
      if (!result.success) {
        console.error("Failed to mark notification as read on server")
      }

      // Dispatch a custom event to notify other components
      // Use a small timeout to prevent race conditions with event handling
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("notificationRead", {
            detail: { id: notificationId },
          }),
        )
      }, 10)
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Handle marking all displayed notifications as read
  const handleMarkAllDisplayedAsRead = async () => {
    try {
      // Mark all currently displayed notifications as read
      const notificationIds = displayedNotifications
        .filter((notification) => !notification.isRead)
        .map((notification) => notification.id)

      if (notificationIds.length === 0) return

      // Add all to persistent notification store
      notificationStore.markAllAsRead(notificationIds)

      // Update local state
      setNotifications(
        notifications.map((notification) =>
          notificationIds.includes(notification.id) ? { ...notification, isRead: true } : notification,
        ),
      )

      // Update global cache if it exists
      if (window.__notificationCache) {
        window.__notificationCache.allNotifications = window.__notificationCache.allNotifications.map((notification) =>
          notificationIds.includes(notification.id) ? { ...notification, isRead: true } : notification,
        )

        // Update unread count
        window.__notificationCache.unreadCount = window.__notificationCache.allNotifications.filter(
          (n) => !n.isRead,
        ).length
      }

      // Dispatch a custom event for each notification
      notificationIds.forEach((id) => {
        window.dispatchEvent(
          new CustomEvent("notificationRead", {
            detail: { id },
          }),
        )
      })
    } catch (error) {
      console.error("Error marking notifications as read:", error)
    }
  }

  // Get notification type color
  const getNotificationTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "info":
        return "bg-blue-100 text-blue-800"
      case "warning":
        return "bg-amber-100 text-amber-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "success":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString()
  }

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return null
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Notification History</CardTitle>
        <CardDescription>View all system notifications from the past month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={activeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("all")}
              >
                All
              </Button>
              <Button
                variant={activeFilter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("unread")}
              >
                Unread
              </Button>
              <Button
                variant={activeFilter === "read" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("read")}
              >
                Read
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            <span className="text-sm font-medium mr-2">Filter by type:</span>
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              All
            </Button>
            <Button
              variant={typeFilter === "info" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("info")}
              className="bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900"
            >
              Info
            </Button>
            <Button
              variant={typeFilter === "warning" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("warning")}
              className="bg-amber-100 text-amber-800 hover:bg-amber-200 hover:text-amber-900"
            >
              Warning
            </Button>
            <Button
              variant={typeFilter === "error" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("error")}
              className="bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900"
            >
              Critical
            </Button>
            <Button
              variant={typeFilter === "success" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("success")}
              className="bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900"
            >
              Success
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <p>Loading notifications...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-muted-foreground">
                  Showing {displayedNotifications.length} of {filteredNotifications.length} notifications
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllDisplayedAsRead}
                  disabled={!displayedNotifications.some((n) => !n.isRead)}
                >
                  Mark page as read
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {displayedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn("rounded-lg border p-3 transition-colors", !notification.isRead && "bg-muted/20")}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            getNotificationTypeColor(notification.type),
                          )}
                        >
                          {notification.title}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</span>
                      </div>
                      <p className="text-sm mt-1">{notification.message}</p>
                      {notification.unitName && (
                        <p className="text-xs text-muted-foreground mt-1">Unit: {notification.unitName}</p>
                      )}
                      {!notification.isRead && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-blue-500"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                      >
                        Click to mark as read
                      </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center mx-2">
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] gap-2">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications found</p>
              {searchQuery || activeFilter !== "all" || typeFilter !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setActiveFilter("all")
                    setTypeFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
