// src/pages/projects/workOrderFormat.js
// Work order money text, exactly as the page always showed it: "₹" + Number.toLocaleString("en-IN")
// (no rounding to whole rupees, "0" for missing values). Not lib/format's formatCurrency.

/** "₹1,25,000" / "₹0" (value is a number or missing). */
export const rupeesOr0 = (value) => `₹${value?.toLocaleString("en-IN") || "0"}`;
