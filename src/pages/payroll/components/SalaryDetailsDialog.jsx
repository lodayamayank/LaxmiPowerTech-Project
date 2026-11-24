// src/pages/payroll/components/SalaryDetailsDialog.jsx
// Details of one employee's salary run: the breakdown plus the "other amounts" editor.
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatRupees } from "../payrollFormat";
import SalaryConfigPanel from "./SalaryConfigPanel";
import SalaryDetailsPanel from "./SalaryDetailsPanel";

export default function SalaryDetailsDialog({ item, edit, onClose, onAdd, onUpdate, onRemove, onSave }) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {item ? (
          <>
            <DialogHeader>
              <DialogTitle>{item.name}</DialogTitle>
              <DialogDescription>
                @{item.username} · Net salary {formatRupees(item.netSalary)}
              </DialogDescription>
            </DialogHeader>
            <SalaryDetailsPanel item={item} />
            <SalaryConfigPanel userId={item.userId} edit={edit} onAdd={onAdd} onUpdate={onUpdate} onRemove={onRemove} onSave={onSave} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
