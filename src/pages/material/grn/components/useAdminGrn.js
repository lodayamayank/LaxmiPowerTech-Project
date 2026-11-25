// src/pages/material/grn/components/useAdminGrn.js
// Data and state for the admin GRN page: list + filters, analytics, the details / billing dialog state,
// billing save and the Excel / PDF exports. Moved unchanged from AdminGRN.jsx.
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { upcomingDeliveryAPI } from '@/api/material';

export default function useAdminGrn() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [billingData, setBillingData] = useState({
    invoiceNumber: '',
    billDate: '',
    materialBilling: [],  // Array of material-wise billing
    totalPrice: 0,
    totalDiscount: 0,
    finalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    paymentStatus: 'pending',
    companyName: 'Laxmi Powertech Private Limited'
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter states
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterInvoiceNumber, setFilterInvoiceNumber] = useState('');
  const [filterType, setFilterType] = useState(''); // ✅ New: Type filter (Site Transfer / Intent)
  const [sites, setSites] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalGRNs: 0,
    totalInvoices: 0,
    totalSpend: 0,
    totalMaterials: 0,
    invoiceSummary: [],
    siteSummary: [],
    materialSummary: []
  });

  useEffect(() => {
    fetchGRNRecords();
    fetchSites();
  }, [search, filterSite, filterDateFrom, filterDateTo]);

  // Apply all filters to deliveries
  useEffect(() => {
    applyFilters();
  }, [deliveries, filterSite, filterDateFrom, filterDateTo, filterInvoiceNumber, filterType, filterStatus, search]);

  // Calculate analytics whenever filtered deliveries change
  useEffect(() => {
    calculateAnalytics();
  }, [filteredDeliveries]);

  // ❌ DISABLED: Auto-refresh removed per client request
  // No event listeners, no auto-polling, no auto-refresh
  // Data loads only on initial mount and manual filter changes

  // Calculate analytics from filtered deliveries
  const calculateAnalytics = () => {
    if (!filteredDeliveries || filteredDeliveries.length === 0) {
      setAnalytics({
        totalGRNs: 0,
        totalInvoices: 0,
        totalSpend: 0,
        totalMaterials: 0,
        invoiceSummary: [],
        siteSummary: [],
        materialSummary: []
      });
      return;
    }

    // Calculate totals
    const totalGRNs = filteredDeliveries.length;
    const totalSpend = filteredDeliveries.reduce((sum, d) => 
      sum + (d.billing?.finalAmount || 0), 0
    );
    
    // Count unique invoices
    const uniqueInvoices = new Set(
      filteredDeliveries
        .filter(d => d.billing?.invoiceNumber)
        .map(d => d.billing.invoiceNumber)
    );
    const totalInvoices = uniqueInvoices.size;

    // Count total materials
    const totalMaterials = filteredDeliveries.reduce((sum, d) => 
      sum + (d.items?.length || 0), 0
    );

    // ✅ Invoice-wise summary (use ST ID if no invoice number)
    const invoiceMap = {};
    filteredDeliveries.forEach(delivery => {
      // Use invoice number if available, otherwise use ST ID
      const invoiceNo = delivery.billing?.invoiceNumber || delivery.transfer_number || delivery.st_id || 'Unknown';
      if (!invoiceMap[invoiceNo]) {
        invoiceMap[invoiceNo] = {
          invoiceNumber: invoiceNo,
          totalAmount: 0,
          grnCount: 0,
          materialCount: 0,
          grns: []
        };
      }
      invoiceMap[invoiceNo].totalAmount += delivery.billing?.finalAmount || 0;
      invoiceMap[invoiceNo].grnCount += 1;
      invoiceMap[invoiceNo].materialCount += delivery.items?.length || 0;
      invoiceMap[invoiceNo].grns.push(delivery.transfer_number || delivery.st_id);
    });
    const invoiceSummary = Object.values(invoiceMap).sort((a, b) => b.totalAmount - a.totalAmount);

    // Site-wise summary
    const siteMap = {};
    filteredDeliveries.forEach(delivery => {
      const site = delivery.to || 'Unknown';
      if (!siteMap[site]) {
        siteMap[site] = {
          siteName: site,
          totalAmount: 0,
          grnCount: 0,
          materialCount: 0,
          invoices: new Set()
        };
      }
      siteMap[site].totalAmount += delivery.billing?.finalAmount || 0;
      siteMap[site].grnCount += 1;
      siteMap[site].materialCount += delivery.items?.length || 0;
      if (delivery.billing?.invoiceNumber) {
        siteMap[site].invoices.add(delivery.billing.invoiceNumber);
      }
    });
    const siteSummary = Object.values(siteMap).map(s => ({
      ...s,
      invoiceCount: s.invoices.size,
      invoices: undefined
    })).sort((a, b) => b.totalAmount - a.totalAmount);

    // ✅ Material-wise summary (with category hierarchy and proper cost calculation)
    const materialMap = {};
    filteredDeliveries.forEach(delivery => {
      const totalItems = delivery.items?.length || 1;
      const deliveryFinalAmount = delivery.billing?.finalAmount || 0;
      
      delivery.items?.forEach(item => {
        // Build material name from category hierarchy
        const category = item.category || '';
        const subCategory = item.subCategory || '';
        const subCategory1 = item.subCategory1 || '';
        const subCategory2 = item.subCategory2 || '';
        
        // Use materialName if available, otherwise build from categories
        let displayName = item.materialName || item.itemName || item.name || '';
        if (!displayName && category) {
          const parts = [category, subCategory, subCategory1, subCategory2].filter(Boolean);
          displayName = parts.join(' - ');
        }
        if (!displayName) {
          displayName = 'Unknown Material';
        }
        
        // Use display name as key
        if (!materialMap[displayName]) {
          materialMap[displayName] = {
            materialName: displayName,
            category,
            subCategory,
            subCategory1,
            subCategory2,
            totalQuantity: 0,
            totalCost: 0,
            totalPrice: 0,
            totalDiscount: 0,
            grnCount: 0,
            unit: item.unit || 'units'
          };
        }
        materialMap[displayName].totalQuantity += item.quantity || 0;
        
        // ✅ Calculate cost from material billing or proportional split
        const materialBilling = delivery.billing?.materialBilling?.find(
          mb => mb.materialName === displayName || 
                mb.materialName === item.materialName ||
                mb.materialName === item.itemName ||
                mb.materialName === item.name
        );
        
        if (materialBilling) {
          // Use actual material billing data
          const quantity = materialBilling.quantity || item.received_quantity || item.quantity || item.st_quantity || 0;
          materialMap[displayName].totalPrice += (materialBilling.price || 0) * quantity;
          materialMap[displayName].totalDiscount += materialBilling.discountAmount || materialBilling.discount || 0;
          materialMap[displayName].totalCost += materialBilling.totalAmount || 0;
        } else if (deliveryFinalAmount > 0) {
          // Proportional split if no itemized billing (divide equally among items)
          const proportionalCost = deliveryFinalAmount / totalItems;
          materialMap[displayName].totalCost += proportionalCost;
        }
        
        materialMap[displayName].grnCount += 1;
      });
    });
    const materialSummary = Object.values(materialMap).sort((a, b) => b.totalCost - a.totalCost);

    setAnalytics({
      totalGRNs,
      totalInvoices,
      totalSpend,
      totalMaterials,
      invoiceSummary,
      siteSummary,
      materialSummary
    });
  };

  // Apply all filters to deliveries
  const applyFilters = () => {
    let filtered = [...deliveries];

    // Search filter (ID, site, etc.)
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(delivery => 
        (delivery.transfer_number?.toLowerCase().includes(searchLower)) ||
        (delivery.st_id?.toLowerCase().includes(searchLower)) ||
        (delivery.from?.toLowerCase().includes(searchLower)) ||
        (delivery.to?.toLowerCase().includes(searchLower)) ||
        (delivery.billing?.invoiceNumber?.toLowerCase().includes(searchLower))
      );
    }

    // Site filter
    if (filterSite) {
      filtered = filtered.filter(delivery => 
        delivery.to === filterSite || delivery.from === filterSite
      );
    }

    // ✅ Type filter (Site Transfer / Intent)
    if (filterType) {
      filtered = filtered.filter(delivery => {
        const deliveryType = delivery.type || '';
        if (filterType === 'Site Transfer') {
          return deliveryType.toLowerCase() === 'site transfer' || deliveryType.toLowerCase() === 'st';
        } else if (filterType === 'Intent') {
          return deliveryType.toLowerCase() === 'po' || deliveryType.toLowerCase() === 'intent';
        }
        return true;
      });
    }

    // Invoice number filter
    if (filterInvoiceNumber) {
      const invoiceSearchLower = filterInvoiceNumber.toLowerCase();
      filtered = filtered.filter(delivery => 
        delivery.billing?.invoiceNumber?.toLowerCase().includes(invoiceSearchLower)
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(delivery => 
        getPaymentSummary(delivery.billing).paymentStatus === filterStatus
      );
    }

    // Date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(delivery => {
        const deliveryDate = new Date(delivery.createdAt);
        return deliveryDate >= fromDate;
      });
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(delivery => {
        const deliveryDate = new Date(delivery.createdAt);
        return deliveryDate <= toDate;
      });
    }

    setFilteredDeliveries(filtered);
  };

  const fetchSites = async () => {
    try {
      const branches = await fetchBranchesCached();
      const sitesList = branches.map(branch => branch.name).sort();
      setSites(sitesList);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setSites([]);
    }
  };

  const fetchGRNRecords = async () => {
    try {
      setLoading(true);
      const response = await upcomingDeliveryAPI.getAll(1, 100, '');
      
      if (response.success) {
        // Filter only transferred deliveries (GRN = Goods Receipt Note = completed deliveries)
        let filteredData = response.data.filter(d => 
          d.status?.toLowerCase() === 'transferred'
        );

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          filteredData = filteredData.filter(item => 
            item.transfer_number?.toLowerCase().includes(searchLower) ||
            item.st_id?.toLowerCase().includes(searchLower) ||
            item.from?.toLowerCase().includes(searchLower) ||
            item.to?.toLowerCase().includes(searchLower) ||
            item.createdBy?.toLowerCase().includes(searchLower)
          );
        }

        // Apply site filter
        if (filterSite) {
          filteredData = filteredData.filter(item => 
            item.from?.toLowerCase().includes(filterSite.toLowerCase()) ||
            item.to?.toLowerCase().includes(filterSite.toLowerCase())
          );
        }

        // Apply date from filter (Intent Request Date)
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          filteredData = filteredData.filter(item => {
            const itemDate = new Date(item.createdAt);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate >= fromDate;
          });
        }

        // Apply date to filter (Intent Request Date)
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          filteredData = filteredData.filter(item => {
            const itemDate = new Date(item.createdAt);
            return itemDate <= toDate;
          });
        }

        setDeliveries(filteredData);
      }
    } catch (err) {
      console.error('Error fetching GRN records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract base PO ID (remove -01, -02 suffix)
  const extractBasePOId = (poId) => {
    if (!poId) return '';
    // Remove trailing -01, -02, etc. from PO ID
    // Example: PO20251223-LNBNE-01 -> PO20251223-LNBNE
    return poId.replace(/-\d+$/, '');
  };

  const getBillableQuantity = (item = {}) => Number(item.received_quantity || item.quantity || item.st_quantity || 0);

  const calculateMaterialBilling = (material = {}) => {
    const quantity = Number(material.quantity || 0);
    const price = parseFloat(material.price) || 0;
    const discount = parseFloat(material.discount) || 0;
    const discountType = material.discountType || 'flat';
    const discountScope = material.discountScope || 'total';
    const grossAmount = price * quantity;
    const discountAmount = discountType === 'percentage'
      ? (grossAmount * discount) / 100
      : discountScope === 'perUnit'
        ? discount * quantity
        : discount;
    const totalAmount = Math.max(0, grossAmount - discountAmount);

    return {
      quantity,
      price,
      discount,
      discountType,
      discountScope,
      grossAmount,
      discountAmount,
      totalAmount,
    };
  };

  const calculatePaymentSummary = (finalAmount = 0, paidAmount = 0) => {
    const payableAmount = Math.max(0, safeNumber(finalAmount));
    const normalizedPaidAmount = Math.min(payableAmount, Math.max(0, safeNumber(paidAmount)));
    const pendingAmount = Math.max(0, payableAmount - normalizedPaidAmount);
    const paymentStatus = normalizedPaidAmount <= 0
      ? 'pending'
      : pendingAmount <= 0
        ? 'complete'
        : 'partial';

    return {
      paidAmount: normalizedPaidAmount,
      pendingAmount,
      paymentStatus
    };
  };

  const getPaymentSummary = (billing = {}) => {
    const finalAmount = safeNumber(billing?.finalAmount);
    const paidAmount = safeNumber(billing?.paidAmount);
    return calculatePaymentSummary(finalAmount, paidAmount);
  };

  const toDateInputValue = (dateString) => {
    if (!dateString) return '';
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const handleViewDetails = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDetailsModal(true);
    setIsEditMode(false);
    
    // Auto-generate invoice number from base PO ID
    const autoInvoiceNumber = extractBasePOId(delivery.transfer_number || delivery.st_id);
    
    // Initialize material-wise billing from delivery items
    const materialBilling = delivery.items?.map((item, index) => {
      // Check if billing data exists for this material
      const existingBilling = delivery.billing?.materialBilling?.find(
        mb => mb.materialId === item._id || mb.materialName === item.category
      );
      
      const row = {
        materialId: item._id || `material-${index}`,
        materialName: item.category || 'Unknown Material',
        quantity: getBillableQuantity(item),
        price: existingBilling?.price || 0,
        discount: existingBilling?.discount || 0,
        discountType: existingBilling?.discountType || 'flat',
        discountScope: existingBilling?.discountScope || 'total',
        discountAmount: existingBilling?.discountAmount || 0,
        totalAmount: existingBilling?.totalAmount || 0
      };
      const calculated = calculateMaterialBilling(row);

      return {
        ...row,
        quantity: calculated.quantity,
        discountAmount: calculated.discountAmount,
        totalAmount: calculated.totalAmount,
      };
    }) || [];
    
    const calculatedBillingTotals = calculateTotals(materialBilling);
    const paymentSummary = calculatePaymentSummary(
      delivery.billing?.finalAmount ?? calculatedBillingTotals.finalAmount,
      delivery.billing?.paidAmount || 0
    );

    // Initialize billing data
    setBillingData({
      invoiceNumber: delivery.billing?.invoiceNumber || autoInvoiceNumber,
      billDate: toDateInputValue(delivery.billing?.billDate),
      materialBilling: materialBilling,
      totalPrice: calculatedBillingTotals.totalPrice,
      totalDiscount: calculatedBillingTotals.totalDiscount,
      finalAmount: calculatedBillingTotals.finalAmount,
      ...paymentSummary,
      companyName: delivery.billing?.companyName || 'Laxmi Powertech Private Limited'
    });
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Reset to original delivery data
    handleViewDetails(selectedDelivery);
  };

  // Calculate totals from material billing
  const calculateTotals = (materialBilling) => {
    let totalPrice = 0;
    let totalDiscountAmount = 0;
    
    materialBilling.forEach(material => {
      const totals = calculateMaterialBilling(material);
      totalPrice += totals.grossAmount;
      totalDiscountAmount += totals.discountAmount;
    });
    
    return {
      totalPrice,
      totalDiscount: totalDiscountAmount,
      finalAmount: Math.max(0, totalPrice - totalDiscountAmount)
    };
  };

  const handleMaterialBillingChange = (materialId, field, value) => {
    const updatedMaterialBilling = billingData.materialBilling.map(material => {
      if (material.materialId === materialId) {
        // Parse numeric values immediately
        let updatedValue = value;
        if (field === 'price' || field === 'discount') {
          updatedValue = parseFloat(value) || 0;
        }
        
        const updatedMaterial = { ...material, [field]: updatedValue };
        const calculated = calculateMaterialBilling(updatedMaterial);

        return {
          ...updatedMaterial,
          quantity: calculated.quantity,
          price: calculated.price,
          discount: calculated.discount,
          discountType: calculated.discountType,
          discountScope: calculated.discountScope,
          discountAmount: calculated.discountAmount,
          totalAmount: calculated.totalAmount,
        };
      }
      return material;
    });
    
    // Recalculate totals
    const totals = calculateTotals(updatedMaterialBilling);
    
    const paymentSummary = calculatePaymentSummary(totals.finalAmount, billingData.paidAmount);

    setBillingData({
      ...billingData,
      materialBilling: updatedMaterialBilling,
      ...totals,
      ...paymentSummary
    });
  };

  const handlePaymentChange = (value) => {
    const paymentSummary = calculatePaymentSummary(billingData.finalAmount, value);
    setBillingData({
      ...billingData,
      ...paymentSummary
    });
  };

  const handleSaveBilling = async () => {
    try {
      setIsSaving(true);
      
      // Validate billing data - ensure all materials have prices
      const hasInvalidData = billingData.materialBilling.some(material => {
        const price = parseFloat(material.price);
        const discount = parseFloat(material.discount);
        return isNaN(price) || isNaN(discount) || price < 0 || discount < 0;
      });
      
      if (hasInvalidData) {
        toast.error('Please enter valid price and discount values for all materials.');
        setIsSaving(false);
        return;
      }
      
      // Check if all materials have prices entered
      const allPricesEntered = billingData.materialBilling.every(material => {
        const price = parseFloat(material.price);
        return price > 0;
      });
      
      if (!allPricesEntered) {
        toast.error('Please enter prices for all materials before saving the bill.');
        setIsSaving(false);
        return;
      }

      if (safeNumber(billingData.paidAmount) < 0) {
        toast.error('Please enter a valid paid amount.');
        setIsSaving(false);
        return;
      }
      
      // Preserve user-entered invoice number or auto-generate if empty
      const autoInvoiceNumber = extractBasePOId(selectedDelivery.transfer_number || selectedDelivery.st_id);
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Log current state for debugging
      
      // Ensure all numeric values are properly formatted
      const recalculatedMaterialBilling = billingData.materialBilling.map(material => {
        const calculated = calculateMaterialBilling(material);
        return {
          ...material,
          quantity: calculated.quantity,
          price: calculated.price,
          discount: calculated.discount,
          discountType: calculated.discountType,
          discountScope: calculated.discountScope,
          discountAmount: calculated.discountAmount,
          totalAmount: calculated.totalAmount
        };
      });
      const recalculatedTotals = calculateTotals(recalculatedMaterialBilling);
      const paymentSummary = calculatePaymentSummary(recalculatedTotals.finalAmount, billingData.paidAmount);

      const sanitizedBillingData = {
        ...billingData,
        invoiceNumber: billingData.invoiceNumber || autoInvoiceNumber,  // Use user-entered or auto-generate
        billDate: billingData.billDate || currentDate,  // Use date only; no bill time is stored from the UI
        companyName: billingData.companyName || 'Laxmi Powertech Private Limited',
        materialBilling: recalculatedMaterialBilling,
        totalPrice: recalculatedTotals.totalPrice,
        totalDiscount: recalculatedTotals.totalDiscount,
        finalAmount: recalculatedTotals.finalAmount,
        ...paymentSummary
      };
      
      
      const response = await upcomingDeliveryAPI.updateBilling(selectedDelivery._id, sanitizedBillingData);
      
      
      if (response.success) {
        // Update local state
        setSelectedDelivery(response.data);
        
        // Ensure materialBilling is properly formatted from response
        const savedMaterialBilling = response.data.billing?.materialBilling || [];
        
        // Update billing data with saved values from response
        setBillingData({
          invoiceNumber: response.data.billing?.invoiceNumber || '',
          billDate: toDateInputValue(response.data.billing?.billDate),
          materialBilling: savedMaterialBilling,
          totalPrice: response.data.billing?.totalPrice || 0,
          totalDiscount: response.data.billing?.totalDiscount || 0,
          finalAmount: response.data.billing?.finalAmount || 0,
          paidAmount: response.data.billing?.paidAmount || 0,
          pendingAmount: response.data.billing?.pendingAmount || 0,
          paymentStatus: response.data.billing?.paymentStatus || 'pending',
          companyName: response.data.billing?.companyName || 'Laxmi Powertech Private Limited'
        });
        
        console.log('🔄 Updated billingData state with:', {
          materialBillingCount: savedMaterialBilling.length,
          totalPrice: response.data.billing?.totalPrice,
          totalDiscount: response.data.billing?.totalDiscount
        });
        
        // Update deliveries list
        setDeliveries(prev => prev.map(d => 
          d._id === response.data._id ? response.data : d
        ));
        
        // Refetch GRN records to ensure table has latest data
        fetchGRNRecords();
        
        setIsEditMode(false);
        toast.success('Bill saved successfully! Invoice number, bill date, and payment status have been assigned.');
      }
    } catch (err) {
      console.error('Error updating billing:', err);
      toast.error('Failed to update billing details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  // Safe number helper
  const safeNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const getPaymentStatusLabel = (status) => {
    switch (status) {
      case 'complete':
        return 'Complete Payment';
      case 'partial':
        return 'Partial Payment';
      default:
        return 'Pending Payment';
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      // Loaded on demand: xlsx is large and only needed when exporting.
      const XLSX = await import('xlsx');
      // Use filtered deliveries for export
      const dataToExport = filteredDeliveries.length > 0 ? filteredDeliveries : deliveries;
      
      // Prepare material-level data for export (matching table structure)
      const exportData = [];
      dataToExport.forEach((delivery, deliveryIndex) => {
        if (delivery.items && delivery.items.length > 0) {
          delivery.items.forEach((item, itemIndex) => {
            const srNo = deliveryIndex * 100 + itemIndex + 1;
            const materialBilling = delivery.billing?.materialBilling?.find(
              mb => mb.materialName === item.name || mb.materialName === item.category
            );
            
            const quantity = item.received_quantity || item.quantity || item.st_quantity || 0;
            const grossAmount = materialBilling?.price ? materialBilling.price * quantity : 0;
            const paymentSummary = getPaymentSummary(delivery.billing);

            exportData.push({
              'Sr No.': srNo,
              'Invoice No': delivery.billing?.invoiceNumber || '-',
              'Date': delivery.billing?.billDate 
                ? new Date(delivery.billing.billDate).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })
                : new Date(delivery.createdAt).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  }),
              'Category': item.category || item.name || '-',
              'Category 1': item.sub_category || '-',
              'Category 2': item.sub_category1 || '-',
              'Quantity': `${quantity} ${item.uom || ''}`,
              'Price (₹)': materialBilling?.price ? materialBilling.price.toLocaleString('en-IN') : '-',
              'Amount (₹)': grossAmount ? grossAmount.toLocaleString('en-IN') : '-',
              'Discount': materialBilling?.discount 
                ? materialBilling.discountType === 'percentage' 
                  ? `${materialBilling.discount}%` 
                  : materialBilling.discount.toLocaleString('en-IN')
                : '-',
              'Total (₹)': materialBilling?.totalAmount ? materialBilling.totalAmount.toLocaleString('en-IN') : '-',
              'Paid (₹)': paymentSummary.paidAmount.toLocaleString('en-IN'),
              'Pending Payment (₹)': paymentSummary.pendingAmount.toLocaleString('en-IN'),
              'Payment Status': getPaymentStatusLabel(paymentSummary.paymentStatus),
              'Project Name': delivery.to || '-',
              'Vendor Name': delivery.from || delivery.vendor || '-',
              'Remark': item.remarks || '-',
              'Company Name': 'Laxmi Powertech Private Limited'
            });
          });
        } else {
          // Handle deliveries with no items
          exportData.push({
            'Sr No.': deliveryIndex + 1,
            'Invoice No': delivery.billing?.invoiceNumber || '-',
            'Date': delivery.billing?.billDate 
              ? new Date(delivery.billing.billDate).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })
              : new Date(delivery.createdAt).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                }),
            'Category': 'No items',
            'Category 1': '-',
            'Category 2': '-',
            'Quantity': '-',
            'Price (₹)': '-',
            'Amount (₹)': '-',
            'Discount': '-',
            'Total (₹)': '-',
            'Paid (₹)': getPaymentSummary(delivery.billing).paidAmount.toLocaleString('en-IN'),
            'Pending Payment (₹)': getPaymentSummary(delivery.billing).pendingAmount.toLocaleString('en-IN'),
            'Payment Status': getPaymentStatusLabel(getPaymentSummary(delivery.billing).paymentStatus),
            'Project Name': delivery.to || '-',
            'Vendor Name': delivery.from || delivery.vendor || '-',
            'Remark': '-',
            'Company Name': 'Laxmi Powertech Private Limited'
          });
        }
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const colWidths = [
        { wch: 8 },  // Sr No.
        { wch: 18 }, // Invoice No
        { wch: 12 }, // Date
        { wch: 20 }, // Category
        { wch: 15 }, // Category 1
        { wch: 15 }, // Category 2
        { wch: 12 }, // Quantity
        { wch: 12 }, // Price
        { wch: 15 }, // Amount
        { wch: 10 }, // Discount
        { wch: 15 }, // Total
        { wch: 15 }, // Paid
        { wch: 18 }, // Pending Payment
        { wch: 18 }, // Payment Status
        { wch: 18 }, // Project Name
        { wch: 18 }, // Vendor Name
        { wch: 20 }, // Remark
        { wch: 35 }  // Company Name
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'GRN Records');

      // Generate filename with current date
      const filename = `GRN_Records_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      
      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Export to Excel error:', error);
      toast.error('Failed to export Excel file. Please try again.');
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      // Loaded on demand: jsPDF + autoTable are large and only needed when exporting.
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      // Use filtered deliveries for export
      const dataToExport = filteredDeliveries.length > 0 ? filteredDeliveries : deliveries;
      
      const doc = new jsPDF('l', 'mm', 'a3'); // A3 Landscape for wider table
      
      // Add title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('GRN Records', 14, 15);
      
      // Add export date and record count
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const totalMaterialRows = dataToExport.reduce((sum, d) => sum + (d.items?.length || 1), 0);
      doc.text(`Export Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);
      doc.text(`Total Material Rows: ${totalMaterialRows}`, 14, 28);
      
      // Prepare material-level table data (matching table structure)
      const tableData = [];
      dataToExport.forEach((delivery, deliveryIndex) => {
        if (delivery.items && delivery.items.length > 0) {
          delivery.items.forEach((item, itemIndex) => {
            const srNo = deliveryIndex * 100 + itemIndex + 1;
            const materialBilling = delivery.billing?.materialBilling?.find(
              mb => mb.materialName === item.name || mb.materialName === item.category
            );
            
            const quantity = item.received_quantity || item.quantity || item.st_quantity || 0;
            const grossAmount = materialBilling?.price ? materialBilling.price * quantity : 0;
            const paymentSummary = getPaymentSummary(delivery.billing);

            tableData.push([
              srNo,
              delivery.billing?.invoiceNumber || '-',
              delivery.billing?.billDate 
                ? new Date(delivery.billing.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                : new Date(delivery.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
              item.category || item.name || '-',
              item.sub_category || '-',
              item.sub_category1 || '-',
              `${quantity} ${item.uom || ''}`,
              materialBilling?.price ? `₹${materialBilling.price.toLocaleString('en-IN')}` : '-',
              grossAmount ? `₹${grossAmount.toLocaleString('en-IN')}` : '-',
              materialBilling?.discount 
                ? materialBilling.discountType === 'percentage' 
                  ? `${materialBilling.discount}%` 
                  : `₹${materialBilling.discount.toLocaleString('en-IN')}`
                : '-',
              materialBilling?.totalAmount ? `₹${materialBilling.totalAmount.toLocaleString('en-IN')}` : '-',
              `₹${paymentSummary.paidAmount.toLocaleString('en-IN')}`,
              `₹${paymentSummary.pendingAmount.toLocaleString('en-IN')}`,
              getPaymentStatusLabel(paymentSummary.paymentStatus),
              delivery.to || '-',
              delivery.from || delivery.vendor || '-',
              item.remarks || '-',
              'Laxmi Powertech Pvt Ltd'
            ]);
          });
        } else {
          const paymentSummary = getPaymentSummary(delivery.billing);
          tableData.push([
            deliveryIndex + 1,
            delivery.billing?.invoiceNumber || '-',
            delivery.billing?.billDate 
              ? new Date(delivery.billing.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
              : new Date(delivery.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            'No items',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            `₹${paymentSummary.paidAmount.toLocaleString('en-IN')}`,
            `₹${paymentSummary.pendingAmount.toLocaleString('en-IN')}`,
            getPaymentStatusLabel(paymentSummary.paymentStatus),
            delivery.to || '-',
            delivery.from || delivery.vendor || '-',
            '-',
            'Laxmi Powertech Pvt Ltd'
          ]);
        }
      });

      // Add table using autoTable
      autoTable(doc, {
        startY: 34,
        head: [[
          'Sr No.', 'Invoice No', 'Date', 'Category', 'Category 1', 'Category 2',
          'Quantity', 'Price', 'Amount', 'Discount', 'Total', 'Paid', 'Pending', 'Payment', 'Project', 'Vendor', 'Remark', 'Company'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [251, 146, 60], // Orange color
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7
        },
        bodyStyles: {
          fontSize: 6
        },
        alternateRowStyles: {
          fillColor: [255, 247, 237] // Light orange
        },
        columnStyles: {
          0: { cellWidth: 12 },  // Sr No.
          1: { cellWidth: 25 },  // Invoice No
          2: { cellWidth: 18 },  // Date
          3: { cellWidth: 25 },  // Category
          4: { cellWidth: 20 },  // Category 1
          5: { cellWidth: 20 },  // Category 2
          6: { cellWidth: 18 },  // Quantity
          7: { cellWidth: 20 },  // Price
          8: { cellWidth: 22 },  // Amount
          9: { cellWidth: 15 },  // Discount
          10: { cellWidth: 22 }, // Total
          11: { cellWidth: 18 }, // Paid
          12: { cellWidth: 18 }, // Pending
          13: { cellWidth: 22 }, // Payment
          14: { cellWidth: 22 }, // Project
          15: { cellWidth: 22 }, // Vendor
          16: { cellWidth: 20 }, // Remark
          17: { cellWidth: 35 }  // Company
        },
        margin: { left: 10, right: 10 }
      });

      // Generate filename with current date
      const filename = `GRN_Records_${new Date().toISOString().split('T')[0]}.pdf`;

      // Save PDF
      doc.save(filename);
      
      toast.success('PDF file exported successfully!');
    } catch (error) {
      console.error('Export to PDF error:', error);
      toast.error('Failed to export PDF file. Please try again.');
    }
  };

  return {
    deliveries, loading, search, setSearch,
    selectedDelivery, showDetailsModal, setShowDetailsModal, isEditMode, billingData, setBillingData, isSaving,
    filterSite, setFilterSite, filterStatus, setFilterStatus, filterDateFrom, setFilterDateFrom,
    filterDateTo, setFilterDateTo, filterInvoiceNumber, setFilterInvoiceNumber, filterType, setFilterType,
    sites, filteredDeliveries, showAnalytics, setShowAnalytics, analytics,
    getPaymentSummary, getPaymentStatusLabel, safeNumber,
    handleViewDetails, handleEditClick, handleCancelEdit, handleMaterialBillingChange, handlePaymentChange,
    handleSaveBilling, handleExportExcel, handleExportPDF,
  };
}
