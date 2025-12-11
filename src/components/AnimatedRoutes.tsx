import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Transfer from "@/pages/Transfer";
import History from "@/pages/History";
import Recipients from "@/pages/Recipients";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";
import Settings from "@/pages/Settings";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import TrackTransfer from "@/pages/TrackTransfer";
import UploadProof from "@/pages/UploadProof";
import NotFound from "@/pages/NotFound";

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition><Index /></PageTransition>
        } />
        <Route path="/auth" element={
          <PageTransition><Auth /></PageTransition>
        } />
        <Route path="/terms" element={
          <PageTransition><Terms /></PageTransition>
        } />
        <Route path="/privacy" element={
          <PageTransition><Privacy /></PageTransition>
        } />
        <Route path="/track" element={
          <PageTransition><TrackTransfer /></PageTransition>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <PageTransition><Dashboard /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/transfer" element={
          <ProtectedRoute>
            <PageTransition><Transfer /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <PageTransition><History /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/recipients" element={
          <ProtectedRoute>
            <PageTransition><Recipients /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <PageTransition><Profile /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <PageTransition><Settings /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/upload-proof" element={
          <ProtectedRoute>
            <PageTransition><UploadProof /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute>
            <PageTransition><AdminDashboard /></PageTransition>
          </AdminRoute>
        } />
        <Route path="*" element={
          <PageTransition><NotFound /></PageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
