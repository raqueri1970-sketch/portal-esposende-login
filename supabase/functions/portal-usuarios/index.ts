// Gerenciar Usuários do Portal Esposende.
// Só o perfil "administrador" ativo pode usar. A chave service_role fica apenas aqui,
// no servidor do Supabase — o navegador nunca a recebe.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PERFIS = ["administrador", "diretoria", "controladoria", "gestor_compras", "comprador", "gestor_departamento"];
// Contas criadas por outros sistemas (robôs e logins por CPF do Acerto de Estoque).
const DOMINIO_TECNICO = /@([a-z0-9-]+\.)*esposende\.app$/i;
const BANIDO = "876000h"; // ~100 anos

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

function resp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
class Erro extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}

function validarEmail(v: unknown) {
  const e = String(v ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Erro("E-mail inválido.");
  return e;
}
function validarSenha(v: unknown) {
  const s = String(v ?? "");
  if (s.length < 8) throw new Erro("A senha precisa ter pelo menos 8 caracteres.");
  return s;
}
async function validarPerfil(perfil: unknown, departamento: unknown) {
  const p = String(perfil ?? "");
  if (!PERFIS.includes(p)) throw new Erro("Perfil inválido.");
  const d = departamento ? String(departamento) : null;
  if (p === "gestor_departamento" && !d) throw new Erro("Escolha o departamento do gestor.");
  if (d) {
    const { data } = await admin.from("orc_departamentos").select("id").eq("id", d).maybeSingle();
    if (!data) throw new Erro("Departamento não encontrado.");
  }
  return { perfil: p, departamento_id: d };
}
async function buscarUsuario(id: unknown) {
  const uid = String(id ?? "");
  const { data, error } = await admin.auth.admin.getUserById(uid);
  if (error || !data?.user) throw new Erro("Usuário não encontrado.", 404);
  if (DOMINIO_TECNICO.test(data.user.email ?? "")) {
    throw new Erro("Conta técnica (robô ou login de loja) — não é alterada por esta tela.");
  }
  return data.user;
}

async function listar() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const [{ data: perfis, error: e1 }, { data: deps, error: e2 }] = await Promise.all([
    admin.from("orc_perfis").select("user_id,perfil,departamento_id,ativo"),
    admin.from("orc_departamentos").select("id,nome").order("nome"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const porId = new Map((perfis ?? []).map((p) => [p.user_id, p]));
  const agora = Date.now();
  return {
    departamentos: deps ?? [],
    usuarios: users.map((u) => {
      const p = porId.get(u.id);
      return {
        id: u.id,
        email: u.email,
        criado_em: u.created_at,
        ultimo_acesso: u.last_sign_in_at ?? null,
        bloqueado: !!(u.banned_until && Date.parse(u.banned_until) > agora),
        tecnica: DOMINIO_TECNICO.test(u.email ?? ""),
        perfil: p?.perfil ?? null,
        departamento_id: p?.departamento_id ?? null,
        ativo: p ? p.ativo : null,
      };
    }).sort((a, b) => String(a.email).localeCompare(String(b.email))),
  };
}

async function criar(b: Record<string, unknown>) {
  const email = validarEmail(b.email);
  const senha = validarSenha(b.senha);
  const pf = await validarPerfil(b.perfil, b.departamento_id);
  if (DOMINIO_TECNICO.test(email)) throw new Erro("Esse domínio é reservado para contas técnicas.");
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) throw new Erro("Já existe um usuário com esse e-mail.");
    throw new Erro(error.message);
  }
  const { error: ep } = await admin.from("orc_perfis").insert({ user_id: data.user.id, ...pf, ativo: true });
  if (ep) {
    await admin.auth.admin.deleteUser(data.user.id); // não deixa usuário sem perfil
    throw new Erro("Não foi possível gravar o perfil: " + ep.message);
  }
  return { ok: true, id: data.user.id };
}

async function atualizar(b: Record<string, unknown>, eu: string) {
  const u = await buscarUsuario(b.user_id);
  const pf = await validarPerfil(b.perfil, b.departamento_id);
  const ativo = b.ativo !== false;
  if (u.id === eu && (!ativo || pf.perfil !== "administrador")) {
    throw new Erro("Você não pode remover o seu próprio acesso de administrador.");
  }
  const { error } = await admin.from("orc_perfis").upsert({ user_id: u.id, ...pf, ativo }, { onConflict: "user_id" });
  if (error) throw new Erro(error.message);
  // Desativado = também não consegue mais entrar (sessões novas bloqueadas).
  const { error: eb } = await admin.auth.admin.updateUserById(u.id, { ban_duration: ativo ? "none" : BANIDO });
  if (eb) throw new Erro(eb.message);
  return { ok: true };
}

async function trocarSenha(b: Record<string, unknown>) {
  const u = await buscarUsuario(b.user_id);
  const senha = validarSenha(b.senha);
  const { error } = await admin.auth.admin.updateUserById(u.id, { password: senha });
  if (error) throw new Erro(error.message);
  return { ok: true };
}

async function excluir(b: Record<string, unknown>, eu: string) {
  const u = await buscarUsuario(b.user_id);
  if (u.id === eu) throw new Erro("Você não pode excluir a sua própria conta.");
  const { error } = await admin.auth.admin.deleteUser(u.id);
  if (error) throw new Erro(error.message);
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ error: "Método não permitido." }, 405);
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: quem, error: ea } = await admin.auth.getUser(token);
    if (ea || !quem?.user) throw new Erro("Sessão expirada. Entre novamente no Portal.", 401);
    const { data: meu } = await admin.from("orc_perfis").select("perfil,ativo")
      .eq("user_id", quem.user.id).maybeSingle();
    if (!meu || !meu.ativo || meu.perfil !== "administrador") {
      throw new Erro("Somente o administrador do Portal pode gerenciar usuários.", 403);
    }
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    switch (b.acao) {
      case "listar": return resp(await listar());
      case "criar": return resp(await criar(b));
      case "atualizar": return resp(await atualizar(b, quem.user.id));
      case "senha": return resp(await trocarSenha(b));
      case "excluir": return resp(await excluir(b, quem.user.id));
      default: throw new Erro("Ação desconhecida.");
    }
  } catch (e) {
    const status = e instanceof Erro ? e.status : 500;
    console.error(e);
    return resp({ error: e instanceof Error ? e.message : String(e) }, status);
  }
});
