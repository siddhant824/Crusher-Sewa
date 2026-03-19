import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { getMyOrders } from "../../services/ordersApi.js";

const Profile = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    delivered: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getMyOrders();
        const orders = data.orders || [];

        setStats({
          total: orders.length,
          pending: orders.filter((order) => order.orderStatus === "PENDING").length,
          delivered: orders.filter((order) => order.deliveryStatus === "DELIVERED").length,
        });
      } catch {
        setStats({
          total: 0,
          pending: 0,
          delivered: 0,
        });
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className="mb-8 rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#ecfeff_0%,#ffffff_48%,#fff7ed_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
              Account Overview
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">
              Your contractor profile
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              View your account details and a quick snapshot of recent ordering activity.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Orders", value: stats.total },
              { label: "Pending", value: stats.pending },
              { label: "Delivered", value: stats.delivered },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-teal-100">
                <span className="text-3xl font-semibold text-teal-700">
                  {user?.name?.charAt(0) || "?"}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-stone-900">{user?.name}</h2>
              <p className="mt-1 text-sm text-stone-500">{user?.email}</p>
              <span className="mt-4 inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                Contractor Account
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Account Details</h3>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">
                    Full Name
                  </label>
                  <p className="text-stone-900">{user?.name}</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">
                    Email Address
                  </label>
                  <p className="text-stone-900">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">
                    Account Type
                  </label>
                  <p className="text-stone-900">{user?.role}</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">
                    Account Status
                  </label>
                  <p className="font-medium text-teal-600">Active</p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-stone-200 pt-6">
              <p className="text-sm text-stone-500">
                Need to update your profile information? Contact support for assistance.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Activity Summary</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Total Orders", value: stats.total },
                { label: "Pending", value: stats.pending },
                { label: "Delivered", value: stats.delivered },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-stone-50 p-4 text-center">
                  <p className="text-2xl font-semibold text-stone-900">{stat.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
