const express=require('express');
const register=require('./blockchain-signature');
const originalListen=express.application.listen;
if(!express.application.__shipchainSignaturePatched){
  express.application.listen=function(...args){
    if(!this.__shipchainSignatureRoutesRegistered){
      const db=this.locals?.db;
      if(db) register(this,db);
      this.__shipchainSignatureRoutesRegistered=true;
    }
    return originalListen.apply(this,args);
  };
  express.application.__shipchainSignaturePatched=true;
}
