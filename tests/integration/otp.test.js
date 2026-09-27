const supertest=require('supertest');
const {app}=require('../../server');
const request=supertest(app);
const {USERS,SHIPMENT_A,login,createShipment,moveToOutForDelivery,requestOtp,confirmPod,TEST_SIGNATURE,TEST_PHOTO}=require('./fixtures');

let tokens,shipment;

async function setupShipment(){
  tokens={
    operator:await login(request,USERS.operator.email,USERS.operator.password),
    transporter:await login(request,USERS.transporter.email,USERS.transporter.password),
    receiver:await login(request,USERS.receiverA.email,USERS.receiverA.password)
  };
  const created=await createShipment(request,tokens.operator,{...SHIPMENT_A,receiverUserId:USERS.receiverA.id});
  expect(created.status).toBe(201);
  shipment=created.body;
  await moveToOutForDelivery(request,tokens.transporter,shipment.id);
}

beforeEach(async()=>{await setupShipment();});

describe('OTP hardening',()=>{
  test.each([
    ['five digits','12345'],
    ['seven digits','1234567'],
    ['non-numeric','12ab56'],
    ['empty','']
  ])('rejects %s OTP before verification',async(_label,otp)=>{
    const sent=await requestOtp(request,tokens.receiver,shipment.id);
    expect(sent.status).toBe(200);
    const response=await confirmPod(request,tokens.receiver,shipment.id,{otp,signature:TEST_SIGNATURE,photo:TEST_PHOTO});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid OTP');
  });

  test('rejects an expired OTP',async()=>{
    const sent=await requestOtp(request,tokens.receiver,shipment.id);
    expect(sent.status).toBe(200);
    app.locals.db.prepare('UPDATE shipments SET pod_otp_expires=? WHERE id=?').run(new Date(Date.now()-1000).toISOString(),shipment.id);
    const response=await confirmPod(request,tokens.receiver,shipment.id,{otp:sent.body.demoOtp,signature:TEST_SIGNATURE,photo:TEST_PHOTO});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('OTP expired');
  });

  test('invalidates the previous OTP when a replacement is requested',async()=>{
    const first=await requestOtp(request,tokens.receiver,shipment.id);
    expect(first.status).toBe(200);
    const second=await requestOtp(request,tokens.receiver,shipment.id);
    expect(second.status).toBe(200);
    const response=await confirmPod(request,tokens.receiver,shipment.id,{otp:first.body.demoOtp,signature:TEST_SIGNATURE,photo:TEST_PHOTO});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid OTP');
    const completed=await confirmPod(request,tokens.receiver,shipment.id,{otp:second.body.demoOtp,signature:TEST_SIGNATURE,photo:TEST_PHOTO});
    expect(completed.status).toBe(200);
  });

  test('locks after five failed attempts before checking the OTP',async()=>{
    const sent=await requestOtp(request,tokens.receiver,shipment.id);
    expect(sent.status).toBe(200);
    for(let i=0;i<5;i++){
      const response=await confirmPod(request,tokens.receiver,shipment.id,{otp:'000000',signature:TEST_SIGNATURE,photo:TEST_PHOTO});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid OTP');
    }
    const locked=await confirmPod(request,tokens.receiver,shipment.id,{otp:sent.body.demoOtp,signature:TEST_SIGNATURE,photo:TEST_PHOTO});
    expect(locked.status).toBe(429);
    expect(locked.body.error).toBe('Too many OTP attempts');
  });

  test('prevents OTP reuse after successful POD',async()=>{
    const sent=await requestOtp(request,tokens.receiver,shipment.id);
    expect(sent.status).toBe(200);
    const completed=await confirmPod(request,tokens.receiver,shipment.id,{otp:sent.body.demoOtp,signature:TEST_SIGNATURE,photo:TEST_PHOTO});
    expect(completed.status).toBe(200);
    const replay=await confirmPod(request,tokens.receiver,shipment.id,{otp:sent.body.demoOtp,signature:TEST_SIGNATURE,photo:TEST_PHOTO});
    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe('Proof of delivery already verified');
  });
});

describe('Production OTP response',()=>{
  test('does not expose demoOtp when NODE_ENV is production',async()=>{
    const original=process.env.NODE_ENV;
    process.env.NODE_ENV='production';
    try{
      const response=await requestOtp(request,tokens.receiver,shipment.id);
      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('demoOtp');
      expect(response.body.expiresAt).toBeDefined();
    }finally{process.env.NODE_ENV=original;}
  });
});
