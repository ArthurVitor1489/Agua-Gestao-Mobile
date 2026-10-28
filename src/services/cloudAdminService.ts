import axios from 'axios';
import { getDatabase } from '../database/sqlite';

export interface DistribuidoraCliente {
  id: string;
  nomeDistribuidora: string;
  responsavel: string;
  email: string;
  whatsapp: string;
  cidade: string;
  estado: string;
  status: 'TRIAL' | 'ATIVO' | 'BLOQUEADO';
  plano: string;
  trialStartDate: string;
  diasRestantes: number;
  dataCadastro: string;
  ultimaAtividade: string;
}

// Configuração padrão da Nuvem (Armazenada localmente e editável no painel)
const DEFAULT_SUPABASE_URL = 'https://owphqcljfztrduhmbmrh.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_6gPw8vyAn_AIWrf7y_Ga5A_wYU2xyPs';

export const CloudAdminService = {
  // 1. Obter configurações da nuvem
  getCloudConfig(): { url: string; apiKey: string } {
    const db = getDatabase();
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS admin_cloud_config (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL,
          apiKey TEXT NOT NULL,
          adminPin TEXT
        );
      `);
      try { db.execSync('ALTER TABLE admin_cloud_config ADD COLUMN adminPin TEXT;'); } catch {}
      const row = db.getFirstSync<any>('SELECT * FROM admin_cloud_config LIMIT 1');
      if (row) {
        return { url: row.url, apiKey: row.apiKey };
      }
    } catch {}
    return { url: DEFAULT_SUPABASE_URL, apiKey: DEFAULT_SUPABASE_KEY };
  },

  // Obter PIN de acesso administrativo do Painel Master
  getAdminPin(): string {
    const db = getDatabase();
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS admin_cloud_config (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL,
          apiKey TEXT NOT NULL,
          adminPin TEXT
        );
      `);
      try { db.execSync('ALTER TABLE admin_cloud_config ADD COLUMN adminPin TEXT;'); } catch {}
      const row = db.getFirstSync<any>('SELECT adminPin FROM admin_cloud_config LIMIT 1');
      if (row?.adminPin) return row.adminPin;
    } catch {}
    return '1489'; // PIN padrão seguro para o administrador
  },

  // Salvar novo PIN de administrador
  saveAdminPin(newPin: string): void {
    const db = getDatabase();
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS admin_cloud_config (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL,
          apiKey TEXT NOT NULL,
          adminPin TEXT
        );
      `);
      try { db.execSync('ALTER TABLE admin_cloud_config ADD COLUMN adminPin TEXT;'); } catch {}
      const existing = db.getFirstSync<any>('SELECT * FROM admin_cloud_config WHERE id = "config_nuvem"');
      if (existing) {
        db.runSync('UPDATE admin_cloud_config SET adminPin = ? WHERE id = "config_nuvem"', [newPin.trim()]);
      } else {
        db.runSync(
          'INSERT INTO admin_cloud_config (id, url, apiKey, adminPin) VALUES ("config_nuvem", ?, ?, ?)',
          [DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, newPin.trim()]
        );
      }
    } catch (e) {
      console.warn('Erro ao salvar admin pin:', e);
    }
  },

  // Salvar configurações personalizadas da nuvem
  saveCloudConfig(url: string, apiKey: string): void {
    const db = getDatabase();
    db.runSync(
      'INSERT OR REPLACE INTO admin_cloud_config (id, url, apiKey) VALUES (?, ?, ?)',
      ['config_nuvem', url.trim(), apiKey.trim()]
    );
  },

  // 2. Registrar distribuidora na nuvem (chamado quando alguém se cadastra no app)
  async registrarDistribuidora(dados: {
    nomeDistribuidora: string;
    responsavel: string;
    email: string;
    whatsapp?: string;
    cidade?: string;
    estado?: string;
  }): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = 'dist-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

    // Salvar localmente no banco
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS distribuidoras_master (
          id TEXT PRIMARY KEY,
          nomeDistribuidora TEXT NOT NULL,
          responsavel TEXT NOT NULL,
          email TEXT NOT NULL,
          whatsapp TEXT,
          cidade TEXT,
          estado TEXT,
          status TEXT NOT NULL,
          plano TEXT NOT NULL,
          trialStartDate TEXT NOT NULL,
          dataCadastro TEXT NOT NULL,
          ultimaAtividade TEXT NOT NULL,
          sincronizado INTEGER DEFAULT 0
        );
      `);

      db.runSync(
        `INSERT OR REPLACE INTO distribuidoras_master (id, nomeDistribuidora, responsavel, email, whatsapp, cidade, estado, status, plano, trialStartDate, dataCadastro, ultimaAtividade, sincronizado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'TRIAL', 'TRIAL_14_DIAS', ?, ?, ?, 0)`,
        [
          id,
          dados.nomeDistribuidora,
          dados.responsavel,
          dados.email.toLowerCase().trim(),
          dados.whatsapp || '',
          dados.cidade || '',
          dados.estado || '',
          now,
          now,
          now,
        ]
      );
    } catch (e) {
      console.warn('Erro ao salvar distribuidora localmente:', e);
    }

    // Tentar enviar para a nuvem em segundo plano
    try {
      const { url, apiKey } = this.getCloudConfig();
      if (url && !url.includes('aguagestao-cloud.supabase.co')) {
        await axios.post(
          `${url}/rest/v1/distribuidoras`,
          {
            id,
            nome_distribuidora: dados.nomeDistribuidora,
            responsavel: dados.responsavel,
            email: dados.email.toLowerCase().trim(),
            whatsapp: dados.whatsapp || '',
            cidade: dados.cidade || '',
            estado: dados.estado || '',
            status: 'TRIAL',
            plano: 'TRIAL_14_DIAS',
            trial_start_date: now,
            created_at: now,
          },
          {
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            timeout: 5000,
          }
        );
        db.runSync('UPDATE distribuidoras_master SET sincronizado = 1 WHERE id = ?', [id]);
      }
    } catch (cloudErr) {
      // Falha silenciosa em segundo plano: o registro continua salvo localmente para sync posterior
      console.log('Nuvem offline ou endpoint aguardando configuracao. Registro salvo localmente.');
    }
  },

  // 3. Listar todas as distribuidoras para o Super Admin
  async listarTodasDistribuidoras(): Promise<DistribuidoraCliente[]> {
    const db = getDatabase();
    db.execSync(`
      CREATE TABLE IF NOT EXISTS distribuidoras_master (
        id TEXT PRIMARY KEY,
        nomeDistribuidora TEXT NOT NULL,
        responsavel TEXT NOT NULL,
        email TEXT NOT NULL,
        whatsapp TEXT,
        cidade TEXT,
        estado TEXT,
        status TEXT NOT NULL,
        plano TEXT NOT NULL,
        trialStartDate TEXT NOT NULL,
        dataCadastro TEXT NOT NULL,
        ultimaAtividade TEXT NOT NULL,
        sincronizado INTEGER DEFAULT 0
      );
    `);

    // Tentar buscar da nuvem primeiro se configurada
    try {
      const { url, apiKey } = this.getCloudConfig();
      if (url && !url.includes('aguagestao-cloud.supabase.co')) {
        const res = await axios.get(`${url}/rest/v1/distribuidoras?order=created_at.desc`, {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 6000,
        });

        if (Array.isArray(res.data) && res.data.length > 0) {
          // Atualiza o cache local
          for (const item of res.data) {
            db.runSync(
              `INSERT OR REPLACE INTO distribuidoras_master (id, nomeDistribuidora, responsavel, email, whatsapp, cidade, estado, status, plano, trialStartDate, dataCadastro, ultimaAtividade, sincronizado)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
              [
                item.id,
                item.nome_distribuidora || item.nomeDistribuidora,
                item.responsavel,
                item.email,
                item.whatsapp || '',
                item.cidade || '',
                item.estado || '',
                item.status || 'TRIAL',
                item.plano || 'TRIAL_14_DIAS',
                item.trial_start_date || item.trialStartDate,
                item.created_at || item.dataCadastro,
                item.created_at || item.dataCadastro,
              ]
            );
          }
        }
      }
    } catch (e) {
      console.log('Super Admin operando com dados cacheados locais.');
    }

    // Retorna do banco
    const rows = db.getAllSync<any>('SELECT * FROM distribuidoras_master ORDER BY dataCadastro DESC');
    const now = Date.now();

    return rows.map((r) => {
      const trialStart = new Date(r.trialStartDate).getTime();
      const diasPassados = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
      const diasRestantes = Math.max(0, 14 - diasPassados);

      return {
        id: r.id,
        nomeDistribuidora: r.nomeDistribuidora,
        responsavel: r.responsavel,
        email: r.email,
        whatsapp: r.whatsapp || '',
        cidade: r.cidade || '',
        estado: r.estado || '',
        status: r.status as any,
        plano: r.plano,
        trialStartDate: r.trialStartDate,
        diasRestantes,
        dataCadastro: r.dataCadastro,
        ultimaAtividade: r.ultimaAtividade,
      };
    });
  },

  // 4. Alterar Status da Licença (Liberar Pro, Bloquear, Prorrogar)
  async alterarStatusLicenca(
    distribuidoraId: string,
    novoStatus: 'TRIAL' | 'ATIVO' | 'BLOQUEADO',
    plano: string = 'VITALICIO'
  ): Promise<boolean> {
    const db = getDatabase();
    try {
      db.runSync(
        'UPDATE distribuidoras_master SET status = ?, plano = ? WHERE id = ?',
        [novoStatus, plano, distribuidoraId]
      );

      // Se for a distribuidora instalada neste aparelho, atualiza imediatamente as permissões
      const cfg = db.getFirstSync<any>('SELECT * FROM configuracao LIMIT 1');
      if (cfg) {
        if (novoStatus === 'ATIVO') {
          db.runSync("UPDATE configuracao SET isSubscribed = 1, plano = 'ANUAL' WHERE id = ?", [cfg.id]);
        } else if (novoStatus === 'BLOQUEADO') {
          db.runSync("UPDATE configuracao SET isSubscribed = 0, trialStartDate = '2020-01-01' WHERE id = ?", [cfg.id]);
        }
      }

      // Tentar sincronizar alteração na nuvem
      const { url, apiKey } = this.getCloudConfig();
      if (url && !url.includes('aguagestao-cloud.supabase.co')) {
        axios.patch(
          `${url}/rest/v1/distribuidoras?id=eq.${distribuidoraId}`,
          { status: novoStatus, plano },
          {
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        ).catch(() => {});
      }

      return true;
    } catch (e) {
      console.warn('Erro ao atualizar licença:', e);
      return false;
    }
  },

  // 5. Prorrogar Teste (+30 Dias)
  async prorrogarTeste(distribuidoraId: string, diasExtras: number = 30): Promise<boolean> {
    const db = getDatabase();
    try {
      const now = new Date();
      // Define a data de início do trial para o futuro ou adiciona dias
      const novaData = new Date(now.getTime() - (14 - diasExtras) * 24 * 60 * 60 * 1000).toISOString();

      db.runSync(
        "UPDATE distribuidoras_master SET status = 'TRIAL', trialStartDate = ? WHERE id = ?",
        [novaData, distribuidoraId]
      );

      return true;
    } catch {
      return false;
    }
  },

  // 6. Remover distribuidora
  excluirDistribuidora(distribuidoraId: string): boolean {
    const db = getDatabase();
    try {
      db.runSync('DELETE FROM distribuidoras_master WHERE id = ?', [distribuidoraId]);
      return true;
    } catch {
      return false;
    }
  },
};
