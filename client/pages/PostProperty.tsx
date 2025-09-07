import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import PackageSelection from "../components/PackageSelection";
import PaymentForm from "../components/PaymentForm";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Camera,
  Plus,
  X,
  MapPin,
  Home,
  IndianRupee,
  Package,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ROHTAK_AREAS } from "@shared/types";

interface PropertyFormData {
  title: string;
  description: string;
  price: string;
  priceType: "sale" | "rent";
  propertyType: string;
  subCategory: string;
  location: {
    area: string;
    address: string;
    landmark: string;
  };
  specifications: {
    bedrooms: string;
    bathrooms: string;
    area: string;
    facing: string;
    floor: string;
    totalFloors: string;
    parking: string;
    furnished: string;
  };
  amenities: string[];
  images: File[];
  contactInfo: {
    name: string;
    phone: string;
    alternativePhone?: string;
    whatsappNumber?: string;
    email: string;
  };
}

const propertyTypes = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "plot", label: "Plot/Land" },
];

const subCategories: Record<string, Array<{ value: string; label: string }>> = {
  residential: [
    { value: "1bhk", label: "1 BHK Apartment" },
    { value: "2bhk", label: "2 BHK Apartment" },
    { value: "3bhk", label: "3 BHK Apartment" },
    { value: "4bhk-plus", label: "4+ BHK Apartment" },
    { value: "independent-house", label: "Independent House" },
    { value: "villa", label: "Villa" },
    { value: "duplex", label: "Duplex" },
    { value: "penthouse", label: "Penthouse" },
  ],
  commercial: [
    { value: "shop", label: "Shop" },
    { value: "office", label: "Office Space" },
    { value: "showroom", label: "Showroom" },
    { value: "warehouse", label: "Warehouse" },
    { value: "factory", label: "Factory" },
    { value: "restaurant-space", label: "Restaurant Space" },
  ],
  plot: [
    { value: "residential-plot", label: "Residential Plot" },
    { value: "commercial-plot", label: "Commercial Plot" },
    { value: "agricultural-land", label: "Agricultural Land" },
    { value: "industrial-plot", label: "Industrial Plot" },
    { value: "farm-house", label: "Farm House Plot" },
  ],
};

const commonAmenities = [
  "Parking",
  "Lift/Elevator",
  "Security",
  "Power Backup",
  "Garden",
  "Swimming Pool",
  "Gym",
  "Club House",
  "Children's Play Area",
  "24x7 Water Supply",
  "Air Conditioning",
  "Internet/WiFi Ready",
  "Intercom",
  "Rain Water Harvesting",
  "Waste Management",
];

export default function PostProperty() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPackageSelection, setShowPackageSelection] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedPackagePrice, setSelectedPackagePrice] = useState(0);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<PropertyFormData>({
    title: "",
    description: "",
    price: "",
    priceType: "sale",
    propertyType: "",
    subCategory: "",
    location: {
      area: "",
      address: "",
      landmark: "",
    },
    specifications: {
      bedrooms: "",
      bathrooms: "",
      area: "",
      facing: "",
      floor: "",
      totalFloors: "",
      parking: "",
      furnished: "",
    },
    amenities: [],
    images: [],
    contactInfo: {
      name: user?.name || "",
      phone: user?.phone || "",
      email: user?.email || "",
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      const returnTo = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/auth?returnTo=${returnTo}`;
      return;
    }
    if (user) {
      setFormData((prev) => ({
        ...prev,
        contactInfo: {
          name: user.name,
          phone: user.phone,
          email: user.email,
        },
      }));
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    // JS wiring for wizard actions
    const prev = () =>
      document
        .querySelector('[data-action="prev"],[data-testid="prev-step"]')
        ?.click() || window.app?.goToPrevStep?.();
    const next = () =>
      document
        .querySelector('[data-action="next"],[data-testid="next-step"]')
        ?.click() || window.app?.goToNextStep?.();

    const prevBtn = document.getElementById("btn-prev");
    const nextBtn = document.getElementById("btn-next");

    if (prevBtn) prevBtn.addEventListener("click", prev);
    if (nextBtn) nextBtn.addEventListener("click", next);

    return () => {
      if (prevBtn) prevBtn.removeEventListener("click", prev);
      if (nextBtn) nextBtn.removeEventListener("click", next);
    };
  }, []);

  const handleInputChange = (field: string, value: string) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof PropertyFormData],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    const MAX_FILES = 10;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    const validFiles = incoming.filter((f) => {
      const ok = f.size <= MAX_SIZE;
      if (!ok) {
        alert(`File too large: ${f.name}. Max 10MB per image.`);
      }
      return ok;
    });

    const totalCount = formData.images.length + validFiles.length;
    if (totalCount > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} images allowed`);
    }

    const allowedToAdd = Math.max(0, MAX_FILES - formData.images.length);
    const filesToAdd = validFiles.slice(0, allowedToAdd);

    if (filesToAdd.length > 0) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...filesToAdd],
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        // Basic validation: title, description, property type are required
        // Subcategory is only required if property type is selected and options are available
        const hasBasicInfo =
          formData.title.trim() &&
          formData.description.trim() &&
          formData.propertyType;

        if (!hasBasicInfo) return false;

        // If property type is selected, subcategory becomes required
        if (formData.propertyType && subCategories[formData.propertyType]) {
          return formData.subCategory.trim() !== "";
        }

        return true;
      case 2:
        return (
          formData.price.trim() &&
          formData.location.area.trim() &&
          formData.location.address.trim()
        );
      case 3:
        return formData.specifications.area.trim() !== "";
      case 4:
        return formData.images.length > 0;
      case 5:
        return (
          formData.contactInfo.name.trim() &&
          formData.contactInfo.phone.trim() &&
          formData.contactInfo.email.trim()
        );
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Provide specific feedback based on current step
      let missingFields = [];

      if (currentStep === 1) {
        if (!formData.title.trim()) missingFields.push("Property Title");
        if (!formData.description.trim()) missingFields.push("Description");
        if (!formData.propertyType) missingFields.push("Property Type");
        if (formData.propertyType && !formData.subCategory)
          missingFields.push("Sub Category");
      }

      if (missingFields.length > 0) {
        alert(
          `Please fill the following required fields: ${missingFields.join(", ")}`,
        );
      } else {
        alert("Please fill all required fields");
      }
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  // Load saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("post_property_draft");
      if (raw) {
        const draft = JSON.parse(raw);
        // Do not restore images from draft
        setFormData((prev) => ({
          ...prev,
          ...draft,
          images: [],
        }));
      }
    } catch {}
  }, []);

  // Autosave draft with 5s debounce
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const { images, ...rest } = formData as any;
        localStorage.setItem("post_property_draft", JSON.stringify(rest));
      } catch {}
    }, 5000);
    return () => clearTimeout(id);
  }, [formData]);

  const handleSubmit = async (withPackage = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        alert("You must be logged in to post a property. Please login first.");
        return;
      }

      // Create FormData for file upload
      const submitData = new FormData();

      // Add property data
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append("price", formData.price);
      submitData.append("priceType", formData.priceType);
      submitData.append("propertyType", formData.propertyType);
      submitData.append("subCategory", formData.subCategory);
      submitData.append("location", JSON.stringify(formData.location));
      submitData.append(
        "specifications",
        JSON.stringify(formData.specifications),
      );
      submitData.append("amenities", JSON.stringify(formData.amenities));
      submitData.append("contactInfo", JSON.stringify(formData.contactInfo));

      // Add premium listing status
      submitData.append("premium", withPackage.toString());
      submitData.append("contactVisible", (!withPackage).toString()); // Free listings show contact immediately

      // Add images
      formData.images.forEach((image, index) => {
        submitData.append(`images`, image);
      });

      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert("Your session has expired. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/user-login";
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to create property`);
      }

      const data = await response.json();

      if (data.success) {
        try {
          localStorage.removeItem("post_property_draft");
        } catch {}
        setPropertyId(data.data._id);
        if (withPackage) {
          setShowPackageSelection(true);
        } else {
          alert(
            "Property posted successfully and submitted for admin approval!",
          );
          window.location.href = "/user-dashboard";
        }
      } else {
        alert(data.error || "Failed to post property");
      }
    } catch (error) {
      console.error("Error posting property:", error);
      alert("Failed to post property");
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = async (packageId: string) => {
    try {
      const response = await fetch(`/api/packages/${packageId}`);
      const data = await response.json();

      if (data.success) {
        setSelectedPackage(packageId);
        setSelectedPackagePrice(data.data.price);
        setShowPackageSelection(false);
        setShowPaymentForm(true);
      }
    } catch (error) {
      console.error("Error fetching package details:", error);
    }
  };

  const handlePaymentComplete = (transactionId: string) => {
    alert("Property posted and package activated successfully!");
    window.location.href = "/seller-dashboard";
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        Redirecting to login...
      </div>
    );
  }

  if (showPackageSelection) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Promote Your Property</h2>
            <p className="text-gray-600">
              Choose a package to boost your property visibility
            </p>
          </div>
          <PackageSelection
            propertyId={propertyId!}
            onPackageSelect={handlePackageSelect}
          />
          <div className="mt-6 text-center">
            <Button
              onClick={() => {
                alert("Property posted successfully!");
                window.location.href = "/seller-dashboard";
              }}
              variant="outline"
            >
              Skip Package Selection
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (showPaymentForm && selectedPackage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="p-4">
          <PaymentForm
            packageId={selectedPackage}
            propertyId={propertyId!}
            amount={selectedPackagePrice}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => {
              alert("Property posted successfully!");
              window.location.href = "/seller-dashboard";
            }}
          />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const stepTitles = [
    "Property Details",
    "Price & Location",
    "Specifications",
    "Photos",
    "Contact Information",
    "Summary",
  ];

  return (
    <div className="min-h-screen bg-gray-50 post-property-page">
      <Header />

      <style>{`
        .post-property-page { padding-bottom: 160px!important; }
        .wizard-actions {
          position: sticky;
          bottom: 0;
          background: #fff;
          box-shadow: 0 -2px 12px rgba(0,0,0,.08);
          padding: .75rem 1rem;
          display: flex;
          gap: .5rem;
          justify-content: space-between;
          z-index: 9999;
        }
        @media (max-width: 1023px) {
          .wizard-actions {
            position: fixed;
            left: 0;
            right: 0;
            bottom: calc(var(--app-bottom-nav-height, 64px));
          }
        }
        @supports (-webkit-touch-callout: none) {
          .wizard-actions {
            bottom: calc(var(--app-bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>

      <div className="p-4">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">Post Property</h1>
            <span className="text-sm text-gray-600">
              Step {currentStep} of {stepTitles.length}
            </span>
          </div>
          <div className="flex space-x-2">
            {stepTitles.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full ${
                  index + 1 <= currentStep ? "bg-[#C70000]" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mt-2">
            {stepTitles[currentStep - 1]}
          </h2>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          {/* Step 1: Property Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., 3 BHK Luxury Apartment in Sector 12"
                  className={!formData.title.trim() ? "border-red-300" : ""}
                  required
                />
                {!formData.title.trim() && (
                  <p className="text-red-500 text-xs mt-1">
                    Property title is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type *
                </label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) => {
                    handleInputChange("propertyType", value);
                    // Clear subcategory when property type changes
                    handleInputChange("subCategory", "");
                  }}
                >
                  <SelectTrigger
                    className={!formData.propertyType ? "border-red-300" : ""}
                  >
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.propertyType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub Category *
                  </label>
                  <Select
                    value={formData.subCategory}
                    onValueChange={(value) =>
                      handleInputChange("subCategory", value)
                    }
                  >
                    <SelectTrigger
                      className={!formData.subCategory ? "border-red-300" : ""}
                    >
                      <SelectValue placeholder="Select sub category" />
                    </SelectTrigger>
                    <SelectContent>
                      {subCategories[formData.propertyType]?.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formData.subCategory && (
                    <p className="text-red-500 text-xs mt-1">
                      Please select a sub category
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe your property in detail..."
                  className={
                    !formData.description.trim() ? "border-red-300" : ""
                  }
                  rows={4}
                  required
                />
                {!formData.description.trim() && (
                  <p className="text-red-500 text-xs mt-1">
                    Property description is required
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Price & Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    placeholder="Enter price"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Type *
                  </label>
                  <Select
                    value={formData.priceType}
                    onValueChange={(value: "sale" | "rent") =>
                      handleInputChange("priceType", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">For Sale</SelectItem>
                      <SelectItem value="rent">For Rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rohtak Area *
                </label>
                <Select
                  value={formData.location.area}
                  onValueChange={(value) =>
                    handleInputChange("location.area", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area in Rohtak" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROHTAK_AREAS.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complete Address *
                </label>
                <Textarea
                  value={formData.location.address}
                  onChange={(e) =>
                    handleInputChange("location.address", e.target.value)
                  }
                  placeholder="House/Plot number, Street, Area, Rohtak, Haryana"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nearby Landmark
                </label>
                <Input
                  value={formData.location.landmark}
                  onChange={(e) =>
                    handleInputChange("location.landmark", e.target.value)
                  }
                  placeholder="e.g., Near PGI Rohtak, AIIMS Rohtak"
                />
              </div>
            </div>
          )}

          {/* Step 3: Specifications */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrooms
                  </label>
                  <Select
                    value={formData.specifications.bedrooms}
                    onValueChange={(value) =>
                      handleInputChange("specifications.bedrooms", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5+">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bathrooms
                  </label>
                  <Select
                    value={formData.specifications.bathrooms}
                    onValueChange={(value) =>
                      handleInputChange("specifications.bathrooms", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5+">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Area (sq ft) *
                </label>
                <Input
                  type="number"
                  value={formData.specifications.area}
                  onChange={(e) =>
                    handleInputChange("specifications.area", e.target.value)
                  }
                  placeholder="e.g., 1200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facing
                  </label>
                  <Select
                    value={formData.specifications.facing}
                    onValueChange={(value) =>
                      handleInputChange("specifications.facing", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north">North</SelectItem>
                      <SelectItem value="south">South</SelectItem>
                      <SelectItem value="east">East</SelectItem>
                      <SelectItem value="west">West</SelectItem>
                      <SelectItem value="north-east">North-East</SelectItem>
                      <SelectItem value="north-west">North-West</SelectItem>
                      <SelectItem value="south-east">South-East</SelectItem>
                      <SelectItem value="south-west">South-West</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Furnished
                  </label>
                  <Select
                    value={formData.specifications.furnished}
                    onValueChange={(value) =>
                      handleInputChange("specifications.furnished", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="furnished">Furnished</SelectItem>
                      <SelectItem value="semi-furnished">
                        Semi-Furnished
                      </SelectItem>
                      <SelectItem value="unfurnished">Unfurnished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor
                  </label>
                  <Input
                    value={formData.specifications.floor}
                    onChange={(e) =>
                      handleInputChange("specifications.floor", e.target.value)
                    }
                    placeholder="e.g., 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Floors
                  </label>
                  <Input
                    value={formData.specifications.totalFloors}
                    onChange={(e) =>
                      handleInputChange(
                        "specifications.totalFloors",
                        e.target.value,
                      )
                    }
                    placeholder="e.g., 5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking
                  </label>
                  <Select
                    value={formData.specifications.parking}
                    onValueChange={(value) =>
                      handleInputChange("specifications.parking", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Available</SelectItem>
                      <SelectItem value="no">Not Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amenities
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {commonAmenities.map((amenity) => (
                    <label
                      key={amenity}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                        className="rounded border-gray-300 text-[#C70000] focus:ring-[#C70000]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Photos */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Photos * (Max 10 images)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Upload clear photos of your property
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="bg-[#C70000] text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-[#A60000]"
                  >
                    Choose Photos
                  </label>
                </div>
              </div>

              {formData.images.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Uploaded Photos ({formData.images.length}/10)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Property ${index + 1}`}
                          className="w-full h-20 sm:h-24 md:h-28 object-cover rounded-lg border-2 border-gray-200 hover:border-[#C70000] transition-colors"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Contact Information */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person Name *
                </label>
                <Input
                  value={formData.contactInfo.name}
                  onChange={(e) =>
                    handleInputChange("contactInfo.name", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <Input
                  value={formData.contactInfo.phone}
                  onChange={(e) =>
                    handleInputChange("contactInfo.phone", e.target.value)
                  }
                  placeholder="Enter primary phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternative Mobile Number (Optional)
                </label>
                <Input
                  value={formData.contactInfo.alternativePhone || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "contactInfo.alternativePhone",
                      e.target.value,
                    )
                  }
                  placeholder="Enter alternative mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number (Optional)
                </label>
                <Input
                  value={formData.contactInfo.whatsappNumber || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "contactInfo.whatsappNumber",
                      e.target.value,
                    )
                  }
                  placeholder="Enter WhatsApp number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) =>
                    handleInputChange("contactInfo.email", e.target.value)
                  }
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 6: Summary */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Ready to Post!
                </h2>
                <p className="text-gray-600">
                  Review your property details and choose how to list it
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {formData.title}
                </h3>
                <p className="text-gray-600 mb-2">{formData.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Price:</span> ₹
                    {Number(formData.price).toLocaleString()}
                    {formData.priceType === "rent" && "/month"}
                  </div>
                  <div>
                    <span className="font-medium">Area:</span>{" "}
                    {formData.location.area}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span>{" "}
                    {formData.specifications.area} sq ft
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {formData.propertyType}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="w-full bg-[#C70000] hover:bg-[#A60000] text-white"
                >
                  {loading ? (
                    "Posting..."
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Post with Promotion Package
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    "Posting..."
                  ) : (
                    <>
                      <Home className="h-4 w-4 mr-2" />
                      Post as Free Listing
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Actions */}
        <div id="wizard-actions" className="wizard-actions">
          <button
            id="btn-prev"
            aria-label="Previous"
            data-action="prev"
            data-testid="prev-step"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            style={{
              padding: "8px 16px",
              backgroundColor: currentStep === 1 ? "#f3f4f6" : "#ffffff",
              color: currentStep === 1 ? "#9ca3af" : "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: currentStep === 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <button
            id="btn-next"
            aria-label="Next"
            data-action="next"
            data-testid="next-step"
            onClick={handleNextStep}
            disabled={!validateStep(currentStep)}
            style={{
              padding: "8px 16px",
              backgroundColor: validateStep(currentStep)
                ? "#C70000"
                : "#f3f4f6",
              color: validateStep(currentStep) ? "#ffffff" : "#9ca3af",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: validateStep(currentStep) ? "pointer" : "not-allowed",
            }}
          >
            Next
          </button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
