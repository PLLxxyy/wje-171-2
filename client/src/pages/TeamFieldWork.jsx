import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, DatePicker, Select, Modal } from 'antd';
import dayjs from 'dayjs';
import { fieldWorkApi } from '../api';

const { RangePicker } = DatePicker;

const typeOptions = [
  { value: 'client_visit', label: '客户拜访' },
  { value: 'site_survey', label: '现场勘查' },
  { value: 'business_trip', label: '出差' },
  { value: 'other', label: '其他外勤' }
];

const statusMap = {
  pending: { text: '待审批', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' }
};

export default function TeamFieldWork() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: undefined, dateRange: null });
  const [detailModal, setDetailModal] = useState({ open: false, record: null });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
        params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
      }
      const data = await fieldWorkApi.team(params);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status) => {
    try {
      await fieldWorkApi.review(id, status);
      message.success(status === 'approved' ? '已通过审批' : '已拒绝申请');
      loadData();
    } catch (e) {
      message.error(e.error || '操作失败');
    }
  };

  const columns = [
    {
      title: '申请人',
      key: 'user',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.user_name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{r.department || '-'}</div>
        </div>
      )
    },
    {
      title: '外勤类型',
      dataIndex: 'type',
      key: 'type',
      render: (v) => typeOptions.find(o => o.value === v)?.label || v
    },
    { title: '目的地', dataIndex: 'destination', key: 'destination' },
    {
      title: '工作内容',
      dataIndex: 'work_content',
      key: 'work_content',
      ellipsis: true,
      width: 200
    },
    {
      title: '时间',
      key: 'time',
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <div>起：{dayjs(r.start_time).format('MM-DD HH:mm')}</div>
          <div>止：{r.end_time ? dayjs(r.end_time).format('MM-DD HH:mm') : '-'}</div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => {
        if (r.status !== 'pending') return <span style={{ color: '#999' }}>已处理</span>;
        return (
          <Space>
            <Button type="link" size="small" onClick={() => handleReview(r.id, 'approved')}>
              通过
            </Button>
            <Button type="link" size="small" danger onClick={() => handleReview(r.id, 'rejected')}>
              拒绝
            </Button>
            <Button type="link" size="small" onClick={() => setDetailModal({ open: true, record: r })}>
              详情
            </Button>
          </Space>
        );
      }
    }
  ];

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <span>状态筛选：</span>
          <Select
            style={{ width: 140 }}
            allowClear
            placeholder="全部状态"
            value={filters.status}
            onChange={(v) => setFilters({ ...filters, status: v })}
            options={[
              { value: 'pending', label: '待审批' },
              { value: 'approved', label: '已通过' },
              { value: 'rejected', label: '已拒绝' }
            ]}
          />
          <RangePicker value={filters.dateRange} onChange={(v) => setFilters({ ...filters, dateRange: v })} />
          <Button onClick={loadData}>查询</Button>
        </Space>
      </Card>

      <Card title="外勤申请列表">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="外勤申请详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={[
          <Button key="close" onClick={() => setDetailModal({ open: false, record: null })}>关闭</Button>
        ]}
      >
        {detailModal.record && (
          <div style={{ lineHeight: 2 }}>
            <p><b>申请人：</b>{detailModal.record.user_name} ({detailModal.record.department})</p>
            <p><b>类型：</b>{typeOptions.find(o => o.value === detailModal.record.type)?.label}</p>
            <p><b>目的地：</b>{detailModal.record.destination}</p>
            <p><b>开始时间：</b>{dayjs(detailModal.record.start_time).format('YYYY-MM-DD HH:mm')}</p>
            <p><b>结束时间：</b>{detailModal.record.end_time ? dayjs(detailModal.record.end_time).format('YYYY-MM-DD HH:mm') : '-'}</p>
            <p><b>地点：</b>{detailModal.record.location || '-'}</p>
            <p><b>工作内容：</b></p>
            <p style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
              {detailModal.record.work_content}
            </p>
            <p><b>状态：</b>
              <Tag color={statusMap[detailModal.record.status]?.color}>
                {statusMap[detailModal.record.status]?.text}
              </Tag>
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
