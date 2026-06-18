import { Button, Calendar, Card, Form, Input, InputNumber, List, Modal, Select, Space, Tag, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { InterviewResult, InterviewType, statusText } from '../constants/enums';
import { api } from '../utils/api';
                                                                                                                                                                                                                                                    
export default function InterviewsPage() {
  const [items, setItems] = useState<Interview[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Interview>();
  const [feedbackForm] = Form.useForm();

  const load = async () => {
    const { data } = await api.get('/interviews');
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const byDate = useMemo(() => items.reduce<Record<string, Interview[]>>((acc, i) => {
    const k = dayjs(i.scheduledAt).format('YYYY-MM-DD');
    (acc[k] ||= []).push(i);
    return acc;
  }, {}), [items]);

  const create = async (v: any) => {
    await api.post('/interviews', {
      ...v,
      resumeId: Number(v.resumeId),
      interviewerId: Number(v.interviewerId),
      round: Number(v.round),
      duration: Number(v.duration)
    });
    message.success('面试已安排');
    setOpen(false);
    load();
  };

  const finish = async (v: any) => {
    if (!active) return;
    await api.patch(`/interviews/${active.id}`, {
      ...v,
      professionalScore: v.professionalScore,
      communicationScore: v.communicationScore,
      cultureScore: v.cultureScore
    });
    message.success('反馈已保存');
    setActive(undefined);
    feedbackForm.resetFields();
    load();
  };

  const onDimensionChange = () => {
    const p = feedbackForm.getFieldValue('professionalScore');
    const c = feedbackForm.getFieldValue('communicationScore');
    const cu = feedbackForm.getFieldValue('cultureScore');
    const scores = [p, c, cu].filter(v => v !== undefined && v !== null);
    if (scores.length > 0) {
      const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
      feedbackForm.setFieldsValue({ score: avg });
    }
  };

  const openFeedback = (i: Interview) => {
    setActive(i);
    feedbackForm.setFieldsValue({
      result: i.result,
      score: i.score,
      professionalScore: i.professionalScore,
      communicationScore: i.communicationScore,
      cultureScore: i.cultureScore,
      feedback: i.feedback
    });
  };

  return <>
    <h1 className="page-title">面试日历</h1>
    <p className="subtle">月视图聚合全部安排，右侧处理待反馈面试。</p>
    <div className="toolbar">
      <Space>
        <Button type="primary" onClick={() => setOpen(true)}>安排新面试</Button>
      </Space>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }}>
      <Card className="tf-card">
        <Calendar fullscreen={false} cellRender={(date: Dayjs) =>
          byDate[date.format('YYYY-MM-DD')]?.map(i =>
            <Tag key={i.id} color="green">{i.resume?.candidate?.name} R{i.round}</Tag>
          )
        } />
      </Card>
      <Card className="tf-card" title="待反馈列表">
        <List
          dataSource={items.filter(i => i.result === InterviewResult.PENDING)}
          renderItem={(i) => <List.Item actions={[<Button size="small" onClick={() => openFeedback(i)}>反馈</Button>]}>
            {i.resume?.candidate?.name} · {dayjs(i.scheduledAt).format('MM-DD HH:mm')}
          </List.Item>}
        />
      </Card>
    </div>

    <Modal title="安排面试" open={open} onCancel={() => setOpen(false)} footer={null}>
      <Form layout="vertical" onFinish={create} initialValues={{ round: 1, duration: 60, type: InterviewType.TECHNICAL, interviewerId: 4 }}>
        <Form.Item label="简历 ID" name="resumeId"><Input /></Form.Item>
        <Form.Item label="面试官 ID" name="interviewerId"><Input /></Form.Item>
        <Form.Item label="轮次" name="round"><Input type="number" /></Form.Item>
        <Form.Item label="时间" name="scheduledAt"><Input placeholder="2026-06-20T10:00:00.000Z" /></Form.Item>
        <Form.Item label="时长" name="duration"><Input type="number" /></Form.Item>
        <Form.Item label="类型" name="type">
          <Select options={Object.values(InterviewType).map(v => ({ value: v, label: v }))} />
        </Form.Item>
        <Button type="primary" htmlType="submit">保存</Button>
      </Form>
    </Modal>

    <Modal title="完成面试反馈" open={!!active} onCancel={() => { setActive(undefined); feedbackForm.resetFields(); }} footer={null}>
      <Form form={feedbackForm} layout="vertical" onFinish={finish} initialValues={{ result: InterviewResult.PASS, score: 8 }}>
        <Form.Item label="结果" name="result">
          <Select options={Object.values(InterviewResult).map(v => ({ value: v, label: statusText[v] }))} />
        </Form.Item>
        <Form.Item label="专业能力" name="professionalScore">
          <InputNumber min={1} max={10} style={{ width: '100%' }} onChange={onDimensionChange} />
        </Form.Item>
        <Form.Item label="沟通协作" name="communicationScore">
          <InputNumber min={1} max={10} style={{ width: '100%' }} onChange={onDimensionChange} />
        </Form.Item>
        <Form.Item label="文化匹配" name="cultureScore">
          <InputNumber min={1} max={10} style={{ width: '100%' }} onChange={onDimensionChange} />
        </Form.Item>
        <Form.Item label="综合评分（自动计算）" name="score">
          <InputNumber min={1} max={10} style={{ width: '100%' }} readOnly />
        </Form.Item>
        <Form.Item label="反馈" name="feedback">
          <Input.TextArea />
        </Form.Item>
        <Button type="primary" htmlType="submit">提交反馈</Button>
      </Form>
    </Modal>
  </>;
}
