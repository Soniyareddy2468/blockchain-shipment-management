const supertest=require('supertest');
const {app}=require('../../server');
const request=supertest(app);
const {USERS,SHIPMENT_A,TEST_SIGNATURE,TEST_PHOTO,login,createShipment,updateStatus,requestOtp,confirmPod}=require('./fixtures');

describe('End-to-end shipment lifecycle',()=>{
  test('creates, transports, verifies OTP POD, and completes shipment',async()=>{
    const operator=await login(request,USERS.operator.email,USERS.operator.password);
    const transporter=await login(request,USERS.transporter.email,USERS.transporter.password);
    const receiver=await login(request,USERS.receiverA.email,USERS.receiverA.password);

    const created=await createShipment(request,operator,{...SHIPMENT_A,receiverUserId:USERS.receiverA.id});
    expect(created.status).toBe(201);
    const shipmentId=created.body.id;
    expect(created.body.status).toBe('Created');
    expect(created.body.receiver_user_id).toBe(USERS.receiverA.id);

    for(const [status,location] of [['Picked Up','Bengaluru'],['In Transit','Bengaluru'],['Arrived at Hub','Mysuru Hub'],['Out for Delivery','Mysuru']]){
      const updated=await updateStatus(request,transporter,shipmentId,status,location);
      expect(updated.status).toBe(200);
      expect(updated.body.status).toBe(status);
      const event=updated.body.events.find(e=>e.status===status);
      expect(event).toBeDefined();
      expect(event.time).toBeTruthy();
      expect(event.location).toBe(location);
    }

    const otp=await requestOtp(request,receiver,shipmentId);
    expect(otp.status).toBe(200);
    expect(otp.body.demoOtp).toMatch(/^\d{6}$/);

    const completed=await confirmPod(request,receiver,shipmentId,{otp:otp.body.demoOtp,signature:TEST_SIGNATURE,photo:TEST_PHOTO});
    expect(completed.status).toBe(200);
    expect(completed.body.shipment.status).toBe('Delivered');
    expect(completed.body.shipment.pod_status).toBe('Verified');
    expect(completed.body.shipment.pod_verified_at).toBeTruthy();
    expect(completed.body.shipment.pod_signature).toBe(TEST_SIGNATURE);
    expect(completed.body.shipment.pod_photo_hash).toBeTruthy();

    const deliveredEvent=completed.body.shipment.events.find(e=>e.status==='Delivered');
    expect(deliveredEvent).toBeDefined();
    expect(deliveredEvent.time).toBeTruthy();
    expect(deliveredEvent.location).toBe(SHIPMENT_A.destination);
    expect(deliveredEvent.verified).toBe(true);
  });
});
