const supertest=require('supertest');
const {app}=require('../../server');
const request=supertest(app);
const {USERS,SHIPMENT_A,login,createShipment,updateStatus,moveToOutForDelivery,requestOtp,confirmPod,TEST_SIGNATURE,TEST_PHOTO}=require('./fixtures');

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
    expect(response.body.error).toBe('OTP must be exactly 6 numeric digits');
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

describe('Shipment lifecycle',()=>{
  test('completes creation, OTP verification, status updates, and delivery',async()=>{
    const lifecycleTokens={
      operator:await login(request,USERS.operator.email,USERS.operator.password),
      transporter:await login(request,USERS.transporter.email,USERS.transporter.password),
      receiver:await login(request,USERS.receiverA.email,USERS.receiverA.password)
    };

    const created=await createShipment(request,lifecycleTokens.operator,{...SHIPMENT_A,receiverUserId:USERS.receiverA.id});
    expect(created.status).toBe(201);
    const id=created.body.id;
    expect(created.body.status).toBe('Created');

    for(const [status,location] of [
      ['Picked Up','Bengaluru'],
      ['In Transit','Bengaluru'],
      ['Arrived at Hub','Mysuru Hub'],
      ['Out for Delivery','Mysuru']
    ]){
      const updated=await updateStatus(request,lifecycleTokens.transporter,id,status,location);
      expect(updated.status).toBe(200);
      expect(updated.body.status).toBe(status);
      const event=updated.body.events.find(e=>e.status===status);
      expect(event.time).toBeTruthy();
      expect(event.location).toBe(location);
    }

    const sent=await requestOtp(request,lifecycleTokens.receiver,id);
    expect(sent.status).toBe(200);
    expect(sent.body.demoOtp).toMatch(/^\d{6}$/);

    const completed=await confirmPod(request,lifecycleTokens.receiver,id,{
      otp:sent.body.demoOtp,
      signature:TEST_SIGNATURE,
      photo:TEST_PHOTO
    });
    expect(completed.status).toBe(200);
    expect(completed.body.shipment.status).toBe('Delivered');
    expect(completed.body.shipment.pod_status).toBe('Verified');

    const final=await request.get(`/api/shipments/${id}`);
    expect(final.status).toBe(200);
    expect(final.body.status).toBe('Delivered');
    expect(final.body.pod_status).toBe('Verified');
    const deliveredEvent=final.body.events.find(e=>e.status==='Delivered');
    expect(deliveredEvent.time).toBeTruthy();
    expect(deliveredEvent.location).toBe(SHIPMENT_A.destination);
    expect(deliveredEvent.verified).toBe(true);
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
