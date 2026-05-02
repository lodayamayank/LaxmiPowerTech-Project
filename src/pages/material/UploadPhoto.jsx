import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCamera, FaCheckCircle, FaImages } from "react-icons/fa";
import { Upload, X } from "lucide-react";
import axios from "../../utils/axios";
import { toast } from "react-toastify";
import { getSelectedBranchName } from '../../utils/branchContext';

export default function UploadPhoto() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [indentId, setIndentId] = useState("");
  const selectedBranchName = getSelectedBranchName() || '';
  const [project] = useState(selectedBranchName);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Generate Intent ID on mount
  useEffect(() => {
    const generateIntentId = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomStr = '';
      for (let i = 0; i < 4; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      return `PO-${dateStr}-${randomStr}`;
    };
    
    setIndentId(generateIntentId());
  }, []);

  // Compress image before upload
  const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            console.log(`📦 Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`);
            resolve(compressed);
          }, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size should be less than 10MB');
        return;
      }
      const compressed = await compressImage(file);
      setSelectedImage(compressed);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(compressed);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!indentId.trim()) {
      toast.error('Please enter Intent ID');
      return;
    }
    if (!project) {
      toast.error('Please select a project');
      return;
    }
    if (!selectedImage) {
      toast.error('Please select an image to upload');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('indentId', indentId);
      formData.append('project', project);
      formData.append('image', selectedImage);
      formData.append('uploadedBy', user._id || user.id);

      console.log('📤 Uploading indent photo...');
      console.log('🆔 Indent ID:', indentId);
      console.log('👤 User ID:', user._id || user.id);
      console.log('📸 Image:', selectedImage.name, selectedImage.size, 'bytes');
      console.log('🌐 Endpoint: /indents/upload-photo');

      const response = await axios.post('/indents/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success('Intent list uploaded successfully!');
        // Trigger refresh event for Intent list
        window.dispatchEvent(new Event('intentCreated'));
        localStorage.setItem('intentRefresh', Date.now().toString());
        
        // Trigger refresh for Upcoming Deliveries
        localStorage.setItem('upcomingDeliveryRefresh', Date.now().toString());
        
        // Navigate back to Intent page after short delay
        setTimeout(() => {
          navigate('/material/intent');
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to upload intent list');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Container with consistent mobile width */}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate('/material/intent')}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Upload Intent List</h1>
            <p className="text-white/80 text-sm">{user?.name || 'User'}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 -mt-4">
          {/* Intent ID Input */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Intent ID (Auto-generated)</label>
            <input
              type="text"
              value={indentId}
              readOnly
              className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-gray-700 font-mono font-semibold cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">This ID is automatically generated and cannot be edited</p>
          </div>

          {/* Project / Site (Auto-filled) */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Site <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={project}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-100 text-gray-700 font-medium cursor-not-allowed"
              readOnly
              disabled
            />
            {!project && (
              <p className="text-xs text-red-500 mt-1">No project selected. Please go back and select a project first.</p>
            )}
          </div>

          {/* Upload Section */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">Material List Photo</label>
            
            {!imagePreview ? (
              <div className="space-y-3">
                {/* Camera + Gallery hidden inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Camera Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  <FaCamera size={24} />
                  <span className="text-lg font-bold">Take Photo</span>
                </button>

                {/* Gallery Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  <FaImages size={24} />
                  <span className="text-lg font-bold">Choose from Gallery</span>
                </button>

                <p className="text-center text-gray-400 text-xs">JPG, PNG or JPEG (Max 10MB) • Auto-compressed</p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 shadow-md">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-64 object-cover"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-lg"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <p className="text-white text-sm font-medium">{selectedImage?.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={uploading || !indentId || !project || !selectedImage}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>Upload Intent List</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
