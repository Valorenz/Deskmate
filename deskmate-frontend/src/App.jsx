// src/App.jsx — COMPLETE FINAL VERSION
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isLoggedIn, getRole } from "./utils/auth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import SupervisorDashboardPage from "./pages/SupervisorDashboardPage";
import ChatPage from "./pages/ChatPage";
import CreateTicketPage from "./pages/CreateTicketPage";
import TicketListPage from "./pages/TicketListPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import AllTicketsPage from "./pages/AllTicketsPage";
import DocumentManagementPage from "./pages/DocumentManagementPage";
import UserManagementPage from "./pages/UserManagementPage";
import ProfilePage from "./pages/ProfilePage";

function PrivateRoute({ children, requiredRole }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (requiredRole) {
    const role = getRole();
    const roleLevel = { employee: 1, supervisor: 2, admin: 3 };
    if ((roleLevel[role] || 0) < (roleLevel[requiredRole] || 0)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
}

function PublicRoute({ children }) {
  if (isLoggedIn()) return <Navigate to="/dashboard" replace />;
  return children;
}

function SmartDashboard() {
  const role = getRole();
  if (role === "supervisor" || role === "admin") return <SupervisorDashboardPage />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'DM Sans', 'Segoe UI', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        button { font-family: inherit; }
        textarea { font-family: inherit; }
        select { font-family: inherit; }
      `}</style>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login"            element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"         element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/dashboard"        element={<PrivateRoute><SmartDashboard /></PrivateRoute>} />
        <Route path="/chat"             element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/tickets"          element={<PrivateRoute><TicketListPage /></PrivateRoute>} />
        <Route path="/tickets/create"   element={<PrivateRoute><CreateTicketPage /></PrivateRoute>} />
        <Route path="/tickets/:id"      element={<PrivateRoute><TicketDetailPage /></PrivateRoute>} />
        <Route path="/all-tickets"      element={<PrivateRoute requiredRole="supervisor"><AllTicketsPage /></PrivateRoute>} />
        <Route path="/documents"        element={<PrivateRoute requiredRole="admin"><DocumentManagementPage /></PrivateRoute>} />
        <Route path="/users"            element={<PrivateRoute requiredRole="admin"><UserManagementPage /></PrivateRoute>} />
        <Route path="/profile"          element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="*"                 element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
