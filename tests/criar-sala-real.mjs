// Teste DE VERDADE (executa o jogo) da criação de sala, no arquivo que realmente roda
// (js/main_stable_342.js — é ele que o index.html carrega). Os testes antigos de "online
// simples" só procuravam texto no js/main.js (que NÃO é o arquivo ativo), então passavam
// mesmo com a criação de sala quebrada.
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar, criarRedeFalsa } from './_ambiente.mjs';

const ENTRADA = 'js/main_stable_342.js';
const { FakePeer } = criarRedeFalsa();
const $ = (w, id) => w.document.getElementById(id);
const r = novoRelatorio();

async function abrirJogo() {
  const w = criarJanela({ Peer: FakePeer }); ativar(w); w.HTMLElement.prototype.scrollIntoView = () => {};
  await importarDe(RAIZ)(ENTRADA + '?' + Math.random().toString(36).slice(2));
  return w;
}

r.secao('Botão "Criar sala" do modo simples (o que aparece primeiro na aba Online)');
{
  const w = await abrirJogo();
  r.check('o botão simples existe', !!$(w, 'onlineSimpleCreateBtn'));
  $(w, 'onlineSimpleCreateBtn').click();
  await esperar(150);
  r.check('o painel da sala abriu (hostPanel visível)', !$(w, 'hostPanel').classList.contains('hidden'));
  r.check('o código da sala apareceu', /\S/.test($(w, 'roomCode').textContent) && $(w, 'roomCode').textContent !== '...', $(w, 'roomCode').textContent);
  r.check('o painel simples da sala apareceu', !$(w, 'onlineSimpleRoomPanel').classList.contains('hidden'));
  const link = $(w, 'onlineSimpleRoomLink')?.value || '';
  r.check('o link de convite foi preenchido', /room=/.test(link), link);
  r.check('o status simples avisa que a sala está aberta', /Sala aberta/.test($(w, 'onlineSimpleRoomStatus')?.textContent || ''), $(w, 'onlineSimpleRoomStatus')?.textContent);
  r.check('sem erros de JavaScript', w.__erros.length === 0, w.__erros[0]);
}

r.secao('Botão "Criar sala" do modo completo');
{
  const w = await abrirJogo();
  $(w, 'hostBtn').click();
  await esperar(150);
  r.check('o painel da sala abriu', !$(w, 'hostPanel').classList.contains('hidden'));
  r.check('o código apareceu', $(w, 'roomCode').textContent !== '...', $(w, 'roomCode').textContent);
  r.check('sem erros de JavaScript', w.__erros.length === 0, w.__erros[0]);
}

// ---------- cenários de FALHA: a pessoa precisa SEMPRE ver o que aconteceu ----------
// Peer falso que dá "código em uso" nas primeiras N tentativas, ou que nunca abre, ou dá erro de rede
function peerComProblema({ emUso = 0, nuncaAbre = false, erroRede = false } = {}) {
  let usos = 0;
  return class PeerRuim {
    constructor(id) {
      this.id = id; this._h = {}; this.destroyed = false;
      setTimeout(() => {
        if (nuncaAbre) return;
        if (erroRede) return (this._h.error || []).forEach((cb) => cb({ type: 'network', message: 'Lost connection to server' }));
        if (id && usos < emUso) { usos++; return (this._h.error || []).forEach((cb) => cb({ type: 'unavailable-id', message: `ID "${id}" is taken` })); }
        (this._h.open || []).forEach((cb) => cb(this.id || 'p-xyz'));
      }, 5);
    }
    on(ev, cb) { (this._h[ev] ||= []).push(cb); }
    connect() { return { on() {}, send() {}, close() {} }; }
    destroy() { this.destroyed = true; }
    reconnect() {}
  };
}
async function abrirCom(Peer) {
  const w = criarJanela({ Peer }); ativar(w); w.HTMLElement.prototype.scrollIntoView = () => {};
  await importarDe(RAIZ)(ENTRADA + '?' + Math.random().toString(36).slice(2));
  return w;
}
const visivel = (w, id) => !!$(w, id) && !$(w, id).closest('.hidden');

r.secao('Código aleatório já em uso: tenta outro sozinho (a pessoa nem percebe)');
{
  const w = await abrirCom(peerComProblema({ emUso: 2 }));
  $(w, 'onlineSimpleCreateBtn').click(); await esperar(400);
  r.check('mesmo com 2 códigos ocupados, a sala acabou criada', !$(w, 'hostPanel').classList.contains('hidden'));
  r.check('o painel simples da sala abriu', !$(w, 'onlineSimpleRoomPanel').classList.contains('hidden'));
}

r.secao('Servidor de salas fora do ar / erro de rede: a pessoa VÊ um aviso claro');
{
  const w = await abrirCom(peerComProblema({ erroRede: true }));
  $(w, 'onlineSimpleCreateBtn').click(); await esperar(300);
  const aviso = $(w, 'onlineSimpleStatus').textContent;
  r.check('o aviso aparece no lugar que está visível (modo simples)', /internet|servidor/i.test(aviso), aviso);
  r.check('não ficou preso em "Criando sua sala..."', !/Criando sua sala/.test(aviso), aviso);
  r.check('o botão "Criar sala" voltou a funcionar', !$(w, 'hostBtn').disabled);
}

r.secao('Servidor nunca responde: não trava pra sempre (tempo limite)');
{
  const w = await abrirCom(peerComProblema({ nuncaAbre: true }));
  $(w, 'onlineSimpleCreateBtn').click();
  await esperar(16500);
  const aviso = $(w, 'onlineSimpleStatus').textContent;
  r.check('depois de um tempo, avisa que não conseguiu', /não consegui|demorou|tempo/i.test(aviso) && !/Criando sua sala/.test(aviso), aviso);
  r.check('o botão "Criar sala" voltou a funcionar', !$(w, 'hostBtn').disabled);
}

r.secao('Senha ligada de antes não pode quebrar o modo simples');
{
  const w = await abrirCom(FakePeer);
  const sel = $(w, 'hostRoomSecurity');
  if (sel) { sel.value = 'pin'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); }
  $(w, 'onlineSimpleCreateBtn').click(); await esperar(200);
  r.check('a sala simples abre normalmente (sem exigir senha)', !$(w, 'onlineSimpleRoomPanel').classList.contains('hidden'), $(w, 'onlineSimpleStatus').textContent);
}

r.secao('Criar duas vezes seguidas (voltar ao menu e criar de novo)');
{
  const w = await abrirCom(FakePeer);
  $(w, 'onlineSimpleCreateBtn').click(); await esperar(200);
  const codigo1 = $(w, 'roomCode').textContent;
  $(w, 'back')?.click(); await esperar(100);
  $(w, 'onlineSimpleCreateBtn').click(); await esperar(200);
  r.check('a segunda sala também foi criada', /\d{4}/.test($(w, 'roomCode').textContent) && !$(w, 'hostPanel').classList.contains('hidden'));
}
r.fim();
