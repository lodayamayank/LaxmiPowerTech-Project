import React from "react";
import Intent from "./Intent";
import MaterialTransfer from "./MaterialTransfer";
import UpcomingDeliveries from "./UpcomingDeliveries";

export default function MaterialContent({ activeTab }) {
  switch (activeTab) {
    case "indent":
      return <Intent />;

    case "transfer":
      return <MaterialTransfer/>;

    case "deliveries":
      return <UpcomingDeliveries/>;

    case "grn":
      return <div className="text-gray-600 text-sm">GRN Page</div>;

    default:
      return <Intent />;
  }
}
