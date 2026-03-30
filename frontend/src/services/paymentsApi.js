const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("cms_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const parseResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Payment request failed");
  }
  return data;
};

export const initiateEsewaPayment = async (orderId, amount) => {
  const res = await fetch(`${apiBase}/api/payments/initiate/esewa`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      orderId,
      ...(amount !== undefined ? { amount } : {}),
    }),
  });

  return parseResponse(res);
};

export const verifyPayment = async (paymentId) => {
  const res = await fetch(`${apiBase}/api/payments/${paymentId}/verify`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const getPaymentsForOrder = async (orderId) => {
  const res = await fetch(`${apiBase}/api/payments/order/${orderId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};
