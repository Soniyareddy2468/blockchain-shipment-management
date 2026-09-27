require('dotenv').config();
const express=require('express');
const cors=require('cors');
const path=require('path');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const Database=require('better-sqlite3');
const {randomUUID}=require('crypto');
const app=express();
const PORT=process.env.PORT||3000;
const JWT_SECRET=process.env.JWT_SECRET||'change-this-secret-in-production';
const db=new Database(process.env.DB_FILE||'shipchain.db');
app.use(cors());app.use(express.json());app.use(express.static(path.join(__dirname)));
db.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'operator',created_at TEXT NOT NULL);CREATE TABLE IF NOT EXISTS shipments(id TEXT PRIMARY KEY,sender TEXT NOT NULL,receiver TEXT NOT NULL,product TEXT NOT NULL,source TEXT NOT NULL,destination TEXT NOT NULL,mode TEXT NOT NULL,delivery TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,blockchain_hash TEXT);CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,shipment_id TEXT NOT NULL,status TEXT NOT NULL,location TEXT,time TEXT,verified INTEGER DEFAULT 0,tx_hash TEXT,FOREIGN KEY(shipment_id) REFERENCES shipments(id));`);
const makeId=()=>`SHP-${Math.floor(100000+Math.random()*900000)}`;
function auth(req,res,next){try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({error:'Authentication required'});req.user=jwt.verify(h.slice(7),JWT_SECRET);next()}catch(e){res.status(401).json({error:'Invalid or expired token'})}}
function shipment(row){if(!row)return null;const events=db.prepare('SELECT * FROM events WHERE shipment_id=? ORDER BY rowid').all(row.id);return {...row,events:events.map(e=>({...e,verified:Boolean(e.verified)}))}}
app.get('/api/health',(req,res)=>res.json({ok:true,service:'ShipChain API',time:new Date().toISOString()}));
app.post('/api/auth/register',(req,res)=>{try{const {email,password,role='operator'}=req.body;if(!email||!password||password.length<6)return res.status(400).json({error:'Valid email and password (6+ characters) required'});const hash=bcrypt.hashSync(password,10),userId=randomUUID();db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(userId,email.toLowerCase(),hash,role,new Date().toISOString());const token=jwt.sign({id:userId,email:email.toLowerCase(),role},JWT_SECRET,{expiresIn:'7d'});res.status(201).json({token,user:{id:userId,email:email.toLowerCase(),role}})}catch(e){res.status(409).json({error:'Email already registered'})}});
app.post('/api/auth/login',(req,res)=>{const {email,password}=req.body;const u=db.prepare('SELECT * FROM users WHERE email=?').get((email||'').toLowerCase());if(!u||!bcrypt.compareSync(password||'',u.password))return res.status(401).json({error:'Invalid credentials'});res.json({token:jwt.sign({id:u.id,email:u.email,role:u.role},JWT_SECRET,{expiresIn:'7d'}),user:{id:u.id,email:u.email,role:u.role}})});
app.get('/api/me',auth,(req,res)=>res.json(req.user));
app.get('/api/stats',(req,res)=>{const total=db.prepare('SELECT COUNT(*) c FROM shipments').get().c;const transit=db.prepare("SELECT COUNT(*) c FROM shipments WHERE status IN ('Created','Picked Up','In Transit','Arrived at Hub','Out for Delivery')").get().c;const delivered=db.prepare("SELECT COUNT(*) c FROM shipments WHERE status='Delivered'").get().c;res.json({total,transit,delivered})});
app.get('/api/shipments',(req,res)=>res.json(db.prepare('SELECT * FROM shipments ORDER BY created_at DESC').all().map(shipment)));
app.get('/api/shipments/:id',(req,res)=>{const s=shipment(db.prepare('SELECT * FROM shipments WHERE id=?').get(req.params.id));if(!s)return res.status(404).json({error:'Shipment not found'});res.json(s)});
app.post('/api/shipments',auth,(req,res)=>{const {sender,receiver,product,source,destination,mode='Road',delivery}=req.body;if(!sender||!receiver||!product||!source||!destination||!delivery)return res.status(400).json({error:'Missing required shipment fields'});const sid=makeId(),now=new Date().toISOString();db.prepare('INSERT INTO shipments VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(sid,sender,receiver,product,source,destination,mode,delivery,'Created',now,null);const ins=db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?)');[['Shipment Created',source,now,0,null],['Picked Up',source,null,0,null],['In Transit','',null,0,null],['Arrived at Hub','',null,0,null],['Out for Delivery',destination,null,0,null],['Delivered',destination,null,0,null]].forEach(e=>ins.run(randomUUID(),sid,...e));res.status(201).json(shipment(db.prepare('SELECT * FROM shipments WHERE id=?').get(sid)))});
app.patch('/api/shipments/:id/status',auth,(req,res)=>{const {status,location=''}=req.body;const s=shipment(db.prepare('SELECT * FROM shipments WHERE id=?').get(req.params.id));if(!s)return res.status(404).json({error:'Shipment not found'});const now=new Date().toISOString();db.prepare('UPDATE shipments SET status=? WHERE id=?').run(status,req.params.id);const event=s.events.find(e=>e.status===status&&!e.time);if(event)db.prepare('UPDATE events SET time=?,location=? WHERE id=?').run(now,location,event.id);res.json(shipment(db.prepare('SELECT * FROM shipments WHERE id=?').get(req.params.id)))});
app.get('*',(req,res)=>req.path.startsWith('/api/')?res.status(404).json({error:'API route not found'}):res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT,()=>console.log(`ShipChain running on http://localhost:${PORT}`));
