import React from "react";
import { NavLink } from "react-router-dom";

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
            isActive
              ? "text-orange-500 border-b-2 border-orange-500 pb-1 whitespace-nowrap"
              : "text-gray-600 hover:text-orange-500 whitespace-nowrap"
          }
        >
          {tab.name}
        </NavLink>
      ))}
    </div>
  );
}
