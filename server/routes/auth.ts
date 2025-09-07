import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { User, ApiResponse } from "@shared/types";

import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendWelcomeNotification } from "./notifications";
import twilio from "twilio";
// <- tumhare DB helper ka path
import { getAdmin } from "../firebaseAdmin"; // <- new file

// Logout handler - clear cookie
export const logout: RequestHandler = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return res.json({ success: true, data: { message: "Logged out" } });
  } catch (e: any) {
    return res
      .status(500)
      .json({ success: false, error: e?.message || "Failed to logout" });
  }
};

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const SALT_ROUNDS = 10;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || "";
const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

// Register new user (seller, agent, or buyer)
export const registerUser: RequestHandler = async (req, res) => {
  try {
    console.log("🔍 Registration request received:", {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
    });

    const db = getDatabase();
    const {
      name,
      email,
      phone,
      password,
      userType,
      experience,
      specializations,
      serviceAreas,
    } = req.body;

    // Validate required fields
    console.log("📋 Validating required fields...");
    if (!name || !email || !phone || !password || !userType) {
      console.log("❌ Missing required fields:", {
        name: !!name,
        email: !!email,
        phone: !!phone,
        password: !!password,
        userType: !!userType,
      });
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: name, email, phone, password, and userType are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format:", email);
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    // Validate phone format (basic check)
    if (phone.length < 10) {
      console.log("❌ Invalid phone number:", phone);
      return res.status(400).json({
        success: false,
        error: "Phone number must be at least 10 digits",
      });
    }

    // Validate userType
    if (!["seller", "buyer", "agent"].includes(userType)) {
      console.log("❌ Invalid user type:", userType);
      return res.status(400).json({
        success: false,
        error: "Invalid user type. Must be seller, buyer, or agent",
      });
    }

    console.log("✅ All validations passed");

    // Check if user already exists
    console.log("🔍 Checking for existing user...");
    const existingUser = await db
      .collection("users")
      .findOne({ $or: [{ email }, { phone }] });

    if (existingUser) {
      console.log("❌ User already exists:", {
        email: existingUser.email,
        phone: existingUser.phone,
      });
      return res.status(400).json({
        success: false,
        error: "User with this email or phone already exists",
      });
    }

    console.log("✅ No existing user found");

    // Hash password
    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log("✅ Password hashed successfully");

    // Create user object
    // Generate email verification token
    console.log("🎫 Generating email verification token...");
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    console.log("✅ Email verification token generated");

    const newUser: Omit<User, "_id"> = {
      name,
      email,
      phone,
      password: hashedPassword,
      userType,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpiry,
      preferences: {
        propertyTypes: [],
        priceRange: { min: 0, max: 10000000 },
        locations: [],
      },
      favorites: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add agent-specific fields if userType is agent
    if (userType === "agent") {
      (newUser as any).agentProfile = {
        experience: parseInt(experience) || 0,
        specializations: specializations || [],
        rating: 0,
        reviewCount: 0,
        aboutMe: "",
        serviceAreas: serviceAreas || [],
      };
      (newUser as any).properties = [];
    }

    console.log("💾 Inserting user into database...");
    console.log("📝 User object to insert:", JSON.stringify(newUser, null, 2));

    const result = await db.collection("users").insertOne(newUser);
    console.log("✅ User inserted successfully:", result.insertedId);

    // Send welcome notification to new user
    try {
      await sendWelcomeNotification(
        result.insertedId.toString(),
        name,
        userType,
      );
    } catch (notificationError) {
      console.warn(
        "⚠️ Failed to send welcome notification:",
        notificationError,
      );
      // Don't fail registration if notification fails
    }

    // Generate JWT token
    console.log("🎟️ Generating JWT token...");
    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        userType,
        email,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    console.log("✅ JWT token generated");

    // For demo purposes, log the verification link
    const verificationLink = `${process.env.BASE_URL || "http://localhost:8080"}/api/auth/verify-email?token=${emailVerificationToken}`;
    console.log(`Email verification link for ${email}: ${verificationLink}`);

    const response: ApiResponse<{
      token: string;
      user: any;
      verificationLink?: string;
    }> = {
      success: true,
      data: {
        token,
        user: {
          id: result.insertedId.toString(),
          name,
          email,
          phone,
          userType,
          emailVerified: false,
        },
        verificationLink, // Include in response for demo
      },
      message:
        "User registered successfully. Please check your email to verify your account.",
    };

    // Set httpOnly cookie for session persistence
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sevenDays,
      path: "/",
    });

    console.log("📤 Sending successful registration response");
    res.status(201).json(response);
  } catch (error: any) {
    console.error("❌ Registration error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: error,
    });

    // Check for specific error types
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "User with this email or phone already exists",
      });
    }

    if (error.name === "MongoError" || error.name === "MongoServerError") {
      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`,
      });
    }

    res.status(500).json({
      success: false,
      error: `Failed to register user: ${error.message}`,
    });
  }
};

// Login user
export const loginUser: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { email, phone, password, userType } = req.body;

    // Build query based on provided fields
    let query: any = {};

    // Check if login is by username (for staff) or email/phone
    const { username } = req.body;

    if (username) {
      // Staff login by username
      query = { username };
    } else if (email && phone) {
      query = { $or: [{ email }, { phone }] };
    } else if (email) {
      query = { email };
    } else if (phone) {
      query = { phone };
    } else {
      return res.status(400).json({
        success: false,
        error: "Email, phone number, or username is required",
      });
    }

    // Support unified login - don't filter by userType for login
    // Users can login with any userType using the same credentialsialsng the same credentials

    // Find user by email, phone, or username
    const user = await db.collection("users").findOne(query);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Update last login time
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          updatedAt: new Date(),
        },
        $unset: user.isFirstLogin ? { isFirstLogin: 1 } : {},
      },
    );

    // Generate JWT token with role information
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userType: user.userType,
        email: user.email,
        role: user.role || user.userType, // Include role for staff members
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Prepare user response with role information
    const userResponse: any = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
    };

    // Add role information for staff members
    if (user.userType === "staff" || user.role) {
      userResponse.role = user.role;
      userResponse.permissions = user.permissions || [];
      userResponse.isFirstLogin = user.isFirstLogin || false;
      userResponse.username = user.username;

      // Add role display information
      const roleInfo = {
        super_admin: { displayName: "Super Admin", color: "purple" },
        content_manager: { displayName: "Content Manager", color: "blue" },
        sales_manager: { displayName: "Sales Manager", color: "green" },
        support_executive: {
          displayName: "Support Executive",
          color: "orange",
        },
        admin: { displayName: "Admin", color: "gray" },
      };

      userResponse.roleInfo = roleInfo[user.role] || {
        displayName: user.role,
        color: "gray",
      };
    }

    const response: ApiResponse<{ token: string; user: any }> = {
      success: true,
      data: {
        token,
        user: userResponse,
      },
      message: user.isFirstLogin
        ? "First login successful - please change your password"
        : "Login successful",
    };

    // Set httpOnly cookie for session persistence
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sevenDays,
      path: "/",
    });

    res.json(response);
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to login",
    });
  }
};

// Send OTP (placeholder - integrate with SMS service)
export const sendOTP: RequestHandler = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, error: "Phone number is required" });
    }

    const to = toE164(phone);

    // If Twilio Verify configured, use it (recommended)
    if (twilioClient && TWILIO_VERIFY_SERVICE_SID) {
      const verification = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to, channel: "sms" });

      if (verification.status === "pending") {
        return res.json({
          success: true,
          data: { message: "OTP sent successfully" },
        });
      }
      return res
        .status(500)
        .json({ success: false, error: "Failed to send OTP" });
    }

    // ---- Fallback (random OTP saved in DB) ----
    const db = getDatabase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await db.collection("otps").deleteMany({ phone });
    await db.collection("otps").insertOne({
      phone,
      otp,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Try emailing OTP as well when email is known
    try {
      const toEmail =
        req.body.email ||
        (
          await db
            .collection("users")
            .findOne({ phone }, { projection: { email: 1 } })
        )?.email;
      if (toEmail) {
        const { sendEmail } = await import("../utils/mailer");
        await sendEmail(
          toEmail,
          "Your OTP Code - dalon",
          `<p>Your OTP is <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
        );
      }
    } catch (e) {
      console.warn("OTP email send failed (non-fatal)");
    }

    // TODO: integrate SMS gateway (MSG91/Textlocal etc.) here
    console.log(`OTP (fallback) for ${phone}: ${otp}`);

    return res.json({
      success: true,
      data: { message: "OTP sent successfully" },
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to send OTP" });
  }
};

// Verify OTP
export const verifyOTP: RequestHandler = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res
        .status(400)
        .json({ success: false, error: "Phone number and OTP are required" });
    }

    const db = getDatabase();
    const to = toE164(phone);

    let verified = false;

    // Twilio Verify path
    if (twilioClient && TWILIO_VERIFY_SERVICE_SID) {
      const check = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to, code: otp });
      verified = check.status === "approved";
    } else {
      // Fallback: accept demo OTP or check DB record
      if (otp === "123456") {
        verified = true;
      } else {
        const otpRecord = await db.collection("otps").findOne({
          phone,
          otp,
          expiresAt: { $gt: new Date() },
        });
        if (otpRecord) {
          verified = true;
          await db.collection("otps").deleteOne({ _id: otpRecord._id });
        }
      }
    }

    if (!verified) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired OTP" });
    }

    // Find existing user by phone, or create a minimal account
    let user = await db.collection("users").findOne({ phone });
    if (!user) {
      const name = `User ${String(phone).slice(-4)}`;
      const email = "";
      const userType = "seller";
      const insertRes = await db.collection("users").insertOne({
        name,
        email,
        phone,
        userType,
        emailVerified: false,
        preferences: {
          propertyTypes: [],
          priceRange: { min: 0, max: 10000000 },
          locations: [],
        },
        favorites: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      user = await db
        .collection("users")
        .findOne({ _id: insertRes.insertedId });
    } else {
      await db
        .collection("users")
        .updateOne(
          { _id: user._id },
          { $set: { lastLogin: new Date(), updatedAt: new Date() } },
        );
    }

    const token = jwt.sign(
      {
        userId: String(user._id),
        userType: user.userType,
        email: user.email || "",
        role: user.role || user.userType,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const userResponse: any = {
      id: String(user._id),
      name: user.name,
      email: user.email || "",
      phone: user.phone,
      userType: user.userType,
    };

    // Set httpOnly cookie
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sevenDays,
      path: "/",
    });

    return res.json({
      success: true,
      data: { token, user: userResponse },
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, error: "Failed to verify OTP" });
  }
};

// Get user profile
export const getUserProfile: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId; // From auth middleware

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    const response: ApiResponse<any> = {
      success: true,
      data: userWithoutPassword,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile",
    });
  }
};

// Update user profile
export const updateUserProfile: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId; // From auth middleware
    const updateData = req.body;

    // Remove sensitive fields
    delete updateData.password;
    delete updateData._id;

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Profile updated successfully" },
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
    });
  }
};

// Google authentication

export const googleAuth: RequestHandler = async (req, res) => {
  try {
    const { idToken, userType } = req.body;
    if (!idToken)
      return res.status(400).json({ success: false, error: "Missing idToken" });

    // --- TEMP DEBUG: token payload print ---
    try {
      const payloadB64 = idToken.split(".")[1];
      const payload = JSON.parse(
        Buffer.from(payloadB64, "base64").toString("utf8"),
      );
      console.log("IDTOKEN payload:", {
        aud: payload.aud,
        iss: payload.iss,
        sub: payload.sub,
        email: payload.email,
      });
    } catch {}

    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("verifyIdToken OK for:", decoded.email, "uid:", decoded.uid);

    const email = decoded.email!;
    const name = decoded.name || "";

    const db = getDatabase();
    let user = await db.collection("users").findOne({ email });
    if (!user) {
      const ins = await db.collection("users").insertOne({
        email,
        name,
        userType: userType || "buyer",
        createdAt: new Date(),
      });
      user = {
        _id: ins.insertedId,
        email,
        name,
        userType: userType || "buyer",
      };
    }

    const token = jwt.sign(
      {
        userId: String(user._id),
        userType: user.userType,
        email: user.email || "",
        role: user.role || user.userType,
      },
      process.env.JWT_SECRET || "change-me",
      { expiresIn: "7d" },
    );

    return res.json({
      success: true,
      data: { token, user },
      message: "Google authentication successful",
    });
  } catch (err: any) {
    console.error(
      "googleAuth verify error:",
      err?.errorInfo?.code || err?.code || err?.message,
      err?.errorInfo || err,
    );
    return res.status(401).json({
      success: false,
      error: err?.errorInfo?.code || err?.code || "Invalid Google user data",
    });
  }
};

function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}
