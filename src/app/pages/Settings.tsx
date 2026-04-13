import { useState, useMemo } from "react";
import { UserPlus, Search, X, Shield, Mail, Phone, Lock, User as UserIcon, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { useApp, UserRole } from "../context/AppContext";
import { postToSheet, invalidateCache } from "../services/api";

const ROLES: UserRole[] = ["Admin", "user"];

export const Settings = () => {
  const { users, fetchAllData } = useApp();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    userId: "",
    username: "",
    password: "",
    role: "" as UserRole | "",
    phoneNumber: "",
    email: "",
    pageAccess: "All"
  });

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => 
      u.username.toLowerCase().includes(q) || 
      u.userId.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      userId: user.userId,
      username: user.username,
      password: user.password || "",
      role: user.role,
      phoneNumber: user.phoneNumber || "",
      email: user.email || "",
      pageAccess: Array.isArray(user.pageAccess) ? user.pageAccess.join(",") : "All"
    });
    setShowModal(true);
  };

  const handleDelete = async (user: any) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) return;
    
    setIsSyncing(true);
    try {
      const res = await postToSheet({
        action: "delete",
        sheetName: "Login Master",
        rowIndex: user.rowIndex.toString()
      });

      if (res.success) {
        invalidateCache("Login Master");
        await fetchAllData(true);
      } else {
        alert("Failed to delete user: " + res.error);
      }
    } catch (error) {
       console.error("Delete error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setIsSyncing(true);

    try {
      let rowData;
      if (editingUser) {
        rowData = [
          `SN-${String(editingUser.rowIndex - 1).padStart(3, "0")}`,
          formData.userId,
          formData.username,
          formData.password,
          formData.role,
          formData.phoneNumber,
          formData.email,
          formData.pageAccess
        ];
      } else {
        const nextSN = `SN-${String(users.length + 1).padStart(3, "0")}`;
        rowData = [
          nextSN,
          formData.userId,
          formData.username,
          formData.password,
          formData.role,
          formData.phoneNumber,
          formData.email,
          formData.pageAccess
        ];
      }

      const res = await postToSheet({
        action: editingUser ? "update" : "insert",
        sheetName: "Login Master",
        ...(editingUser && { rowIndex: editingUser.rowIndex.toString() }),
        rowData: JSON.stringify(rowData)
      });

      if (res.success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setShowModal(false);
          setEditingUser(null);
          setFormData({ userId: "", username: "", password: "", role: "" as any, phoneNumber: "", email: "", pageAccess: "All" });
        }, 2000);

        invalidateCache("Login Master");
        await fetchAllData(true);
      } else {
        alert("Failed: " + res.error);
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSubmitting(false);
      setIsSyncing(false);
    }
  };

  const PAGES = [
    "Dashboard",
    "24k Metal Stock",
    "Alloy Conversion",
    "Production Planning",
    "Department Issue",
    "Department Receipt",
    "Karigar Issue",
    "Stock Summary",
    "Settings",
    "License"
  ];

  const handlePageToggle = (page: string) => {
    const current = formData.pageAccess === "All" ? [...PAGES] : formData.pageAccess.split(",").map(p => p.trim());
    let updated;
    if (page === "All") {
      updated = formData.pageAccess === "All" ? "" : "All";
    } else {
      if (current.includes(page)) {
        updated = current.filter(p => p !== page).join(",");
      } else {
        updated = [...current, page].join(",");
      }
    }
    setFormData({ ...formData, pageAccess: updated || "" });
  };

  const isPageSelected = (page: string) => {
    if (formData.pageAccess === "All") return true;
    return formData.pageAccess.split(",").map(p => p.trim()).includes(page);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-3 bg-white/90 backdrop-blur-md border border-green-100 rounded-2xl shadow-2xl px-10 py-8 animate-in fade-in zoom-in duration-300">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-base font-bold text-gray-900">{editingUser ? "User Updated!" : "User Added!"}</p>
            <p className="text-sm text-gray-500 text-center">Login credentials have been stored.</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
             <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">User Management</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Settings & Access Control</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-sm transition-all"
            />
          </div>
          <button 
            onClick={() => {
              const nextID = `SN-${String(users.length + 1).padStart(3, "0")}`;
              setEditingUser(null);
              setFormData({ 
                userId: nextID, 
                username: "", 
                password: "", 
                role: "" as any, 
                phoneNumber: "", 
                email: "", 
                pageAccess: "All" 
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-400/20 hover:scale-[1.02] transition-transform active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
        
        {/* Syncing Loader */}
        {isSyncing && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-xl border border-amber-100 flex flex-col items-center gap-3 animate-in zoom-in duration-300">
              <div className="w-10 h-10 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-sm font-bold text-amber-900 uppercase tracking-widest">Saving Changes...</p>
            </div>
          </div>
        )}

        {/* Desktop View */}
        <div className="hidden md:block flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-gray-50/50 backdrop-blur-md">
              <tr className="border-b border-gray-200">
                {["User Details", "Role", "Contact Info", "Password", "Access", "Actions"].map((h) => (
                  <th key={h} className={`px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest ${h === "Access" ? "w-64" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <UserIcon className="w-12 h-12" />
                      <p className="text-base font-medium">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.userId} className="hover:bg-amber-50/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-bold text-xs uppercase group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors">
                          {u.username.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{u.username}</p>
                          <p className="text-[11px] font-mono text-gray-400 tracking-tighter">{u.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                        u.role === 'Admin' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                        u.role === 'Production Head' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-gray-100 text-gray-700 border border-gray-100'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{u.email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{u.phoneNumber || "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md w-fit border border-gray-100">
                        <Lock className="w-3 h-3 text-gray-400" />
                        <span>{"•".repeat(u.password?.length || 8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 w-64">
                      <div className="flex flex-wrap gap-1">
                        {u.pageAccess.map((p: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-100 whitespace-nowrap">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(u)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(u)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex-1 overflow-auto p-4 space-y-4 bg-gray-50/30">
          {filteredUsers.length === 0 ? (
            <div className="py-20 text-center opacity-30">
               <UserIcon className="w-12 h-12 mx-auto mb-2" />
               <p className="text-base font-medium">No users found</p>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.userId} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-black text-sm uppercase">
                      {u.username.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-gray-900">{u.username}</p>
                      <p className="text-xs font-mono text-gray-400 tracking-tighter">{u.userId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(u)}
                      className="p-2 text-amber-600 bg-amber-50 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                       onClick={() => handleDelete(u)}
                       className="p-2 text-red-600 bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                    <p className="text-xs text-gray-700 truncate">{u.email || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password</p>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 w-fit">
                       <Lock className="w-3 h-3 text-gray-400" />
                       <span>{"•".repeat(u.password?.length || 8)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</p>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase rounded-full border border-purple-100">
                      {u.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Access</p>
                   <div className="flex flex-wrap gap-1">
                     {u.pageAccess.map((p, i) => (
                       <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-100">
                         {p}
                       </span>
                     ))}
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{editingUser ? "Edit User" : "Add New User"}</h3>
                  <p className="text-xs text-gray-500">{editingUser ? "Update credentials and access" : "Create login credentials and roles"}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">User ID *</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      required
                      name="userId"
                      value={formData.userId}
                      onChange={handleChange}
                      readOnly={!editingUser} // Auto-generated for new users
                      placeholder="User ID"
                      className={`w-full pl-10 pr-4 py-2 border rounded-xl outline-none text-sm font-medium ${
                        !editingUser ? "bg-amber-50/50 border-amber-200 text-amber-900 cursor-not-allowed" : "bg-gray-50 border-gray-200 focus:ring-2 focus:ring-amber-400"
                      }`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Full Name *</label>
                  <input
                    required
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Full Name"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    required
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Role *</label>
                <div className="relative">
                   <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <select
                    required
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-sm appearance-none font-medium"
                  >
                    <option value="" disabled>Select Role</option>
                    {ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="7000xxxxxx"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Page Access *</label>
                  <button 
                    type="button" 
                    onClick={() => handlePageToggle("All")}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-wider underline underline-offset-2"
                  >
                    {formData.pageAccess === "All" ? "Deselect All" : "Select All"}
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {PAGES.map(page => (
                      <label 
                        key={page} 
                        className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all border ${
                          isPageSelected(page) 
                            ? "bg-amber-100/50 border-amber-200 text-amber-900" 
                            : "bg-white border-transparent text-gray-600 hover:bg-white hover:border-gray-200"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isPageSelected(page) ? "bg-amber-500 border-amber-500" : "bg-white border-gray-300"
                        }`}>
                          {isPageSelected(page) && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isPageSelected(page)}
                          onChange={() => handlePageToggle(page)}
                        />
                        <span className="text-xs font-bold leading-none">{page}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.pageAccess}
                  className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {isSubmitting ? (editingUser ? "Updating..." : "Creating...") : (editingUser ? "Update User" : "Save User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
