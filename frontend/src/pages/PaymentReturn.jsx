import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";

const PaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get("paymentStatus") || "PENDING";
  const paymentId = searchParams.get("paymentId") || "";
  const orderId = searchParams.get("orderId") || "";

  useEffect(() => {
    if (!window.opener || window.opener.closed) {
      return;
    }

    window.opener.postMessage(
      {
        type: "ESEWA_PAYMENT_RESULT",
        paymentStatus,
        paymentId,
        orderId,
      },
      window.location.origin
    );

    window.setTimeout(() => {
      window.close();
    }, 300);
  }, [orderId, paymentId, paymentStatus]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">Payment Update</h1>
        <p className="mt-3 text-sm text-stone-600">
          Payment returned with status: <span className="font-medium text-stone-900">{paymentStatus}</span>
        </p>
        <p className="mt-2 text-sm text-stone-500">
          This tab will close automatically. If it does not, use the button below.
        </p>
        <Link
          to="/contractor/orders"
          className="mt-6 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Back to Orders
        </Link>
      </div>
    </div>
  );
};

export default PaymentReturn;
