import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, DatePicker, Row, Col, Statistic, Progress } from 'antd';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { supervisorApi } from '../api';

const { MonthPicker } = DatePicker;

export default function TeamAttendance() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [stats, setStats] = useState([]);
  const [fieldStats, setFieldStats] = useState({ byType: [], byDest: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamStats, fieldStatsData] = await Promise.all([
        supervisorApi.teamStats(month),
        supervisorApi.fieldStats(month)
      ]);
      setStats(teamStats);
      setFieldStats(fieldStatsData);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels = {
    client_visit: '客户拜访',
    site_survey: '现场勘查',
    business_trip: '出差',
    other: '其他外勤'
  };

  const fieldTypeOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}: {c}次' },
      data: fieldStats.byType.map(t => ({
        name: typeLabels[t.type] || t.type,
        value: t.count
      }))
    }]
  };

  const fieldDestOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'value', name: '次数' },
    yAxis: {
      type: 'category',
      data: fieldStats.byDest.map(d => d.destination).reverse()
    },
    series: [{
      type: 'bar',
      data: fieldStats.byDest.map(d => d.count).reverse(),
      itemStyle: { color: '#fa8c16' },
      label: { show: true, position: 'right' }
    }]
  };

  const columns = [
    {
      title: '员工',
      key: 'name',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{r.username} · {r.department || '-'}</div>
        </div>
      )
    },
    {
      title: '正常',
      dataIndex: ['stats', 'normal_days'],
      key: 'normal_days',
      align: 'center',
      render: (v) => <Tag color="green" style={{ margin: 0 }}>{v}天</Tag>
    },
    {
      title: '迟到',
      dataIndex: ['stats', 'late_count'],
      key: 'late_count',
      align: 'center',
      render: (v) => v > 0 ? <Tag color="orange">{v}次</Tag> : <span style={{ color: '#999' }}>0</span>
    },
    {
      title: '早退',
      dataIndex: ['stats', 'early_leave_count'],
      key: 'early_leave_count',
      align: 'center',
      render: (v) => v > 0 ? <Tag color="magenta">{v}次</Tag> : <span style={{ color: '#999' }}>0</span>
    },
    {
      title: '缺勤',
      dataIndex: ['stats', 'absent_days'],
      key: 'absent_days',
      align: 'center',
      render: (v) => v > 0 ? <Tag color="red">{v}天</Tag> : <span style={{ color: '#999' }}>0</span>
    },
    {
      title: '外勤',
      dataIndex: ['stats', 'field_days'],
      key: 'field_days',
      align: 'center',
      render: (v) => v > 0 ? <Tag color="geekblue">{v}天</Tag> : <span style={{ color: '#999' }}>0</span>
    },
    {
      title: '出勤率',
      key: 'rate',
      align: 'center',
      render: (_, r) => {
        const total = r.stats.total_days || 0;
        const rate = total > 0 ? Math.round(r.stats.normal_days / total * 100) : 0;
        return <Progress percent={rate} size="small" />;
      }
    }
  ];

  const summary = stats.reduce((acc, r) => ({
    normal: acc.normal + r.stats.normal_days,
    late: acc.late + r.stats.late_count,
    early: acc.early + r.stats.early_leave_count,
    absent: acc.absent + r.stats.absent_days,
    field: acc.field + r.stats.field_days
  }), { normal: 0, late: 0, early: 0, absent: 0, field: 0 });

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span style={{ marginRight: 8 }}>统计月份：</span>
            <MonthPicker value={dayjs(month)} onChange={(v) => setMonth(v ? v.format('YYYY-MM') : '')} />
          </Col>
        </Row>
      </Card>

      <Card title="团队考勤汇总" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={4.8}>
            <Statistic title="正常出勤 (人天)" value={summary.normal} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="迟到总次数" value={summary.late} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="早退总次数" value={summary.early} valueStyle={{ color: '#eb2f96' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="缺勤总天数" value={summary.absent} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="外勤总天数" value={summary.field} valueStyle={{ color: '#fa8c16' }} />
          </Col>
        </Row>
      </Card>

      <Card title="员工考勤明细" style={{ marginBottom: 24 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={stats}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="外勤类型分布">
            <ReactECharts option={fieldTypeOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="外勤目的地 TOP">
            <ReactECharts option={fieldDestOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
