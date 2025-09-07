import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Image as ImageIcon, Plus, Save, Trash2, Upload, ChevronUp, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface HeroForm {
  title: string;
  subtitle: string;
  images: string[];
  ctaLabel: string;
  ctaHref: string;
  active: boolean;
}

interface BannerForm {
  image: string;
  href?: string;
  order: number;
  active: boolean;
}

export default function CategoryContentPage() {
  const { categoryId } = useParams();
  const { token } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [hero, setHero] = useState<HeroForm>({ title: "", subtitle: "", images: [], ctaLabel: "", ctaHref: "", active: true });
  const [banners, setBanners] = useState<BannerForm[]>([]);

  useEffect(() => {
    fetchInitial();
  }, [categoryId]);

  const fetchInitial = async () => {
    try {
      setLoading(true);
      await fetchCategoryName();
      await fetchContent();
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryName = async () => {
    try {
      const res = await fetch("/api/admin/categories", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data?.data?.categories) {
        const found = data.data.categories.find((c: any) => c._id === categoryId);
        if (found) setCategoryName(found.name);
      }
    } catch {}
  };

  const fetchContent = async () => {
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/content`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data?.success && data.data) {
        const doc = data.data;
        const h = doc.hero || {};
        setHero({
          title: h.title || "",
          subtitle: h.subtitle || "",
          images: Array.isArray(h.images) ? h.images : [],
          ctaLabel: h.ctaLabel || "",
          ctaHref: h.ctaHref || "",
          active: h.active !== false,
        });
        setBanners(Array.isArray(doc.banners) ? doc.banners : []);
      } else {
        setHero({ title: "", subtitle: "", images: [], ctaLabel: "", ctaHref: "", active: true });
        setBanners([]);
      }
    } catch {
      setHero({ title: "", subtitle: "", images: [], ctaLabel: "", ctaHref: "", active: true });
      setBanners([]);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/admin/banners/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    return data?.success && data.data?.imageUrl ? data.data.imageUrl : null;
  };

  const addHeroImage = async (file: File) => {
    const url = await uploadImage(file);
    if (url) setHero((h) => ({ ...h, images: [...h.images, url] }));
  };

  const addBannerRow = () => {
    setBanners((arr) => [...arr, { image: "", href: "", order: (arr[arr.length - 1]?.order ?? 0) + 1, active: true }]);
  };

  const moveBanner = (idx: number, dir: "up" | "down") => {
    setBanners((arr) => {
      const copy = [...arr];
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= copy.length) return copy;
      const temp = copy[idx];
      copy[idx] = copy[swapWith];
      copy[swapWith] = temp;
      return copy.map((b, i) => ({ ...b, order: i + 1 }));
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = { hero, banners };
      const res = await fetch(`/api/admin/categories/${categoryId}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Save failed");
      toast({ title: "Saved", description: "Category content updated" });
      window.dispatchEvent(new CustomEvent("category-content:updated", { detail: { categoryId } }));
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      activeSection="categories"
      onSectionChange={(section) => {
        if (section === "categories") window.location.href = "/admin/ads/categories";
        else if (section === "countries") window.location.href = "/admin/locations/countries";
        else window.location.href = "/admin";
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => (window.location.href = "/admin/ads/categories")} aria-label="Back to categories">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-semibold">{categoryName ? `${categoryName} — Content` : "Category Content"}</h2>
        </div>
        <Button onClick={save} disabled={saving} className="bg-[#C70000] hover:bg-[#A60000]" aria-label="Save content">
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hero</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Title</label>
                  <Input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} placeholder="Amazing New Property" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={hero.active} onCheckedChange={(v) => setHero({ ...hero, active: v })} />
                  <span className="text-sm">Active</span>
                </div>
                <div>
                  <label className="block text-sm mb-1">Subtitle</label>
                  <Input value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} placeholder="Find your dream home" />
                </div>
                <div>
                  <label className="block text-sm mb-1">CTA Label</label>
                  <Input value={hero.ctaLabel} onChange={(e) => setHero({ ...hero, ctaLabel: e.target.value })} placeholder="Explore" />
                </div>
                <div>
                  <label className="block text-sm mb-1">CTA Href</label>
                  <Input value={hero.ctaHref} onChange={(e) => setHero({ ...hero, ctaHref: e.target.value })} placeholder="/properties" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2">Hero Images</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {hero.images.map((url, idx) => (
                    <div key={idx} className="relative w-40 h-24 border rounded overflow-hidden">
                      <img src={url} alt={hero.title || "Hero"} className="w-full h-full object-cover" />
                      <button
                        className="absolute top-1 right-1 bg-white/80 border rounded p-1"
                        onClick={() => setHero((h) => ({ ...h, images: h.images.filter((_, i) => i !== idx) }))}
                        aria-label="Remove hero image"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <Input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await addHeroImage(file);
                  }} className="w-64" />
                  <Upload className="h-4 w-4 text-gray-500" />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Banners</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={addBannerRow} aria-label="Add banner">
                  <Plus className="h-4 w-4 mr-1" /> Add Banner
                </Button>
              </div>
              <div className="space-y-3">
                {banners.map((b, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center border p-3 rounded">
                    <div className="md:col-span-2 flex items-center gap-2">
                      {b.image ? (
                        <img src={b.image} alt={categoryName || "Banner"} className="w-24 h-14 object-cover rounded border" />
                      ) : (
                        <div className="w-24 h-14 border rounded flex items-center justify-center text-gray-400"><ImageIcon className="h-5 w-5" /></div>
                      )}
                      <Input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await uploadImage(file);
                          if (url) setBanners((arr) => arr.map((x, i) => (i === idx ? { ...x, image: url } : x)));
                        }
                      }} />
                    </div>
                    <div>
                      <Input placeholder="Link (optional)" value={b.href || ""} onChange={(e) => setBanners((arr) => arr.map((x, i) => (i === idx ? { ...x, href: e.target.value } : x)))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Order</span>
                      <Input type="number" className="w-20" value={b.order} onChange={(e) => setBanners((arr) => arr.map((x, i) => (i === idx ? { ...x, order: parseInt(e.target.value) || 0 } : x)))} />
                      <div className="flex flex-col">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveBanner(idx, "up")} aria-label="Move banner up"><ChevronUp className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveBanner(idx, "down")} aria-label="Move banner down"><ChevronDown className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={b.active} onCheckedChange={(v) => setBanners((arr) => arr.map((x, i) => (i === idx ? { ...x, active: v } : x)))} />
                      <span className="text-sm">Active</span>
                    </div>
                    <div>
                      <Button variant="outline" className="text-red-600" onClick={() => setBanners((arr) => arr.filter((_, i) => i !== idx))} aria-label="Delete banner">
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
