import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { Subcategory, ApiResponse } from "@shared/types";
import { ObjectId } from "mongodb";
import multer from "multer";

// Configure multer for icon upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit for icons
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Helper function to generate unique slug per category
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove multiple hyphens
    .trim();
}

// Helper function to ensure unique slug within category
async function ensureUniqueSlugInCategory(
  db: any,
  name: string,
  categoryId: string,
  excludeId?: string,
): Promise<string> {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const filter: any = { slug, categoryId };
    if (excludeId) {
      filter._id = { $ne: new ObjectId(excludeId) };
    }

    const existing = await db.collection("subcategories").findOne(filter);
    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// ADMIN: Get all subcategories with search and pagination
export const getAllSubcategories: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { search = "", page = "1", limit = "10", categoryId } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build search filter
    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }
    if (categoryId) {
      filter.categoryId = categoryId;
    }

    const [subcategories, total] = await Promise.all([
      db
        .collection("subcategories")
        .find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection("subcategories").countDocuments(filter),
    ]);

    // Add category info to each subcategory
    const subcategoriesWithCategory = await Promise.all(
      subcategories.map(async (subcategory: any) => {
        const category = await db
          .collection("categories")
          .findOne({ _id: new ObjectId(subcategory.categoryId) });

        return {
          ...subcategory,
          category: category
            ? { _id: category._id, name: category.name, slug: category.slug }
            : null,
        };
      }),
    );

    const response: ApiResponse<{
      subcategories: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        subcategories: subcategoriesWithCategory,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch subcategories",
    });
  }
};

// ADMIN: Create subcategory
export const createSubcategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { categoryId, name, iconUrl, sortOrder, isActive = true } = req.body;

    // Validate required fields
    if (!categoryId || !name || !iconUrl || typeof sortOrder !== "number") {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: categoryId, name, iconUrl, sortOrder",
      });
    }

    // Validate category exists
    const category = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(categoryId) });

    if (!category) {
      return res.status(400).json({
        success: false,
        error: "Parent category not found",
      });
    }

    // Generate unique slug within this category
    const slug = await ensureUniqueSlugInCategory(db, name, categoryId);

    const subcategoryData: Omit<Subcategory, "_id"> = {
      categoryId,
      name: name.trim(),
      slug,
      iconUrl: iconUrl.trim(),
      sortOrder,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("subcategories")
      .insertOne(subcategoryData);

    const response: ApiResponse<{ _id: string; subcategory: Subcategory }> = {
      success: true,
      data: {
        _id: result.insertedId.toString(),
        subcategory: {
          ...subcategoryData,
          _id: result.insertedId.toString(),
        } as Subcategory,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error creating subcategory:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create subcategory",
    });
  }
};

// ADMIN: Update subcategory
export const updateSubcategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { categoryId, name, iconUrl, sortOrder, isActive } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid subcategory ID",
      });
    }

    // Get current subcategory
    const currentSubcategory = await db
      .collection("subcategories")
      .findOne({ _id: new ObjectId(id) });

    if (!currentSubcategory) {
      return res.status(404).json({
        success: false,
        error: "Subcategory not found",
      });
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Validate category if changing
    if (
      categoryId !== undefined &&
      categoryId !== currentSubcategory.categoryId
    ) {
      const category = await db
        .collection("categories")
        .findOne({ _id: new ObjectId(categoryId) });

      if (!category) {
        return res.status(400).json({
          success: false,
          error: "Parent category not found",
        });
      }
      updateData.categoryId = categoryId;
    }

    if (name !== undefined) {
      updateData.name = name.trim();
      // Regenerate slug if name changed or category changed
      const targetCategoryId = categoryId || currentSubcategory.categoryId;
      updateData.slug = await ensureUniqueSlugInCategory(
        db,
        name,
        targetCategoryId,
        id,
      );
    }
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl.trim();
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await db
      .collection("subcategories")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Subcategory not found",
      });
    }

    // Get updated subcategory
    const updatedSubcategory = await db
      .collection("subcategories")
      .findOne({ _id: new ObjectId(id) });

    const response: ApiResponse<{ subcategory: Subcategory }> = {
      success: true,
      data: { subcategory: updatedSubcategory as Subcategory },
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating subcategory:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update subcategory",
    });
  }
};

// ADMIN: Delete subcategory
export const deleteSubcategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid subcategory ID",
      });
    }

    // Check if subcategory is linked to items (properties, etc.)
    // You can add specific checks based on your schema
    // For example, check if any properties use this subcategory
    const linkedItems = await db
      .collection("properties")
      .countDocuments({ subCategory: { $regex: new RegExp(id, "i") } });

    if (linkedItems > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete subcategory. It is linked to ${linkedItems} items.`,
      });
    }

    const result = await db
      .collection("subcategories")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Subcategory not found",
      });
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Subcategory deleted successfully" },
    };

    res.json(response);
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete subcategory",
    });
  }
};

// ADMIN: Toggle subcategory active status
export const toggleSubcategoryActive: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid subcategory ID",
      });
    }

    // Get current subcategory
    const subcategory = await db
      .collection("subcategories")
      .findOne({ _id: new ObjectId(id) });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: "Subcategory not found",
      });
    }

    // Toggle active status
    const result = await db.collection("subcategories").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive: !subcategory.isActive,
          updatedAt: new Date(),
        },
      },
    );

    const updatedSubcategory = await db
      .collection("subcategories")
      .findOne({ _id: new ObjectId(id) });

    const response: ApiResponse<{ subcategory: Subcategory }> = {
      success: true,
      data: { subcategory: updatedSubcategory as Subcategory },
    };

    res.json(response);
  } catch (error) {
    console.error("Error toggling subcategory:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle subcategory",
    });
  }
};

// ADMIN: Update subcategory sort order (for drag-and-drop within category)
export const updateSubcategorySortOrder: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { updates } = req.body; // Array of {id, sortOrder}

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: "Updates must be an array",
      });
    }

    // Update all subcategories in batch
    const bulkOps = updates.map((update: any) => ({
      updateOne: {
        filter: { _id: new ObjectId(update.id) },
        update: {
          $set: {
            sortOrder: update.sortOrder,
            updatedAt: new Date(),
          },
        },
      },
    }));

    await db.collection("subcategories").bulkWrite(bulkOps);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Sort order updated successfully" },
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating sort order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update sort order",
    });
  }
};

// Icon upload handlers
export const uploadSubcategoryIcon = upload.single("icon");

export const handleSubcategoryIconUpload: RequestHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // In a real implementation, upload to cloud storage
    // For now, simulate with a placeholder URL
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = req.file.originalname.split(".").pop();
    const iconUrl = `/uploads/subcategory-icons/${timestamp}-${random}.${extension}`;

    const response: ApiResponse<{ iconUrl: string }> = {
      success: true,
      data: { iconUrl },
    };

    res.json(response);
  } catch (error) {
    console.error("Error uploading icon:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload icon",
    });
  }
};

// ADMIN: Get subcategories by category
export const getSubcategoriesByCategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { categoryId } = req.params;

    if (!ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid category ID",
      });
    }

    const subcategories = await db
      .collection("subcategories")
      .find({ categoryId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    const response: ApiResponse<Subcategory[]> = {
      success: true,
      data: subcategories as Subcategory[],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching subcategories by category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch subcategories",
    });
  }
};
