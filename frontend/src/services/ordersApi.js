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

export const createOrder = async (items) => {
  const res = await fetch(`${apiBase}/api/orders`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ items }),
  });

  return parseResponse(res);
};

export const getMyOrders = async () => {
  const res = await fetch(`${apiBase}/api/orders/my`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const getAllOrders = async () => {
  const res = await fetch(`${apiBase}/api/orders`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const updateOrderStatus = async (orderId, orderStatus, reviewNote = "") => {
  const res = await fetch(`${apiBase}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderStatus, reviewNote }),
  });

  return parseResponse(res);
};

export const createDeliveryTrip = async (payload) => {
  const res = await fetch(`${apiBase}/api/delivery-trips`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};

export const updateDeliveryTrip = async (tripId, payload) => {
  const res = await fetch(`${apiBase}/api/delivery-trips/${tripId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};
