import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { prisma } from '../db/prisma';
import { config } from '../config/env';

const app = createApp();

describe('Authentication and Multi-User Isolation Tests', () => {
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Clean test database or mock records
    // Create User A
    userA = await prisma.user.create({
      data: {
        email: `test_user_a_${Date.now()}@example.com`,
        googleId: `google_id_a_${Date.now()}`,
        name: 'User A',
      },
    });

    const sessionA = await prisma.session.create({
      data: {
        userId: userA.id,
        token: `token_a_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    tokenA = jwt.sign(
      { userId: userA.id, sessionId: sessionA.id },
      config.sessionSecret
    );

    // Create User B
    userB = await prisma.user.create({
      data: {
        email: `test_user_b_${Date.now()}@example.com`,
        googleId: `google_id_b_${Date.now()}`,
        name: 'User B',
      },
    });

    const sessionB = await prisma.session.create({
      data: {
        userId: userB.id,
        token: `token_b_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    tokenB = jwt.sign(
      { userId: userB.id, sessionId: sessionB.id },
      config.sessionSecret
    );
  });

  afterAll(async () => {
    if (userA) {
      await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    }
    if (userB) {
      await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Authentication required/i);
  });

  it('allows authenticated requests with valid session token', async () => {
    const res = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.accounts).toBeDefined();
  });

  it('strictly isolates financial records between two users', async () => {
    // User A creates an account
    const accResA = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'User A HDFC Bank',
        type: 'BANK',
        openingBalance: 50000,
      });

    expect(accResA.status).toBe(201);
    const accountAId = accResA.body.account.id;

    // User B fetches accounts - must NOT see User A's account!
    const resB = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    const userBAccountIds = resB.body.accounts.map((acc: any) => acc.id);
    expect(userBAccountIds).not.toContain(accountAId);

    // User B attempts to modify User A's account - must be rejected with 404/403
    const updateRes = await request(app)
      .patch(`/api/accounts/${accountAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hacked Name' });

    expect(updateRes.status).toBe(404);
  });
});

