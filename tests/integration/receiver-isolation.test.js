const request=require('supertest');
const {app}=require('../../server');
const {USERS,SHIPMENT_A,SHIPMENT_B,login,createShipment}=require('./fixtures');

describe('Receiver shipment isolation integration',()=>{
  let operatorToken,receiverAToken,receiverBToken,shipmentA,shipmentB;

  beforeAll(async()=>{
    operatorToken=await login(request,USERS.operator.email,USERS.operator.password);
    receiverAToken=await login(request,USERS.receiverA.email,USERS.receiverA.password);
    receiverBToken=await login(request,USERS.receiverB.email,USERS.receiverB.password);

    shipmentA=await createShipment(request,operatorToken,{...SHIPMENT_A,receiverUserId:USERS.receiverA.id});
    shipmentB=await createShipment(request,operatorToken,{...SHIPMENT_B,receiverUserId:USERS.receiverB.id});

    expect(shipmentA.status).toBe(201);
    expect(shipmentB.status).toBe(201);
  });

  test('receiver A only receives shipments assigned to receiver A',async()=>{
    const response=await request(app).get('/api/receiver/shipments').set('Authorization',`Bearer ${receiverAToken}`);
    expect(response.status).toBe(200);
    expect(response.body.map(s=>s.id)).toContain(shipmentA.body.id);
    expect(response.body.map(s=>s.id)).not.toContain(shipmentB.body.id);
    expect(response.body.every(s=>s.receiver_user_id===USERS.receiverA.id)).toBe(true);
  });

  test('receiver B only receives shipments assigned to receiver B',async()=>{
    const response=await request(app).get('/api/receiver/shipments').set('Authorization',`Bearer ${receiverBToken}`);
    expect(response.status).toBe(200);
    expect(response.body.map(s=>s.id)).toContain(shipmentB.body.id);
    expect(response.body.map(s=>s.id)).not.toContain(shipmentA.body.id);
    expect(response.body.every(s=>s.receiver_user_id===USERS.receiverB.id)).toBe(true);
  });

  test('receiver A cannot request POD OTP for receiver B shipment',async()=>{
    const response=await request(app).post(`/api/shipments/${shipmentB.body.id}/pod/request-otp`).set('Authorization',`Bearer ${receiverAToken}`);
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/not assigned/i);
  });

  test('receiver A cannot read receiver B POD',async()=>{
    const response=await request(app).get(`/api/shipments/${shipmentB.body.id}/pod`).set('Authorization',`Bearer ${receiverAToken}`);
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/not assigned/i);
  });

  test('receiver A cannot retrieve receiver B POD photo',async()=>{
    const response=await request(app).get(`/api/shipments/${shipmentB.body.id}/pod/photo`).set('Authorization',`Bearer ${receiverAToken}`);
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/not assigned/i);
  });

  test('receiver A cannot confirm POD for receiver B shipment',async()=>{
    const response=await request(app).post(`/api/shipments/${shipmentB.body.id}/pod/confirm`).set('Authorization',`Bearer ${receiverAToken}`).send({otp:'123456',signature:'data:image/png;base64,TEST',photo:'data:image/jpeg;base64,TEST'});
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/not assigned/i);
  });

  test('unauthenticated receiver shipment listing is rejected',async()=>{
    const response=await request(app).get('/api/receiver/shipments');
    expect(response.status).toBe(401);
  });
});
