// src/pages/reimbursements/CreateReimbursement.jsx  (mobile, from the Reimbursement tile)
// Laid out like the New claim design: one card per expense item (amount, date, category chips, description, receipt
// photo), "Add another item", and a sticky total + Submit bar. The request and the offline queue are unchanged; the
// "no receipts attached" window.confirm is now a ConfirmDialog.
import React, { useState } from "react";
import { ROUTES } from '@/lib/routes';
import { submitOffline } from "@/pwa/offlineSubmit";
import { useNavigate } from "react-router-dom";
import { toast } from 'sonner';
import { Calendar, Camera, Plus, Trash2, X } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChoiceChips } from "@/components/common/ChoiceChips";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import MobileCard from "@/layouts/mobile/MobileCard";
import MobilePage from "@/layouts/mobile/MobilePage";

const CATEGORIES = [
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food" },
  { value: "accommodation", label: "Stay" },
  { value: "materials", label: "Materials" },
  { value: "other", label: "Other" },
];

const CreateReimbursement = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([
    {
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      category: "travel",
      description: "",
      receipts: [],
      receiptPreviews: [],
    },
  ]);
  
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmNoReceipts, setConfirmNoReceipts] = useState(false);

  const addItem = () => {
    setItems([
      ...items,
      {
        amount: "",
        expenseDate: new Date().toISOString().split("T")[0],
        category: "travel",
        description: "",
        receipts: [],
        receiptPreviews: [],
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length === 1) {
      toast.error("Keep at least one item", { description: "A claim needs one expense item." });
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleFileChange = (index, files) => {
    const updated = [...items];
    const fileArray = Array.from(files);
    
    // Create preview URLs
    const previews = fileArray.map(file => URL.createObjectURL(file));
    
    updated[index].receipts = fileArray;
    updated[index].receiptPreviews = previews;
    setItems(updated);
  };

  const removeReceipt = (itemIndex, receiptIndex) => {
    const updated = [...items];
    
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(updated[itemIndex].receiptPreviews[receiptIndex]);
    
    updated[itemIndex].receipts = updated[itemIndex].receipts.filter((_, i) => i !== receiptIndex);
    updated[itemIndex].receiptPreviews = updated[itemIndex].receiptPreviews.filter((_, i) => i !== receiptIndex);
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    // Validation
    const invalidItems = items.filter(
      (item) => !item.amount || !item.expenseDate || !item.description
    );
    if (invalidItems.length > 0) {
      toast.error("Some items are incomplete", { description: "Add an amount, a date and what it was for." });
      return;
    }

    // Check if at least one receipt is uploaded
    const hasReceipts = items.some(item => item.receipts.length > 0);
    if (!hasReceipts && !confirmNoReceipts) {
      setConfirmNoReceipts(true); // "No receipts attached. Continue anyway?" (ConfirmDialog; continues in submitClaim)
      return;
    }
    await submitClaim();
  };

  const submitClaim = async () => {
    setConfirmNoReceipts(false);

    setSubmitting(true);

    try {
      const formData = new FormData();
      
      // Add items without files
      const itemsData = items.map((item) => {
        const rest = { ...item };
        delete rest.receipts;
        delete rest.receiptPreviews;
        return rest;
      });
      formData.append("items", JSON.stringify(itemsData));
      formData.append("note", note);
      
      // Add all receipt files
      items.forEach((item) => {
        item.receipts.forEach((file) => {
          formData.append("receipts", file);
        });
      });

      const result = await submitOffline({
        module: "reimbursement",
        endpoint: "/reimbursements",
        formData,
        label: `Reimbursement (₹${totalAmount})`,
      });

      if (result.offline) {
        toast.info("Saved on your phone", { description: "Will send when you\u2019re back online" });
      } else {
        toast.success("Claim submitted", { description: `\u20b9${totalAmount.toFixed(0)} \u00b7 ${items.length} ${items.length === 1 ? "item" : "items"}` });
      }
      navigate(ROUTES.reimbursements);
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Couldn\u2019t submit the claim", { description: err.response?.data?.message || "Check your connection and try again.", action: { label: "Retry", onClick: () => submitClaim() } });
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return (
    <>
      <form onSubmit={handleSubmit}>
        <MobilePage
          title="New claim"
          back
          onBack={() => navigate(-1)}
          className="pb-4"
          footer={
            <div className="flex items-center gap-3">
              <div>
                <div className="text-small text-ink-3">
                  Total · {items.length} {items.length === 1 ? "item" : "items"}
                </div>
                <div className="text-[20px] font-semibold tabular-nums text-ink-1">{"\u20b9"}{totalAmount.toFixed(2)}</div>
              </div>
              <Button type="submit" size="xl" className="flex-1" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit claim"}
              </Button>
            </div>
          }
        >
          {items.map((item, index) => (
            <MobileCard key={index} className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-ink-1">Item {index + 1}</h2>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                  <Trash2 /> Remove
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <FormField label={"Amount (\u20b9)"} htmlFor={`reimbursement-amount-${index}`}>
                  <Input id={`reimbursement-amount-${index}`} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={item.amount} onChange={(e) => updateItem(index, "amount", e.target.value)} required />
                </FormField>
                <FormField label="Date" htmlFor={`reimbursement-date-${index}`}>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-3" />
                    <Input id={`reimbursement-date-${index}`} type="date" className="pl-9" value={item.expenseDate} onChange={(e) => updateItem(index, "expenseDate", e.target.value)} required />
                  </div>
                </FormField>
              </div>

              <FormField label="Category">
                <ChoiceChips aria-label="Category" options={CATEGORIES} value={item.category} onChange={(value) => updateItem(index, "category", value)} />
              </FormField>

              <FormField label="What was it for?" htmlFor={`reimbursement-description-${index}`}>
                <Textarea id={`reimbursement-description-${index}`} rows={3} placeholder="e.g. Auto fare to Maple Residency site" value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} required />
              </FormField>

              <div>
                <Input id={`receipts-${index}`} type="file" multiple accept="image/*,application/pdf" onChange={(e) => handleFileChange(index, e.target.files)} className="hidden" aria-label={`Receipts for item ${index + 1}`} />
                <Button
                  type="button"
                  variant="outline"
                  className="!h-auto min-h-[76px] w-full border-2 border-dashed border-line-input bg-surface-subtle text-primary"
                  onClick={() => document.getElementById(`receipts-${index}`)?.click()}
                >
                  <Camera /> {item.receipts.length > 0 ? `${item.receipts.length} file(s) selected` : "Photo of receipt"}
                </Button>
                {item.receiptPreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {item.receiptPreviews.map((preview, receiptIndex) => (
                      <div key={receiptIndex} className="relative">
                        <img loading="lazy" decoding="async" src={preview} alt={`Receipt ${receiptIndex + 1}`} className="h-20 w-full rounded-control border border-line-card object-cover" />
                        <Button type="button" variant="destructive" size="icon" aria-label="Remove receipt" className="absolute -right-2 -top-2 !size-6 rounded-full" onClick={() => removeReceipt(index, receiptIndex)}>
                          <X className="!size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </MobileCard>
          ))}

          <Button type="button" variant="outline" className="!h-12" onClick={addItem}>
            <Plus /> Add another item
          </Button>

          <FormField label="Additional note (optional)" htmlFor="reimbursement-note">
            <Textarea id="reimbursement-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Any additional information about this reimbursement..." />
          </FormField>
        </MobilePage>
      </form>

      <ConfirmDialog
        open={confirmNoReceipts}
        onOpenChange={(open) => !open && setConfirmNoReceipts(false)}
        title="No receipts attached"
        description="Continue without a receipt photo?"
        confirmLabel="Continue"
        onConfirm={() => handleSubmit()}
      />
    </>
  );
};

export default CreateReimbursement;
