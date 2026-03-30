import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getInvoiceById } from "../services/invoicesApi.js";
import { useAuth } from "../hooks/useAuth.js";

const InvoiceView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const basePath =
    user?.role === "CONTRACTOR" ? "/contractor/orders" : `/${user?.role === "ADMIN" ? "admin" : "manager"}/invoices`;

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const data = await getInvoiceById(id);
        setInvoice(data.invoice);
      } catch (err) {
        toast.error(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="py-20 text-center text-stone-500">Invoice not found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Invoice {invoice.invoiceNumber}</h1>
          <p className="mt-1 text-stone-500">
            Generated on {new Date(invoice.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Print / Save PDF
          </button>
          <Link
            to={basePath}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 border-b border-stone-200 pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Crusher Sewa</h2>
            <p className="mt-2 text-sm text-stone-500">Construction Material Invoice</p>
          </div>
          <div className="text-sm text-stone-600">
            <p><span className="font-medium text-stone-900">Contractor:</span> {invoice.contractor?.name}</p>
            <p><span className="font-medium text-stone-900">Email:</span> {invoice.contractor?.email}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-stone-50">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Material</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {invoice.order?.items?.map((item) => (
                <tr key={`${invoice._id}-${item.materialName}`}>
                  <td className="px-4 py-3 text-sm text-stone-900">{item.materialName}</td>
                  <td className="px-4 py-3 text-sm text-stone-700">{Number(item.quantity).toFixed(2)} {item.unit}</td>
                  <td className="px-4 py-3 text-sm text-stone-700">Rs. {Number(item.ratePerCuMetre).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-stone-900">Rs. {Number(item.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between text-sm text-stone-600">
              <span>Subtotal</span>
              <span>Rs. {Number(invoice.subtotalAmount).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-base font-semibold text-stone-900">
              <span>Total</span>
              <span>Rs. {Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
