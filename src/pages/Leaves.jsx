// src/pages/Leaves.jsx
import { useEffect, useState } from "react";
import axios from "../utils/axios";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEdit,
  FaPaperPlane,
} from 'react-icons/fa';



const StatusBadge = ({ status }) => {
  const config = {
    approved: {
      bg: "bg-green-100",
      text: "text-green-700",
      icon: <FaCheckCircle className="inline mr-1" size={12} />,
      border: "border-green-200"
    },
    rejected: {
      bg: "bg-red-100",
      text: "text-red-700",
      icon: <FaTimesCircle className="inline mr-1" size={12} />,
      border: "border-red-200"
    },
    pending: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      icon: <FaClock className="inline mr-1" size={12} />,
      border: "border-yellow-200"
    }
  };
  
  const { bg, text, icon, border } = config[status] || config.pending;
  
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${bg} ${text} ${border} border inline-flex items-center`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function Leaves() {
    const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "paid",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/leaves/my");
      setLeaves(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/leaves", form);
      toast.success("Leave request submitted successfully!");
      setForm({ type: "paid", startDate: "", endDate: "", reason: "" });
      loadLeaves();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit leave request");
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leaves...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate('/dashboard')}
          >
            <FaArrowLeft className="text-orange-500" size={16} />
            <span className="text-sm text-orange-500 font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg border-4 border-white/30 mx-auto mb-3">
              <FaCalendarAlt size={40} />
            </div>
            <h1 className="text-white text-2xl font-bold mb-1">Leave Management</h1>
            <p className="text-white/80 text-sm">Request and track your leaves</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Request Leave Form */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaEdit className="text-orange-500" />
              Request New Leave
            </h3>
            <form
              onSubmit={handleSubmit}
              className="bg-gradient-to-br from-orange-50 to-blue-50 rounded-2xl p-5 space-y-4 shadow-md border border-orange-100"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <FaClipboardList className="text-gray-400" size={14} />
                    <span>Leave Type</span>
                  </div>
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="paid">Paid Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-400" size={14} />
                    <span>Start Date</span>
                  </div>
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-400" size={14} />
                    <span>End Date</span>
                  </div>
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <FaClipboardList className="text-gray-400" size={14} />
                    <span>Reason (Optional)</span>
                  </div>
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                  placeholder="Enter reason for leave..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <FaPaperPlane size={16} />
                <span>Submit Leave Request</span>
              </button>
            </form>
          </div>

          {/* Leave History */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaClipboardList className="text-orange-500" />
              My Leave History
            </h3>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-md border border-blue-100">
              {leaves.length === 0 ? (
                <div className="text-center py-8">
                  <FaCalendarAlt className="text-gray-400 mx-auto mb-3" size={40} />
                  <p className="text-sm text-gray-500 font-medium">No leave requests yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your leave history will appear here</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {leaves.map((l) => {
                    const days =
                      Math.max(1,
                        Math.round(
                          (new Date(l.endDate) - new Date(l.startDate)) /
                            (1000 * 60 * 60 * 24)
                        ) + 1
                      );
                    return (
                      <li key={l._id} className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 capitalize flex items-center gap-2">
                              <FaClipboardList className="text-orange-500" size={14} />
                              {l.type} Leave
                            </p>
                          </div>
                          <StatusBadge status={l.status} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <FaCalendarAlt className="text-gray-400" size={12} />
                          <span>
                            {dayjs(l.startDate).format("DD MMM YYYY")} → {dayjs(l.endDate).format("DD MMM YYYY")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <FaClock className="text-gray-400" size={12} />
                          <span className="font-medium">{days} {days === 1 ? 'day' : 'days'}</span>
                        </div>
                        {l.reason && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 italic">"{l.reason}"</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-green-50 rounded-2xl p-4 border border-green-200 flex items-start gap-3">
            <FaCheckCircle className="text-green-600 mt-0.5" size={16} />
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Leave Request Tips</p>
              <p className="text-xs text-gray-600">
                Plan your leaves in advance and ensure all dates are correct. Your manager will review and approve your request.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-center" autoClose={2000} hideProgressBar />
    </div>
  );
}
