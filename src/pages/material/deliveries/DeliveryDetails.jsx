import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X } from "lucide-react";
import { upcomingDeliveryAPI } from "@/api/material";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const DECIMAL_UNITS = new Set([
  "kg",
  "kgs",
  "kilogram",
  "kilograms",
  "m",
  "mtr",
  "mtrs",
  "meter",
  "meters",
  "metre",
  "metres",
  "ltr",
  "ltrs",
  "liter",
  "liters",
  "litre",
  "litres",
  "sqft",
  "sqm",
  "sq m",
  "sq.m",
  "cum",
  "cubic meter",
]);

const getDeliveryId = (delivery) => delivery?._id || delivery?.id;
const getItemId = (material) => material?.itemId || material?._id;
const getRequestedQty = (material) =>
  Number(material?.quantity ?? material?.st_quantity ?? 0);
const getReceivedQty = (material) => Number(material?.received_quantity ?? 0);
const getUnit = (material) => material?.unit || material?.uom || "units";
const canUseDecimalQuantity = (unit = "") =>
  DECIMAL_UNITS.has(String(unit).trim().toLowerCase());

const getMaterialName = (material) => {
  const category = material?.category || "";
  const subCategory = material?.subCategory || material?.sub_category || "";
  const subCategory1 = material?.subCategory1 || material?.sub_category1 || "";
  const subCategory2 = material?.subCategory2 || material?.sub_category2 || "";
  const existingName =
    material?.materialName || material?.itemName || material?.name || "";

  if (existingName) return existingName;

  const parts = [category, subCategory, subCategory1, subCategory2].filter(
    Boolean
  );
  return parts.length ? parts.join(" - ") : "Material Item";
};

const normalizeMaterials = (delivery) => {
  const rawMaterials = delivery?.materials || delivery?.items || [];
  return rawMaterials.map((material) => {
    const requestedQty = getRequestedQty(material);
    const receivedQty = getReceivedQty(material);
    const remainingQty = Math.max(requestedQty - receivedQty, 0);

    return {
      ...material,
      receive_now: "",
      full_receive: remainingQty === 0,
      is_received: remainingQty === 0 || Boolean(material.is_received),
    };
  });
};

export default function DeliveryDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeDeliveryId } = useParams();

  const locationItem = location.state?.item;
  const locationType = location.state?.type;
  const [delivery, setDelivery] = useState(locationItem || null);
  const [deliveryType, setDeliveryType] = useState(
    locationType || locationItem?.type || "PO"
  );
  const [materials, setMaterials] = useState(() =>
    normalizeMaterials(locationItem)
  );
  const [deliveryImages, setDeliveryImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [loading, setLoading] = useState(
    !locationItem && Boolean(routeDeliveryId)
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadDelivery = async () => {
      if (locationItem) {
        setDelivery(locationItem);
        setDeliveryType(locationType || locationItem.type || "PO");
        setMaterials(normalizeMaterials(locationItem));
        return;
      }

      if (!routeDeliveryId) {
        navigate(-1);
        return;
      }

      try {
        setLoading(true);
        const response = await upcomingDeliveryAPI.getById(routeDeliveryId);
        if (!ignore && response.success) {
          setDelivery(response.data);
          setDeliveryType(response.data?.type || "PO");
          setMaterials(normalizeMaterials(response.data));
        }
      } catch (error) {
        console.error("❌ Error loading delivery details:", error);
        if (!ignore) {
          setValidationError(
            "Delivery details could not be loaded. Please go back and try again."
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadDelivery();

    return () => {
      ignore = true;
    };
  }, [locationItem, locationType, navigate, routeDeliveryId]);

  const deliveryId = getDeliveryId(delivery);

  const selectedItems = useMemo(() => {
    return materials.filter(
      (material) => Number(material.receive_now || 0) > 0
    );
  }, [materials]);

  const handleCheckbox = (id, checked) => {
    setMaterials((prev) =>
      prev.map((material) => {
        if (getItemId(material) !== id) return material;

        const remainingQty = Math.max(
          getRequestedQty(material) - getReceivedQty(material),
          0
        );
        return {
          ...material,
          receive_now: checked && remainingQty > 0 ? String(remainingQty) : "",
          full_receive: checked,
          is_received: checked && remainingQty > 0,
        };
      })
    );
  };

  const handleReceiveNowChange = (id, value) => {
    setMaterials((prev) =>
      prev.map((material) => {
        if (getItemId(material) !== id) return material;

        const remainingQty = Math.max(
          getRequestedQty(material) - getReceivedQty(material),
          0
        );
        const numericValue = Number(value);
        const isFull =
          Number.isFinite(numericValue) &&
          numericValue > 0 &&
          numericValue >= remainingQty;

        return {
          ...material,
          receive_now: value,
          full_receive: isFull,
          is_received: isFull,
        };
      })
    );
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    setDeliveryImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (index) => {
    setDeliveryImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreview((prev) => prev.filter((_, i) => i !== index));
  };

  const validateBeforeSubmit = () => {
    if (deliveryImages.length === 0) {
      return "Delivery Proof (Challan) is required. Please upload at least one image.";
    }

    if (selectedItems.length === 0) {
      return "Enter received quantity for at least one material.";
    }

    for (const material of selectedItems) {
      const materialName = getMaterialName(material);
      const currentQty = Number(material.receive_now);
      const requestedQty = getRequestedQty(material);
      const alreadyReceivedQty = getReceivedQty(material);
      const remainingQty = Math.max(requestedQty - alreadyReceivedQty, 0);
      const unit = getUnit(material);

      if (!Number.isFinite(currentQty) || currentQty <= 0) {
        return `${materialName}: received quantity must be greater than 0.`;
      }

      if (currentQty > remainingQty) {
        return `${materialName}: received quantity cannot exceed remaining quantity (${remainingQty} ${unit}).`;
      }

      if (!canUseDecimalQuantity(unit) && !Number.isInteger(currentQty)) {
        return `${materialName}: decimal quantity is not allowed for ${unit}.`;
      }
    }

    return "";
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const errorMessage = validateBeforeSubmit();
    if (errorMessage) {
      setValidationError(errorMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const totalReceivedNow = selectedItems.reduce(
      (total, material) => total + Number(material.receive_now || 0),
      0
    );
    const confirmed = window.confirm(
      `Confirm delivery receipt for ${selectedItems.length} material(s), total quantity ${totalReceivedNow}?`
    );
    if (!confirmed) return;

    setSubmitting(true);
    setValidationError("");

    try {
      console.log("📤 Uploading delivery proof images:", deliveryImages.length);
      const uploadResponse = await upcomingDeliveryAPI.uploadReceipts(
        deliveryId,
        deliveryImages
      );

      if (!uploadResponse.success) {
        setValidationError(
          "Failed to upload delivery proof. Please try again."
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const formattedItems = selectedItems.map((material) => {
        const currentQty = Number(material.receive_now);
        const remainingQty = Math.max(
          getRequestedQty(material) - getReceivedQty(material),
          0
        );

        return {
          itemId: getItemId(material),
          currentReceivedQuantity: currentQty,
          received_now: currentQty,
          isFullDelivery: currentQty >= remainingQty,
        };
      });

      console.log("📤 Submitting delivery update:", {
        deliveryId,
        items: formattedItems,
      });

      const response = await upcomingDeliveryAPI.updateItems(
        deliveryId,
        formattedItems,
        {
          receiptAttachments: uploadResponse.attachments || [],
        }
      );

      if (response.success) {
        const updatedStatus = response.data?.status || "Pending";
        alert(
          updatedStatus === "Transferred"
            ? "Delivery completed and moved to GRN."
            : "Partial delivery saved. Remaining quantity will stay in Upcoming Deliveries."
        );
        navigate(-1);
      } else {
        setValidationError(response.message || "Failed to update delivery.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      console.error("❌ Error updating delivery:", error);
      setValidationError(
        error.response?.data?.message ||
          "Error updating delivery. Please try again."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !delivery) {
    return (
      <div className="min-h-screen bg-tone-highlight-soft flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line-card mx-auto mb-4"></div>
          <p className="text-ink-3">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tone-highlight-soft">
      <div className="max-w-md mx-auto bg-surface shadow-xl">
        <div className="bg-primary text-primary-foreground hover:bg-primary-strong px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <Button
            variant="ghost"
            className="mobile-back-button absolute top-6 left-6 h-auto rounded-full border border-white/70 bg-surface px-3 py-1.5 text-sm font-medium text-tone-highlight-fg shadow-sm hover:bg-tone-highlight-soft hover:text-primary-strong"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </Button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">
              Delivery Details
            </h1>
            <p className="text-white/80 text-sm">
              {deliveryType} - {deliveryId}
            </p>
          </div>
        </div>

        <div className="px-6 py-6 -mt-4 pb-24">
          <div className="space-y-4">
            {validationError && (
              <div className="bg-tone-bad-soft border-2 border-tone-bad-border rounded-lg p-4 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-tone-bad-solid flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-bold text-sm">!</span>
                </div>
                <div className="flex-1">
                  <p className="text-tone-bad-fg text-sm font-medium">
                    {validationError}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Dismiss validation error"
                  onClick={() => setValidationError("")}
                  className="text-tone-bad-fg hover:text-primary-strong transition-colors"
                >
                  <X size={18} />
                </Button>
              </div>
            )}

            <div className="bg-surface rounded-lg border p-4">
              <h2 className="font-semibold text-ink-1 mb-3">
                Delivery Information
              </h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-ink-3 font-medium">Delivery ID</span>
                  <span className="font-semibold text-ink-1 text-right">
                    {delivery.transfer_number || deliveryId}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-ink-3 font-medium">Type</span>
                  <Badge
                    className={`border-0 text-xs px-3 py-1 rounded-full font-semibold ${
                      deliveryType === "PO"
                        ? "bg-tone-info-soft text-tone-info-fg"
                        : "bg-tone-purple-soft text-tone-purple-fg"
                    }`}
                  >
                    {deliveryType === "PO" ? "Purchase Order" : "Site Transfer"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-ink-3 font-medium">From</span>
                  <span className="font-semibold text-ink-1 text-right">
                    {delivery.from || delivery.vendor_name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-ink-3 font-medium">To</span>
                  <span className="font-semibold text-ink-1 text-right">
                    {delivery.to || delivery.delivery_site || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-ink-3 font-medium">
                    Intent Request Date
                  </span>
                  <span className="font-semibold text-ink-1 text-right">
                    {new Date(
                      delivery.createdAt || delivery.date
                    ).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-ink-3 font-medium">Status</span>
                  <Badge
                    className={`border-0 text-xs px-3 py-1 rounded-full font-semibold ${
                      delivery.status === "Transferred"
                        ? "bg-tone-ok-soft text-tone-ok-fg"
                        : delivery.status === "Partial"
                        ? "bg-tone-warn-soft text-tone-warn-fg"
                        : delivery.status === "Pending"
                        ? "bg-tone-highlight-soft text-tone-highlight-fg"
                        : "bg-surface-muted text-ink-2"
                    }`}
                  >
                    {delivery.status || "Pending"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-lg border p-4">
              <h2 className="font-semibold text-ink-1 mb-3">
                Materials ({materials.length})
              </h2>

              <div className="space-y-3">
                {materials.map((material, index) => {
                  const itemId = getItemId(material);
                  const category = material.category || "";
                  const requestedQty = getRequestedQty(material);
                  const alreadyReceivedQty = getReceivedQty(material);
                  const remainingQty = Math.max(
                    requestedQty - alreadyReceivedQty,
                    0
                  );
                  const receiveNowQty = Number(material.receive_now || 0);
                  const pendingAfterQty = Math.max(
                    remainingQty -
                      (Number.isFinite(receiveNowQty) ? receiveNowQty : 0),
                    0
                  );
                  const unit = getUnit(material);
                  const itemComplete = remainingQty === 0;

                  return (
                    <div
                      key={itemId || index}
                      className="bg-surface-subtle rounded-lg border border-line-card p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-xs font-bold text-ink-3 mt-1">
                              #{index + 1}
                            </span>
                            <p className="text-sm font-bold text-ink-1 leading-snug">
                              {getMaterialName(material)}
                            </p>
                          </div>

                          {category && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-ink-3 font-medium">
                                Category:
                              </span>
                              <span className="text-xs text-ink-1 font-semibold bg-tone-info-soft px-2 py-0.5 rounded">
                                {category}
                              </span>
                            </div>
                          )}
                        </div>
                        {isEditMode && (
                          <Checkbox
                            checked={Boolean(material.full_receive)}
                            disabled={itemComplete}
                            onCheckedChange={(checked) =>
                              handleCheckbox(itemId, checked === true)
                            }
                            aria-label="Receive full remaining quantity"
                            className="w-7 h-7 rounded-lg border-2 border-line-input data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 data-[state=checked]:text-white [&_svg]:h-5 [&_svg]:w-5"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-line-card">
                        <div>
                          <label className="text-xs text-ink-3 font-medium block mb-1">
                            Requested
                          </label>
                          <p className="text-sm font-bold text-tone-highlight-fg">
                            {requestedQty} {unit}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-ink-3 font-medium block mb-1">
                            Previously Received
                          </label>
                          <p className="text-sm font-bold text-tone-ok-fg">
                            {alreadyReceivedQty} {unit}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-ink-3 font-medium block mb-1">
                            Remaining
                          </label>
                          <p className="text-sm font-bold text-ink-1">
                            {remainingQty} {unit}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-ink-3 font-medium block mb-1">
                            Status
                          </label>
                          <Badge
                            className={`border-0 text-xs px-2 py-1 rounded-full font-semibold ${
                              itemComplete
                                ? "bg-tone-ok-soft text-tone-ok-fg"
                                : alreadyReceivedQty > 0
                                ? "bg-tone-warn-soft text-tone-warn-fg"
                                : "bg-tone-highlight-soft text-tone-highlight-fg"
                            }`}
                          >
                            {itemComplete
                              ? "Fully Received"
                              : alreadyReceivedQty > 0
                              ? "Partial"
                              : "Pending"}
                          </Badge>
                        </div>
                      </div>

                      {isEditMode && !itemComplete && (
                        <div className="mt-3 pt-3 border-t border-line-card">
                          <label className="text-xs text-ink-3 font-semibold block mb-1">
                            Received Now
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={remainingQty}
                            step={canUseDecimalQuantity(unit) ? "0.01" : "1"}
                            value={material.receive_now}
                            disabled={material.full_receive}
                            onChange={(event) =>
                              handleReceiveNowChange(itemId, event.target.value)
                            }
                            placeholder={`Max ${remainingQty} ${unit}`}
                            className="h-auto w-full border border-line-input rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus-visible:ring-ring disabled:bg-gray-100 disabled:text-gray-600"
                          />
                          <p className="text-xs text-ink-3 mt-1">
                            Pending after this delivery:{" "}
                            <span className="font-semibold">
                              {pendingAfterQty} {unit}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isEditMode && (
              <div className="bg-surface rounded-lg border-2 border-line-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold text-ink-1">
                    Delivery Proof - Challan Upload
                  </h2>
                  <span className="text-xs font-bold text-tone-bad-fg bg-tone-bad-soft px-2 py-0.5 rounded-full">
                    * REQUIRED
                  </span>
                </div>

                {imagePreview.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {imagePreview.map((preview, index) => (
                      <div
                        key={preview}
                        className="relative border border-line-input rounded-lg overflow-hidden"
                      >
                        <img loading="lazy" decoding="async"
                          src={preview}
                          alt={`Delivery proof ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove delivery proof image"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 h-8 w-8 p-1 bg-tone-bad-solid text-white rounded-full hover:bg-primary-strong transition-colors"
                        >
                          <X size={14} />
                        </Button>
                        <div className="p-2 bg-surface border-t border-line-card">
                          <p className="text-xs text-ink-3 truncate">
                            {deliveryImages[index]?.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-line-card rounded-lg cursor-pointer hover:border-primary hover:bg-tone-highlight-soft transition-colors bg-tone-highlight-soft/30">
                  <Upload size={20} className="text-tone-highlight-fg" />
                  <span className="text-sm text-ink-1 font-semibold">
                    Upload Delivery Proof (Challan, etc.) *
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-tone-bad-fg font-medium mt-2">
                  * Required: Upload images of delivery challan or proof
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line-card shadow-lg z-50">
          <div className="max-w-[390px] mx-auto px-4 py-3">
            {!isEditMode ? (
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => navigate(-1)}
                  className="h-auto flex-1 bg-surface-muted text-ink-2 font-semibold py-3 rounded-lg hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsEditMode(true)}
                  disabled={delivery.status === "Transferred"}
                  className="h-auto flex-1 bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-strong transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Edit
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsEditMode(false);
                    setMaterials(normalizeMaterials(delivery));
                    setDeliveryImages([]);
                    setImagePreview([]);
                    setValidationError("");
                  }}
                  disabled={submitting}
                  className="h-auto flex-1 bg-surface-muted text-ink-2 font-semibold py-3 rounded-lg hover:bg-surface-muted transition-colors disabled:opacity-60"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="h-auto flex-1 bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-strong transition-colors shadow-md disabled:bg-orange-300 disabled:cursor-wait"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
