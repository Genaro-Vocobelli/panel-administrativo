import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import HomeRedirect from "@/components/HomeRedirect";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Consultas from "./pages/Consultas";
import Disenadores from "./pages/Disenadores";
import Tareas from "./pages/Tareas";
import AdminUsuarios from "./pages/AdminUsuarios";
import Chat from "./pages/Chat";
import Perfil from "./pages/Perfil";
import MisConsultas from "./pages/MisConsultas";
import Login from "./pages/Login";
import ActualizarPassword from "./pages/ActualizarPassword";
import NotFound from "./pages/NotFound";
import InstagramPage from "./pages/Instagram";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/actualizar-password"
              element={<ActualizarPassword />}
            />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomeRedirect />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consultas"
                element={
                  <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                    <Consultas />
                  </ProtectedRoute>
                }
              />
              <Route path="/tareas" element={<Tareas />} />
              <Route path="/disenadores" element={<Disenadores />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route path="/instagram" element={<InstagramPage />} />
              <Route path="/mis-consultas" element={<MisConsultas />} />
              <Route
                path="/admin/usuarios"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminUsuarios />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
