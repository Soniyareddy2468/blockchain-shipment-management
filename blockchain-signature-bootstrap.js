const express=require('express');
const register=require('./blockchain-signature');
const originalListen=express.application.listen;
if(!express.application.__shipchainSignaturePatched){
  express.application.listen=function(...args){
    if(!this.__shipchainSignatureRoutesRegistered){register(this);this.__shipchainSignatureRoutesRegistered=true;}
    return originalListen.apply(this,args);
  };
  express.application.__shipchainSignaturePatched=true;
}
