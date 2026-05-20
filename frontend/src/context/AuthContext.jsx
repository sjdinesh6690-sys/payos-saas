import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('payslip_token'));
  const [role,  setRole]  = useState(() => localStorage.getItem('payslip_role'));

  const login = (newToken, newRole) => {
    localStorage.setItem('payslip_token', newToken);
    localStorage.setItem('payslip_role',  newRole);
    setToken(newToken);
    setRole(newRole);
  };

  const logout = () => {
    localStorage.removeItem('payslip_token');
    localStorage.removeItem('payslip_role');
    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout, isEmployer: role === 'employer', isEmployee: role === 'employee' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
