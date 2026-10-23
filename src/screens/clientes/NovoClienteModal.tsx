import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ClientesService, ProdutosService } from '../../database/dbService';
import { Produto, Cliente } from '../../database/models';
import { LocationService } from '../../services/locationService';
import { HapticService } from '../../services/hapticService';
import { X, MapPin, Check, Sparkles, DollarSign, Edit2 } from 'lucide-react-native';

interface NovoClienteModalProps {
  visible: boolean;
  clienteParaEditar?: Cliente | null;
  onClose: () => void;
  onSuccess: (clienteSalvo: Cliente) => void;
}

export const NovoClienteModal: React.FC<NovoClienteModalProps> = ({
  visible,
  clienteParaEditar,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();

  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [pontoReferencia, setPontoReferencia] = useState('');

  // GPS
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);

  // Produtos e Preços Personalizados
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [precosPersonalizados, setPrecosPersonalizados] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      try {
        const prods = ProdutosService.getProdutos().filter((p) => p.ativo);
        setProdutos(prods);

        if (clienteParaEditar) {
          setNome(clienteParaEditar.nome || '');
          setCpfCnpj(clienteParaEditar.cpfCnpj || '');
          setTelefone(clienteParaEditar.telefone || '');
          setWhatsapp(clienteParaEditar.whatsapp || '');
          setLogradouro(clienteParaEditar.logradouro || '');
          setNumero(clienteParaEditar.numero || '');
          setBairro(clienteParaEditar.bairro || '');
          setCidade(clienteParaEditar.cidade || '');
          setPontoReferencia(clienteParaEditar.pontoReferencia || '');
          setLatitude(clienteParaEditar.latitude || null);
          setLongitude(clienteParaEditar.longitude || null);

          // Carregar preços especiais existentes
          const precosMap: Record<string, string> = {};
          if (clienteParaEditar.precosEspeciais) {
            for (const pe of clienteParaEditar.precosEspeciais) {
              precosMap[pe.produtoId] = String(pe.preco);
            }
          }
          setPrecosPersonalizados(precosMap);
        } else {
          // Reset para novo cadastro
          setNome('');
          setCpfCnpj('');
          setTelefone('');
          setWhatsapp('');
          setLogradouro('');
          setNumero('');
          setBairro('');
          setCidade('');
          setPontoReferencia('');
          setLatitude(null);
          setLongitude(null);
          setPrecosPersonalizados({});
        }
      } catch (err) {
        console.warn('Erro ao carregar dados no modal de cliente:', err);
      }
    }
  }, [visible, clienteParaEditar]);

  const capturarGps = async () => {
    try {
      setCapturingGps(true);
      await HapticService.light();
      const coords = await LocationService.getCurrentCoordinates();
      if (coords) {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        await HapticService.success();
        Alert.alert('GPS Capturado!', `Lat: ${coords.latitude.toFixed(5)}, Long: ${coords.longitude.toFixed(5)}`);
      } else {
        Alert.alert('Aviso', 'Não foi possível capturar as coordenadas GPS.');
      }
    } catch {
      Alert.alert('Erro', 'Falha ao acessar GPS.');
    } finally {
      setCapturingGps(false);
    }
  };

  const setPrecoDoProduto = (produtoId: string, valorStr: string) => {
    setPrecosPersonalizados({
      ...precosPersonalizados,
      [produtoId]: valorStr,
    });
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do cliente.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();

      // Montar array de preços especiais válidos
      const precosEspeciaisList = Object.entries(precosPersonalizados)
        .map(([prodId, valStr]) => {
          const num = parseFloat(valStr.replace(',', '.'));
          if (!isNaN(num) && num > 0) {
            return {
              id: 'pe-' + Math.random().toString(36).substring(2, 9),
              clienteId: clienteParaEditar?.id || '',
              produtoId: prodId,
              preco: num,
            };
          }
          return null;
        })
        .filter(Boolean) as any[];

      const clienteSalvo = ClientesService.salvarCliente({
        id: clienteParaEditar ? clienteParaEditar.id : undefined,
        nome: nome.trim(),
        cpfCnpj: cpfCnpj.trim() || undefined,
        telefone: telefone.trim() || undefined,
        whatsapp: whatsapp.trim() || telefone.trim() || undefined,
        logradouro: logradouro.trim() || undefined,
        numero: numero.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        pontoReferencia: pontoReferencia.trim() || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        precosEspeciais: precosEspeciaisList.length > 0 ? precosEspeciaisList : undefined,
      });

      await HapticService.success();
      onSuccess(clienteSalvo);
    } catch (err: any) {
      await HapticService.error();
      Alert.alert('Erro', err.message || 'Falha ao salvar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                {clienteParaEditar ? 'Editar Cliente' : 'Novo Cliente'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Cadastro com preço personalizado por cliente
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Dados Básicos */}
            <Text style={[styles.label, { color: colors.text }]}>Nome / Razão Social *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Ex: Mercadinho Central, Academia Fisio, Arthur..."
              placeholderTextColor={colors.textMuted}
              value={nome}
              onChangeText={setNome}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>WhatsApp / Celular</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="(83) 99999-9999"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>CPF / CNPJ (Opcional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="000.000.000-00"
                  placeholderTextColor={colors.textMuted}
                  value={cpfCnpj}
                  onChangeText={setCpfCnpj}
                />
              </View>
            </View>

            {/* SEÇÃO PRINCIPAL: PREÇO PERSONALIZADO DESTE CLIENTE */}
            <View style={[styles.pricingSection, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Sparkles size={18} color={colors.primary} />
                <Text style={[styles.pricingTitle, { color: colors.text }]}>
                  Preço Personalizado deste Cliente
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                Defina o valor da água negociado para este cliente. No PDV, o valor será puxado automaticamente!
              </Text>

              {produtos.map((prod) => {
                const valorAtual = precosPersonalizados[prod.id] || '';
                return (
                  <View key={prod.id} style={[styles.prodPriceRow, { borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.prodPriceNome, { color: colors.text }]}>{prod.nome}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Tabela normal: R$ {prod.precoVenda.toFixed(2)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>R$</Text>
                        <TextInput
                          style={[
                            styles.priceInput,
                            {
                              backgroundColor: colors.card,
                              color: colors.text,
                              borderColor: valorAtual ? colors.primary : colors.border,
                            },
                          ]}
                          keyboardType="numeric"
                          placeholder={prod.precoVenda.toFixed(2)}
                          placeholderTextColor={colors.textMuted}
                          value={valorAtual}
                          onChangeText={(t) => setPrecoDoProduto(prod.id, t)}
                        />
                      </View>

                      {/* Botões rápidos de preço */}
                      <View style={styles.quickPillsRow}>
                        {[8, 9, 10, 11, 12].map((pVal) => (
                          <TouchableOpacity
                            key={pVal}
                            style={[
                              styles.quickPill,
                              {
                                backgroundColor: valorAtual === String(pVal) ? colors.primary : colors.card,
                                borderColor: colors.border,
                              },
                            ]}
                            onPress={() => {
                              HapticService.light();
                              setPrecoDoProduto(prod.id, String(pVal));
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: valorAtual === String(pVal) ? '#fff' : colors.text,
                              }}
                            >
                              {pVal}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {valorAtual ? (
                          <TouchableOpacity
                            style={[styles.quickPill, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
                            onPress={() => {
                              HapticService.light();
                              setPrecoDoProduto(prod.id, '');
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.danger }}>Limpar</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Endereço */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>Endereço de Entrega</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 3 }}>
                <Text style={[styles.label, { color: colors.text }]}>Rua / Logradouro</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Rua das Flores"
                  placeholderTextColor={colors.textMuted}
                  value={logradouro}
                  onChangeText={setLogradouro}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Nº</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="123"
                  placeholderTextColor={colors.textMuted}
                  value={numero}
                  onChangeText={setNumero}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Bairro</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Centro"
                  placeholderTextColor={colors.textMuted}
                  value={bairro}
                  onChangeText={setBairro}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Cidade</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="João Pessoa"
                  placeholderTextColor={colors.textMuted}
                  value={cidade}
                  onChangeText={setCidade}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Ponto de Referência</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Ex: Em frente à praça / portão azul"
              placeholderTextColor={colors.textMuted}
              value={pontoReferencia}
              onChangeText={setPontoReferencia}
            />

            {/* Captura de Coordenadas GPS */}
            <TouchableOpacity
              style={[
                styles.gpsBtn,
                {
                  backgroundColor: latitude ? '#dcfce7' : colors.surface,
                  borderColor: latitude ? '#15803d' : colors.border,
                },
              ]}
              onPress={capturarGps}
              disabled={capturingGps}
            >
              {capturingGps ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <MapPin size={18} color={latitude ? '#15803d' : colors.primary} />
                  <Text style={[styles.gpsBtnText, { color: latitude ? '#15803d' : colors.primary }]}>
                    {latitude
                      ? `GPS Salvo: ${latitude.toFixed(4)}, ${longitude?.toFixed(4)}`
                      : 'Capturar Coordenadas GPS Atuais'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleSalvar}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>
                    {clienteParaEditar ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                  </Text>
                </>
              )}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  pricingSection: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 16,
    marginBottom: 6,
  },
  pricingTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  prodPriceRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prodPriceNome: {
    fontSize: 14,
    fontWeight: '800',
  },
  priceInput: {
    width: 76,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  quickPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 14,
  },
  gpsBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
