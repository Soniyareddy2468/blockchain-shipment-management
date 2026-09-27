/* ShipChain frontend authorization helper. Backend authorization remains authoritative. */
(function(){
  window.ShipChainAuth={
    token:function(){return localStorage.getItem('shipchain_token')||''},
    async me:function(){
      const token=this.token();
      if(!token) throw new Error('Authentication required');
      const r=await fetch('/api/me',{headers:{Authorization:'Bearer '+token}});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){localStorage.removeItem('shipchain_token');localStorage.removeItem('shipchain_user');throw new Error(data.error||'Session expired');}
      return data;
    },
    guard:async function(roles,next){
      try{const me=await this.me();
        if(roles&&roles.length&&!roles.includes(me.role)){
          const target=next||'role-dashboard.html';
          location.replace(target+'?error=forbidden');
          return null;
        }
        document.documentElement.classList.add('authenticated');
        return me;
      }catch(e){location.replace('login.html?next='+encodeURIComponent(next||location.pathname+location.search));return null;}
    },
    logout:function(){localStorage.removeItem('shipchain_token');localStorage.removeItem('shipchain_user');location.href='login.html';}
  };
})();