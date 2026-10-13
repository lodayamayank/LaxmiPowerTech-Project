import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function MaterialTabs({ activeTab }) {
  const tabs = [
    { name: "Indent", path: "/indent" },
    { name: "Material Transfer", path: "/transfer" },
    { name: "Upcoming Deliveries", path: "/deliveries" },
    { name: "GRN", path: "/grn" },
  ];

  return (
    <div className="flex space-x-4 text-sm font-medium border-b pb-2 overflow-x-auto">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            cn(
              "whitespace-nowrap",
              isActive
                ? "text-orange-500 border-b-2 border-orange-500 pb-1"
                : "text-gray-600 hover:text-orange-500"
            )
          }
        >
          {tab.name}
        </NavLink>
      ))}
    </div>
  );
}
