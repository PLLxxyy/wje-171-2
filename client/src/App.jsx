import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import FieldWork from './pages/FieldWork.jsx';
import MyAttendance from './pages/MyAttendance.jsx';
import SupervisorDashboard from './pages/SupervisorDashboard.jsx';
import TeamAttendance from './pages/TeamAttendance.jsx';
import TeamFieldWork from './pages/TeamFieldWork.jsx';
import AbnormalReview from './pages/AbnormalReview.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminReports from './pages/AdminReports.jsx';

function LoadingScreen({ tip = '加载中...' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large">{tip}</Spin>
    </div>
  );
}

function PrivateRoute({ children, allowedRoles }) {
  const { user, initialChecked } = useAuth();

  if (!initialChecked) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'supervisor') return <Navigate to="/supervisor/dashboard" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }

  return children;
}

function RedirectByRole() {
  const { user, initialChecked } = useAuth();

  if (!initialChecked) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'supervisor') return <Navigate to="/supervisor/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
}

export default function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RedirectByRole />} />

        <Route path="/employee" element={
          <PrivateRoute allowedRoles={['employee', 'supervisor', 'admin']}>
            <Layout />
          </PrivateRoute>
        }>
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="field-work" element={<FieldWork />} />
          <Route path="attendance" element={<MyAttendance />} />
        </Route>

        <Route path="/supervisor" element={
          <PrivateRoute allowedRoles={['supervisor', 'admin']}>
            <Layout />
          </PrivateRoute>
        }>
          <Route path="dashboard" element={<SupervisorDashboard />} />
          <Route path="attendance" element={<TeamAttendance />} />
          <Route path="field-work" element={<TeamFieldWork />} />
          <Route path="abnormal-review" element={<AbnormalReview />} />
        </Route>

        <Route path="/admin" element={
          <PrivateRoute allowedRoles={['admin']}>
            <Layout />
          </PrivateRoute>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="abnormal-review" element={<AbnormalReview />} />
        </Route>
      </Routes>
    </div>
  );
}
