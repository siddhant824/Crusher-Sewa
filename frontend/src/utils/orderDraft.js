const DRAFT_ORDER_KEY = "cms_draft_order";

export const getDraftOrder = () => {
  try {
    const stored = localStorage.getItem(DRAFT_ORDER_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveDraftOrder = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    localStorage.removeItem(DRAFT_ORDER_KEY);
    return;
  }

  localStorage.setItem(DRAFT_ORDER_KEY, JSON.stringify(items));
};

export const clearDraftOrder = () => {
  localStorage.removeItem(DRAFT_ORDER_KEY);
};
