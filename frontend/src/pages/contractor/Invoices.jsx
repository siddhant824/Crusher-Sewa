import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getInvoices } from "../../services/invoicesApi.js";

const Invoices = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const data = await getInvoices();
        setInvoices(data.invoices || []);
      } catch (err) {
        toast.error(err.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const selectedOrderId = searchParams.get("order") || "";

  const filteredInvoices = useMemo(() => {
    if (!selectedOrderId) {
      return invoices;
    }

    return invoices.filter(
      (invoice) => String(invoice.order?._id || invoice.order) === selectedOrderId
    );
  }, [invoices, selectedOrderId]);

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_45%,#eff6ff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
              Invoices
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">View invoices separately from order tracking</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              Open, review, and download invoice files without digging through every order card.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Invoices</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">{filteredInvoices.length}</p>
          </div>
        </div>
      </div>

      {selectedOrderId && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Clear selected order
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-stone-50">
              <tr className="border-b border-stone-200">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Invoice</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Order Total</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Order Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Delivery</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Payment</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Generated</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-stone-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice._id}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-stone-900">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-stone-500">
                      {invoice.order?.items?.length || 0} material{(invoice.order?.items?.length || 0) > 1 ? "s" : ""}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-stone-900">
                    Rs. {Number(invoice.totalAmount || invoice.order?.totalAmount || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">{invoice.order?.orderStatus || "-"}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{invoice.order?.deliveryStatus || "-"}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{invoice.order?.paymentStatus || "-"}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{new Date(invoice.generatedAt || invoice.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      to={`/contractor/invoices/${invoice._id}`}
                      className="inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                    >
                      Open Invoice
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-stone-500">
                    No invoices available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Invoices;
