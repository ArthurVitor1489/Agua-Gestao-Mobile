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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (produtoParaEditar) {
        setNome(produtoParaEditar.nome);
        setCategoria(produtoParaEditar.categoria);
        setPrecoVenda(produtoParaEditar.precoVenda.toFixed(2));
      } else {
        setNome('');
        setCategoria('AGUA_20L');
        setPrecoVenda('');
      }
    }
  }, [visible, produtoParaEditar]);

  const produtosPredefinidos = [
    { nome: 'Água Belle 20L', categoria: 'AGUA_20L' as CategoriaProduto, precoSugerido: '12,00' },
    { nome: 'Água Sublime 20L', categoria: 'AGUA_20L' as CategoriaProduto, precoSugerido: '12,00' },
    { nome: 'Água Indaiá 20L', categoria: 'AGUA_20L' as CategoriaProduto, precoSugerido: '14,00' },
    { nome: 'Água Santa Joana 20L', categoria: 'AGUA_20L' as CategoriaProduto, precoSugerido: '13,00' },
    { nome: 'Água Crystal 20L', categoria: 'AGUA_20L' as CategoriaProduto, precoSugerido: '14,00' },
    { nome: 'Vasilhame 20L Vazio', categoria: 'GARRAFAO_NOVO' as CategoriaProduto, precoSugerido: '35,00' },
  ];

  const handleSalvar = async () => {
    const preco = parseFloat(precoVenda.replace(',', '.'));

    if (!nome.trim()) {
      Alert.alert('Atenção', 'Selecione ou digite o nome do produto.');
      return;
    }
    if (isNaN(preco) || preco <= 0) {
      Alert.alert('Atenção', 'Informe o preço do produto.');
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
          quantidadeAtual: produtoParaEditar?.estoque?.quantidadeAtual || 0,
          quantidadeMinima: 10,
          updatedAt: new Date().toISOString(),
        },
      });

      await HapticService.success();
      onSuccess();
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao salvar produto');
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
                  {produtoParaEditar ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Selecione o produto e defina o preço de venda
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Selecionar Produto / Marca com Botões Rápidos */}
            <Text style={[styles.label, { color: colors.text }]}>1. Selecione o Produto / Marca:</Text>
            <View style={styles.marcasGrid}>
              {produtosPredefinidos.map((item) => {
                const isSel = nome === item.nome;
                return (
                  <TouchableOpacity
                    key={item.nome}
                    style={[
                      styles.marcaBtn,
                      {
                        backgroundColor: isSel ? colors.primary : colors.surface,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      HapticService.light();
                      setNome(item.nome);
                      setCategoria(item.categoria);
                      if (!precoVenda || produtosPredefinidos.some((p) => p.precoSugerido === precoVenda)) {
                        setPrecoVenda(item.precoSugerido);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.marcaBtnText,
                        { color: isSel ? '#fff' : colors.text, fontWeight: isSel ? '800' : '600' },
                      ]}
                    >
                      {item.nome}
                    </Text>
                    {isSel && <Check size={16} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Nome do Produto (ou Digitar Outra Marca) */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              2. Nome do Produto (ou digite outra marca):
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Ex: Água Belle 20L, Água Sublime 20L..."
              placeholderTextColor={colors.textMuted}
              value={nome}
              onChangeText={setNome}
            />

            {/* Preço do Produto */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              3. Preço do Produto (R$) *
            </Text>
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
                    {produtoParaEditar ? 'Salvar Alterações' : 'Cadastrar Produto'}
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
  marcasGrid: {
    gap: 8,
  },
  marcaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  marcaBtnText: {
    fontSize: 14,
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
