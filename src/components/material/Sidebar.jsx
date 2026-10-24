import { FileUp, Package, ArrowLeftRight, List, ShoppingCart } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Sidebar({ setActiveSection }) {
  return (
    <div className="w-64 bg-orange-500 text-white min-h-screen p-4">
      <h2 className="text-2xl font-semibold mb-6">Laxmi Powertech</h2>

      <Accordion type="single" collapsible>
        <AccordionItem value="material" className="border-0">
          <AccordionTrigger className="mb-2 py-0 text-left hover:no-underline">
            <span className="flex items-center gap-2">
              <Package /> Material
            </span>
          </AccordionTrigger>
          <AccordionContent className="ml-6 flex flex-col gap-2 p-0 text-white">
            <button
              onClick={() => setActiveSection("uploadIndent")}
              className="text-sm hover:text-gray-200 flex items-center gap-2"
            >
              <FileUp size={16} /> Upload Indent List2
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
