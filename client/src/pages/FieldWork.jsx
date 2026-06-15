import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, DatePicker, Button, Table, Tag, message, Space } from 'antd';
import dayjs from 'dayjs';
import { fieldWorkApi } from '../api';

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

export default function FieldWork() {
  const [form] = Form.useForm();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await fieldWorkApi.my();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await fieldWorkApi.create({
        type: values.type,
        destination: values.destination,
        work_content: values.work_content,
        start_time: values.time_range[0].toISOString(),
        end_time: values.time_range[1].toISOString(),
        location: values.location,
        lat: 0,
        lng: 0
      });
      message.success('外勤申请提交成功！');
      form.resetFields();
      loadRecords();
    } catch (e) {
      message.error(e.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '外勤类型',
      dataIndex: 'type',
      key: 'type',
      render: (v) => typeOptions.find(o => o.value === v)?.label || v
    },
    { title: '目的地', dataIndex: 'destination', key: 'destination' },
    { title: '工作内容', dataIndex: 'work_content', key: 'work_content' },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag>
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm')
    }
  ];

  return (
    <div>
      <Card title="提交外勤申请" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="type" label="外勤类型" rules={[{ required: true, message: '请选择外勤类型' }]}>
              <Select options={typeOptions} placeholder="请选择外勤类型" />
            </Form.Item>
            <Form.Item name="destination" label="外勤目的地" rules={[{ required: true, message: '请输入目的地' }]}>
              <Input placeholder="如：客户公司、项目现场等" />
            </Form.Item>
            <Form.Item name="time_range" label="外勤时间" rules={[{ required: true, message: '请选择时间范围' }]}>
              <DatePicker.RangePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="location" label="打卡地点">
              <Input placeholder="选填，如具体地址" />
            </Form.Item>
          </div>
          <Form.Item name="work_content" label="工作内容" rules={[{ required: true, message: '请输入工作内容' }]}>
            <Input.TextArea rows={3} placeholder="请描述本次外勤的具体工作内容..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交申请
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="我的外勤记录">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
