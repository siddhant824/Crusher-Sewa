import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth.js";
import { getMaterials, updateMaterial, deleteMaterial } from "../../services/materialsApi.js";

const ManageMaterials = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    ratePerCuMetre: "",
    unit: "",
    stock: "",
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = user?.role === "ADMIN";
  const basePath = isAdmin ? "/admin" : "/manager";

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await getMaterials();
      setMaterials(data.materials || []);
    } catch (err) {
      toast.error(err.message || "Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (material) => {
    setEditingId(material._id);
    setEditForm({
      name: material.name || "",
      ratePerCuMetre: material.ratePerCuMetre || "",
      unit: material.unit || "cubic metre",
      stock: material.stock || "",
    });
    setEditImageFile(null);
    setEditImagePreview(material.imageUrl || null);
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setEditImageFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a valid image file (jpg, png, or webp)");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      e.target.value = "";
      return;
    }

    setEditImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      let submitData;

      if (editImageFile) {
        // If new image is uploaded, use FormData
        const formData = new FormData();
        formData.append("name", editForm.name.trim());
        formData.append("ratePerCuMetre", parseFloat(editForm.ratePerCuMetre).toString());
        formData.append("unit", editForm.unit.trim() || "cubic metre");
        formData.append("stock", editForm.stock ? parseFloat(editForm.stock).toString() : "0");
        formData.append("image", editImageFile);
        submitData = formData;
      } else {
        // No new image, send JSON
        submitData = {
          name: editForm.name.trim(),
          ratePerCuMetre: parseFloat(editForm.ratePerCuMetre),
          unit: editForm.unit.trim() || "cubic metre",
          stock: editForm.stock ? parseFloat(editForm.stock) : 0,
        };
      }

      await updateMaterial(editingId, submitData);
      toast.success("Material updated successfully");
      setEditingId(null);
      setEditForm({ name: "", ratePerCuMetre: "", unit: "", stock: "" });
      setEditImageFile(null);
      setEditImagePreview(null);
      fetchMaterials();
    } catch (err) {
      toast.error(err.message || "Failed to update material");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material?")) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteMaterial(id);
      toast.success("Material deleted successfully");
      fetchMaterials();
    } catch (err) {
      toast.error(err.message || "Failed to delete material");
    } finally {
      setDeletingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", ratePerCuMetre: "", unit: "", stock: "" });
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-stone-500">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Materials</h1>
          <p className="text-stone-500 mt-1">
            {materials.length} material{materials.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <Link
          to={`${basePath}/materials/add`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Material
        </Link>
      </div>

      {/* Materials Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-stone-200 rounded-xl">
            <svg className="w-12 h-12 text-stone-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-stone-600 font-medium">No materials found</p>
            <p className="text-sm text-stone-400 mt-1">Add your first material to get started</p>
          </div>
        ) : (
          materials.map((material) => {
            const isEditing = editingId === material._id;
            const imageUrl = material.imageUrl
              ? material.imageUrl.startsWith("http")
                ? material.imageUrl
                : `${apiBase}${material.imageUrl}`
              : null;

            return (
              <div
                key={material._id}
                className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
              >
                {isEditing ? (
                  // Edit Form
                  <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Rate (Rs.)</label>
                      <input
                        type="number"
                        name="ratePerCuMetre"
                        value={editForm.ratePerCuMetre}
                        onChange={handleEditChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">Unit</label>
                        <input
                          type="text"
                          name="unit"
                          value={editForm.unit}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">Stock</label>
                        <input
                          type="number"
                          name="stock"
                          value={editForm.stock}
                          onChange={handleEditChange}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Image (optional)</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleEditImageChange}
                        className="w-full text-xs"
                      />
                      {editImagePreview && (
                        <img src={editImagePreview} alt="Preview" className="mt-2 w-full h-24 object-cover rounded" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 px-3 py-2 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-3 py-2 text-xs border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  // Display Card
                  <>
                    {imageUrl && (
                      <div className="w-full h-48 bg-stone-100">
                        <img src={imageUrl} alt={material.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-stone-900">{material.name}</h3>
                        {material.stock !== undefined && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-teal-50 text-teal-700">
                            Stock: {material.stock}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 mb-2">Per {material.unit}</p>
                      <p className="text-lg font-semibold text-stone-900 mb-4">
                        Rs. {material.ratePerCuMetre?.toFixed(2)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(material)}
                          className="flex-1 px-3 py-2 text-xs bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 font-medium"
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(material._id)}
                            disabled={deletingId === material._id}
                            className="px-3 py-2 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium disabled:opacity-50"
                          >
                            {deletingId === material._id ? "..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ManageMaterials;
