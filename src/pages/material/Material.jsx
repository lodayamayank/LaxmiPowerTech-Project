import React from "react";
import MaterialTabs from "./MaterialTabs";
import MaterialContent from "./MaterialContent";

import UploadPhoto from "./UploadPhoto";       // Full screen component
import AddIndentPopup from "./AddIntentPopup";

export default function Material({ activeTab }) {


  return (
    <div className="h-full flex flex-col justify-between relative">
      {/* Header */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Material</h2>

        {/* Tabs */}
        <MaterialTabs activeTab={activeTab} />

        {/* Content */}
        <MaterialContent activeTab={activeTab} />
      </div>


    </div>
  );
}
