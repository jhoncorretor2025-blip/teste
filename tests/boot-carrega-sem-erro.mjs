// Reproduz o bug real que travava o jogo pra sempre na telinha de carregamento
// ("Tentar novamente" repetindo o mesmo erro): importa o entrypoint ativo js/main_stable_342.js exatamente como o
// navegador faz ao abrir a página, em VÁRIOS jeitos reais de entrar (link puro, link de
// aba, link de convite de sala — o mais comum de todos, já que toda sala compartilhada
// gera um `?room=`), e garante que NENHUM erro estoura na hora, em nenhum deles.
//
// Isso é diferente das outras checagens: `node --input-type=module --check` só vê
// SINTAXE, não RODA o arquivo; a checagem 13 do verificador só vê "nunca existe em
// lugar nenhum", não "existe, mas tarde demais" (e só dispara se o código que usa
// aquele nome for realmente EXECUTADO — por isso testar só a URL "pelada" não bastava:
// o código que lia TAB_ALIASES cedo demais só rodava para quem abria um link com
// ?tab= ou ?room=, que é como QUALQUER convite de sala real chega pro amigo).
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar } from './_ambiente.mjs';

const CENARIOS = {
  'link puro (sem parâmetros)': 'http://localhost/index.html',
  'link de uma aba (?tab=online)': 'http://localhost/index.html?tab=online',
  'link de convite de sala (?room=ABC123)': 'http://localhost/index.html?room=ABC123&mode=classic&map=medium',
};

const r = novoRelatorio();
let contador = 0;
for (const [nome, url] of Object.entries(CENARIOS)) {
  contador++;
  r.secao(`Abrindo como: ${nome}`);
  const w = criarJanela({ url }); ativar(w);
  let erro = null;
  try {
    await importarDe(RAIZ)(`js/main_stable_342.js?cenario${contador}`); // query só pra forçar reimportar, cada cenário isolado
  } catch (err) {
    erro = err;
  }
  r.check('nenhum erro ao carregar main.js', erro === null, erro?.message);
  await esperar(200);
  r.check('nenhum erro assíncrono depois (setTimeout, promessas)', w.__erros.length === 0, w.__erros[0]);
}
r.fim();
