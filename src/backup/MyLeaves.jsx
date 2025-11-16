import React, { useEffect, useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";

const MyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await axios.get("/leaves/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLeaves(res.data);
      } catch (err) {
        console.error("Failed to fetch leaves", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaves();
  }, [token]);

  return (
    <div className="p-6 bg-white min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="text-sm bg-orange-500 text-white px-3 py-1 rounded mb-4"
      >
        ← Back
      </button>

      <h1 className="text-xl font-bold mb-4">My Leaves</h1>

      {loading ? (
        <p>Loading...</p>
      ) : leaves.length === 0 ? (
        <p className="text-gray-500">No leave requests found.</p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-black">Type</th>
              <th className="border p-2 text-black">Start</th>
              <th className="border p-2 text-black">End</th>
              <th className="border p-2 text-black">Reason</th>
              <th className="border p-2 text-black">Status</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((leave) => (
              <tr key={leave._id}>
                <td className="border p-2 text-black capitalize">{leave.type}</td>
                <td className="border p-2 text-black">
                  {new Date(leave.startDate).toLocaleDateString()}
                </td>
                <td className="border p-2 text-black">
                  {new Date(leave.endDate).toLocaleDateString()}
                </td>
                <td className="border p-2 text-black">{leave.reason}</td>
                <td
                  className={`border p-2 text-black ${
                    leave.status === "approved"
                      ? "text-green-600"
                      : leave.status === "rejected"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {leave.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MyLeaves;
