import { useState } from "react";
import { FileUp, Package, ArrowLeftRight, List, ShoppingCart } from "lucide-react";

export default function Sidebar({ setActiveSection }) {
  const [openMaterial, setOpenMaterial] = useState(false);

  return (
    <div className="w-64 bg-orange-500 text-white min-h-screen p-4">
      <h2 className="text-2xl font-semibold mb-6">Laxmi Powertech</h2>

      <div>
        <button
          onClick={() => setOpenMaterial(!openMaterial)}
          className="flex items-center gap-2 mb-2 w-full"
        >
          <Package /> Material
        </button>

        {openMaterial && (
          <div className="ml-6 flex flex-col gap-2">
            <button
              onClick={() => setActiveSection("uploadIndent")}
              className="text-sm hover:text-gray-200 flex items-center gap-2"
            >
              <FileUp size={16} /> Upload Indent List
            </button>
            <button
              onClick={() => setActiveSection("siteTransfers")}
              className="text-sm hover:text-gray-200 flex items-center gap-2"
            >
              <ArrowLeftRight size={16} /> Site Transfers
            </button>
            <button
              onClick={() => setActiveSection("upcomingDeliveries")}
              className="text-sm hover:text-gray-200 flex items-center gap-2"
            >
              <List size={16} /> Upcoming Deliveries
            </button>
            <button
              onClick={() => setActiveSection("intent")}
              className="text-sm hover:text-gray-200 flex items-center gap-2"
            >
              <ShoppingCart size={16} /> Intent (PO)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
