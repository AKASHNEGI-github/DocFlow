import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SidebarProvider } from './context/SidebarContext.jsx';
import { router } from './router.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <SidebarProvider>
            <RouterProvider router={router} />
          </SidebarProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
