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
    throw new Error(data.message || "Invoice request failed");
  }
  return data;
};

export const getInvoices = async () => {
  const res = await fetch(`${apiBase}/api/invoices`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const getInvoiceById = async (invoiceId) => {
  const res = await fetch(`${apiBase}/api/invoices/${invoiceId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const generateInvoice = async (payload) => {
  const res = await fetch(`${apiBase}/api/invoices`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};
