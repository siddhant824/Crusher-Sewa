import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getUsers, updateUserStatus } from "../../services/adminApi.js";

const USERS_PER_PAGE = 10;

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.users || []);
    } catch (err) {
      toast.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (roleFilter !== "ALL") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (statusFilter !== "ALL") {
      const isActive = statusFilter === "ACTIVE";
      filtered = filtered.filter((user) => user.isActive === isActive);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, roleFilter, statusFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [currentPage, filteredUsers]);
  const pageStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length);

  const handleStatusToggle = async (userId, currentStatus) => {
    setUpdatingId(userId);
    try {
      await updateUserStatus(userId, !currentStatus);
      toast.success(`User ${!currentStatus ? "activated" : "deactivated"}`);
      setUsers(
        users.map((user) => {
          const uid = user._id || user.id;
          return uid === userId ? { ...user, isActive: !currentStatus } : user;
        })
      );
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      ADMIN: "bg-rose-50 text-rose-700 border-rose-200",
      MANAGER: "bg-sky-50 text-sky-700 border-sky-200",
      CONTRACTOR: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return styles[role] || "bg-stone-50 text-stone-700 border-stone-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-stone-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Users</h1>
          <p className="text-stone-500 mt-1">
            {filteredUsers.length} of {users.length} users
          </p>
        </div>
        <Link
          to="/admin/users/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add User
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="CONTRACTOR">Contractor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-stone-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-stone-600 font-medium">No users found</p>
            <p className="text-sm text-stone-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedUsers.map((user) => {
                  const userId = user._id || user.id;
                  return (
                    <tr key={userId} className="hover:bg-stone-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center">
                            <span className="text-teal-700 font-medium text-sm">
                              {user.name?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{user.name}</p>
                            <p className="text-sm text-stone-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-sm ${user.isActive ? "text-teal-600" : "text-stone-400"}`}>
                          <span className={`w-2 h-2 rounded-full ${user.isActive ? "bg-teal-500" : "bg-stone-300"}`}></span>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleStatusToggle(userId, user.isActive)}
                          disabled={updatingId === userId}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                            user.isActive
                              ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                              : "bg-teal-50 text-teal-600 hover:bg-teal-100"
                          }`}
                        >
                          {updatingId === userId
                            ? "..."
                            : user.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filteredUsers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-stone-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">
              Showing {pageStart}-{pageEnd} of {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;
