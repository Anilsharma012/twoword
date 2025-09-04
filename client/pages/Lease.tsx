import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import CategoryBar from "../components/CategoryBar";
import BottomNavigation from "../components/BottomNavigation";
import StaticFooter from "../components/StaticFooter";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  count?: number;
}

export default function Lease() {
  const navigate = useNavigate();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      // STEP 4 requirement: await api('/subcategories?category=lease&approved=true')
      const apiResponse = await (window as any).api(
        "/subcategories?category=lease&approved=true",
      );
      const data = apiResponse.ok
        ? apiResponse.json
        : { success: false, error: "Failed to fetch subcategories" };

      if (data.success) {
        setSubcategories(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch subcategories");
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setSubcategories([
        {
          id: "office",
          name: "Office Space",
          slug: "office",
          description: "Commercial office space",
          count: 35,
        },
        {
          id: "retail",
          name: "Retail Space",
          slug: "retail",
          description: "Shops and showrooms",
          count: 28,
        },
        {
          id: "warehouse",
          name: "Warehouse",
          slug: "warehouse",
          description: "Storage and warehouse",
          count: 12,
        },
        {
          id: "industrial",
          name: "Industrial",
          slug: "industrial",
          description: "Industrial properties",
          count: 8,
        },
        {
          id: "restaurant",
          name: "Restaurant Space",
          slug: "restaurant",
          description: "Restaurant and food space",
          count: 15,
        },
        {
          id: "hotel",
          name: "Hotel/Lodge",
          slug: "hotel",
          description: "Hospitality properties",
          count: 6,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryClick = (subcategory: Subcategory) => {
    navigate(`/lease/${subcategory.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <OLXStyleHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <OLXStyleHeader />

      <main className="pb-16">
        <CategoryBar />

        <div className="px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Lease Properties
            </h1>
            <p className="text-gray-600">Choose a property type for lease</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {subcategories.map((subcategory) => (
              <button
                key={subcategory.id}
                onClick={() => handleSubcategoryClick(subcategory)}
                className="subcat-card bg-white border border-gray-200 rounded-lg p-4 text-left hover:bg-gray-50 transition-colors shadow-sm"
                data-testid="subcat-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {subcategory.name}
                  </h3>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {subcategory.description}
                </p>
                {subcategory.count && (
                  <span className="text-xs bg-[#C70000] text-white px-2 py-1 rounded-full">
                    {subcategory.count} properties
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </main>

      <BottomNavigation />
      <StaticFooter />
    </div>
  );
}
