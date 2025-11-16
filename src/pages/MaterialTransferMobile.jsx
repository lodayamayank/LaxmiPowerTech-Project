import React, { useState } from "react";

/**
 * MaterialTransferMobile.jsx
 * Mobile-first, responsive for all phones (320px -> 480px+).
 * Tailwind CSS required (see previous steps).
 */

export default function MaterialTransferMobile() {
    const [activeTab, setActiveTab] = useState("material"); // 'indent', 'material', 'upcoming', 'grn'
    const [showForm, setShowForm] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [search, setSearch] = useState("");
    const [materials, setMaterials] = useState([
        {
            id: 1,
            stId: "ST-001",
            sending: "Site A",
            receiving: "Site B",
            issued: "10 qty",
            date: "2025-10-20",
            transferred: true,
        },
        {
            id: 2,
            stId: "ST-002",
            sending: "Site C",
            receiving: "Site D",
            issued: "5 qty",
            date: "2025-10-18",
            transferred: false,
        },
    ]);

    const [form, setForm] = useState({
        stId: "",
        project: "",
        checkedBy: "",
        materials: [],
        remarks: "",
        attachments: [],
    });

    // responsive filter / search
    const filtered = materials.filter((m) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            m.stId.toLowerCase().includes(q) ||
            m.sending.toLowerCase().includes(q) ||
            m.receiving.toLowerCase().includes(q)
        );
    });

    function openNewForm() {
        setForm({
            stId: "",
            project: "",
            checkedBy: "",
            materials: [],
            remarks: "",
            attachments: [],
        });
        setShowForm(true);
    }

    function saveForm() {
        const newItem = {
            id: Date.now(),
            stId: form.stId || `ST-${Date.now().toString().slice(-4)}`,
            sending: form.project || "Sending Site (choose later)",
            receiving: "Receiving Site (choose later)",
            issued: form.materials.length ? `${form.materials.length} items` : "0 qty",
            date: new Date().toISOString().slice(0, 10),
            transferred: false,
        };
        setMaterials((s) => [newItem, ...s]);
        setShowForm(false);
    }

    function addMaterialRow() {
        setForm((f) => ({
            ...f,
            materials: [...f.materials, { id: Date.now(), name: "", qty: "" }],
        }));
    }

    function updateMaterialRow(id, key, value) {
        setForm((f) => ({
            ...f,
            materials: f.materials.map((m) => (m.id === id ? { ...m, [key]: value } : m)),
        }));
    }

    function removeMaterialRow(id) {
        setForm((f) => ({ ...f, materials: f.materials.filter((m) => m.id !== id) }));
    }

    function handleAttachFiles(e) {
        const files = Array.from(e.target.files);
        setForm((f) => ({ ...f, attachments: [...f.attachments, ...files] }));
    }

    return (
        <div className="min-h-screen bg-white shadow-md rounded-xl overflow-hidden safe-area-bottom">
            {/* Header */}
            <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                    <h2 className="text-gray-700 text-sm sm:text-base font-semibold">Material Transfer</h2>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilter(true)}
                            className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs sm:text-sm btn-shadow active:scale-95 transition-transform"
                        >
                            Filter
                        </button>

                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                            {/* avatar placeholder */}
                            <svg className="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.761 0 5.312.832 7.379 2.246M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                    <button
                        onClick={() => setActiveTab("indent")}
                        className={`px-2 py-1 rounded ${activeTab === "indent" ? "text-orange-500 font-semibold border-b-2 border-orange-500" : "text-gray-500"}`}
                    >
                        Indent
                    </button>
                    <button
                        onClick={() => setActiveTab("material")}
                        className={`px-2 py-1 rounded ${activeTab === "material" ? "text-orange-500 font-semibold border-b-2 border-orange-500" : "text-gray-500"}`}
                    >
                        Material Transfer
                    </button>
                    <button
                        onClick={() => setActiveTab("upcoming")}
                        className={`px-2 py-1 rounded ${activeTab === "upcoming" ? "text-orange-500 font-semibold border-b-2 border-orange-500" : "text-gray-500"}`}
                    >
                        Upcoming Deliveries
                    </button>
                    <button
                        onClick={() => setActiveTab("grn")}
                        className={`px-2 py-1 rounded ${activeTab === "grn" ? "text-orange-500 font-semibold border-b-2 border-orange-500" : "text-gray-500"}`}
                    >
                        GRN
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-3">
                {!showForm && (
                    <>
                        {/* Search */}
                        <div className="mb-3">
                            <div className="relative">
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search ST ID or site"
                                    className="w-full px-4 py-2 rounded-full border text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-300"
                                />
                                <div className="absolute right-3 top-2.5 text-gray-400">
                                    {/* search icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* list */}
                        <div className="space-y-3">
                            {filtered.map((m) => (
                                <div key={m.id} className="p-3 bg-gray-50 rounded-lg border flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs text-gray-400">ST ID:</div>
                                            <div className="text-sm font-semibold">{m.stId}</div>
                                            {m.transferred && <div className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Transferred</div>}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">Sending: {m.sending}</div>
                                        <div className="text-xs text-gray-500">Receiving: {m.receiving}</div>
                                    </div>

                                    <div className="text-right text-xs">
                                        <div className="text-gray-400">{m.issued}</div>
                                        <div className="text-gray-400">{m.date}</div>
                                    </div>
                                </div>
                            ))}

                            {filtered.length === 0 && <div className="text-center text-gray-400 text-sm py-8">No transfers found</div>}
                        </div>
                    </>
                )}

                {/* Form overlay (mobile full-screen) */}
                {showForm && (
                    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
                        <div onClick={() => setShowForm(false)} className="absolute inset-0 bg-black/30" />

                        <div className="relative w-full sm:w-11/12 max-w-md bg-white rounded-t-2xl sm:rounded-lg p-4 shadow-lg overflow-auto" style={{ maxHeight: "92vh" }}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-gray-800 font-semibold text-sm">New Site Transfer</h3>
                                <button onClick={() => setShowForm(false)} className="text-sm text-gray-500">Close</button>
                            </div>

                            <div className="space-y-3">
                                <div className="text-xs text-gray-500">Site Transfer ID</div>
                                <div className="flex gap-2">
                                    <input
                                        value={form.stId}
                                        onChange={(e) => setForm({ ...form, stId: e.target.value })}
                                        placeholder="ST-XXXX"
                                        className="flex-1 px-3 py-2 rounded-lg border text-sm"
                                    />
                                    <div className="px-3 py-2 rounded-lg bg-orange-100 text-orange-600 text-sm flex items-center">ST</div>
                                </div>

                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Transfer To (Project)</div>
                                    <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm">
                                        <option value="">Select Project</option>
                                        <option value="Site A">Site A</option>
                                        <option value="Site B">Site B</option>
                                        <option value="Site C">Site C</option>
                                    </select>
                                </div>

                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Checked By</div>
                                    <select value={form.checkedBy} onChange={(e) => setForm({ ...form, checkedBy: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm">
                                        <option value="">Select Team Member</option>
                                        <option value="tm1">Team Member 1</option>
                                        <option value="tm2">Team Member 2</option>
                                    </select>
                                </div>

                                {/* dynamic materials */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-500 mb-1">Material Details</div>
                                        <button onClick={addMaterialRow} className="text-xs text-orange-500">+ Add</button>
                                    </div>

                                    {form.materials.length === 0 && <div className="text-xs text-gray-400">No materials added</div>}

                                    <div className="space-y-2">
                                        {form.materials.map((it) => (
                                            <div key={it.id} className="grid grid-cols-3 gap-2 items-center">
                                                <input
                                                    value={it.name}
                                                    onChange={(e) => updateMaterialRow(it.id, "name", e.target.value)}
                                                    placeholder="Item name"
                                                    className="col-span-2 px-2 py-2 rounded-lg border text-sm"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        value={it.qty}
                                                        onChange={(e) => updateMaterialRow(it.id, "qty", e.target.value)}
                                                        placeholder="Qty"
                                                        className="w-20 px-2 py-2 rounded-lg border text-sm text-center"
                                                    />
                                                    <button onClick={() => removeMaterialRow(it.id)} className="text-xs text-red-400">Remove</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Remarks</div>
                                    <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Remarks" className="w-full px-3 py-2 rounded-lg border text-sm h-20" />
                                </div>

                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Attachments</div>
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="file" accept="image/*,application/pdf" onChange={handleAttachFiles} multiple className="hidden" />
                                        <div className="px-3 py-2 rounded-lg border text-sm inline-block">Upload files</div>
                                    </label>

                                    {form.attachments.length > 0 && (
                                        <ul className="mt-2 text-xs text-gray-600 space-y-1">
                                            {form.attachments.map((f, idx) => (
                                                <li key={idx} className="flex items-center justify-between">
                                                    <span className="truncate max-w-[60%]">{f.name}</span>
                                                    <span className="text-xs text-gray-400">{Math.round(f.size / 1024)} KB</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-2">
                                    <button
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 px-6 py-3 bg-gray-300 text-black font-semibold rounded-full shadow-lg hover:shadow-xl hover:bg-gray-400 active:scale-95 transition-all duration-200"
                                    >
                                        Cancel
                                    </button>

                                    {/* Done Button */}
                                    <button
                                        onClick={saveForm}
                                        className="flex-1 px-6 py-3 bg-orange-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:bg-orange-600 active:scale-95 transition-all duration-200"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500"></div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={openNewForm}
                        className="w-14 h-14 rounded-full bg-gray-300 text-black flex items-center justify-center text-3xl pb-1 font-bold leading-none btn-shadow active:scale-95 transition-transform"
                    >

                        +
                    </button>
                </div>
            </div>

            {/* Filter slide-over (full width on small screens) */}
            {showFilter && (
                <div className="fixed inset-0 z-40">
                    <div onClick={() => setShowFilter(false)} className="absolute inset-0 bg-black/30" />
                    <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-white shadow-lg p-4 overflow-auto rounded-t-2xl sm:rounded-none" style={{ maxHeight: "92vh" }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-gray-800 font-semibold text-sm">Filters</h3>
                            <button onClick={() => setShowFilter(false)} className="text-sm text-orange-500">CLEAR</button>
                        </div>

                        <div className="mt-4 space-y-4 text-sm text-gray-700">
                            <div>
                                <div className="font-medium text-xs text-gray-500">Sort By</div>
                                <div className="mt-2 space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="sort" className="accent-orange-500" />
                                        <span>Latest</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="sort" className="accent-orange-500" />
                                        <span>Oldest</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <div className="font-medium text-xs text-gray-500">Category</div>
                                <div className="mt-2">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" />
                                        <span>All</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" />
                                        <span>Electrical</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <div className="font-medium text-xs text-gray-500">Status</div>
                                <div className="mt-2">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" />
                                        <span>Pending</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" />
                                        <span>Transferred</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setShowFilter(false)} className="flex-1 px-3 py-2 rounded-xl border text-sm">Close</button>
                            <button onClick={() => setShowFilter(false)} className="flex-1 px-3 py-2 rounded-xl bg-orange-500 text-white text-sm">Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
