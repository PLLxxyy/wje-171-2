import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, message, Descriptions, Select, Switch, Space } from 'antd';
import { EnvironmentOutlined, CheckCircleOutlined, LogoutOutlined, AimOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { attendanceApi, officeApi } from '../api';
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
  const [offices, setOffices] = useState([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [gpsFailed, setGpsFailed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadToday();
    loadOffices();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocation(`经度: ${pos.coords.longitude.toFixed(4)}, 纬度: ${pos.coords.latitude.toFixed(4)}`);
          setGpsFailed(false);
        },
        () => {
          setLocation('无法获取位置');
          setCoords({ lat: 0, lng: 0 });
          setGpsFailed(true);
          setManualMode(true);
        }
      );
    } else {
      setLocation('浏览器不支持定位');
      setGpsFailed(true);
      setManualMode(true);
    }
  }, []);

  const loadToday = async () => {
    const data = await attendanceApi.today();
    setTodayRecord(data);
  };

  const loadOffices = async () => {
    try {
      const data = await officeApi.list();
      setOffices(data);
    } catch (e) {
      message.error('获取办公地点列表失败');
    }
  };

  const handleManualModeChange = (checked) => {
    setManualMode(checked);
    if (!checked) {
      setSelectedOfficeId(null);
    }
  };

  const getCheckInPayload = () => {
    if (manualMode && selectedOfficeId) {
      return {
        location: offices.find(o => o.id === selectedOfficeId)?.name + '（手动选择）',
        lat: 0,
        lng: 0,
        location_source: 'office',
        office_id: selectedOfficeId
      };
    }
    return {
      location,
      lat: coords.lat,
      lng: coords.lng,
      location_source: 'gps'
    };
  };

  const handleCheckIn = async () => {
    if (manualMode && !selectedOfficeId) {
      message.warning('请先选择一个办公地点');
      return;
    }
    setLoading(true);
    try {
      const payload = getCheckInPayload();
      await attendanceApi.checkIn(payload);
      message.success('上班打卡成功！');
      loadToday();
    } catch (e) {
      message.error(e.error || '打卡失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (manualMode && !selectedOfficeId) {
      message.warning('请先选择一个办公地点');
      return;
    }
    setLoading(true);
    try {
      const payload = getCheckInPayload();
      await attendanceApi.checkOut(payload);
      message.success('下班打卡成功！');
      loadToday();
    } catch (e) {
      message.error(e.error || '打卡失败');
    } finally {
      setLoading(false);
    }
  };

  const selectedOffice = offices.find(o => o.id === selectedOfficeId);

  return (
    <div>
      <Card className="clock-card">
        <h2 style={{ marginBottom: 8 }}>{user?.name}，你好！</h2>
        <p style={{ color: '#888', marginBottom: 16 }}>{user?.department || ''}</p>
        <div className="clock-date">{now.format('YYYY年MM月DD日 dddd')}</div>
        <div className="clock-display">{now.format('HH:mm:ss')}</div>

        <div style={{ margin: '16px 0', padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>
              <AimOutlined style={{ marginRight: 6 }} />
              定位方式
            </span>
            <Space>
              <Switch
                size="small"
                checked={manualMode}
                onChange={handleManualModeChange}
                checkedChildren="手动选择"
                unCheckedChildren="GPS定位"
              />
              {gpsFailed && <Tag color="warning">信号不佳</Tag>}
            </Space>
          </div>

          {manualMode ? (
            <div>
              <Select
                style={{ width: '100%' }}
                placeholder="请选择办公地点"
                value={selectedOfficeId}
                onChange={setSelectedOfficeId}
                options={offices.map(o => ({
                  value: o.id,
                  label: `${o.name}（围栏${o.radius}米）`
                }))}
              />
              {selectedOffice && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                  坐标：{selectedOffice.lat.toFixed(4)}, {selectedOffice.lng.toFixed(4)} | 围栏半径：{selectedOffice.radius}米
                </div>
              )}
            </div>
          ) : (
            <div className="location-info">
              <EnvironmentOutlined style={{ marginRight: 8 }} />
              {location}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            type="primary"
            size="large"
            className="clock-button"
            icon={<CheckCircleOutlined />}
            onClick={handleCheckIn}
            loading={loading}
            disabled={todayRecord?.check_in_time || (manualMode && !selectedOfficeId)}
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
            disabled={!todayRecord?.check_in_time || todayRecord?.check_out_time || (manualMode && !selectedOfficeId)}
            style={{
              background: todayRecord?.check_out_time ? '#d9d9d9' : '#1677ff',
              borderColor: todayRecord?.check_out_time ? '#d9d9d9' : '#1677ff',
              color: '#fff'
            }}
          >
            {todayRecord?.check_out_time ? '已打卡' : '下班打卡'}
          </Button>
        </div>

        {todayRecord && (
          <Card style={{ marginTop: 24, textAlign: 'left' }} size="small" title="今日打卡记录">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="上班时间">
                {todayRecord.check_in_time ? dayjs(todayRecord.check_in_time).format('HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="上班地点">
                {todayRecord.check_in_location || '-'}
                {todayRecord.check_in_location_source === 'office' && <Tag color="blue" style={{ marginLeft: 4 }}>手动选择</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="下班时间">
                {todayRecord.check_out_time ? dayjs(todayRecord.check_out_time).format('HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="下班地点">
                {todayRecord.check_out_location || '-'}
                {todayRecord.check_out_location_source === 'office' && <Tag color="blue" style={{ marginLeft: 4 }}>手动选择</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="考勤状态">
                {statusMap[todayRecord.status] ? (
                  <Tag color={statusMap[todayRecord.status].color}>
                    {statusMap[todayRecord.status].text}
                  </Tag>
                ) : '-'}
                {todayRecord.is_field_work && <Tag color="orange">外勤</Tag>}
                {todayRecord.is_abnormal && todayRecord.abnormal_review_status === 'pending' && <Tag color="warning">定位异常待审</Tag>}
                {todayRecord.is_abnormal && todayRecord.abnormal_review_status === 'approved' && <Tag color="success">定位异常已通过</Tag>}
                {todayRecord.is_abnormal && todayRecord.abnormal_review_status === 'rejected' && <Tag color="error">定位异常已驳回</Tag>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Card>
    </div>
  );
}
