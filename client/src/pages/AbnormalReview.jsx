import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Select, Space, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { abnormalAttendanceApi } from '../api';

const reviewStatusMap = {
  pending: { text: '待审核', color: 'warning' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已驳回', color: 'error' }
};

const attendanceStatusMap = {
  normal: { text: '正常', color: 'green' },
  late: { text: '迟到', color: 'orange' },
  early_leave: { text: '早退', color: 'magenta' },
  absent: { text: '缺勤', color: 'red' },
  half_absent: { text: '半天缺勤', color: 'volcano' }
};

export default function AbnormalReview() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await abnormalAttendanceApi.list({ status: filterStatus });
      setRecords(data);
    } catch (e) {
      message.error('获取异常记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status) => {
    try {
      await abnormalAttendanceApi.review(id, status);
      message.success(status === 'approved' ? '已通过审核' : '已驳回');
      loadData();
    } catch (e) {
      message.error(e.error || '操作失败');
    }
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (v) => dayjs(v).format('YYYY-MM-DD')
    },
    {
      title: '员工',
      key: 'employee',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.user_name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{r.department || '-'}</div>
        </div>
      )
    },
    {
      title: '上班时间',
      dataIndex: 'check_in_time',
      key: 'check_in_time',
      render: (v) => v ? dayjs(v).format('HH:mm:ss') : '-'
    },
    {
      title: '上班地点',
      key: 'check_in_location',
      render: (_, r) => (
        <span>
          {r.check_in_location || '-'}
          {r.check_in_location_source === 'office' && <Tag color="blue" style={{ marginLeft: 4 }}>手动选点</Tag>}
        </span>
      )
    },
    {
      title: '上班坐标',
      key: 'check_in_coords',
      render: (_, r) => r.check_in_lat && r.check_in_lat !== 0
        ? `${r.check_in_lat.toFixed(4)}, ${r.check_in_lng.toFixed(4)}`
        : '-'
    },
    {
      title: '下班时间',
      dataIndex: 'check_out_time',
      key: 'check_out_time',
      render: (v) => v ? dayjs(v).format('HH:mm:ss') : '-'
    },
    {
      title: '考勤状态',
      dataIndex: 'status',
      key: 'status',
      render: (v) => attendanceStatusMap[v]
        ? <Tag color={attendanceStatusMap[v].color}>{attendanceStatusMap[v].text}</Tag>
        : '-'
    },
    {
      title: '审核状态',
      dataIndex: 'abnormal_review_status',
      key: 'abnormal_review_status',
      render: (v, r) => (
        <span>
          {reviewStatusMap[v] && <Tag color={reviewStatusMap[v].color}>{reviewStatusMap[v].text}</Tag>}
          {r.reviewer_name && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>审核人：{r.reviewer_name}</div>}
          {r.abnormal_reviewed_at && <div style={{ fontSize: 12, color: '#999' }}>{dayjs(r.abnormal_reviewed_at).format('YYYY-MM-DD HH:mm')}</div>}
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => r.abnormal_review_status === 'pending' ? (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleReview(r.id, 'approved')}
          >
            通过
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleReview(r.id, 'rejected')}
          >
            驳回
          </Button>
        </Space>
      ) : '-'
    }
  ];

  const pendingCount = records.filter(r => r.abnormal_review_status === 'pending').length;

  return (
    <div>
      <Card
        title="异常打卡审核"
        extra={
          <Space>
            <span>筛选状态：</span>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 120 }}
              options={[
                { value: 'pending', label: '待审核' },
                { value: 'approved', label: '已通过' },
                { value: 'rejected', label: '已驳回' }
              ]}
            />
          </Space>
        }
      >
        {filterStatus === 'pending' && pendingCount > 0 && (
          <div style={{ marginBottom: 16, padding: '8px 16px', background: '#fff7e6', borderRadius: 4, border: '1px solid #ffe58f' }}>
            当前共 <b style={{ color: '#fa8c16' }}>{records.length}</b> 条待审核记录
          </div>
        )}
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
