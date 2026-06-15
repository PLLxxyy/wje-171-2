import React from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState('');

  const onFinish = async (values) => {
    setError('');
    try {
      const user = await login(values.username, values.password);
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'supervisor') navigate('/supervisor/dashboard');
      else navigate('/employee/dashboard');
    } catch (e) {
      setError(e.error || '登录失败');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">考勤打卡系统</h1>
        <p className="login-subtitle">外勤工时与考勤管理</p>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ marginTop: 24, padding: 16, background: '#f6f8fa', borderRadius: 8, fontSize: 13, color: '#666' }}>
          <p style={{ marginBottom: 8, fontWeight: 600, color: '#333' }}>测试账号：</p>
          <p>管理员：admin / admin123</p>
          <p>主管：sup01 / 123456，sup02 / 123456</p>
          <p>员工：emp01-emp06 / 123456</p>
        </div>
      </div>
    </div>
  );
}
