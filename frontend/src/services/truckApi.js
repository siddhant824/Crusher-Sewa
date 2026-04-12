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

export const getTrucks = async () => {
  const res = await fetch(`${apiBase}/api/trucks`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};

export const createTruck = async (payload) => {
  const res = await fetch(`${apiBase}/api/trucks`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};

export const updateTruck = async (id, payload) => {
  const res = await fetch(`${apiBase}/api/trucks/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(res);
};

export const deleteTruck = async (id) => {
  const res = await fetch(`${apiBase}/api/trucks/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};
