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
import { ProdutosService } from '../../database/dbService';
import { Produto, CategoriaProduto } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { X, Check, Droplets } from 'lucide-react-native';

interface ProdutoFormModalProps {
  visible: boolean;
  produtoParaEditar?: Produto | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProdutoFormModal: React.FC<ProdutoFormModalProps> = ({
  visible,
  produtoParaEditar,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProduto>('AGUA_20L');
  const [precoVenda, setPrecoVenda] = useState('');
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (produtoParaEditar) {
        setNome(produtoParaEditar.nome);
        setCategoria(produtoParaEditar.categoria);
        setPrecoVenda(produtoParaEditar.precoVenda.toFixed(2));
        setEstoqueAtual(String(produtoParaEditar.estoque?.quantidadeAtual || 0));
      } else {
        setNome('');
        setCategoria('AGUA_20L');
        setPrecoVenda('');
        setEstoqueAtual('50');
      }
    }
  }, [visible, produtoParaEditar]);

  const tamanhosDisponiveis: { id: CategoriaProduto; label: string }[] = [
    { id: 'AGUA_20L', label: '💧 Galão 20 Litros' },
    { id: 'GARRAFAO_NOVO', label: '📦 Vasilhame 20L Vazio' },
  ];

  const handleSalvar = async () => {
    const preco = parseFloat(precoVenda.replace(',', '.'));
    const estoque = parseInt(estoqueAtual, 10) || 0;

    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome da água / marca que você vende (ex: Água Belle 20L).');
      return;
    }
    if (isNaN(preco) || preco <= 0) {
      Alert.alert('Atenção', 'Informe o preço de venda válido.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();

      ProdutosService.salvarProduto({
        id: produtoParaEditar ? produtoParaEditar.id : undefined,
        nome: nome.trim(),
        categoria,
        precoVenda: preco,
        estoque: {
          id: produtoParaEditar?.estoque?.id || 'est-' + Math.random().toString(36).substring(2, 9),
          produtoId: produtoParaEditar?.id || '',
          quantidadeAtual: estoque,
          quantidadeMinima: 10,
          updatedAt: new Date().toISOString(),
        },
      });

      await HapticService.success();
      onSuccess();
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao salvar produto de água');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Droplets size={22} color={colors.primary} />
              <View>
                <Text style={[styles.title, { color: colors.text }]}>
                  {produtoParaEditar ? 'Editar Água' : 'Cadastrar Água Mineral'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Marca de água que sua distribuidora vende
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Nome da Água / Marca */}
            <Text style={[styles.label, { color: colors.text }]}>Nome da Água / Marca *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Ex: Água Belle 20L, Indaiá 20L, Santa Joana..."
              placeholderTextColor={colors.textMuted}
              value={nome}
              onChangeText={setNome}
              autoFocus
            />

            {/* Tamanho / Embalagem */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Tamanho do Galão:</Text>
            <View style={styles.catGrid}>
              {tamanhosDisponiveis.map((tam) => {
                const isSel = categoria === tam.id;
                return (
                  <TouchableOpacity
                    key={tam.id}
                    style={[
                      styles.catBtn,
                      {
                        backgroundColor: isSel ? colors.primary : colors.surface,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      HapticService.light();
                      setCategoria(tam.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.catText,
                        { color: isSel ? '#fff' : colors.text, fontWeight: isSel ? '800' : '600' },
                      ]}
                    >
                      {tam.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preço de Venda e Estoque de Cheios */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Preço de Venda (R$) *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                  ]}
                  keyboardType="numeric"
                  placeholder="Ex: 12,00"
                  placeholderTextColor={colors.textMuted}
                  value={precoVenda}
                  onChangeText={setPrecoVenda}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Galões Cheios (Estoque)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                  ]}
                  keyboardType="numeric"
                  placeholder="50"
                  placeholderTextColor={colors.textMuted}
                  value={estoqueAtual}
                  onChangeText={setEstoqueAtual}
                />
              </View>
            </View>

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
                    {produtoParaEditar ? 'Salvar Alterações' : 'Cadastrar Água'}
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
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  catText: {
    fontSize: 13,
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
