const request=require('supertest');
const {app}=require('../../server');
const {USERS,login}=require('./fixtures');

describe('Authentication integration',()=>{
  test('receiver can login and access /api/me',async()=>{
    const token=await login(request,USERS.receiverA.email,USERS.receiverA.password);
    const response=await request(app).get('/api/me').set('Authorization',`Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({id:USERS.receiverA.id,email:USERS.receiverA.email,role:'receiver'}));
  });

  test('rejects invalid password',async()=>{
    const response=await request(app).post('/api/auth/login').send({email:USERS.receiverA.email,password:'WrongPassword!'});
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/invalid credentials/i);
  });

  test('rejects /api/me without JWT',async()=>{
    const response=await request(app).get('/api/me');
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/authentication required/i);
  });

  test('public registration cannot create admin or transporter accounts',async()=>{
    for(const role of ['admin','transporter']){
      const response=await request(app).post('/api/auth/register').send({email:`blocked-${role}@test.shipchain.local`,password:'Password123!',role});
      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/public registration|admin|transporter/i);
    }
  });
});
