import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { adminApi } from '../api';

const { MonthPicker } = DatePicker;

export default function AdminDashboard() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [ranking, setRanking] = useState([]);
  const [trend, setTrend] = useState([]);
  const [distribution, setDistribution] = useState({ byDept: [], byType: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, t, d] = await Promise.all([
        adminApi.departmentRanking(month),
        adminApi.lateTrend(),
        adminApi.fieldDistribution(month)
      ]);
      setRanking(r);
      setTrend(t);
      setDistribution(d);
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

  const deptColors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

  const trendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['迟到率(%)'] },
    grid: { left: 50, right: 30, top: 50, bottom: 40 },
    xAxis: {
      type: 'category',
      data: trend.map(t => t.month)
    },
    yAxis: {
      type: 'value',
      name: '迟到率(%)',
      min: 0,
      max: 100
    },
    series: [{
      name: '迟到率(%)',
      type: 'line',
      smooth: true,
      data: trend.map(t => t.late_rate),
      itemStyle: { color: '#ff4d4f' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255,77,79,0.3)' },
            { offset: 1, color: 'rgba(255,77,79,0.05)' }
          ]
        }
      },
      label: { show: true, formatter: '{c}%' }
    }]
  };

  const fieldDeptOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: Object.keys(typeLabels).map(k => typeLabels[k]) },
    grid: { left: 80, right: 30, top: 50, bottom: 40 },
    xAxis: { type: 'category', data: [...new Set(distribution.byDept.map(d => d.department))] },
    yAxis: { type: 'value', name: '次数' },
    series: Object.keys(typeLabels).map((type, idx) => ({
      name: typeLabels[type],
      type: 'bar',
      stack: 'total',
      data: [...new Set(distribution.byDept.map(d => d.department))].map(dept => {
        const found = distribution.byDept.find(d => d.department === dept && d.type === type);
        return found ? found.count : 0;
      }),
      itemStyle: { color: deptColors[idx % deptColors.length] }
    }))
  };

  const fieldTypeOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { show: true, formatter: '{b}: {c}次 ({d}%)' },
      data: distribution.byType.map(t => ({
        name: typeLabels[t.type] || t.type,
        value: t.count
      }))
    }]
  };

  const totalStats = ranking.reduce((acc, r) => ({
    total: acc.total + r.total_employees,
    normal: acc.normal + r.normal_count,
    late: acc.late + r.late_count,
    absent: acc.absent + r.absent_count,
    field: acc.field + r.field_count
  }), { total: 0, normal: 0, late: 0, absent: 0, field: 0 });

  const totalAttendance = ranking.reduce((s, r) => s + r.total_attendance_records, 0);
  const overallRate = totalAttendance > 0 ? Math.round(totalStats.normal / totalAttendance * 100) : 0;

  const rankColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      align: 'center',
      render: (_, __, idx) => {
        const medals = ['🥇', '🥈', '🥉'];
        return idx < 3 ? medals[idx] : idx + 1;
      }
    },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '员工数', dataIndex: 'total_employees', key: 'total_employees', align: 'center' },
    {
      title: '正常出勤',
      dataIndex: 'normal_count',
      key: 'normal_count',
      align: 'center',
      render: (v) => <Tag color="green">{v}</Tag>
    },
    {
      title: '迟到',
      dataIndex: 'late_count',
      key: 'late_count',
      align: 'center',
      render: (v) => v > 0 ? <Tag color="orange">{v}</Tag> : <span style={{ color: '#999' }}>0</span>
    },
    {
      title: '缺勤',
      dataIndex: 'absent_count',
      key: 'absent_count',
      align: 'center',
      render: (v) => v > 0 ? <Tag color="red">{v}</Tag> : <span style={{ color: '#999' }}>0</span>
    },
    {
      title: '外勤',
      dataIndex: 'field_count',
      key: 'field_count',
      align: 'center',
      render: (v) => v > 0 ? <Tag color="geekblue">{v}</Tag> : <span style={{ color: '#999' }}>0</span>
    },
    {
      title: '出勤率',
      dataIndex: 'attendance_rate',
      key: 'attendance_rate',
      align: 'center',
      render: (v) => <b style={{ color: v >= 90 ? '#52c41a' : v >= 70 ? '#faad14' : '#ff4d4f' }}>{v}%</b>
    }
  ];

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

      <Card title="全公司考勤概览" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={4.8}>
            <Statistic title="员工总数" value={totalStats.total} valueStyle={{ color: '#1677ff' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="整体出勤率" value={overallRate} suffix="%" valueStyle={{ color: overallRate >= 90 ? '#52c41a' : '#faad14' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="正常出勤 (人天)" value={totalStats.normal} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="迟到总次数" value={totalStats.late} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={4.8}>
            <Statistic title="外勤总次数" value={totalStats.field} valueStyle={{ color: '#fa8c16' }} />
          </Col>
        </Row>
      </Card>

      <Card title="部门出勤率排行榜" style={{ marginBottom: 24 }}>
        <Table
          rowKey="department"
          columns={rankColumns}
          dataSource={ranking}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="近6个月迟到率趋势">
            <ReactECharts option={trendOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card title="外勤分布（按部门×类型）">
            <ReactECharts option={fieldDeptOption} style={{ height: 360 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="外勤类型占比">
            <ReactECharts option={fieldTypeOption} style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
