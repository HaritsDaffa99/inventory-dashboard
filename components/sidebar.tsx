"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Map,
  BarChart2,
  Activity,
  User,
  LogOut,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
  { name: "Map", icon: Map, href: "/map" },
  { name: "Stock Forecast", icon: BarChart2, href: "/stock-forecast" },
  { name: "Disease Trend", icon: Activity, href: "/disease-trend" },
];

const settingsItems = [
  { name: "Profile", icon: User, href: "/profile" },
  { name: "Logout", icon: LogOut, href: "/logout" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col bg-teal-600 text-white">
      <div className="p-4">
        <h1 className="text-4xl font-bold">
          <span className="text-white">Si</span>
          <span className="text-yellow-300">Modis</span>
        </h1>
      </div>

      <nav className="flex-1">
        <div className="px-4 py-9">
          <h2 className="mb-4 text-xs font-semibold uppercase">Overview</h2>
          <ul className="space-y-4">
            {menuItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center rounded-lg px-2 py-2 text-base font-semibold hover:bg-teal-700 ${
                    pathname === item.href ? "bg-teal-700" : ""
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="px-4 py-2">
        <h2 className="mb-4 text-xs font-semibold uppercase">Settings</h2>
        <ul className="space-y-4">
          {settingsItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center rounded-lg px-2 py-2 text-base font-semibold hover:bg-teal-700"
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
