/* Agente Base Mãe Esposende — fonte canônica compartilhada */
(function(g){
 const URL='https://rdztzurfesnobfkazgpm.supabase.co';
 function client(){return g.supabase&&g.supabase.createClient?g.supabase.createClient(URL,'sb_publishable_4LHSO4TrP7F4m4tpJyH44g_BGmfC92h'):null}
 async function rpc(cpf,loja){const c=client();if(!c)throw Error('Supabase indisponível');const {data,error}=await c.rpc('portal_base_mae_consultar',{p_cpf:cpf||null,p_loja:loja==null?null:Number(loja)});if(error)throw error;return data||[]}
 g.BaseMae={consultar:rpc,funcionario:async cpf=>(await rpc(String(cpf).replace(/\D/g,''),null))[0]||null,loja:async loja=>rpc(null,loja)};
})(window);