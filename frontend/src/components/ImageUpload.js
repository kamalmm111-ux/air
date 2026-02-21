import { useState, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  Upload, X, Camera, Image as ImageIcon, 
  Loader2, Check, AlertCircle, Trash2 
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Reusable Image Upload Component
 * 
 * Features:
 * - Drag & drop upload
 * - Click to browse
 * - Camera capture on mobile
 * - Image preview
 * - Progress indicator
 * - Validation (type, size)
 * 
 * @param {string} value - Current image URL
 * @param {function} onChange - Callback when image changes (receives URL)
 * @param {string} category - Image category for organization (drivers, vehicles, banners, etc.)
 * @param {string} label - Field label
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Disable the component
 * @param {string} className - Additional CSS classes
 * @param {object} headers - Auth headers for API calls
 */
const ImageUpload = ({ 
  value, 
  onChange, 
  category = "general",
  label = "Image",
  placeholder = "Click to upload or drag & drop",
  disabled = false,
  className = "",
  headers = {}
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Validate file before upload
  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Please upload JPG, PNG, WebP, or GIF.";
    }

    if (file.size > maxSize) {
      return "File too large. Maximum size is 5MB.";
    }

    return null;
  };

  // Upload file to server
  const uploadFile = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API}/api/upload/image?category=${category}`,
        formData,
        {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        const imageUrl = `${API}${response.data.image_url}`;
        onChange(imageUrl);
        toast.success("Image uploaded successfully!");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to upload image";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
    } else {
      toast.error("Please drop an image file");
    }
  }, [disabled, category, headers, onChange]);

  // Remove current image
  const handleRemove = () => {
    onChange("");
    setError(null);
  };

  // Open camera on mobile
  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200
          ${dragOver ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#D4AF37]/50'}
          ${error ? 'border-red-400' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        {/* Upload area content */}
        {value ? (
          /* Image preview */
          <div className="relative group">
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-48 object-cover rounded-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";
              }}
            />
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-1" />
                Replace
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={uploading}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
            {/* Success indicator */}
            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
              <Check className="w-4 h-4" />
            </div>
          </div>
        ) : (
          /* Upload prompt */
          <div className="p-8 text-center">
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{placeholder}</p>
                <p className="text-xs text-gray-400">JPG, PNG, WebP or GIF (max 5MB)</p>
                
                {/* Action buttons */}
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={disabled}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Browse
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCameraCapture();
                    }}
                    disabled={disabled}
                    className="md:hidden" // Only show on mobile
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Camera
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Manual URL input (fallback) */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>or paste URL:</span>
        <Input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="h-7 text-xs flex-1"
          disabled={disabled || uploading}
        />
      </div>
    </div>
  );
};

export default ImageUpload;
