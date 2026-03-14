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
    throw new Error(data.message || "Request failed");
  }
  return data;
};

export const createProductionEntry = async (payload) => {
  const res = await fetch(`${apiBase}/api/stock/production`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};

export const createManualAdjustment = async (payload) => {
  const res = await fetch(`${apiBase}/api/stock/manual-adjustment`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};

export const getInventoryLogs = async () => {
  const res = await fetch(`${apiBase}/api/stock/inventory-logs`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const getProductionLogs = async () => {
  const res = await fetch(`${apiBase}/api/stock/production-logs`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};
