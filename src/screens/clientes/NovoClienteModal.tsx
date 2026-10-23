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
import { X, MapPin, Check, Plus, Trash2 } from 'lucide-react-native';

interface NovoClienteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (novoCliente: Cliente) => void;
}

export const NovoClienteModal: React.FC<NovoClienteModalProps> = ({
  visible,
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
  const [observacoes, setObservacoes] = useState('');

  // GPS
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);

  // Preços Especiais
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [precosEspeciais, setPrecosEspeciais] = useState<{ produtoId: string; preco: number }[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      try {
        const prods = ProdutosService.getProdutos();
        setProdutos(prods.filter((p) => p.ativo));
      } catch (err) {
        console.warn('Erro ao carregar produtos no modal de cliente:', err);
      }
    }
  }, [visible]);

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

  const handleSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do cliente.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();

      const novo = ClientesService.salvarCliente({
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
        precosEspeciais:
          precosEspeciais.length > 0
            ? precosEspeciais.map((pe) => ({
                id: 'pe-' + Math.random().toString(36).substring(2, 9),
                clienteId: '',
                produtoId: pe.produtoId,
                preco: pe.preco,
              }))
            : undefined,
      });

      await HapticService.success();
      // Limpar formulário
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
      setPrecosEspeciais([]);

      onSuccess(novo);
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
              <Text style={[styles.title, { color: colors.text }]}>Novo Cliente</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Cadastro com GPS e tabela de preços
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
              placeholder="Ex: Arthur Vitor ou Padaria Pão de Mel"
              placeholderTextColor={colors.textMuted}
              value={nome}
              onChangeText={setNome}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Telefone / WhatsApp</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  keyboardType="phone-pad"
                  placeholder="(83) 99999-9999"
                  placeholderTextColor={colors.textMuted}
                  value={telefone}
                  onChangeText={(t) => {
                    setTelefone(t);
                    if (!whatsapp) setWhatsapp(t);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>CPF / CNPJ</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  keyboardType="numeric"
                  placeholder="000.000.000-00"
                  placeholderTextColor={colors.textMuted}
                  value={cpfCnpj}
                  onChangeText={setCpfCnpj}
                />
              </View>
            </View>

            {/* Endereço */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>
              Endereço de Entrega
            </Text>

            <View style={styles.rowInputs}>
              <View style={{ flex: 2.2 }}>
                <Text style={[styles.label, { color: colors.text }]}>Logradouro / Rua</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Rua das Acácias"
                  placeholderTextColor={colors.textMuted}
                  value={logradouro}
                  onChangeText={setLogradouro}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Número</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="120"
                  placeholderTextColor={colors.textMuted}
                  value={numero}
                  onChangeText={setNumero}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
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

            <Text style={[styles.label, { color: colors.text }]}>Ponto de Referência</Text>
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
                  <Text style={styles.confirmBtnText}>Cadastrar Cliente</Text>
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
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
    marginTop: 6,
  },
  gpsBtnText: {
    fontSize: 13,
    fontWeight: '800',
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
