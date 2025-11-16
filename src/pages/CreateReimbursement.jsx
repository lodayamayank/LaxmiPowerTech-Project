import React, { useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaCamera,
  FaSave,
  FaMoneyBillWave,
  FaTimes,
} from "react-icons/fa";
import { toast } from "react-toastify";

const CreateReimbursement = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  
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
      toast.error("At least one item is required");
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
    e.preventDefault();
    
    // Validation
    const invalidItems = items.filter(
      (item) => !item.amount || !item.expenseDate || !item.description
    );
    if (invalidItems.length > 0) {
      toast.error("Please fill all required fields");
      return;
    }

    // Check if at least one receipt is uploaded
    const hasReceipts = items.some(item => item.receipts.length > 0);
    if (!hasReceipts) {
      const confirm = window.confirm("No receipts attached. Continue anyway?");
      if (!confirm) return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      
      // Add items without files
      const itemsData = items.map(({ receipts, receiptPreviews, ...item }) => item);
      formData.append("items", JSON.stringify(itemsData));
      formData.append("note", note);
      
      // Add all receipt files
      items.forEach((item) => {
        item.receipts.forEach((file) => {
          formData.append("receipts", file);
        });
      });

      await axios.post("/reimbursements", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Reimbursement submitted successfully!");
      navigate("/reimbursements");
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err.response?.data?.message || "Failed to submit reimbursement");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(-1)}
            type="button"
          >
            <FaArrowLeft className="text-orange-600" size={16} />
            <span className="text-sm font-medium text-orange-600">Back</span>
          </button>

          <div className="text-center pt-8">
            <FaMoneyBillWave className="text-white mx-auto mb-3" size={40} />
            <h1 className="text-white text-2xl font-bold mb-2">New Reimbursement</h1>
            <p className="text-white/80 text-sm">Submit your expense claim</p>
          </div>
        </div>

        {/* Main Content */}
        <form onSubmit={handleSubmit} className="px-6 py-6 -mt-4 pb-24">
          {/* Total Amount Display */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-50 rounded-2xl p-4 mb-6 border border-pink-100">
            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-pink-600">₹{totalAmount.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{items.length} item(s)</p>
          </div>

          {/* Expense Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-gray-800">Expense Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-all"
              >
                <FaPlus size={12} />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Item {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-600 p-2"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.amount}
                        onChange={(e) => updateItem(index, "amount", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Expense Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={item.expenseDate}
                        onChange={(e) => updateItem(index, "expenseDate", e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        required
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(index, "category", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        required
                      >
                        <option value="travel">Travel</option>
                        <option value="food">Food</option>
                        <option value="accommodation">Accommodation</option>
                        <option value="materials">Materials</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                        rows={2}
                        placeholder="Brief description of expense..."
                        required
                      />
                    </div>

                    {/* Receipts */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Receipts (Optional)
                      </label>
                      
                      {/* File Input */}
                      <div className="relative mb-2">
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileChange(index, e.target.files)}
                          className="hidden"
                          id={`receipts-${index}`}
                        />
                        <label
                          htmlFor={`receipts-${index}`}
                          className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-pink-500 hover:text-pink-600 cursor-pointer transition-all"
                        >
                          <FaCamera size={14} />
                          {item.receipts.length > 0
                            ? `${item.receipts.length} file(s) selected`
                            : "Tap to upload receipts"}
                        </label>
                      </div>

                      {/* Receipt Previews */}
                      {item.receiptPreviews.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {item.receiptPreviews.map((preview, receiptIndex) => (
                            <div key={receiptIndex} className="relative group">
                              <img
                                src={preview}
                                alt={`Receipt ${receiptIndex + 1}`}
                                className="w-full h-20 object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeReceipt(index, receiptIndex)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <FaTimes size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overall Note */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              rows={3}
              placeholder="Any additional information about this reimbursement..."
            />
          </div>

          {/* Submit Button - Fixed at bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-md mx-auto">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold shadow-lg hover:from-pink-600 hover:to-pink-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <FaSave size={18} />
                    <span>Submit Reimbursement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReimbursement;