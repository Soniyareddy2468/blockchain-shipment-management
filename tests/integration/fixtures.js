const USERS={
  admin:{email:'admin@test.shipchain.local',password:'Admin123!',role:'admin'},
  operator:{email:'operator@test.shipchain.local',password:'Operator123!',role:'operator'},
  transporter:{email:'transporter@test.shipchain.local',password:'Transporter123!',role:'transporter'},
  receiverA:{email:'receiver-a@test.shipchain.local',password:'ReceiverA123!',role:'receiver'},
  receiverB:{email:'receiver-b@test.shipchain.local',password:'ReceiverB123!',role:'receiver'}
};
const SHIPMENT_A={sender:'ABC Electronics',receiver:USERS.receiverA.email,product:'Laptop',source:'Bengaluru',destination:'Mysuru',mode:'Road',delivery:'2030-12-31'};
const SHIPMENT_B={sender:'XYZ Logistics',receiver:USERS.receiverB.email,product:'Mobile Phones',source:'Chennai',destination:'Bengaluru',mode:'Road',delivery:'2030-12-31'};
const TEST_SIGNATURE='data:image/png;base64,VFJFU1RfU0lHTkFUVVJF';
const TEST_PHOTO='data:image/jpeg;base64,VFJFU1RfUEhPVE8=';
async function login(request,email,password){const r=await request.post('/api/auth/login').send({email,password});if(r.status!==200)throw new Error(`Login failed for ${email}: ${r.status} ${JSON.stringify(r.body)}`);return r.body.token;}
async function createShipment(request,token,input){return request.post('/api/shipments').set('Authorization',`Bearer ${token}`).send({...input,receiverUserId:input.receiverUserId});}
async function updateStatus(request,token,id,status,location=''){return request.patch(`/api/shipments/${id}/status`).set('Authorization',`Bearer ${token}`).send({status,location});}
async function moveToOutForDelivery(request,token,id){for(const [status,location] of [['Picked Up','Bengaluru'],['In Transit','Bengaluru'],['Arrived at Hub','Mysuru Hub'],['Out for Delivery','Mysuru']]){const r=await updateStatus(request,token,id,status,location);if(r.status!==200)throw new Error(`Status ${status} failed: ${r.status} ${JSON.stringify(r.body)}`);} }
async function requestOtp(request,token,id){return request.post(`/api/shipments/${id}/pod/request-otp`).set('Authorization',`Bearer ${token}`);}
async function confirmPod(request,token,id,payload){return request.post(`/api/shipments/${id}/pod/confirm`).set('Authorization',`Bearer ${token}`).send(payload);}
module.exports={USERS,SHIPMENT_A,SHIPMENT_B,TEST_SIGNATURE,TEST_PHOTO,login,createShipment,updateStatus,moveToOutForDelivery,requestOtp,confirmPod};
