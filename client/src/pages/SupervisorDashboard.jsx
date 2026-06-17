import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supervisorApi } from '../api';

const stateMap = {
  on_duty: { text: '已下班', color: '#52c41a', bg: '#f6ffed' },
  working: { text: '在岗中', color: '#1677ff', bg: '#e6f4ff' },
  field: { text: '外勤中', color: '#fa8c16', bg: '#fff7e6' },
  absent: { text: '缺勤', color: '#ff4d4f', bg: '#fff1f0' },
  late: { text: '迟到', color: '#faad14', bg: '#fff7e6' },
  early_leave: { text: '早退', color: '#eb2f96', bg: '#fff0f6' }
};

const avatarColors = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2', '#fa8c16', '#f5222d'];

export default function SupervisorDashboard() {
  const [teamData, setTeamData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await supervisorApi.teamToday();
      setTeamData(data);
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    on_duty: teamData.filter(m => m.state === 'on_duty').length,
    working: teamData.filter(m => m.state === 'working').length,
    field: teamData.filter(m => m.state === 'field').length,
    absent: teamData.filter(m => ['absent', 'late', 'early_leave', 'half_absent'].includes(m.state)).length,
    total: teamData.length
  };

  const statusCards = [
    { label: '在岗中', count: counts.working, color: '#1677ff', bg: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)' },
    { label: '外勤中', count: counts.field, color: '#fa8c16', bg: 'linear-gradient(135deg, #fa8c16 0%, #ffbb96 100%)' },
    { label: '已下班', count: counts.on_duty, color: '#52c41a', bg: 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)' },
    { label: '异常/缺勤', count: counts.absent, color: '#ff4d4f', bg: 'linear-gradient(135deg, #ff4d4f 0%, #ffa39e 100%)' }
  ];

  return (
    <div>
      <Card
        style={{ marginBottom: 24 }}
        title={
          <span>
            团队今日出勤状态大屏
            <Tag style={{ marginLeft: 16 }}>{dayjs().format('YYYY年MM月DD日')}</Tag>
          </span>
        }
        extra={
          <Button onClick={loadData} loading={loading}>
            刷新
          </Button>
        }
      >
        <div className="dashboard-grid">
          {statusCards.map((c, i) => (
            <div key={i} className="status-card" style={{ background: c.bg }}>
              <div className="count">{c.count}</div>
              <div className="label">{c.label}</div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                共 {counts.total} 人，占 {counts.total ? Math.round(c.count / counts.total * 100) : 0}%
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {teamData.map((member, idx) => {
            const st = stateMap[member.state] || stateMap.absent;
            return (
              <div key={member.id} className={`team-member-card ${member.state}`}>
                <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                  <div
                    className="member-avatar"
                    style={{ background: avatarColors[idx % avatarColors.length] }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{member.name}</div>
                  <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
                    {member.department || '-'}
                  </div>
                  <Tag color={st.color} style={{ margin: 0 }}>{st.text}</Tag>
                  {member.attendance?.is_abnormal && member.attendance?.abnormal_review_status === 'pending' && <Tag color="warning" style={{ margin: 0, marginLeft: 4 }}>定位异常待审</Tag>}
                  {member.attendance?.is_abnormal && member.attendance?.abnormal_review_status === 'approved' && <Tag color="success" style={{ margin: 0, marginLeft: 4 }}>异常已通过</Tag>}
                  {member.attendance?.is_abnormal && member.attendance?.abnormal_review_status === 'rejected' && <Tag color="error" style={{ margin: 0, marginLeft: 4 }}>异常已驳回</Tag>}
                </div>
                {member.attendance && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                    <div>上班：{member.attendance.check_in_time ? dayjs(member.attendance.check_in_time).format('HH:mm') : '-'}
                      {member.attendance.check_in_location_source === 'office' && <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>手动选点</Tag>}
                    </div>
                    <div>下班：{member.attendance.check_out_time ? dayjs(member.attendance.check_out_time).format('HH:mm') : '-'}
                      {member.attendance.check_out_location_source === 'office' && <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>手动选点</Tag>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
