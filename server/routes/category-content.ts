import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { ApiResponse } from "@shared/types";
import { ObjectId } from "mongodb";

interface CategoryHero {
  title?: string;
  subtitle?: string;
  images?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  active?: boolean;
}

interface CategoryBannerItem {
  image: string;
  href?: string;
  order: number;
  active: boolean;
}

interface CategoryContentDoc {
  _id?: string;
  categoryId: string;
  hero?: CategoryHero;
  banners?: CategoryBannerItem[];
  updatedAt: Date;
}

export const getAdminCategoryContent: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid category ID" });
    }

    const doc = await db.collection("category_content").findOne({ categoryId: id });

    const response: ApiResponse<CategoryContentDoc | {}> = {
      success: true,
      data: (doc as CategoryContentDoc) || ({} as any),
    };
    res.json(response);
  } catch (e) {
    console.error("Error fetching admin category content:", e);
    res.status(500).json({ success: false, error: "Failed to fetch content" });
  }
};

export const upsertAdminCategoryContent: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid category ID" });
    }

    const payload = req.body || {};
    const hero: CategoryHero | undefined = payload.hero;
    const banners: CategoryBannerItem[] = Array.isArray(payload.banners)
      ? payload.banners.map((b: any) => ({
          image: String(b.image || b.imageUrl || ""),
          href: b.href ? String(b.href) : undefined,
          order: Number.parseInt(String(b.order ?? 0), 10) || 0,
          active: String(b.active ?? true).toString().toLowerCase() !== "false",
        }))
      : [];

    const update: Partial<CategoryContentDoc> = {
      categoryId: id,
      hero: hero
        ? {
            title: hero.title ? String(hero.title) : undefined,
            subtitle: hero.subtitle ? String(hero.subtitle) : undefined,
            images: Array.isArray(hero.images)
              ? hero.images.map((u) => String(u)).filter(Boolean)
              : [],
            ctaLabel: hero.ctaLabel ? String(hero.ctaLabel) : undefined,
            ctaHref: hero.ctaHref ? String(hero.ctaHref) : undefined,
            active:
              typeof hero.active === "boolean"
                ? hero.active
                : String((hero as any).active ?? true).toLowerCase() !== "false",
          }
        : undefined,
      banners: banners.sort((a, b) => a.order - b.order),
      updatedAt: new Date(),
    };

    await db
      .collection("category_content")
      .updateOne({ categoryId: id }, { $set: update }, { upsert: true });

    const saved = await db.collection("category_content").findOne({ categoryId: id });

    const response: ApiResponse<CategoryContentDoc> = {
      success: true,
      data: saved as CategoryContentDoc,
    };
    res.json(response);
  } catch (e) {
    console.error("Error upserting admin category content:", e);
    res.status(500).json({ success: false, error: "Failed to save content" });
  }
};

export const getPublicCategoryContent: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { slug } = req.params as { slug: string };

    const category = await db.collection("categories").findOne({ slug, isActive: true });
    if (!category) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    const doc = (await db
      .collection("category_content")
      .findOne({ categoryId: category._id.toString() })) as CategoryContentDoc | null;

    const data = doc || ({} as any);
    const hero = data.hero && data.hero.active ? data.hero : undefined;
    const banners = Array.isArray(data.banners)
      ? data.banners.filter((b) => b.active).sort((a, b) => a.order - b.order)
      : [];

    const response: ApiResponse<{ hero?: CategoryHero; banners: CategoryBannerItem[] }> = {
      success: true,
      data: { hero, banners },
    };
    res.json(response);
  } catch (e) {
    console.error("Error fetching public category content:", e);
    res.status(500).json({ success: false, error: "Failed to fetch content" });
  }
};
