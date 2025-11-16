import React, { useEffect, useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaPlus,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import { toast } from "react-toastify";

const MyReimbursements = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchReimbursements();
  }, []);

  const fetchReimbursements = async () => {
    try {
      const res = await axios.get("/reimbursements/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReimbursements(res.data || []);
    } catch (err) {
      console.error("Failed to fetch reimbursements", err);
      toast.error("Failed to load reimbursements");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "paid":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <FaClock className="text-yellow-600" size={14} />;
      case "approved":
        return <FaCheckCircle className="text-green-600" size={14} />;
      case "rejected":
        return <FaTimesCircle className="text-red-600" size={14} />;
      case "paid":
        return <FaMoneyBillWave className="text-blue-600" size={14} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="text-orange-600" size={16} />
            <span className="text-sm font-medium text-orange-600">Back</span>
          </button>

          <div className="text-center pt-8">
            <FaFileInvoiceDollar className="text-white mx-auto mb-3" size={40} />
            <h1 className="text-white text-2xl font-bold mb-2">My Reimbursements</h1>
            <p className="text-white/80 text-sm">Track your expense claims</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* New Request Button */}
          <button
            onClick={() => navigate("/reimbursements/new")}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-3 mb-6"
          >
            <FaPlus size={18} />
            <span>New Reimbursement Request</span>
          </button>

          {/* Reimbursements List */}
          {reimbursements.length === 0 ? (
            <div className="text-center py-12">
              <FaFileInvoiceDollar className="text-gray-300 mx-auto mb-4" size={64} />
              <p className="text-gray-500">No reimbursements yet</p>
              <p className="text-sm text-gray-400 mt-2">Submit your first expense claim</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reimbursements.map((reimb) => (
                <div
                  key={reimb._id}
                  onClick={() => navigate(`/reimbursements/${reimb._id}`)}
                  className="bg-white rounded-2xl p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FaMoneyBillWave className="text-orange-600" size={16} />
                        <span className="font-bold text-xl text-gray-800">
                          ₹{reimb.totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FaCalendarAlt size={12} />
                        <span>{new Date(reimb.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${getStatusColor(reimb.status)}`}>
                      {getStatusIcon(reimb.status)}
                      {reimb.status.toUpperCase()}
                    </div>
                  </div>

                  {/* Items Count */}
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                    <span className="font-semibold">{reimb.items.length}</span> expense item(s)
                    {reimb.note && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{reimb.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyReimbursements;