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
import { ClientesService, ProdutosService, PedidosService } from '../../database/dbService';
import { Cliente, Produto, Pedido, FormaPagamento } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import {
  X,
  Search,
  Plus,
  Minus,
  Check,
  QrCode,
  DollarSign,
  CreditCard,
  BookOpen,
  Calendar,
  Sparkles,
} from 'lucide-react-native';

interface NovoPedidoModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (pedidoCriado: Pedido) => void;
}

export const NovoPedidoModal: React.FC<NovoPedidoModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Seleções do Pedido
  const [searchCliente, setSearchCliente] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [itensCarrinho, setItensCarrinho] = useState<{
    produto: Produto;
    quantidade: number;
    valorUnitario: number;
  }[]>([]);
  const [desconto, setDesconto] = useState('');
  const [acrescimo, setAcrescimo] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [observacoes, setObservacoes] = useState('');

  // Calculadora de Troco (Dinheiro)
  const [valorRecebido, setValorRecebido] = useState('');

  useEffect(() => {
    if (visible) {
      carregarDados();
    }
  }, [visible]);

  const carregarDados = () => {
    try {
      setLoading(true);
      const cli = ClientesService.getClientes();
      const prod = ProdutosService.getProdutos();
      setClientes(cli);
      setProdutos(prod.filter((p) => p.ativo));
    } catch (e) {
      console.warn('Erro ao carregar dados do PDV:', e);
    } finally {
      setLoading(false);
    }
  };

  const selecionarCliente = (c: Cliente) => {
    HapticService.light();
    setSelectedCliente(c);
    setSearchCliente('');

    // Se já houver produtos no carrinho, atualiza com a tabela de preço especial do cliente
    if (itensCarrinho.length > 0 && c.precosEspeciais) {
      const atualizados = itensCarrinho.map((item) => {
        const especial = c.precosEspeciais?.find((pe) => pe.produtoId === item.produto.id);
        return {
          ...item,
          valorUnitario: especial ? especial.preco : item.produto.precoVenda,
        };
      });
      setItensCarrinho(atualizados);
    }
  };

  const adicionarProduto = (prod: Produto) => {
    HapticService.light();
    const index = itensCarrinho.findIndex((i) => i.produto.id === prod.id);

    // Verificar se o cliente tem preço especial para este produto
    let precoUnit = prod.precoVenda;
    if (selectedCliente?.precosEspeciais) {
      const esp = selectedCliente.precosEspeciais.find((p) => p.produtoId === prod.id);
      if (esp) precoUnit = esp.preco;
    }

    if (index !== -1) {
      const novos = [...itensCarrinho];
      novos[index].quantidade += 1;
      setItensCarrinho(novos);
    } else {
      setItensCarrinho([
        ...itensCarrinho,
        {
          produto: prod,
          quantidade: 1,
          valorUnitario: precoUnit,
        },
      ]);
    }
  };

  const alterarQtd = (prodId: string, delta: number) => {
    HapticService.light();
    const index = itensCarrinho.findIndex((i) => i.produto.id === prodId);
    if (index === -1) return;

    const novos = [...itensCarrinho];
    const novaQtd = novos[index].quantidade + delta;

    if (novaQtd <= 0) {
      novos.splice(index, 1);
    } else {
      novos[index].quantidade = novaQtd;
    }
    setItensCarrinho(novos);
  };

  // Cálculos de Total
  const subtotal = itensCarrinho.reduce(
    (acc, i) => acc + i.quantidade * i.valorUnitario,
    0
  );
  const numDesconto = parseFloat(desconto.replace(',', '.')) || 0;
  const numAcrescimo = parseFloat(acrescimo.replace(',', '.')) || 0;
  const totalFinal = Math.max(0, subtotal - numDesconto + numAcrescimo);

  // Cálculo de Troco
  const numRecebido = parseFloat(valorRecebido.replace(',', '.')) || 0;
  const troco = Math.max(0, numRecebido - totalFinal);

  const handleSubmit = async () => {
    if (!selectedCliente) {
      Alert.alert('Atenção', 'Selecione o cliente para o pedido.');
      return;
    }
    if (itensCarrinho.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos 1 produto no pedido.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();

      const payload = {
        clienteId: selectedCliente.id,
        itens: itensCarrinho.map((i) => ({
          produtoId: i.produto.id,
          quantidade: i.quantidade,
          valorUnitario: i.valorUnitario,
        })),
        desconto: numDesconto,
        acrescimo: numAcrescimo,
        formaPagamento,
        observacoes: observacoes.trim() || undefined,
      };

      const novoPedido = PedidosService.criarPedido(payload);
      HapticService.success();

      // Reset estado
      setSelectedCliente(null);
      setItensCarrinho([]);
      setDesconto('');
      setAcrescimo('');
      setValorRecebido('');
      setObservacoes('');

      onSuccess(novoPedido);
    } catch (err: any) {
      await HapticService.error();
      Alert.alert('Erro', err.message || 'Falha ao lançar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const clientesFiltrados = searchCliente.trim()
    ? clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(searchCliente.toLowerCase()) ||
          c.telefone?.includes(searchCliente) ||
          c.logradouro?.toLowerCase().includes(searchCliente.toLowerCase())
      )
    : [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header do PDV */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Novo Pedido (PDV)</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Lançamento rápido em rota</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Seleção de Cliente */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>1. Cliente</Text>
            {selectedCliente ? (
              <View style={[styles.selectedClientCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedClientName, { color: colors.text }]}>
                    {selectedCliente.nome}
                  </Text>
                  {selectedCliente.telefone && (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      WhatsApp: {selectedCliente.telefone}
                    </Text>
                  )}
                  {selectedCliente.logradouro && (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      End: {selectedCliente.logradouro}, {selectedCliente.numero || 'S/N'} ({selectedCliente.bairro})
                    </Text>
                  )}
                  {Boolean(selectedCliente.precosEspeciais?.length) && (
                    <View style={styles.specialPriceBadge}>
                      <Sparkles size={12} color="#0284c7" />
                      <Text style={{ color: '#0284c7', fontSize: 11, fontWeight: '700' }}>
                        Tabela com Preço Especial Ativa
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedCliente(null)}
                  style={[styles.trocarBtn, { backgroundColor: colors.card }]}
                >
                  <Text style={{ color: colors.danger, fontSize: 12, fontWeight: 'bold' }}>Trocar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Search size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar por nome, fone ou rua..."
                    placeholderTextColor={colors.textMuted}
                    value={searchCliente}
                    onChangeText={setSearchCliente}
                  />
                  {searchCliente.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchCliente('')}>
                      <X size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {searchCliente.trim().length > 0 && (
                  <View style={[styles.searchResultsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {clientesFiltrados.slice(0, 5).map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                        onPress={() => selecionarCliente(c)}
                      >
                        <Text style={[styles.searchResultNome, { color: colors.text }]}>{c.nome}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                          {c.telefone || ''} {c.bairro ? `• ${c.bairro}` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {clientesFiltrados.length === 0 && (
                      <Text style={{ padding: 12, color: colors.textMuted, textAlign: 'center' }}>
                        Nenhum cliente encontrado.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* 2. Seleção de Produtos com Preço Especial Automático */}
            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 18 }]}>
              2. Produtos
            </Text>
            <View style={styles.productsGrid}>
              {produtos.map((prod) => {
                // Verificar se tem preço especial
                const esp = selectedCliente?.precosEspeciais?.find((p) => p.produtoId === prod.id);
                const precoExibido = esp ? esp.preco : prod.precoVenda;
                const noCarrinho = itensCarrinho.find((i) => i.produto.id === prod.id);

                return (
                  <TouchableOpacity
                    key={prod.id}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: noCarrinho ? colors.primaryLight : colors.surface,
                        borderColor: noCarrinho ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => adicionarProduto(prod)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                        {prod.nome}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Text style={[styles.productPrice, { color: colors.primary }]}>
                          R$ {precoExibido.toFixed(2)}
                        </Text>
                        {esp && <Sparkles size={12} color="#0284c7" />}
                      </View>
                    </View>
                    {noCarrinho && (
                      <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.cartBadgeText}>{noCarrinho.quantidade}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Carrinho / Itens Selecionados */}
            {itensCarrinho.length > 0 && (
              <View style={[styles.cartSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cartSectionTitle, { color: colors.text }]}>Itens do Pedido</Text>
                {itensCarrinho.map((item) => (
                  <View key={item.produto.id} style={[styles.cartItemRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cartItemName, { color: colors.text }]}>{item.produto.nome}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                          R$ {item.valorUnitario.toFixed(2)} un • Sub: R$ {(item.quantidade * item.valorUnitario).toFixed(2)}
                        </Text>
                        {item.valorUnitario !== item.produto.precoVenda && (
                          <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803d' }}>Preço Cliente</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: colors.card }]}
                        onPress={() => alterarQtd(item.produto.id, -1)}
                      >
                        <Minus size={16} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyValue, { color: colors.text }]}>{item.quantidade}</Text>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: colors.card }]}
                        onPress={() => alterarQtd(item.produto.id, 1)}
                      >
                        <Plus size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Desconto e Acréscimo */}
                <View style={styles.adjustRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.adjustLabel, { color: colors.textMuted }]}>Desconto (R$)</Text>
                    <TextInput
                      style={[styles.adjustInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      placeholder="0,00"
                      placeholderTextColor={colors.textMuted}
                      value={desconto}
                      onChangeText={setDesconto}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.adjustLabel, { color: colors.textMuted }]}>Taxa/Entrega (R$)</Text>
                    <TextInput
                      style={[styles.adjustInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      placeholder="0,00"
                      placeholderTextColor={colors.textMuted}
                      value={acrescimo}
                      onChangeText={setAcrescimo}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 4. Forma de Pagamento */}
            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 18 }]}>
              3. Forma de Pagamento
            </Text>
            <View style={styles.paymentMethodsGrid}>
              {[
                { id: 'PIX', label: 'PIX', icon: QrCode },
                { id: 'DINHEIRO', label: 'Dinheiro', icon: DollarSign },
                { id: 'DEBITO', label: 'Débito', icon: CreditCard },
                { id: 'CREDITO', label: 'Crédito', icon: CreditCard },
                { id: 'FIADO', label: 'Fiado (Caderneta)', icon: BookOpen },
                { id: 'BOLETO', label: 'Boleto', icon: Calendar },
              ].map((m) => {
                const isSelected = formaPagamento === m.id;
                const Icon = m.icon;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.paymentBtn,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      HapticService.light();
                      setFormaPagamento(m.id as FormaPagamento);
                    }}
                  >
                    <Icon size={16} color={isSelected ? '#fff' : colors.textMuted} />
                    <Text
                      style={[
                        styles.paymentBtnText,
                        { color: isSelected ? '#fff' : colors.text, fontWeight: isSelected ? '800' : '600' },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calculadora de Troco Automática quando selecionado Dinheiro */}
            {formaPagamento === 'DINHEIRO' && (
              <View style={[styles.trocoBox, { backgroundColor: '#e0f2fe', borderColor: '#38bdf8' }]}>
                <Text style={{ color: '#0369a1', fontWeight: '800', fontSize: 13 }}>
                  Cálculo de Troco Automático
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#0369a1' }}>Valor Recebido (R$)</Text>
                    <TextInput
                      style={[styles.trocoInput, { backgroundColor: '#fff', color: '#0f172a' }]}
                      keyboardType="numeric"
                      placeholder={`Ex: ${(totalFinal + 10).toFixed(2)}`}
                      value={valorRecebido}
                      onChangeText={setValorRecebido}
                    />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: '#0369a1' }}>Troco a Devolver:</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#0284c7' }}>
                      R$ {troco.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Observações */}
            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 14 }]}>
              Observações da Entrega
            </Text>
            <TextInput
              style={[
                styles.obsInput,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Ex: Deixar na portaria, troco para 100, etc..."
              placeholderTextColor={colors.textMuted}
              value={observacoes}
              onChangeText={setObservacoes}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Rodapé com Total e Botão de Concluir */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <View>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>TOTAL FINAL</Text>
              <Text style={[styles.totalFinalNum, { color: colors.primary }]}>
                R$ {totalFinal.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Confirmar e Imprimir</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  formScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchResultsBox: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchResultNome: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedClientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  selectedClientName: {
    fontSize: 15,
    fontWeight: '800',
  },
  specialPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trocarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  cartBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  cartSection: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  cartSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  adjustLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  adjustInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    minWidth: '48%',
  },
  paymentBtnText: {
    fontSize: 13,
  },
  trocoBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  trocoInput: {
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  obsInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalFinalNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
