import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Phone, Mail, AlertCircle } from "lucide-react";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ApiResponse } from "@shared/types";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const userType = searchParams.get("type") || "buyer"; // buyer, seller, agent
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: profile (for signup)
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [experience, setExperience] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data: ApiResponse<any> = await response.json();

      if (data.success) {
        setStep(2);
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, otp }),
      });

      const data: ApiResponse<any> = await response.json();

      if (data.success) {
        if (data.data.isNewUser) {
          // New user - proceed to profile setup
          setStep(3);
        } else {
          // Existing user - use auth context to login
          login(data.data.token, data.data.user);

          // Redirect to dashboard based on user type
          if (data.data.user.userType === "seller") {
            window.location.href = "/seller-dashboard";
          } else if (data.data.user.userType === "agent") {
            window.location.href = "/agent-dashboard";
          } else {
            window.location.href = "/";
          }
        }
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          userType,
          password: "temp123", // Temporary password since we're using OTP auth
          experience:
            userType === "agent" ? parseInt(experience) || 0 : undefined,
          specializations: userType === "agent" ? [] : undefined,
          serviceAreas: userType === "agent" ? [] : undefined,
        }),
      });

      const data: ApiResponse<any> = await response.json();

      if (data.success) {
        // Use auth context to login
        login(data.data.token, data.data.user);

        // Redirect to appropriate dashboard
        if (userType === "seller") {
          window.location.href = "/seller-dashboard";
        } else if (userType === "agent") {
          window.location.href = "/agent-dashboard";
        } else {
          window.location.href = "/";
        }
      } else {
        setError(data.error || "Failed to create profile");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth
    setError("Google login coming soon!");
  };

  const getUserTypeTitle = () => {
    switch (userType) {
      case "seller":
        return "Property Seller";
      case "agent":
        return "Property Agent";
      default:
        return "User";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => window.history.back()}
            className="mr-4 p-2 bg-white rounded-full shadow-md"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isLogin ? "Login" : "Sign Up"}
            </h1>
            <p className="text-gray-600">as {getUserTypeTitle()}</p>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          {/* Step 1: Phone Number */}
          {step === 1 && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#C70000] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Enter your mobile number
                </h2>
                <p className="text-gray-600">
                  We'll send you a verification code
                </p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Mobile Number</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                      <span className="text-gray-600">+91</span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-l-none"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#C70000] hover:bg-[#A60000] text-white"
                  disabled={phone.length !== 10 || loading}
                >
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4"
                  onClick={handleGoogleLogin}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  {isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="ml-1 text-[#C70000] font-medium"
                  >
                    {isLogin ? "Sign up" : "Login"}
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#C70000] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Enter verification code
                </h2>
                <p className="text-gray-600">We sent a code to +91 {phone}</p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="otp">6-digit code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#C70000] hover:bg-[#A60000] text-white"
                  disabled={otp.length !== 6 || loading}
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setStep(1)}
                  className="text-[#C70000] font-medium"
                >
                  Change phone number
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Profile Setup (Signup only) */}
          {step === 3 && !isLogin && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Complete your profile
                </h2>
                <p className="text-gray-600">Tell us a bit about yourself</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {userType === "agent" && (
                  <div>
                    <Label htmlFor="experience">Experience</Label>
                    <Select onValueChange={setExperience}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-1">0-1 years</SelectItem>
                        <SelectItem value="1-3">1-3 years</SelectItem>
                        <SelectItem value="3-5">3-5 years</SelectItem>
                        <SelectItem value="5-10">5-10 years</SelectItem>
                        <SelectItem value="10+">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#C70000] hover:bg-[#A60000] text-white"
                  disabled={loading}
                >
                  {loading ? "Setting up..." : "Complete Setup"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
