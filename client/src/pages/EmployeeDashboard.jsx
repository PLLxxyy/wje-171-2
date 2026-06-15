import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, message, Descriptions } from 'antd';
import { EnvironmentOutlined, CheckCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { attendanceApi } from '../api';
import { useAuth } from '../context/AuthContext.jsx';

const statusMap = {
  normal: { text: '正常', color: 'green' },
  late: { text: '迟到', color: 'orange' },
  early_leave: { text: '早退', color: 'magenta' },
  absent: { text: '缺勤', color: 'red' },
  half_absent: { text: '半天缺勤', color: 'volcano' }
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [now, setNow] = useState(dayjs());
  const [todayRecord, setTodayRecord] = useState(null);
  const [location, setLocation] = useState('正在获取位置...');
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadToday();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocation(`经度: ${pos.coords.longitude.toFixed(4)}, 纬度: ${pos.coords.latitude.toFixed(4)}`);
        },
        () => {
          setLocation('无法获取位置（默认：公司总部）');
          setCoords({ lat: 39.9042, lng: 116.4074 });
        }
      );
    }
  }, []);

  const loadToday = async () => {
    const data = await attendanceApi.today();
    setTodayRecord(data);
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await attendanceApi.checkIn({ location, lat: coords.lat, lng: coords.lng });
      message.success('上班打卡成功！');
      loadToday();
    } catch (e) {
      message.error(e.error || '打卡失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await attendanceApi.checkOut({ location, lat: coords.lat, lng: coords.lng });
      message.success('下班打卡成功！');
      loadToday();
    } catch (e) {
      message.error(e.error || '打卡失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card className="clock-card">
        <h2 style={{ marginBottom: 8 }}>{user?.name}，你好！</h2>
        <p style={{ color: '#888', marginBottom: 16 }}>{user?.department || ''}</p>
        <div className="clock-date">{now.format('YYYY年MM月DD日 dddd')}</div>
        <div className="clock-display">{now.format('HH:mm:ss')}</div>

        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            type="primary"
            size="large"
            className="clock-button"
            icon={<CheckCircleOutlined />}
            onClick={handleCheckIn}
            loading={loading}
            disabled={todayRecord?.check_in_time}
            danger={false}
            style={{
              background: todayRecord?.check_in_time ? '#d9d9d9' : '#52c41a',
              borderColor: todayRecord?.check_in_time ? '#d9d9d9' : '#52c41a'
            }}
          >
            {todayRecord?.check_in_time ? '已打卡' : '上班打卡'}
          </Button>
          <Button
            size="large"
            className="clock-button"
            icon={<LogoutOutlined />}
            onClick={handleCheckOut}
            loading={loading}
            disabled={!todayRecord?.check_in_time || todayRecord?.check_out_time}
            style={{
              background: todayRecord?.check_out_time ? '#d9d9d9' : '#1677ff',
              borderColor: todayRecord?.check_out_time ? '#d9d9d9' : '#1677ff',
              color: '#fff'
            }}
          >
            {todayRecord?.check_out_time ? '已打卡' : '下班打卡'}
          </Button>
        </div>

        <div className="location-info">
          <EnvironmentOutlined style={{ marginRight: 8 }} />
          {location}
        </div>

        {todayRecord && (
          <Card style={{ marginTop: 24, textAlign: 'left' }} size="small" title="今日打卡记录">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="上班时间">
                {todayRecord.check_in_time ? dayjs(todayRecord.check_in_time).format('HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="上班地点">
                {todayRecord.check_in_location || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="下班时间">
                {todayRecord.check_out_time ? dayjs(todayRecord.check_out_time).format('HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="下班地点">
                {todayRecord.check_out_location || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="考勤状态">
                {statusMap[todayRecord.status] ? (
                  <Tag color={statusMap[todayRecord.status].color}>
                    {statusMap[todayRecord.status].text}
                  </Tag>
                ) : '-'}
                {todayRecord.is_field_work && <Tag color="orange">外勤</Tag>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Card>
    </div>
  );
}
