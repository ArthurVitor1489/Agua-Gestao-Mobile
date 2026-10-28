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
import { Produto } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import { X, Check, PackagePlus } from 'lucide-react-native';

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
  const { keyboardHeight, maxModalHeight } = useKeyboardOffset();

  const [nome, setNome] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (produtoParaEditar) {
        setNome(produtoParaEditar.nome);
        setPrecoVenda(produtoParaEditar.precoVenda.toFixed(2));
      } else {
        setNome('');
        setPrecoVenda('');
      }
    }
  }, [visible, produtoParaEditar]);

  const handleSalvar = async () => {
    const preco = parseFloat(precoVenda.replace(',', '.'));

    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do produto.');
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
        categoria: 'AGUA_20L',
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
      <View style={[styles.overlay, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.card },
            maxModalHeight ? { maxHeight: maxModalHeight } : null,
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PackagePlus size={22} color={colors.primary} />
              <View>
                <Text style={[styles.title, { color: colors.text }]}>
                  {produtoParaEditar ? 'Editar Produto' : 'Cadastrar Produto'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Informe o nome e o preço de venda
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Nome do Produto */}
            <Text style={[styles.label, { color: colors.text }]}>Nome do Produto *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Digite o nome do produto..."
              placeholderTextColor={colors.textMuted}
              value={nome}
              onChangeText={setNome}
            />

            {/* Preço do Produto */}
            <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
              Preço do Produto (R$) *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              value={precoVenda}
              onChangeText={setPrecoVenda}
            />

            <View style={{ height: 24 }} />
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
