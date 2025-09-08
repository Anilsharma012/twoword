import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { FirebaseAuthProvider } from "./hooks/useFirebaseAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import PageUpdateNotification from "./components/PageUpdateNotification";
import { LocationProvider } from "./hooks/useLocationPreference";
import "./lib/global-api"; // Make API helper globally available
import Index from "./pages/Index";
import FirebaseAuth from "./pages/FirebaseAuth";
import FirebaseAuthTest from "./pages/FirebaseAuthTest";
import Categories from "./pages/Categories";
import Properties from "./pages/Properties";
import Buy from "./pages/Buy";
import Sale from "./pages/Sale";
import Rent from "./pages/Rent";
import Lease from "./pages/Lease";
import PG from "./pages/PG";
import Services from "./pages/Services";
import Advertise from "./pages/Advertise";
import Chat from "./pages/Chat";
import ChatPage from "./pages/ChatPage";
import ChatConversation from "./pages/ChatConversation";
import Conversations from "./pages/Conversations";
import DevChatTest from "./pages/DevChatTest";
import MyAccount from "./pages/MyAccount";
import User from "./pages/User";
import Seller from "./pages/Seller";
import Support from "./pages/Support";
import Agents from "./pages/Agents";
import Login from "./pages/Login";
import UserLogin from "./pages/UserLogin";
import EnhancedUserLogin from "./pages/EnhancedUserLogin";
import ComprehensiveAuth from "./pages/ComprehensiveAuth";
import UserDashboard from "./pages/UserDashboard";
import PostProperty from "./pages/PostProperty";
import SellerDashboard from "./pages/SellerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import CategoriesPage from "./pages/CategoriesPage";
import CountriesPage from "./pages/CountriesPage";
import CategoryProperties from "./pages/CategoryProperties";
import PropertyTypes from "./pages/PropertyTypes";
import PropertyDetail from "./pages/PropertyDetail";
import ContentPage from "./pages/ContentPage";
import DynamicPage from "./pages/DynamicPage";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import StaffAdmin from "./pages/StaffAdmin";
import EnhancedSellerDashboard from "./pages/EnhancedSellerDashboard";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import MyProperties from "./pages/MyProperties";
import Clients from "./pages/Clients";
import Favorites from "./pages/Favorites";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Maps from "./pages/Maps";
import NewProjects from "./pages/NewProjects";
import RecentViews from "./pages/RecentViews";
import Leads from "./pages/Leads";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import FooterTest from "./pages/FooterTest";
import FooterDebugPage from "./pages/FooterDebugPage";
import OtherServices from "./pages/OtherServices";
import OtherServicesCategory from "./pages/OtherServicesCategory";
import OtherServicesListings from "./pages/OtherServicesListings";
import TestChat from "./pages/TestChat";
import Step3Test from "./pages/Step3Test";
import NetworkStatus from "./components/NetworkStatus";
import SubcategoriesPage from "./pages/SubcategoriesPage";
import CategoryContentPage from "./pages/CategoryContentPage";
import OneSignalInit from "./components/OneSignalInit";
import { AdsProvider } from "./ads/AdsProvider";
import AdminAdsSettings from "./pages/AdminAdsSettings";

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <FirebaseAuthProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <NetworkStatus />
              {import.meta.env.VITE_ONESIGNAL_APP_ID ? <OneSignalInit /> : null}
              <LocationProvider>
              <BrowserRouter>
                <AdsProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route
                    path="/categories/:category"
                    element={<CategoryProperties />}
                  />
                  <Route path="/category/:category" element={<CategoryProperties />} />
                  <Route
                    path="/categories/:category/:subcategory"
                    element={<CategoryProperties />}
                  />
                  <Route
                    path="/categories/:category/:subcategory/:propertyType"
                    element={<CategoryProperties />}
                  />
                  <Route path="/properties" element={<Properties />} />
                  {/* New Category Routes */}
                  <Route path="/buy" element={<Buy />} />
                  <Route path="/sale" element={<Sale />} />
                  <Route path="/rent" element={<Rent />} />
                  <Route path="/lease" element={<Lease />} />
                  <Route path="/pg" element={<PG />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/other-services" element={<OtherServices />} />
                  <Route
                    path="/other-services/:cat"
                    element={<OtherServicesCategory />}
                  />
                  <Route
                    path="/other-services/:cat/:sub"
                    element={<OtherServicesListings />}
                  />
                  <Route path="/advertise" element={<Advertise />} />
                  {/* Category/Subcategory Listings */}
                  <Route path="/buy/:slug" element={<CategoryProperties />} />
                  <Route path="/sale/:slug" element={<CategoryProperties />} />
                  <Route path="/rent/:slug" element={<CategoryProperties />} />
                  <Route path="/lease/:slug" element={<CategoryProperties />} />
                  <Route path="/pg/:slug" element={<CategoryProperties />} />
                  <Route path="/property/:id" element={<PropertyDetail />} />
                  <Route path="/properties/:id" element={<PropertyDetail />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:conversationId" element={<ChatPage />} />
                  <Route path="/chats" element={<Conversations />} />
                  <Route
                    path="/conversation/:id"
                    element={<ChatConversation />}
                  />
                  <Route path="/test-chat/:id" element={<TestChat />} />
                  <Route path="/dev/chat-test" element={<DevChatTest />} />
                  <Route path="/step3-test" element={<Step3Test />} />
                  <Route path="/my-account" element={<MyAccount />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/login" element={<EnhancedUserLogin />} />
                  <Route path="/user-login" element={<EnhancedUserLogin />} />
                  <Route path="/auth" element={<ComprehensiveAuth />} />
                  <Route path="/firebase-auth" element={<FirebaseAuth />} />
                  <Route
                    path="/firebase-auth-test"
                    element={<FirebaseAuthTest />}
                  />
                  <Route path="/user" element={<User />} />
                  <Route path="/user-dashboard" element={<UserDashboard />} />
                  <Route path="/post-property" element={<PostProperty />} />
                  <Route path="/seller" element={<Seller />} />
                  <Route
                    path="/seller-dashboard"
                    element={<SellerDashboard />}
                  />
                  <Route path="/support/:action" element={<Support />} />
                  <Route
                    path="/support/ticket/:ticketId"
                    element={<Support />}
                  />
                  <Route
                    path="/enhanced-seller-dashboard"
                    element={<EnhancedSellerDashboard />}
                  />
                  <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
                  <Route path="/agent-dashboard" element={<AgentDashboard />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/support" element={<Admin />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/ads-settings" element={<AdminAdsSettings />} />
                  <Route path="/admin/ads/categories" element={<CategoriesPage />} />
                  <Route path="/admin/ads/categories/:categoryId/subcategories" element={<SubcategoriesPage />} />
                  <Route path="/admin/ads/categories/:categoryId/content" element={<CategoryContentPage />} />
                  <Route path="/admin/locations/countries" element={<CountriesPage />} />
                  <Route path="/staff/login" element={<StaffLogin />} />
                  <Route path="/staff-dashboard" element={<StaffDashboard />} />
                  <Route path="/staff-admin" element={<StaffAdmin />} />
                  {/* New Routes for Menu Dashboard Pages */}
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/my-properties" element={<MyProperties />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/wishlist" element={<Favorites />} />
                  <Route path="/account/my-ads" element={<MyProperties />} />
                  <Route path="/account/my-ads" element={<MyProperties />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/maps" element={<Maps />} />
                  <Route path="/new-projects" element={<NewProjects />} />
                  <Route path="/recent-views" element={<RecentViews />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/notifications" element={<Notifications />} />
                  {/* Content Pages */}
                  <Route path="/about-us" element={<ContentPage />} />
                  <Route path="/privacy-policy" element={<ContentPage />} />
                  <Route path="/terms-conditions" element={<ContentPage />} />
                  <Route path="/refund-policy" element={<ContentPage />} />
                  <Route path="/contact-us" element={<ContentPage />} />
                  {/* Aliases */}
                  <Route path="/contact" element={<Navigate to="/p/contact-us" replace />} />
                  {/* Footer Test Page */}
                  <Route path="/footer-test" element={<FooterTest />} />
                  <Route path="/footer-debug" element={<FooterDebugPage />} />
                  {/* Dynamic Pages from Admin */}
                  <Route path="/page/:slug" element={<DynamicPage />} />
                  <Route path="/p/:slug" element={<ContentPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </AdsProvider>
              </BrowserRouter>
              </LocationProvider>

              {/* Global Components */}
              <PageUpdateNotification />
            </TooltipProvider>
          </AuthProvider>
        </FirebaseAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
