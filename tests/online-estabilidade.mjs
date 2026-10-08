// Regressão dos relatos de travamento e "você venceu" no online.
// O teste é textual de propósito: as regras de rede reais dependem de WebRTC, mas estes
// invariantes precisam permanecer no código ativo para evitar voltar ao comportamento antigo.
import fs from 'fs';
import path from 'path';
import { RAIZ, novoRelatorio } from './_ambiente.mjs';

const net = fs.readFileSync(path.join(RAIZ, 'js/net_stable_360.js'), 'utf8');
const loop = fs.readFileSync(path.join(RAIZ, 'js/loop_stable_336.js'), 'utf8');
const main = fs.readFileSync(path.join(RAIZ, 'js/main_stable_342.js'), 'utf8');
const r = novoRelatorio();

r.secao('Entrega de estado online');
r.check('cada snapshot tem sessão + sequência', /session: stateSessionId/.test(net) && /seq, sentAt/.test(net));
r.check('o anfitrião espera confirmação antes de empilhar estado', /pendingSeq/.test(net) && /STATE_ACK_WAIT_MS/.test(net));
r.check('o cliente confirma recebimento do snapshot', /type: 'stateAck'/.test(net));
r.check('canal preso é encerrado para disparar reconexão', /STATE_STALL_MS/.test(net) && /c\.close\(\)/.test(net));

r.secao('Cliente não volta para um estado antigo');
r.check('sessão nova reseta a sequência', /remoteStateSession/.test(loop) && /lastRemoteStateSeq = 0/.test(loop));
r.check('snapshot antigo é ignorado', /incomingSeq <= lastRemoteStateSeq/.test(loop));

r.secao('Resultado do torneio');
r.check('empate não escolhe automaticamente o slot 0', /return metricas\.every/.test(loop) && /champion < 0/.test(loop));
r.check('resultado possui identificador único', /resultId:/.test(loop));
r.check('resultado duplicado não abre novamente', /lastOnlineResultId/.test(main));
r.check('vitória só aparece quando existe campeão', /hasChampion/.test(main) && /terminou empatado/.test(main));

r.fim();
