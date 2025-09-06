import { connectToDatabase, getDatabase, closeDatabaseConnection } from "../db/mongodb";

async function run() {
  await connectToDatabase();
  const db = getDatabase();

  const categories = db.collection("categories");
  const categoryContent = db.collection("category_content");
  const properties = db.collection("properties");

  const slug = "new-property";
  const name = "New Property";

  // Upsert category
  const catResult = await categories.findOneAndUpdate(
    { slug },
    {
      $setOnInsert: {
        name,
        slug,
        description: "Brand new properties and launches",
        icon: "🏗️",
        order: 999,
        createdAt: new Date(),
      },
      $set: {
        updatedAt: new Date(),
        active: true,
      },
    },
    { upsert: true, returnDocument: "after" as const },
  );

  const categoryId = (catResult.value as any)._id.toString();

  // Upsert category content
  const heroImages = [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1200&auto=format&fit=crop",
  ];

  await categoryContent.updateOne(
    { categoryId },
    {
      $set: {
        categoryId,
        hero: {
          title: "Discover New Properties",
          subtitle: "Latest launches and fresh listings",
          images: heroImages,
          ctaLabel: "Explore Now",
          ctaHref: "/properties",
          active: true,
        },
        banners: [
          {
            image:
              "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop",
            href: "/properties",
            order: 1,
            active: true,
          },
          {
            image:
              "https://images.unsplash.com/photo-1502005229762-cf1b2da7c52f?q=80&w=1200&auto=format&fit=crop",
            href: "/buy",
            order: 2,
            active: true,
          },
          {
            image:
              "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1200&auto=format&fit=crop",
            href: "/sale",
            order: 3,
            active: true,
          },
        ],
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  // Seed one sample approved active property under this category (idempotent by title)
  const title = "Sample New Property - Test Listing";
  const existing = await properties.findOne({ title });
  if (!existing) {
    await properties.insertOne({
      title,
      description: "A fresh listing under New Property category for testing.",
      price: 4500000,
      priceType: "sale",
      propertyType: slug,
      subCategory: "",
      location: {
        address: "Rohtak, Haryana",
      },
      specifications: {
        area: 1200,
        bedrooms: 2,
        bathrooms: 2,
      },
      images: [
        "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?q=80&w=1200&auto=format&fit=crop",
      ],
      amenities: ["parking", "water"],
      ownerId: "seed",
      ownerType: "seller",
      contactInfo: {
        name: "Test Owner",
        phone: "+911234567890",
        email: "owner@example.com",
      },
      status: "active",
      approvalStatus: "approved",
      featured: false,
      premium: false,
      contactVisible: true,
      views: 0,
      inquiries: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log("✅ Seeded category, content, and sample property for /category/new-property");
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
  });
