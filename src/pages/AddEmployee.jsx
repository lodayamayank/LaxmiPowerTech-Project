// // src/pages/AddEmployee.jsx
// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import DashboardLayout from "../layouts/DashboardLayout";
// import axios from "../utils/axios";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Checkbox } from "@/components/ui/checkbox";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { toast } from "react-toastify";
// import { FaEye, FaEyeSlash } from "react-icons/fa";

// const TEAM_PATH = "/admin/my-team";

// const roleLabel = (r) => {
//   const role = typeof r === "string" ? r : r?.role || "";
//   return role.charAt(0).toUpperCase() + role.slice(1);
// };
// const roleValue = (r) => (typeof r === "string" ? r : r?.role || "");

// const EMPTY_FORM = {
//   name: "",
//   username: "",
//   password: "default123",
//   mobileNumber: "",
//   role: "labour",
//   assignedBranches: [],
// };

// const AddEmployee = () => {
//   const navigate = useNavigate();
//   const token = localStorage.getItem("token");
//   const headers = { Authorization: `Bearer ${token}` };

//   const [formData, setFormData] = useState(EMPTY_FORM);
//   const [branches, setBranches] = useState([]);
//   const [roleOptions, setRoleOptions] = useState([]);
//   const [showPassword, setShowPassword] = useState(false);
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     axios
//       .get("/branches", { headers })
//       .then((res) =>
//         setBranches(
//           (res.data || [])
//             .slice()
//             .sort((a, b) =>
//               a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
//             ),
//         ),
//       )
//       .catch((err) => console.error("Failed to fetch branches", err));

//     axios
//       .get("/roles", { headers })
//       .then((res) => setRoleOptions(res.data))
//       .catch((err) => console.error("Failed to fetch roles", err));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const set = (key, value) =>
//     setFormData((prev) => ({ ...prev, [key]: value }));

//   // stay = true keeps the admin on this page to add another user
//   const submit = async (stay = false) => {
//     if (!formData.name || !formData.username || !formData.role) {
//       toast.error("Please fill required fields (name, username, role)");
//       return;
//     }

//     const payload = { ...formData };
//     if (!payload.password || payload.password.trim() === "")
//       payload.password = "default123";
//     else payload.password = payload.password.trim();

//     try {
//       setSubmitting(true);
//       await axios.post("/users/register", payload, { headers });
//       toast.success("User registered successfully!");
//       if (stay) {
//         setFormData(EMPTY_FORM);
//         setShowPassword(false);
//       } else {
//         navigate(TEAM_PATH);
//       }
//     } catch (err) {
//       console.error(
//         "Error submitting form",
//         err?.response?.data || err.message,
//       );
//       toast.error(`Error: ${err?.response?.data?.message || err.message}`);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <DashboardLayout title="Add Employee">
//       <Card>
//         <CardHeader className="pb-3">
//           <CardTitle className="text-base font-semibold">
//             Add New User
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <Input
//               placeholder="Name *"
//               value={formData.name}
//               onChange={(e) => set("name", e.target.value)}
//             />
//             <Input
//               placeholder="Username *"
//               value={formData.username}
//               onChange={(e) => set("username", e.target.value)}
//             />

//             <div className="relative">
//               <Input
//                 type={showPassword ? "text" : "password"}
//                 placeholder="Password (default: default123)"
//                 value={formData.password}
//                 className="pr-10"
//                 onChange={(e) => set("password", e.target.value)}
//               />
//               <Button
//                 type="button"
//                 variant="ghost"
//                 size="icon"
//                 className="absolute right-0 top-0 h-full px-3 text-gray-500 dark:text-gray-400"
//                 onClick={() => setShowPassword((p) => !p)}
//               >
//                 {showPassword ? <FaEyeSlash /> : <FaEye />}
//               </Button>
//             </div>

//             <Input
//               placeholder="Mobile Number"
//               value={formData.mobileNumber}
//               onChange={(e) => set("mobileNumber", e.target.value)}
//             />

//             <Select value={formData.role} onValueChange={(v) => set("role", v)}>
//               <SelectTrigger className="w-full">
//                 <SelectValue placeholder="Select Role" />
//               </SelectTrigger>
//               <SelectContent>
//                 {Array.isArray(roleOptions) &&
//                   roleOptions.map((r) => {
//                     const value = roleValue(r);
//                     return (
//                       <SelectItem key={value} value={value}>
//                         {roleLabel(r)}
//                       </SelectItem>
//                     );
//                   })}
//               </SelectContent>
//             </Select>

//             {formData.role !== "admin" && (
//               <div className="md:col-span-2">
//                 <Label className="block mb-2">Branches</Label>
//                 <div className="max-h-40 overflow-y-auto rounded-md border p-3 space-y-2">
//                   {branches.map((branch) => (
//                     <label
//                       key={branch._id}
//                       className="flex items-center gap-2 cursor-pointer"
//                     >
//                       <Checkbox
//                         checked={formData.assignedBranches.includes(branch._id)}
//                         onCheckedChange={(checked) =>
//                           setFormData((prev) => ({
//                             ...prev,
//                             assignedBranches: checked
//                               ? [...prev.assignedBranches, branch._id]
//                               : prev.assignedBranches.filter(
//                                   (id) => id !== branch._id,
//                                 ),
//                           }))
//                         }
//                       />
//                       <span className="text-sm">{branch.name}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="flex flex-wrap items-center gap-3">
//             <Button
//               onClick={() => submit(false)}
//               disabled={submitting}
//               className="bg-orange-500 hover:bg-orange-600 text-white"
//             >
//               {submitting ? "Saving..." : "Add User"}
//             </Button>
//             <Button
//               variant="outline"
//               onClick={() => submit(true)}
//               disabled={submitting}
//             >
//               Save & Add Another
//             </Button>
//             <Button
//               variant="ghost"
//               onClick={() => navigate(-1)}
//               disabled={submitting}
//             >
//               Cancel
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </DashboardLayout>
//   );
// };

// export default AddEmployee;
