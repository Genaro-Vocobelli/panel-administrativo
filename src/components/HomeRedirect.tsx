import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const HomeRedirect = () => {
  const { profile } = useAuth();
  if (profile?.role === 'admin') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/tareas" replace />;
};

export default HomeRedirect;
