const localtunnel = require('localtunnel');

const PORT = 3000;
const SUBDOMAIN = 'aguagestao-api';

let activeTunnel = null;
let keepAliveTimer = null;

async function startTunnel() {
  if (keepAliveTimer) clearInterval(keepAliveTimer);

  try {
    console.log(`🔌 Conectando túnel HTTPS para a porta ${PORT}...`);
    activeTunnel = await localtunnel({
      port: PORT,
      subdomain: SUBDOMAIN,
    });

    console.log(`✅ Túnel HTTPS ativo e pronto em: ${activeTunnel.url}`);

    activeTunnel.on('close', () => {
      console.warn('⚠️ Túnel fechado pela nuvem. Reconectando em 3 segundos...');
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      setTimeout(startTunnel, 3000);
    });

    activeTunnel.on('error', (err) => {
      console.error('❌ Erro no túnel:', err.message);
      try {
        activeTunnel.close();
      } catch {}
    });

    // Keep-alive heartbeat a cada 25 segundos para impedir que o túnel caia por inatividade
    keepAliveTimer = setInterval(async () => {
      try {
        if (activeTunnel?.url) {
          await fetch(`${activeTunnel.url}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Bypass-Tunnel-Reminder': 'true',
            },
            body: JSON.stringify({ ping: true }),
          });
        }
      } catch {}
    }, 25000);

  } catch (error) {
    console.error('❌ Falha ao abrir túnel:', error.message);
    console.log('🔄 Tentando novamente em 5 segundos...');
    setTimeout(startTunnel, 5000);
  }
}

// Tratamento de encerramento gracioso
process.on('SIGINT', () => {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  if (activeTunnel) activeTunnel.close();
  process.exit();
});

startTunnel();
