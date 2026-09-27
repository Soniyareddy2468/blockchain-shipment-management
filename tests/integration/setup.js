const fs=require('fs');const path=require('path');const bcrypt=require('bcryptjs');
const dbPath=path.join(__dirname,`shipchain-test-${process.pid}.db`);
process.env.NODE_ENV='test';process.env.DB_FILE=dbPath;process.env.JWT_SECRET='shipchain-test-secret';
const {USERS}=require('./fixtures');

function seed(db){
  const now=new Date().toISOString();
  const insert=db.prepare('INSERT INTO users(id,email,password,role,created_at) VALUES(?,?,?,?,?)');
  for(const user of Object.values(USERS)){
    const id=require('crypto').randomUUID();
    insert.run(id,user.email,bcrypt.hashSync(user.password,10),user.role,now);
    user.id=id;
  }
}

beforeAll(()=>{
  const {app,db}=require('../../server');
  app.locals.db=db;
  global.__shipchainApp=app;
  global.__shipchainTestDb=db;
  seed(db);
});

afterAll(()=>{
  try{
    if(global.__shipchainTestDb)global.__shipchainTestDb.close();
  }finally{
    if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
  }
});
