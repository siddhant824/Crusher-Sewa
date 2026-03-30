import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getReportSummary } from "../services/reportsApi.js";

const ReportsOverview = () => {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const data = await getReportSummary(nextFilters);
      setReport(data);
    } catch (err) {
      toast.error(err.message || "Failed to load report summary");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchReport(filters);
  };

  if (loading && !report) {
    return <div className="py-20 text-center text-stone-500">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Reports</h1>
        <p className="mt-1 text-stone-500">
          Track sales, stock, delivery, and payment performance with date-based summaries.
        </p>
      </div>

      <form onSubmit={handleApplyFilters} className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((current) => ({ ...current, startDate: e.target.value }))}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((current) => ({ ...current, endDate: e.target.value }))}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Apply Filter
          </button>
        </div>
      </form>

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <p className="text-sm text-stone-500">Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">Rs. {report.sales.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <p className="text-sm text-stone-500">Stock Total</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{report.stock.totalStock.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <p className="text-sm text-stone-500">Unpaid Amount</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">Rs. {report.payments.unpaidAmountTotal.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <p className="text-sm text-stone-500">Partial Payment Total</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">Rs. {report.payments.partialPaymentTotal.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-stone-900">Monthly Summary</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[360px]">
                  <thead className="bg-stone-50">
                    <tr className="border-b border-stone-200">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Month</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Revenue</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {report.monthlySummary.map((item) => (
                      <tr key={item.month}>
                        <td className="px-4 py-3 text-sm text-stone-900">{item.label}</td>
                        <td className="px-4 py-3 text-sm text-stone-700">Rs. {item.revenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-stone-700">{item.transactions}</td>
                      </tr>
                    ))}
                    {report.monthlySummary.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-sm text-stone-500">
                          No monthly payment data found for the selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-stone-900">Top Selling Materials</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead className="bg-stone-50">
                    <tr className="border-b border-stone-200">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Material</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {report.topSellingMaterials.map((item) => (
                      <tr key={item.materialName}>
                        <td className="px-4 py-3 text-sm text-stone-900">{item.materialName}</td>
                        <td className="px-4 py-3 text-sm text-stone-700">{item.totalQuantity.toFixed(2)} {item.unit}</td>
                        <td className="px-4 py-3 text-sm text-stone-700">Rs. {item.totalRevenue.toFixed(2)}</td>
                      </tr>
                    ))}
                    {report.topSellingMaterials.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-sm text-stone-500">
                          No top-selling material data found for the selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsOverview;
