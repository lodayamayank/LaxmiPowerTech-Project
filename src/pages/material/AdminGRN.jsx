import React, { useState, useEffect } from 'react';
import { Search, Eye, Package, Receipt, Edit2, Save, XCircle, DollarSign, Download, FileText, FileSpreadsheet, Trash2, X, Calendar, MapPin, User, TrendingUp } from 'lucide-react';
import { upcomingDeliveryAPI, branchesAPI } from '../../utils/materialAPI';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function AdminGRN() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  const [showExportMenu, setShowExportMenu] = useState(false);
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
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchGRNRecords();
    fetchSites();
  }, [currentPage, search, filterSite, filterDateFrom, filterDateTo]);

  // Apply all filters to deliveries
  useEffect(() => {
    applyFilters();
  }, [deliveries, filterSite, filterDateFrom, filterDateTo, filterInvoiceNumber, filterType, search]);

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
          materialMap[displayName].totalPrice += materialBilling.price || 0;
          materialMap[displayName].totalDiscount += materialBilling.discount || 0;
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

  // ✅ Delete All GRN Data (Admin Only)
  const handleDeleteAllGRN = async () => {
    try {
      setIsDeleting(true);
      console.log('🗑️ Deleting all GRN data...');
      
      const response = await upcomingDeliveryAPI.deleteAll();
      
      if (response.success) {
        console.log('✅ All GRN data deleted successfully');
        alert('✅ All GRN data has been deleted successfully!');
        
        // Refresh the data
        setDeliveries([]);
        setFilteredDeliveries([]);
        setShowDeleteConfirmModal(false);
        
        // Fetch fresh data
        fetchGRNRecords();
      } else {
        console.error('❌ Failed to delete GRN data:', response.message);
        alert('❌ Failed to delete GRN data: ' + response.message);
      }
    } catch (error) {
      console.error('❌ Error deleting GRN data:', error);
      alert('❌ Error deleting GRN data. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchSites = async () => {
    try {
      const branches = await branchesAPI.getAll();
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
        console.log(`📦 Admin GRN: Found ${filteredData.length} transferred deliveries`);
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
      
      return {
        materialId: item._id || `material-${index}`,
        materialName: item.category || 'Unknown Material',
        price: existingBilling?.price || 0,
        discount: existingBilling?.discount || 0,
        discountType: existingBilling?.discountType || 'flat',
        totalAmount: existingBilling?.totalAmount || 0
      };
    }) || [];
    
    // Initialize billing data
    setBillingData({
      invoiceNumber: delivery.billing?.invoiceNumber || autoInvoiceNumber,
      billDate: delivery.billing?.billDate ? new Date(delivery.billing.billDate).toISOString().split('T')[0] : '',
      materialBilling: materialBilling,
      totalPrice: delivery.billing?.totalPrice || 0,
      totalDiscount: delivery.billing?.totalDiscount || 0,
      finalAmount: delivery.billing?.finalAmount || 0,
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
      const price = parseFloat(material.price) || 0;
      const discount = parseFloat(material.discount) || 0;
      const discountType = material.discountType || 'flat';
      
      totalPrice += price;
      
      if (discountType === 'percentage') {
        totalDiscountAmount += (price * discount / 100);
      } else {
        totalDiscountAmount += discount;
      }
    });
    
    return {
      totalPrice,
      totalDiscount: totalDiscountAmount,
      finalAmount: totalPrice - totalDiscountAmount
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
        
        // Recalculate total amount for this material
        const price = parseFloat(updatedMaterial.price) || 0;
        const discount = parseFloat(updatedMaterial.discount) || 0;
        const discountType = updatedMaterial.discountType;
        
        if (discountType === 'percentage') {
          updatedMaterial.totalAmount = Math.max(0, price - (price * discount / 100));
        } else {
          updatedMaterial.totalAmount = Math.max(0, price - discount);
        }
        
        // Ensure all numeric fields are numbers
        updatedMaterial.price = price;
        updatedMaterial.discount = discount;
        
        return updatedMaterial;
      }
      return material;
    });
    
    // Recalculate totals
    const totals = calculateTotals(updatedMaterialBilling);
    
    setBillingData({
      ...billingData,
      materialBilling: updatedMaterialBilling,
      ...totals
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
        alert('Please enter valid price and discount values for all materials.');
        setIsSaving(false);
        return;
      }
      
      // Check if all materials have prices entered
      const allPricesEntered = billingData.materialBilling.every(material => {
        const price = parseFloat(material.price);
        return price > 0;
      });
      
      if (!allPricesEntered) {
        alert('Please enter prices for all materials before saving the bill.');
        setIsSaving(false);
        return;
      }
      
      // Preserve user-entered invoice number or auto-generate if empty
      const autoInvoiceNumber = extractBasePOId(selectedDelivery.transfer_number || selectedDelivery.st_id);
      const currentDateTime = new Date().toISOString();
      
      // Log current state for debugging
      console.log('💾 Saving billing data...');
      console.log('📝 User-entered invoice number:', billingData.invoiceNumber);
      console.log('🤖 Auto-generated invoice number:', autoInvoiceNumber);
      
      // Ensure all numeric values are properly formatted
      const sanitizedBillingData = {
        ...billingData,
        invoiceNumber: billingData.invoiceNumber || autoInvoiceNumber,  // Use user-entered or auto-generate
        billDate: billingData.billDate || currentDateTime,  // Use user-entered or set current date-time
        companyName: billingData.companyName || 'Laxmi Powertech Private Limited',
        materialBilling: billingData.materialBilling.map(material => ({
          ...material,
          price: parseFloat(material.price) || 0,
          discount: parseFloat(material.discount) || 0,
          totalAmount: parseFloat(material.totalAmount) || 0
        })),
        totalPrice: parseFloat(billingData.totalPrice) || 0,
        totalDiscount: parseFloat(billingData.totalDiscount) || 0,
        finalAmount: parseFloat(billingData.finalAmount) || 0
      };
      
      console.log('📤 Sending to backend - Invoice Number:', sanitizedBillingData.invoiceNumber);
      
      const response = await upcomingDeliveryAPI.updateBilling(selectedDelivery._id, sanitizedBillingData);
      
      console.log('📥 Backend response received');
      console.log('✅ Saved invoice number:', response.data?.billing?.invoiceNumber);
      
      if (response.success) {
        // Update local state
        setSelectedDelivery(response.data);
        
        // Update billing data with saved values from response
        setBillingData({
          invoiceNumber: response.data.billing?.invoiceNumber || '',
          billDate: response.data.billing?.billDate || '',
          materialBilling: response.data.billing?.materialBilling || [],
          totalPrice: response.data.billing?.totalPrice || 0,
          totalDiscount: response.data.billing?.totalDiscount || 0,
          finalAmount: response.data.billing?.finalAmount || 0,
          companyName: response.data.billing?.companyName || 'Laxmi Powertech Private Limited'
        });
        
        // Update deliveries list
        setDeliveries(prev => prev.map(d => 
          d._id === response.data._id ? response.data : d
        ));
        
        // Refetch GRN records to ensure table has latest data
        fetchGRNRecords();
        
        setIsEditMode(false);
        alert('Bill saved successfully! Invoice number and date-time have been assigned.');
      }
    } catch (err) {
      console.error('Error updating billing:', err);
      alert('Failed to update billing details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Safe number formatting helper
  const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '₹0.00';
    return `₹${num.toFixed(2)}`;
  };

  const safeNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'transferred':
        return 'bg-green-100 text-green-600';
      case 'partial':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
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
              'Quantity': `${item.received_quantity || item.quantity || item.st_quantity || 0} ${item.uom || ''}`,
              'Price (₹)': materialBilling?.price ? materialBilling.price.toLocaleString('en-IN') : '-',
              'Amount (₹)': materialBilling?.price && item.received_quantity 
                ? (materialBilling.price * (item.received_quantity || 0)).toLocaleString('en-IN') 
                : '-',
              'Discount': materialBilling?.discount ? `${materialBilling.discount}%` : '-',
              'Total (₹)': materialBilling?.totalAmount ? materialBilling.totalAmount.toLocaleString('en-IN') : '-',
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
      
      setShowExportMenu(false);
      alert('Excel file exported successfully!');
    } catch (error) {
      console.error('Export to Excel error:', error);
      alert('Failed to export Excel file. Please try again.');
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
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
            
            tableData.push([
              srNo,
              delivery.billing?.invoiceNumber || '-',
              delivery.billing?.billDate 
                ? new Date(delivery.billing.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                : new Date(delivery.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
              item.category || item.name || '-',
              item.sub_category || '-',
              item.sub_category1 || '-',
              `${item.received_quantity || item.quantity || item.st_quantity || 0} ${item.uom || ''}`,
              materialBilling?.price ? `₹${materialBilling.price.toLocaleString('en-IN')}` : '-',
              materialBilling?.price && item.received_quantity 
                ? `₹${(materialBilling.price * (item.received_quantity || 0)).toLocaleString('en-IN')}` 
                : '-',
              materialBilling?.discount ? `${materialBilling.discount}%` : '-',
              materialBilling?.totalAmount ? `₹${materialBilling.totalAmount.toLocaleString('en-IN')}` : '-',
              delivery.to || '-',
              delivery.from || delivery.vendor || '-',
              item.remarks || '-',
              'Laxmi Powertech Pvt Ltd'
            ]);
          });
        } else {
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
          'Quantity', 'Price', 'Amount', 'Discount', 'Total', 'Project', 'Vendor', 'Remark', 'Company'
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
          11: { cellWidth: 22 }, // Project
          12: { cellWidth: 22 }, // Vendor
          13: { cellWidth: 20 }, // Remark
          14: { cellWidth: 35 }  // Company
        },
        margin: { left: 10, right: 10 }
      });

      // Generate filename with current date
      const filename = `GRN_Records_${new Date().toISOString().split('T')[0]}.pdf`;

      // Save PDF
      doc.save(filename);
      
      setShowExportMenu(false);
      alert('PDF file exported successfully!');
    } catch (error) {
      console.error('Export to PDF error:', error);
      alert('Failed to export PDF file. Please try again.');
    }
  };

  return (
    <DashboardLayout title="GRN (Goods Receipt Note)">
      <div className="flex-1 p-6 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">GRN (Goods Receipt Note)</h1>
            <p className="text-sm text-gray-500">View all completed deliveries</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-md"
            >
              <TrendingUp size={18} />
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </button>
            <button
              onClick={() => setShowDeleteConfirmModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm shadow-md"
              title="Delete all GRN data (Admin only)"
            >
              <Trash2 size={18} />
              Delete All GRN
            </button>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {showAnalytics && !loading && (
          <div className="mb-6 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total GRNs Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Package size={24} className="opacity-80" />
                  <span className="text-2xl font-bold">{analytics.totalGRNs}</span>
                </div>
                <p className="text-sm opacity-90">Total GRNs</p>
                <p className="text-xs opacity-75 mt-1">Completed deliveries</p>
              </div>

              {/* Total Invoices Card */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Receipt size={24} className="opacity-80" />
                  <span className="text-2xl font-bold">{analytics.totalInvoices}</span>
                </div>
                <p className="text-sm opacity-90">Total Invoices</p>
                <p className="text-xs opacity-75 mt-1">Unique invoice numbers</p>
              </div>

              {/* Total Spend Card */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign size={24} className="opacity-80" />
                  <span className="text-2xl font-bold">₹{(analytics.totalSpend / 1000).toFixed(1)}K</span>
                </div>
                <p className="text-sm opacity-90">Total Spend</p>
                <p className="text-xs opacity-75 mt-1">₹{analytics.totalSpend.toLocaleString('en-IN')}</p>
              </div>

              {/* Total Materials Card */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Package size={24} className="opacity-80" />
                  <span className="text-2xl font-bold">{analytics.totalMaterials}</span>
                </div>
                <p className="text-sm opacity-90">Total Materials</p>
                <p className="text-xs opacity-75 mt-1">Material line items</p>
              </div>
            </div>

            {/* Detailed Analytics Sections */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              {/* Site-wise Summary */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={20} className="text-orange-600" />
                  <h3 className="text-lg font-bold text-gray-800">Site-wise Summary</h3>
                </div>
                <p className="text-xs text-gray-600 mb-4 bg-orange-50 p-3 rounded-lg border border-orange-200">
                  💡 <strong>Note:</strong> Shows total materials delivered to each site, total GRN entries, total amount spent, and invoice count per site.
                </p>
                
                {/* Table Layout */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Site Name
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          GRN Count
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Materials
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Invoices
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.siteSummary.length > 0 ? (
                        analytics.siteSummary.slice(0, 10).map((site, idx) => (
                          <tr key={idx} className="hover:bg-orange-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-semibold text-gray-900">{site.siteName}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-orange-600">₹{site.totalAmount.toLocaleString('en-IN')}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {site.grnCount} GRNs
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {site.materialCount} Items
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {site.invoiceCount} Invoices
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                            No sites found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-600 text-sm">Loading GRN records...</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg py-3 px-2 overflow-x-auto">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-700">
                  GRN Records ({filteredDeliveries.length} of {deliveries.length} records)
                </h2>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Search by ID, site..."
                    className="border border-gray-300 rounded p-2 w-80 focus:ring-2 focus:ring-orange-400 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  
                  {/* Export Button with Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm shadow-md"
                    >
                      <Download size={18} />
                      Export
                    </button>
                    
                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                        <button
                          onClick={handleExportExcel}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left border-b border-gray-100"
                        >
                          <FileSpreadsheet size={18} className="text-green-600" />
                          <span className="font-medium text-gray-700">Export as Excel</span>
                        </button>
                        <button
                          onClick={handleExportPDF}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left"
                        >
                          <FileText size={18} className="text-red-600" />
                          <span className="font-medium text-gray-700">Export as PDF</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Filters Section - Advanced Filters */}
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Search size={16} className="text-orange-600" />
                  Advanced Filters
                </h3>
                
                {/* First Row */}
                <div className="flex gap-4 items-end flex-wrap mb-3">
                  {/* Site Filter */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Site</label>
                    <select
                      value={filterSite}
                      onChange={(e) => setFilterSite(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">All Sites</option>
                      {sites.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </div>

                  {/* ✅ Type Filter */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">All Types</option>
                      <option value="Site Transfer">Site Transfer</option>
                      <option value="Intent">Intent</option>
                    </select>
                  </div>

                  {/* Invoice Number Filter */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Number</label>
                    <input
                      type="text"
                      value={filterInvoiceNumber}
                      onChange={(e) => setFilterInvoiceNumber(e.target.value)}
                      placeholder="Search invoice..."
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-gray-400 transition-colors"
                    />
                  </div>

                  {/* Date From */}
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-gray-400 transition-colors"
                    />
                  </div>

                  {/* Date To */}
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-gray-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => {
                      setFilterSite('');
                      setFilterType('');
                      setFilterStatus('');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                      setFilterInvoiceNumber('');
                    }}
                    className="px-6 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>

            {deliveries.length === 0 ? (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No completed deliveries found</p>
              </div>
            ) : (
              <table className="min-w-full border-collapse border border-gray-200 text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Sr No.</th>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Invoice No</th>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Date</th>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Category</th>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Category 1</th>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Category 2</th>
                    <th className="border px-2 py-2 text-center font-semibold text-gray-700">Quantity</th>
                    <th className="border px-2 py-2 text-right font-semibold text-gray-700">Price (₹)</th>
                    <th className="border px-2 py-2 text-right font-semibold text-gray-700">Amount (₹)</th>
                    <th className="border px-2 py-2 text-right font-semibold text-gray-700">Discount</th>
                    <th className="border px-2 py-2 text-right font-semibold text-gray-700 bg-green-50">Total (₹)</th>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Project Name</th>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Vendor Name</th>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Remark</th>
                    <th className="border px-2 py-2 text-left font-semibold text-gray-700">Company Name</th>
                    <th className="border px-2 py-2 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.map((delivery, deliveryIndex) => {
                    // Expand each delivery to show all its materials
                    return delivery.items && delivery.items.length > 0 ? (
                      delivery.items.map((item, itemIndex) => {
                        const srNo = deliveryIndex * 100 + itemIndex + 1;
                        const materialBilling = delivery.billing?.materialBilling?.find(
                          mb => mb.materialName === item.name || mb.materialName === item.category
                        );
                        
                        return (
                          <tr key={`${delivery._id}-${itemIndex}`} className="hover:bg-gray-50">
                            <td className="border px-2 py-2 text-center text-gray-700">{srNo}</td>
                            <td className="border px-2 py-2 font-medium text-gray-900">
                              {delivery.billing?.invoiceNumber || '-'}
                            </td>
                            <td className="border px-2 py-2 text-gray-700">
                              {delivery.billing?.billDate 
                                ? new Date(delivery.billing.billDate).toLocaleDateString('en-IN', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })
                                : new Date(delivery.createdAt).toLocaleDateString('en-IN', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                            </td>
                            <td className="border px-2 py-2 text-gray-900">{item.category || item.name || '-'}</td>
                            <td className="border px-2 py-2 text-gray-700">{item.sub_category || '-'}</td>
                            <td className="border px-2 py-2 text-gray-700">{item.sub_category1 || '-'}</td>
                            <td className="border px-2 py-2 text-center font-medium text-gray-900">
                              {item.received_quantity || item.quantity || item.st_quantity || 0} {item.uom || ''}
                            </td>
                            <td className="border px-2 py-2 text-right text-gray-900">
                              {materialBilling?.price ? `₹${materialBilling.price.toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="border px-2 py-2 text-right font-medium text-gray-900">
                              {materialBilling?.price && item.received_quantity 
                                ? `₹${(materialBilling.price * (item.received_quantity || 0)).toLocaleString('en-IN')}` 
                                : '-'}
                            </td>
                            <td className="border px-2 py-2 text-right text-red-600">
                              {materialBilling?.discount ? `${materialBilling.discount}%` : '-'}
                            </td>
                            <td className="border px-2 py-2 text-right font-bold text-green-700 bg-green-50">
                              {materialBilling?.totalAmount ? `₹${materialBilling.totalAmount.toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="border px-2 py-2 text-gray-900">{delivery.to || '-'}</td>
                            <td className="border px-2 py-2 text-gray-900">{delivery.from || delivery.vendor || '-'}</td>
                            <td className="border px-2 py-2 text-gray-700">{item.remarks || '-'}</td>
                            <td className="border px-2 py-2 font-medium text-gray-900">Laxmi Powertech Private Limited</td>
                            <td className="border px-2 py-2 text-center">
                              {itemIndex === 0 && (
                                <button
                                  onClick={() => handleViewDetails(delivery)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr key={delivery._id} className="hover:bg-gray-50">
                        <td className="border px-2 py-2 text-center text-gray-700">{deliveryIndex + 1}</td>
                        <td className="border px-2 py-2 font-medium text-gray-900">
                          {delivery.billing?.invoiceNumber || '-'}
                        </td>
                        <td className="border px-2 py-2 text-gray-700">
                          {delivery.billing?.billDate 
                            ? new Date(delivery.billing.billDate).toLocaleDateString('en-IN', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })
                            : new Date(delivery.createdAt).toLocaleDateString('en-IN', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                        </td>
                        <td className="border px-2 py-2 text-gray-500" colSpan="3">No items</td>
                        <td className="border px-2 py-2 text-center">-</td>
                        <td className="border px-2 py-2 text-right">-</td>
                        <td className="border px-2 py-2 text-right">-</td>
                        <td className="border px-2 py-2 text-right">-</td>
                        <td className="border px-2 py-2 text-right bg-green-50">-</td>
                        <td className="border px-2 py-2">{delivery.to || '-'}</td>
                        <td className="border px-2 py-2">{delivery.from || delivery.vendor || '-'}</td>
                        <td className="border px-2 py-2">-</td>
                        <td className="border px-2 py-2 font-medium">Laxmi Powertech Private Limited</td>
                        <td className="border px-2 py-2 text-center">
                          <button
                            onClick={() => handleViewDetails(delivery)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">GRN Details</h3>
                <p className="text-sm text-gray-500">{selectedDelivery.st_id || selectedDelivery.transfer_number}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {selectedDelivery.type === 'PO' ? 'Intent PO ID' : 'Site Transfer ID'}
                  </label>
                  <p className="text-gray-900 font-semibold">{selectedDelivery.transfer_number || selectedDelivery.st_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="text-gray-900">{selectedDelivery.type === 'PO' ? 'Purchase Order' : 'Site Transfer'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">From</label>
                  <p className="text-gray-900">{selectedDelivery.from || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">To</label>
                  <p className="text-gray-900">{selectedDelivery.to || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Requested By</label>
                  <p className="text-gray-900">{selectedDelivery.createdBy || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Intent Request Date & Time</label>
                  <p className="text-gray-900">{formatDate(selectedDelivery.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Delivery Date & Time (Challan Upload)</label>
                  <p className="text-green-600 font-medium">{formatDate(selectedDelivery.updatedAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDelivery.status)}`}>
                    {selectedDelivery.status}
                  </span>
                </div>
              </div>

              {/* Billing Summary Section */}
              <div className="border-2 border-orange-300 rounded-lg p-5 bg-gradient-to-r from-orange-50 via-orange-100 to-orange-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Receipt size={20} className="text-orange-600" />
                    Billing Details
                  </h4>
                  {!isEditMode ? (
                    <button
                      onClick={handleEditClick}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors shadow-md"
                    >
                      <Edit2 size={16} />
                      Edit Billing
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBilling}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 shadow-md"
                      >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save Billing'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Invoice Number, Bill Date, and Company Name */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">
                      Invoice Number
                    </label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={billingData.invoiceNumber || ''}
                        onChange={(e) => setBillingData({ ...billingData, invoiceNumber: e.target.value })}
                        className="w-full bg-white border-2 border-orange-300 rounded px-3 py-2 text-gray-900 font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter invoice number"
                      />
                    ) : (
                      <div className="bg-white border-2 border-orange-300 rounded px-3 py-2">
                        <p className="text-gray-900 font-bold">{billingData.invoiceNumber || 'Not set'}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Bill Date & Time</label>
                    {isEditMode ? (
                      <input
                        type="datetime-local"
                        value={billingData.billDate ? new Date(billingData.billDate).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setBillingData({ ...billingData, billDate: e.target.value })}
                        className="w-full bg-white border-2 border-orange-300 rounded px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        style={{ colorScheme: 'light' }}
                      />
                    ) : (
                      <div className="bg-white border-2 border-orange-300 rounded px-3 py-2">
                        <p className="text-gray-900 font-medium">
                          {billingData.billDate ? new Date(billingData.billDate).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Not set'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Company Name</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={billingData.companyName || 'Laxmi Powertech Private Limited'}
                        onChange={(e) => setBillingData({ ...billingData, companyName: e.target.value })}
                        className="w-full bg-white border-2 border-orange-300 rounded px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter company name"
                      />
                    ) : (
                      <div className="bg-white border-2 border-orange-300 rounded px-3 py-2">
                        <p className="text-gray-900 font-medium">{billingData.companyName || 'Laxmi Powertech Private Limited'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Totals */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-lg border-2 border-orange-200">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Total Price</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(billingData.totalPrice)}</p>
                  </div>
                  <div className="text-center border-x-2 border-orange-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Total Discount</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(billingData.totalDiscount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Final Amount</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(billingData.finalAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Material-wise Billing Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-orange-100 px-4 py-3 border-b-2 border-orange-300">
                  <h4 className="text-md font-bold text-gray-900 flex items-center gap-2">
                    <Package size={18} className="text-orange-600" />
                    Material-wise Billing
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-4 py-3 text-left font-semibold text-gray-700">Material Name</th>
                        <th className="border px-4 py-3 text-left font-semibold text-gray-700">Price (₹)</th>
                        <th className="border px-4 py-3 text-left font-semibold text-gray-700">Discount</th>
                        <th className="border px-4 py-3 text-left font-semibold text-gray-700 bg-green-50">Total Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingData.materialBilling.map((material, index) => (
                        <tr key={material.materialId} className="hover:bg-gray-50">
                          <td className="border px-4 py-3 font-medium text-gray-900">{material.materialName}</td>
                          <td className="border px-4 py-3">
                            {isEditMode ? (
                              <input
                                type="number"
                                value={safeNumber(material.price)}
                                onChange={(e) => handleMaterialBillingChange(material.materialId, 'price', e.target.value)}
                                className="w-full border-2 border-blue-400 bg-white rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-600 shadow-sm"
                                placeholder="Enter price"
                                step="0.01"
                                min="0"
                              />
                            ) : (
                              <span className="font-semibold text-gray-900">{formatCurrency(material.price)}</span>
                            )}
                          </td>
                          <td className="border px-4 py-3">
                            {isEditMode ? (
                              <div className="flex gap-2">
                                <select
                                  value={material.discountType || 'flat'}
                                  onChange={(e) => handleMaterialBillingChange(material.materialId, 'discountType', e.target.value)}
                                  className="border-2 border-blue-400 bg-white rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-600 shadow-sm"
                                >
                                  <option value="flat">₹</option>
                                  <option value="percentage">%</option>
                                </select>
                                <input
                                  type="number"
                                  value={safeNumber(material.discount)}
                                  onChange={(e) => handleMaterialBillingChange(material.materialId, 'discount', e.target.value)}
                                  className="flex-1 border-2 border-blue-400 bg-white rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-600 shadow-sm"
                                  placeholder="Enter discount"
                                  step={material.discountType === 'percentage' ? '1' : '0.01'}
                                  min="0"
                                  max={material.discountType === 'percentage' ? '100' : undefined}
                                />
                              </div>
                            ) : (
                              <span className="text-gray-900">
                                {safeNumber(material.discount) > 0 
                                  ? `${safeNumber(material.discount)}${material.discountType === 'percentage' ? '%' : '₹'}`
                                  : '-'}
                              </span>
                            )}
                          </td>
                          <td className="border px-4 py-3 bg-green-50">
                            <span className="font-bold text-green-700 text-lg">{formatCurrency(material.totalAmount)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Materials Table */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={18} />
                  Materials Received
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border px-3 py-2 text-left text-xs font-medium text-gray-700">Item</th>
                        <th className="border px-3 py-2 text-left text-xs font-medium text-gray-700">Category</th>
                        <th className="border px-3 py-2 text-center text-xs font-medium text-gray-700">Approved Qty</th>
                        <th className="border px-3 py-2 text-center text-xs font-medium text-gray-700">Received Qty</th>
                        <th className="border px-3 py-2 text-center text-xs font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDelivery.items?.map((item, index) => {
                        const approvedQty = item.st_quantity || 0;
                        const receivedQty = item.received_quantity || 0;
                        const isFullyReceived = receivedQty >= approvedQty;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border px-3 py-2 text-sm text-gray-900">
                              {item.category || item.name || 'N/A'}
                            </td>
                            <td className="border px-3 py-2 text-sm text-gray-600">
                              {[item.sub_category, item.sub_category1, item.sub_category2]
                                .filter(Boolean)
                                .join(' - ') || '-'}
                            </td>
                            <td className="border px-3 py-2 text-center text-sm font-medium text-gray-900">
                              {approvedQty}
                            </td>
                            <td className="border px-3 py-2 text-center text-sm font-semibold text-green-600">
                              {receivedQty}
                            </td>
                            <td className="border px-3 py-2 text-center">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                isFullyReceived 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-orange-100 text-orange-600'
                              }`}>
                                {isFullyReceived ? 'Complete' : 'Partial'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attachments (Challan) */}
              {selectedDelivery.attachments && selectedDelivery.attachments.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText size={18} />
                    Attachments ({selectedDelivery.attachments.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedDelivery.attachments.map((attachment, index) => {
                      const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
                      const fileName = attachmentUrl.split('/').pop();
                      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(attachmentUrl);
                      
                      return (
                        <div key={index} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                          {/* Image Preview */}
                          {isImage ? (
                            <div className="relative bg-gray-100">
                              <img 
                                src={attachmentUrl} 
                                alt={`Challan ${index + 1}`}
                                className="w-full h-48 object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-48 bg-gray-100">
                              <FileText size={48} className="text-gray-400" />
                            </div>
                          )}
                          
                          {/* File Info & Actions */}
                          <div className="p-3 bg-white border-t">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText size={16} className="text-orange-500 flex-shrink-0" />
                                <span className="text-sm text-gray-700 truncate">{fileName}</span>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors"
                              >
                                <Eye size={14} />
                                View
                              </a>
                              <a
                                href={attachmentUrl}
                                download
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Delete All GRN Data</h2>
                  <p className="text-sm opacity-90">Permanent Action</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold mb-2">⚠️ Warning: This action is irreversible!</p>
                <p className="text-sm text-red-700">
                  You are about to delete <strong>ALL GRN data</strong> from the system. This includes:
                </p>
                <ul className="text-sm text-red-700 mt-2 ml-4 space-y-1">
                  <li>• All GRN records</li>
                  <li>• All billing information</li>
                  <li>• All material delivery records</li>
                  <li>• All associated attachments</li>
                </ul>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This will affect both Admin and Client panels. The data cannot be recovered once deleted.
                </p>
              </div>

              <p className="text-gray-700 font-medium mb-2">Are you absolutely sure you want to proceed?</p>
              <p className="text-sm text-gray-600">
                This action is only available to administrators and should be used with extreme caution.
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllGRN}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Yes, Delete All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
