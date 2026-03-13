import request from 'supertest';
import { app } from '../src/index';

describe('Exam-Net Clone API Tests', () => {
  let createdExamId: string;
  let createdExamKey: string;
  let createdQuestionId: string;
  let submissionId: string;

  const teacherId = 'teacher-1';

  it('GET /api/students - should return a list of students', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it('POST /api/exams - should create a new exam with complex types', async () => {
    const examData = {
      teacherId,
      title: 'Complex API Test Exam',
      questions: [
        { id: 'q1', type: 'open', text: 'Test question', points: 1, correctAnswer: 'Test' },
        { 
          id: 'q2', 
          type: 'matching', 
          text: 'Match them', 
          points: 2, 
          matchingPairs: [{ id: 'p1', left: 'A', right: '1' }] 
        },
        { 
          id: 'q3', 
          type: 'ordering', 
          text: 'Order them', 
          points: 2, 
          orderItems: ['First', 'Second'] 
        }
      ],
      labels: ['complex-test'],
      type: 'toets',
      isGraded: true,
      requireFullscreen: true,
      detectTabSwitch: true
    };
    const res = await request(app).post('/api/exams').send(examData);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('examKey');
    
    createdExamId = res.body.id;
    createdExamKey = res.body.examKey;
  });

  it('GET /api/teacher/exams - should list teacher exams', async () => {
    const res = await request(app).get(`/api/teacher/exams?teacherId=${teacherId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    const found = res.body.find((e: any) => e.id === createdExamId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Complex API Test Exam');
  });

  it('GET /api/exams/:key - should get exam details by key', async () => {
    const res = await request(app).get(`/api/exams/${createdExamKey}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Complex API Test Exam');
  });

  it('POST /api/submissions - student should be able to submit complex answers', async () => {
    const submitData = {
      examId: createdExamId,
      name: 'Complex Test Student',
      klas: '6A',
      answers: { 
        'q1': 'Answer',
        'q2': [{ id: 'p1', text: '1' }],
        'q3': [{ id: '0', text: 'First' }, { id: '1', text: 'Second' }]
      }
    };
    const res = await request(app).post('/api/submissions').send(submitData);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/exams/:id/submissions - teacher should fetch submissions', async () => {
    const res = await request(app).get(`/api/exams/${createdExamId}/submissions`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
    submissionId = res.body[0].id;
  });

  it('PUT /api/submissions/:id/scores - teacher should save scores', async () => {
    const scoresData = { scores: { 'q1': 1, 'q2': 2 } };
    const res = await request(app).put(`/api/submissions/${submissionId}/scores`).send(scoresData);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/questions-bank - should save a question to the bank', async () => {
    const qData = {
      teacherId,
      question: { id: 'test-q-1', type: 'open', text: 'Bank Question', points: 2, correctAnswer: 'Ok' },
      labels: ['bank-test'],
      forceNew: true
    };
    const res = await request(app).post('/api/questions-bank').send(qData);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    createdQuestionId = res.body.id;
  });

  it('DELETE /api/questions-bank/:id - should delete question from bank', async () => {
    const res = await request(app).delete(`/api/questions-bank/${createdQuestionId}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /api/exams/:id - should delete the exam', async () => {
    const res = await request(app).delete(`/api/exams/${createdExamId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
