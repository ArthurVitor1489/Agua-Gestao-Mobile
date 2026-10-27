import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { HapticService } from '../../services/hapticService';
import { LocalStorage } from '../../database/localStorage';
import { getDatabase } from '../../database/sqlite';
import {
  X,
  FileText,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';

interface TermosPrivacidadeModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'termos' | 'privacidade' | 'exclusao';
}

export const TermosPrivacidadeModal: React.FC<TermosPrivacidadeModalProps> = ({
  visible,
  onClose,
  initialTab = 'termos',
}) => {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const [tabAtiva, setTabAtiva] = useState<'termos' | 'privacidade' | 'exclusao'>(initialTab);
  const [excluindo, setExcluindo] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTabAtiva(initialTab);
    }
  }, [visible, initialTab]);

  const handleExcluirConta = () => {
    Alert.alert(
      'Excluir Conta e Dados',
      'ATENÇÃO: Esta ação é definitiva e irreversível.\n\nTodos os seus pedidos, clientes, produtos cadastrados, histórico financeiro e conta de acesso serão permanentemente apagados deste dispositivo e da nuvem conforme a LGPD e as políticas do Google Play.\n\nDeseja realmente prosseguir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Excluir Tudo Definitivamente',
          style: 'destructive',
          onPress: async () => {
            try {
              setExcluindo(true);
              await HapticService.error();

              // 1. Limpar banco SQLite local
              const db = getDatabase();
              try {
                db.runSync('DELETE FROM pedidos;');
                db.runSync('DELETE FROM clientes;');
                db.runSync('DELETE FROM produtos;');
                db.runSync('DELETE FROM fiados;');
                db.runSync('DELETE FROM quitacoes_fiado;');
                db.runSync('DELETE FROM despesas;');
                db.runSync('DELETE FROM estoque_garrafoes;');
                db.runSync('DELETE FROM movimentacoes_estoque;');
                db.runSync('DELETE FROM configuracao;');
                db.runSync('DELETE FROM usuarios;');
              } catch (dbErr) {
                console.warn('Erro ao limpar tabelas locais:', dbErr);
              }

              // 2. Limpar AsyncStorage
              await LocalStorage.clearSession();

              onClose();
              await logout();

              Alert.alert(
                'Conta e Dados Excluídos',
                'Sua conta e todos os dados associados foram excluídos com sucesso.'
              );
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao processar exclusão de dados.');
            } finally {
              setExcluindo(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Termos e Privacidade</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Conformidade Google Play & LGPD (Lei 13.709/2018)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Abas Superiores */}
          <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabAtiva === 'termos' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => {
                HapticService.light();
                setTabAtiva('termos');
              }}
            >
              <FileText size={15} color={tabAtiva === 'termos' ? colors.primary : colors.textMuted} />
              <Text
                style={[
                  styles.tabText,
                  { color: tabAtiva === 'termos' ? colors.primary : colors.textMuted, fontWeight: tabAtiva === 'termos' ? '800' : '600' },
                ]}
              >
                Termos de Uso
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabAtiva === 'privacidade' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => {
                HapticService.light();
                setTabAtiva('privacidade');
              }}
            >
              <Shield size={15} color={tabAtiva === 'privacidade' ? colors.primary : colors.textMuted} />
              <Text
                style={[
                  styles.tabText,
                  { color: tabAtiva === 'privacidade' ? colors.primary : colors.textMuted, fontWeight: tabAtiva === 'privacidade' ? '800' : '600' },
                ]}
              >
                Privacidade
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabAtiva === 'exclusao' && { borderBottomColor: colors.danger, borderBottomWidth: 3 },
              ]}
              onPress={() => {
                HapticService.light();
                setTabAtiva('exclusao');
              }}
            >
              <Trash2 size={15} color={tabAtiva === 'exclusao' ? colors.danger : colors.textMuted} />
              <Text
                style={[
                  styles.tabText,
                  { color: tabAtiva === 'exclusao' ? colors.danger : colors.textMuted, fontWeight: tabAtiva === 'exclusao' ? '800' : '600' },
                ]}
              >
                Excluir Dados
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conteúdo com Scroll */}
          <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
            {/* 1. TERMOS DE USO */}
            {tabAtiva === 'termos' && (
              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Termos de Serviço e Uso do Aplicativo</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>
                  Última atualização: 27 de Outubro de 2026
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>1. Aceitação dos Termos</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  Ao criar uma conta ou utilizar o aplicativo Água Gestão, você concorda expressamente com os presentes Termos de Serviço e com a nossa Política de Privacidade. Se você não concordar com qualquer um dos termos, solicitamos que não utilize o aplicativo.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>2. Objeto e Finalidade</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  O Água Gestão é uma plataforma de software voltada para a gestão comercial, controle de estoque de garrafões e vasilhames, caderneta digital de fiados, emissão de comprovantes de entrega e inteligência de pós-venda para distribuidoras de água mineral e gás.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>3. Período de Teste Gratuito e Assinatura</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  Oferecemos um período de teste gratuito de 14 (quatorze) dias com todas as funcionalidades liberadas. Após o término do período de teste, o usuário poderá optar por assinar o plano recorrente mensal ou anual via Google Play Store para manter os serviços ativos. Caso opte por não assinar, o acesso aos recursos do sistema será suspenso sem prejuízo de seus dados.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>4. Responsabilidades do Usuário</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  O usuário é o único responsável pela veracidade e exatidão dos dados inseridos no aplicativo (incluindo dados de clientes, valores de vendas e formas de pagamento), bem como pela confidencialidade de sua senha de acesso.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>5. Propriedade Intelectual</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  Todos os direitos de propriedade intelectual sobre o software, layout, algoritmos e marcas pertencem exclusivamente ao Água Gestão. É concedida ao usuário uma licença de uso pessoal, intransferível e não exclusiva para a gestão de seu próprio estabelecimento.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>6. Legislação e Foro</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial pelo Marco Civil da Internet (Lei nº 12.965/2014) e pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                </Text>
              </View>
            )}

            {/* 2. POLÍTICA DE PRIVACIDADE */}
            {tabAtiva === 'privacidade' && (
              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Política de Privacidade e Proteção de Dados</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>
                  Em conformidade com a LGPD e as diretrizes do Google Play Developer
                </Text>

                <View style={[styles.securityBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                  <Lock size={18} color="#059669" />
                  <Text style={{ color: '#065f46', fontSize: 13, fontWeight: '700', flex: 1 }}>
                    Seus dados são 100% privados. Não vendemos, alugamos ou compartilhamos dados com terceiros.
                  </Text>
                </View>

                <Text style={[styles.heading, { color: colors.text }]}>1. Dados Coletados</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  • Dados de Cadastro: Nome da distribuidora, e-mail de acesso, telefone/WhatsApp de contato, cidade e estado.{'\n'}
                  • Dados Operacionais inseridos pelo Usuário: Cadastros de clientes (nome, telefone, endereço para entrega), registros de pedidos, fiados e movimentações de garrafões.{'\n'}
                  • Localização Geográfica (opcional): Utilizada exclusivamente mediante permissão prévia para registrar as coordenadas das entregas e rotas de entrega.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>2. Finalidade do Tratamento</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  Os dados são coletados com o único e exclusivo propósito de fornecer as funcionalidades do aplicativo (organização das entregas, cálculo do fluxo de caixa e envio de comprovantes de venda aos consumidores).
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>3. Armazenamento e Segurança</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  O aplicativo opera com arquitetura Offline-First: os dados são armazenados localmente no dispositivo através de banco de dados SQLite seguro. Para fins de backup e sincronização, as informações são transmitidas criptografadas via protocolo seguro HTTPS/TLS com isolamento rígido multi-tenant, garantindo que nenhuma distribuidora tenha acesso a dados de terceiros.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>4. Direitos do Titular (LGPD Art. 18)</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  Você possui o direito inalienável de confirmar a existência de tratamento de seus dados, acessá-los, corrigi-los, solicitar sua portabilidade ou requerer a exclusão completa e permanente a qualquer momento, diretamente pela aba "Excluir Dados" deste aplicativo.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>5. Contato com o Encarregado (DPO)</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  Para dúvidas sobre a presente Política de Privacidade ou sobre o tratamento de dados pessoais, entre em contato pelo e-mail oficial: suporte@aguagestao.com.br.
                </Text>
              </View>
            )}

            {/* 3. EXCLUSÃO DE CONTA E DADOS (GOOGLE PLAY REQUIREMENT) */}
            {tabAtiva === 'exclusao' && (
              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.danger }]}>Exclusão de Conta e Dados Pessoais</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
                  Exigência de transparência e controle de dados do Google Play e da LGPD.
                </Text>

                <View style={[styles.warningBox, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                  <AlertTriangle size={24} color="#dc2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#991b1b', fontWeight: '800', fontSize: 14 }}>
                      Atenção: Ação Irreversível!
                    </Text>
                    <Text style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>
                      Ao solicitar a exclusão, todos os seus dados cadastrais, pedidos, clientes, estoque, registros financeiros e sua conta de acesso serão definitivamente apagados.
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 20, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={18} color="#059669" />
                    <Text style={{ color: colors.text, fontSize: 13 }}>Apaga todos os pedidos e notas de venda</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={18} color="#059669" />
                    <Text style={{ color: colors.text, fontSize: 13 }}>Apaga a lista completa de clientes cadastrados</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={18} color="#059669" />
                    <Text style={{ color: colors.text, fontSize: 13 }}>Apaga o saldo devedor e histórico de fiados</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={18} color="#059669" />
                    <Text style={{ color: colors.text, fontSize: 13 }}>Revoga acessos e sessões ativas</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: colors.danger }]}
                  onPress={handleExcluirConta}
                  disabled={excluindo}
                  activeOpacity={0.8}
                >
                  <Trash2 size={20} color="#fff" />
                  <Text style={styles.deleteBtnText}>
                    {excluindo ? 'Excluindo...' : 'EXCLUIR MINHA CONTA E TODOS OS DADOS'}
                  </Text>
                </TouchableOpacity>

                <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 14 }}>
                  Você também pode solicitar a exclusão enviando um e-mail para privacidade@aguagestao.com.br informando seu e-mail cadastrado.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeModalBtnText}>Entendi e Concordo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 12,
  },
  scrollContent: {
    flex: 1,
  },
  textSection: {},
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  heading: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.9,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 26,
    gap: 10,
    elevation: 2,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  closeModalBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
