// Compatibilidade: todos os módulos do jogo compartilham a mesma instância de multiplayer.
// O ponto de entrada atual usa net_stable_360.js; reexportar daqui evita duas sessões de rede
// concorrentes quando loop/render/input/players/mission importam "net.js".
export * from './net_stable_360.js';
