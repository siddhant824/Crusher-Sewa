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
    throw new Error(data.message || "Report request failed");
  }
  return data;
};

export const getReportSummary = async () => {
  const res = await fetch(`${apiBase}/api/reports/summary`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return parseResponse(res);
};
