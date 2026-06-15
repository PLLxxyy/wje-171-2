import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, DatePicker, Row, Col, Statistic } from 'antd';
import dayjs from 'dayjs';
import { attendanceApi } from '../api';

const { MonthPicker } = DatePicker;

const statusMap = {
  normal: { text: '正常', color: 'green' },
  late: { text: '迟到', color: 'orange' },
  early_leave: { text: '早退', color: 'magenta' },
  absent: { text: '缺勤', color: 'red' },
  half_absent: { text: '半天缺勤', color: 'volcano' }
};

export default function MyAttendance() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.my(month);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    normal: records.filter(r => r.status === 'normal').length,
    late: records.filter(r => r.status === 'late').length,
    early: records.filter(r => r.status === 'early_leave').length,
    absent: records.filter(r => ['absent', 'half_absent'].includes(r.status)).length,
    field: records.filter(r => r.is_field_work).length
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (v) => dayjs(v).format('YYYY-MM-DD dddd')
    },
    {
      title: '上班时间',
      dataIndex: 'check_in_time',
      key: 'check_in_time',
      render: (v) => v ? dayjs(v).format('HH:mm:ss') : '-'
    },
    {
      title: '下班时间',
      dataIndex: 'check_out_time',
      key: 'check_out_time',
      render: (v) => v ? dayjs(v).format('HH:mm:ss') : '-'
    },
    { title: '上班地点', dataIndex: 'check_in_location', key: 'check_in_location', render: v => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v) => (
        <span>
          {statusMap[v] && <Tag color={statusMap[v].color}>{statusMap[v].text}</Tag>}
        </span>
      )
    },
    {
      title: '外勤',
      dataIndex: 'is_field_work',
      key: 'is_field_work',
      render: (v) => v ? <Tag color="orange">是</Tag> : '-'
    }
  ];

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span style={{ marginRight: 8 }}>选择月份：</span>
            <MonthPicker value={dayjs(month)} onChange={(v) => setMonth(v ? v.format('YYYY-MM') : '')} />
          </Col>
        </Row>
      </Card>

      <Card title="考勤统计" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={4.8}>
            <Statistic title="正常出勤" value={stats.normal} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="迟到次数" value={stats.late} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="早退次数" value={stats.early} valueStyle={{ color: '#eb2f96' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="缺勤天数" value={stats.absent} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="外勤天数" value={stats.field} valueStyle={{ color: '#fa8c16' }} />
          </Col>
        </Row>
      </Card>

      <Card title="考勤明细">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
