import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Space } from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  BarChartOutlined,
  FileTextOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';

const { Header, Sider, Content } = AntLayout;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getMenuItems = () => {
    const items = [];
    if (['employee', 'supervisor', 'admin'].includes(user.role)) {
      items.push({
        key: '/employee/dashboard',
        icon: <ClockCircleOutlined />,
        label: '打卡',
        onClick: () => navigate('/employee/dashboard')
      });
      items.push({
        key: '/employee/field-work',
        icon: <EnvironmentOutlined />,
        label: '外勤申请',
        onClick: () => navigate('/employee/field-work')
      });
      items.push({
        key: '/employee/attendance',
        icon: <FileTextOutlined />,
        label: '我的考勤',
        onClick: () => navigate('/employee/attendance')
      });
    }
    if (['supervisor', 'admin'].includes(user.role)) {
      items.push({ type: 'divider' });
      items.push({
        key: '/supervisor/dashboard',
        icon: <TeamOutlined />,
        label: '团队出勤',
        onClick: () => navigate('/supervisor/dashboard')
      });
      items.push({
        key: '/supervisor/attendance',
        icon: <BarChartOutlined />,
        label: '考勤统计',
        onClick: () => navigate('/supervisor/attendance')
      });
      items.push({
        key: '/supervisor/field-work',
        icon: <EnvironmentOutlined />,
        label: '外勤审批',
        onClick: () => navigate('/supervisor/field-work')
      });
    }
    if (user.role === 'admin') {
      items.push({ type: 'divider' });
      items.push({
        key: '/admin/dashboard',
        icon: <BarChartOutlined />,
        label: '数据总览',
        onClick: () => navigate('/admin/dashboard')
      });
      items.push({
        key: '/admin/reports',
        icon: <FileTextOutlined />,
        label: '报表导出',
        onClick: () => navigate('/admin/reports')
      });
    }
    return items;
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => { logout(); navigate('/login'); }
    }
  ];

  const roleText = {
    employee: '员工',
    supervisor: '主管',
    admin: '管理员'
  };

  return (
    <AntLayout className="main-layout">
      <Header className="main-header" style={{ background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClockCircleOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          <h2 style={{ margin: 0, fontSize: 18 }}>外勤工时与考勤打卡系统</h2>
        </div>
        <Dropdown menu={{ items: userMenuItems }}>
          <Space style={{ cursor: 'pointer' }}>
            <Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
            <span>
              {user?.name}
              <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                [{roleText[user?.role]}]
              </span>
            </span>
          </Space>
        </Dropdown>
      </Header>
      <AntLayout>
        <Sider width={200} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={getMenuItems()}
          />
        </Sider>
        <Content className="main-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
