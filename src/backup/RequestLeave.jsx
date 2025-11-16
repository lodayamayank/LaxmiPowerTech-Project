import React, { useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";

const RequestLeave = () => {
  const [form, setForm] = useState({
    type: "paid", // default
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate || !form.reason) {
      setMessage("⚠️ Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/leaves", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("✅ Leave request submitted!");
      setForm({ type: "paid", startDate: "", endDate: "", reason: "" });
      setTimeout(() => navigate("/my-leaves"), 1000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to submit leave request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="text-sm bg-orange-500 text-white px-3 py-1 rounded mb-4"
      >
        ← Back
      </button>

      <h1 className="text-xl font-bold mb-4">Request Leave</h1>

      {message && <p className="mb-3 text-center">{message}</p>}

      <div className="space-y-3">
        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="paid">Paid Leave</option>
          <option value="unpaid">Unpaid Leave</option>
        </select>

        <input
          type="date"
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          type="date"
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <textarea
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Enter reason"
          className="w-full border p-2 rounded"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white w-full py-2 rounded disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Leave"}
        </button>
      </div>
    </div>
  );
};

export default RequestLeave;
