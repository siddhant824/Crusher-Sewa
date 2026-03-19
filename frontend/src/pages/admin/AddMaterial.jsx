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
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Add Material</h1>
        <p className="mt-2 text-sm text-stone-500">Create a new construction material for the system.</p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
              required
            />
          </div>

          {/* Rate Per Cubic Metre */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Rate Per Cubic Metre (Rs.) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              name="ratePerCuMetre"
              value={formData.ratePerCuMetre}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
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
                className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Stock (Optional)
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="0"
                className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Material Image (Optional)
            </label>
            <div className="space-y-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-3 transition-colors hover:border-teal-500 hover:bg-teal-50">
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
                  <span className="text-sm text-stone-600 break-all">
                    {imageFile.name} ({(imageFile.size / 1024).toFixed(2)} KB)
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Accepted formats: JPG, PNG, WEBP. Max size: 2MB
              </p>
              {imagePreview && (
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-2">
                    Preview:
                  </p>
                  <div className="w-full max-w-xs overflow-hidden rounded-xl border border-stone-200 bg-white">
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
          <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/materials`)}
              className="rounded-xl border border-stone-300 px-6 py-3 font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-teal-600 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterial;
