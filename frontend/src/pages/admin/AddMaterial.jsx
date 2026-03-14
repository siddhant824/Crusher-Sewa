import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth.js";
import { createMaterial } from "../../services/materialsApi.js";

const AddMaterial = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === "ADMIN" ? "/admin" : "/manager";
  const [formData, setFormData] = useState({
    name: "",
    ratePerCuMetre: "",
    unit: "cubic metre",
    stock: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a valid image file (jpg, png, or webp)");
      e.target.value = "";
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      e.target.value = "";
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name.trim() || !formData.ratePerCuMetre) {
      toast.error("Please fill in name and rate per cubic metre");
      setLoading(false);
      return;
    }

    const rate = parseFloat(formData.ratePerCuMetre);
    if (isNaN(rate) || rate < 0) {
      toast.error("Rate per cubic metre must be a valid positive number");
      setLoading(false);
      return;
    }

    try {
      const submitFormData = new FormData();
      submitFormData.append("name", formData.name.trim());
      submitFormData.append("ratePerCuMetre", rate.toString());
      submitFormData.append("unit", formData.unit.trim() || "cubic metre");
      if (formData.stock) {
        submitFormData.append("stock", formData.stock.toString());
      }
      if (imageFile) {
        submitFormData.append("image", imageFile);
      }

      await createMaterial(submitFormData);
      toast.success("Material created successfully");
      navigate(`${basePath}/materials`);
    } catch (err) {
      toast.error(err.message || "Failed to create material");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Add Material</h1>
        <p className="text-stone-500 mt-1">Create a new construction material</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Material Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Material Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., River Sand"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          {/* Rate Per Cubic Metre */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Rate Per Cubic Metre (Rs.) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="ratePerCuMetre"
              value={formData.ratePerCuMetre}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Unit
            </label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              placeholder="cubic metre"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Stock (Optional)
            </label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              placeholder="0"
              step="0.01"
              min="0"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Material Image (Optional)
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center justify-center px-4 py-2.5 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-stone-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-stone-700">
                      {imageFile ? "Change Image" : "Choose Image"}
                    </span>
                  </div>
                </label>
                {imageFile && (
                  <span className="text-sm text-stone-600">
                    {imageFile.name} ({(imageFile.size / 1024).toFixed(2)} KB)
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Accepted formats: JPG, PNG, WEBP. Max size: 2MB
              </p>
              {imagePreview && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-stone-700 mb-2">
                    Preview:
                  </p>
                  <div className="w-full max-w-xs border border-stone-200 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create Material"}
            </button>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/materials`)}
              className="px-6 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterial;
