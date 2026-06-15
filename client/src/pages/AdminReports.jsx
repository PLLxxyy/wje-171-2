import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Table, Tag, Row, Col, Space, message, Tabs } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi } from '../api';

const { MonthPicker } = DatePicker;

const statusMap = {
  normal: { text: '正常', color: 'green' },
  late: { text: '迟到', color: 'orange' },
  early_leave: { text: '早退', color: 'magenta' },
  absent: { text: '缺勤', color: 'red' },
  half_absent: { text: '半天缺勤', color: 'volcano' }
};

const typeLabels = {
  client_visit: '客户拜访',
  site_survey: '现场勘查',
  business_trip: '出差',
  other: '其他外勤'
};

const fwStatusMap = {
  pending: { text: '待审批', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' }
};

function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    message.warning('没有可导出的数据');
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        let val = row[h] ?? '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    )
  ];
  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  message.success('导出成功');
}

export default function AdminReports() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [monthlyData, setMonthlyData] = useState([]);
  const [fieldData, setFieldData] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState({ monthly: false, field: false });

  useEffect(() => {
    loadMonthly();
    loadField();
    loadUsersAndDepts();
  }, [month]);

  const loadMonthly = async () => {
    setLoading(l => ({ ...l, monthly: true }));
    try {
      const data = await adminApi.exportMonthly(month);
      setMonthlyData(data);
    } finally {
      setLoading(l => ({ ...l, monthly: false }));
    }
  };

  const loadField = async () => {
    setLoading(l => ({ ...l, field: true }));
    try {
      const data = await adminApi.exportField(month);
      setFieldData(data);
    } finally {
      setLoading(l => ({ ...l, field: false }));
    }
  };

  const loadUsersAndDepts = async () => {
    try {
      const [u, d] = await Promise.all([adminApi.users(), adminApi.departments()]);
      setUsers(u);
      setDepartments(d);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportMonthly = () => {
    const exportData = monthlyData.map(r => ({
      工号: r.username,
      姓名: r.name,
      部门: r.department || '',
      日期: r.date,
      上班时间: r.check_in_time ? dayjs(r.check_in_time).format('HH:mm:ss') : '',
      下班时间: r.check_out_time ? dayjs(r.check_out_time).format('HH:mm:ss') : '',
      考勤状态: statusMap[r.status]?.text || r.status,
      是否外勤: r.is_field_work ? '是' : '否'
    }));
    exportToCSV(exportData, `月度考勤表_${month}.csv`);
  };

  const handleExportField = () => {
    const exportData = fieldData.map(r => ({
      工号: r.username,
      姓名: r.name,
      部门: r.department || '',
      外勤类型: typeLabels[r.type] || r.type,
      目的地: r.destination,
      工作内容: r.work_content || '',
      开始时间: r.start_time ? dayjs(r.start_time).format('YYYY-MM-DD HH:mm') : '',
      结束时间: r.end_time ? dayjs(r.end_time).format('YYYY-MM-DD HH:mm') : '',
      地点: r.location || '',
      审批状态: fwStatusMap[r.status]?.text || r.status,
      审批人: r.reviewer_name || '',
      审批时间: r.reviewed_at ? dayjs(r.reviewed_at).format('YYYY-MM-DD HH:mm') : ''
    }));
    exportToCSV(exportData, `外勤明细表_${month}.csv`);
  };

  const monthlyColumns = [
    { title: '工号', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '部门', dataIndex: 'department', key: 'department', render: v => v || '-' },
    { title: '日期', dataIndex: 'date', key: 'date' },
    {
      title: '上班时间',
      dataIndex: 'check_in_time',
      key: 'check_in_time',
      render: v => v ? dayjs(v).format('HH:mm:ss') : '-'
    },
    {
      title: '下班时间',
      dataIndex: 'check_out_time',
      key: 'check_out_time',
      render: v => v ? dayjs(v).format('HH:mm:ss') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: v => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text || v}</Tag>
    },
    {
      title: '外勤',
      dataIndex: 'is_field_work',
      key: 'is_field_work',
      render: v => v ? <Tag color="orange">是</Tag> : '-'
    }
  ];

  const fieldColumns = [
    { title: '工号', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '部门', dataIndex: 'department', key: 'department', render: v => v || '-' },
    { title: '类型', dataIndex: 'type', key: 'type', render: v => typeLabels[v] || v },
    { title: '目的地', dataIndex: 'destination', key: 'destination' },
    { title: '工作内容', dataIndex: 'work_content', key: 'work_content', ellipsis: true, width: 200 },
    {
      title: '开始',
      dataIndex: 'start_time',
      key: 'start_time',
      render: v => dayjs(v).format('MM-DD HH:mm')
    },
    {
      title: '结束',
      dataIndex: 'end_time',
      key: 'end_time',
      render: v => v ? dayjs(v).format('MM-DD HH:mm') : '-'
    },
    {
      title: '审批状态',
      dataIndex: 'status',
      key: 'status',
      render: v => <Tag color={fwStatusMap[v]?.color}>{fwStatusMap[v]?.text}</Tag>
    },
    { title: '审批人', dataIndex: 'reviewer_name', key: 'reviewer_name', render: v => v || '-' }
  ];

  const userColumns = [
    { title: '工号', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: v => {
        const map = { employee: '员工', supervisor: '主管', admin: '管理员' };
        return <Tag color={v === 'admin' ? 'purple' : v === 'supervisor' ? 'blue' : 'default'}>{map[v]}</Tag>;
      }
    },
    { title: '部门', dataIndex: 'department', key: 'department', render: v => v || '-' },
    { title: '直属主管', dataIndex: 'supervisor_name', key: 'supervisor_name', render: v => v || '-' },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : '-'
    }
  ];

  const deptColumns = [
    { title: '部门名称', dataIndex: 'name', key: 'name' },
    { title: '部门经理', dataIndex: 'manager_name', key: 'manager_name', render: v => v || '-' },
    { title: '成员数', dataIndex: 'member_count', key: 'member_count', align: 'center' }
  ];

  const tabItems = [
    {
      key: 'monthly',
      label: '月度考勤表',
      children: (
        <div>
          <Card
            style={{ marginBottom: 16 }}
            title={`月度考勤明细 - ${month}`}
            extra={
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportMonthly}>
                导出 CSV
              </Button>
            }
          >
            <Table
              rowKey={(r, i) => `${r.username}-${r.date}-${i}`}
              columns={monthlyColumns}
              dataSource={monthlyData}
              loading={loading.monthly}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: 900 }}
            />
          </Card>
        </div>
      )
    },
    {
      key: 'field',
      label: '外勤明细表',
      children: (
        <div>
          <Card
            style={{ marginBottom: 16 }}
            title={`外勤明细 - ${month}`}
            extra={
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportField}>
                导出 CSV
              </Button>
            }
          >
            <Table
              rowKey="id"
              columns={fieldColumns}
              dataSource={fieldData}
              loading={loading.field}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: 1100 }}
            />
          </Card>
        </div>
      )
    },
    {
      key: 'users',
      label: '员工管理',
      children: (
        <Card title="员工列表" style={{ marginBottom: 16 }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Table
                rowKey="id"
                columns={userColumns}
                dataSource={users}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
              />
            </Col>
            <Col span={12}>
              <Card title="部门列表" size="small">
                <Table
                  rowKey="id"
                  columns={deptColumns}
                  dataSource={departments}
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      )
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
          <Col>
            <Space>
              <Button onClick={loadMonthly}>刷新考勤</Button>
              <Button onClick={loadField}>刷新外勤</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Tabs defaultActiveKey="monthly" items={tabItems} />
      </Card>
    </div>
  );
}
