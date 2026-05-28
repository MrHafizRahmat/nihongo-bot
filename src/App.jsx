import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import RegisterStudents from "./pages/RegisterStudents";
import TeacherMaterials from "./pages/TeacherMaterials";
import StudentMaterials from "./pages/StudentMaterials";
import ChatPage from "./pages/ChatPage";
import ChatHistory from "./pages/ChatHistory";
import StudentMessages from "./pages/StudentMessages";
import TeacherMessages from "./pages/TeacherMessages";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard/student"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/teacher"
            element={
              <ProtectedRoute requiredRole="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/teacher/register"
            element={
              <ProtectedRoute requiredRole="teacher">
                <RegisterStudents />
              </ProtectedRoute>
            }
          />

          <Route path="/dashboard/teacher/materials" element={
            <ProtectedRoute requiredRole="teacher"><TeacherMaterials /></ProtectedRoute>
          } />
          <Route path="/dashboard/student/materials" element={
            <ProtectedRoute requiredRole="student"><StudentMaterials /></ProtectedRoute>
          } />

          <Route path="/chat" element={
            <ProtectedRoute requiredRole="student"><ChatPage /></ProtectedRoute>
          } />
          <Route path="/chat/history" element={
            <ProtectedRoute requiredRole="student"><ChatHistory /></ProtectedRoute>
          } />

          <Route path="/messages/student" element={
            <ProtectedRoute requiredRole="student"><StudentMessages /></ProtectedRoute>
          } />
          <Route path="/messages/teacher" element={
            <ProtectedRoute requiredRole="teacher"><TeacherMessages /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}