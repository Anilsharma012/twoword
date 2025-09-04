import React, { useState, useEffect } from "react";
import {
  Car,
  Building2,
  Smartphone,
  Briefcase,
  Shirt,
  Bike,
  Tv,
  Truck,
  Sofa,
  Heart,
  Plus,
} from "lucide-react";
import { withApiErrorBoundary } from "./ApiErrorBoundary";

const categoryIcons: Record<string, any> = {
  Cars: Car,
  Properties: Building2,
  Mobiles: Smartphone,
  Jobs: Briefcase,
  Fashion: Shirt,
  Bikes: Bike,
  "Electronics & Appliances": Tv,
  "Commercial Vehicles & Spares": Truck,
  Furniture: Sofa,
  Pets: Heart,
};

interface Category {
  _id?: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  subcategories: any[];
  order: number;
  active: boolean;
}

interface HomepageSlider {
  _id: string;
  title: string;
  subtitle: string;
  icon: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
  order: number;
}

function OLXStyleCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sliders, setSliders] = useState<HomepageSlider[]>([]);
  const [loading, setLoading] = useState(true);

  // Default categories similar to OLX
  const defaultCategories = [
    { name: "Cars", slug: "cars", icon: "🚗" },
    { name: "Properties", slug: "properties", icon: "🏢" },
    { name: "Mobiles", slug: "mobiles", icon: "��" },
    { name: "Jobs", slug: "jobs", icon: "💼" },
    { name: "Fashion", slug: "fashion", icon: "👕" },
    { name: "Bikes", slug: "bikes", icon: "🏍️" },
    { name: "Electronics & Appliances", slug: "electronics", icon: "📺" },
    { name: "Commercial Vehicles & Spares", slug: "commercial", icon: "🚚" },
    { name: "Furniture", slug: "furniture", icon: "🛋️" },
    { name: "Pets", slug: "pets", icon: "🐕" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Set default/empty data immediately to prevent UI blocking
    setSliders([]); // No sliders needed since we removed Rohtak section

    // Use default categories immediately to prevent empty UI
    console.log("📂 Loading default categories first...");
    setCategories(defaultCategories as any);

    try {
      // Try simple fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        console.log("🔄 Fetching categories with timeout...");
        const response = await fetch("/api/categories", {
          headers: { "Content-Type": "application/json" },
          cache: "no-cache",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (
            data.success &&
            data.data &&
            Array.isArray(data.data) &&
            data.data.length > 0
          ) {
            console.log(
              "✅ Categories loaded successfully, replacing defaults:",
              data.data.length,
            );
            setCategories(data.data.slice(0, 10));
            return; // Success
          }
        }

        console.log("⚠️ API response not as expected, keeping defaults");
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === "AbortError") {
          console.warn("⏰ Fetch timeout - keeping default categories");
        } else {
          console.warn(
            "⚠️ Fetch failed:",
            fetchError.message,
            "- keeping defaults",
          );
        }
      }
    } catch (error) {
      console.error("❌ Unexpected error:", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: Category) => {
    window.location.href = `/categories/${category.slug}`;
  };

  const handleSellClick = () => {
    window.location.href = "/post-property";
  };

  if (loading) {
    return (
      <div className="bg-white">
        {/* Banner placeholder */}
        <div className="mx-4 mt-4 mb-6">
          <div className="bg-blue-100 rounded-lg h-20 animate-pulse"></div>
        </div>

        {/* Categories grid placeholder */}
        <div className="px-4 pb-6">
          <div className="grid grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-14 h-14 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
                <div className="w-12 h-3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Dynamic Slider Section - Only render if sliders exist */}
      {sliders.length > 0 && (
        <div className="mx-4 mt-4 mb-6">
          <div className="space-y-3">
            {sliders.map((slider) => (
              <div
                key={slider._id}
                className={`bg-gradient-to-r ${slider.backgroundColor} rounded-lg p-4 ${slider.textColor} relative overflow-hidden`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{slider.title}</h3>
                    <p className="text-sm opacity-90">{slider.subtitle}</p>
                  </div>
                  <div className="text-3xl">{slider.icon}</div>
                </div>
                <div className="absolute -right-2 -top-2 w-16 h-16 bg-white bg-opacity-10 rounded-full"></div>
                <div className="absolute -right-6 -bottom-2 w-12 h-12 bg-white bg-opacity-10 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="px-4 pb-12">
        <div className="grid grid-cols-5 gap-3">
          {(categories || []).slice(0, 10).map((category, index) => {
            if (!category || !category.name) return null;

            const IconComponent = categoryIcons[category.name] || Building2;

            return (
              <div
                key={category._id || category.slug || index}
                data-testid="header-cat-chip"
                onClick={() => handleCategoryClick(category)}
                className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center mb-2 hover:bg-red-100 transition-colors">
                  <IconComponent className="h-7 w-7 text-[#C70000]" />
                </div>
                <span className="text-xs text-gray-800 text-center font-medium leading-tight">
                  {category.name && category.name.length > 12
                    ? `${category.name.substring(0, 12)}...`
                    : category.name || "Category"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Export with API error boundary for better error handling
export default withApiErrorBoundary(OLXStyleCategories);
