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

export const getMyPayments = async () => {
  const res = await fetch(`${apiBase}/api/payments/my`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const getAllPayments = async ({ status = "", provider = "", search = "" } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (provider) params.set("provider", provider);
  if (search) params.set("search", search);

  const query = params.toString();
  const res = await fetch(`${apiBase}/api/payments${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const getPaymentSummary = async () => {
  const res = await fetch(`${apiBase}/api/payments/summary`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const recordManualPayment = async (payload) => {
  const res = await fetch(`${apiBase}/api/payments/manual`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};
