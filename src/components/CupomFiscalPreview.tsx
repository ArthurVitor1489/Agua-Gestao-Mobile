import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Pedido, Empresa } from '../database/models';
import { PrinterService } from '../services/printerService';
import { useTheme } from '../context/ThemeContext';
import { HapticService } from '../services/hapticService';
import { Printer, Share2, X } from 'lucide-react-native';

interface CupomFiscalPreviewProps {
  visible: boolean;
  pedido: Pedido | null;
  empresa?: Empresa | null;
  onClose: () => void;
}

export const CupomFiscalPreview: React.FC<CupomFiscalPreviewProps> = ({
  visible,
  pedido,
  empresa,
  onClose,
}) => {
  const { colors } = useTheme();
  const [paperWidth, setPaperWidth] = useState<58 | 80>(58);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!pedido) return null;

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      await HapticService.medium();
      await PrinterService.printCupom(pedido, empresa, { paperWidth });
      await HapticService.success();
    } catch (e) {
      await HapticService.error();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      await HapticService.light();
      await PrinterService.shareCupomPdf(pedido, empresa, paperWidth);
    } catch (e) {
      await HapticService.error();
    } finally {
      setIsSharing(false);
    }
  };

  const dataFormatada = new Date(pedido.data).toLocaleString('pt-BR');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header do Modal */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Comprovante #{pedido.numero}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Impressão Térmica ESC/POS Não-Fiscal
              </Text>
            </View>

            {/* Alternador de Bobina 58mm / 80mm */}
            <View style={styles.widthSwitch}>
              <TouchableOpacity
                style={[
                  styles.switchButton,
                  paperWidth === 58 && { backgroundColor: colors.primary },
                ]}
                onPress={() => setPaperWidth(58)}
              >
                <Text
                  style={[
                    styles.switchText,
                    { color: paperWidth === 58 ? '#fff' : colors.textMuted },
                  ]}
                >
                  58mm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.switchButton,
                  paperWidth === 80 && { backgroundColor: colors.primary },
                ]}
                onPress={() => setPaperWidth(80)}
              >
                <Text
                  style={[
                    styles.switchText,
                    { color: paperWidth === 80 ? '#fff' : colors.textMuted },
                  ]}
                >
                  80mm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ticket Térmico Simulado */}
          <ScrollView
            style={styles.ticketScroll}
            contentContainerStyle={styles.ticketScrollContent}
          >
            <View style={[styles.ticketBody, { width: paperWidth === 80 ? 320 : 260 }]}>
              {/* Cabeçalho Empresa */}
              <Text style={styles.ticketEmpresaNome}>
                {empresa?.nome || 'DISTRIBUIDORA DE ÁGUA E GÁS'}
              </Text>
              {empresa?.cnpj && (
                <Text style={styles.ticketTextCenter}>CNPJ: {empresa.cnpj}</Text>
              )}
              {empresa?.telefone && (
                <Text style={styles.ticketTextCenter}>Tel: {empresa.telefone}</Text>
              )}
              {empresa?.endereco && (
                <Text style={styles.ticketTextCenter}>
                  {empresa.endereco} - {empresa.cidade || ''}
                </Text>
              )}

              <Text style={styles.ticketDivider}>--------------------------------</Text>

              {/* Pedido e Data */}
              <Text style={styles.ticketOrderTitle}>
                COMPROVANTE DE ENTREGA #{pedido.numero}
              </Text>
              <Text style={styles.ticketTextCenter}>Data/Hora: {dataFormatada}</Text>

              <Text style={styles.ticketDivider}>--------------------------------</Text>

              {/* Cliente */}
              <Text style={styles.ticketTextLeft}>
                <Text style={styles.bold}>CLIENTE: </Text>
                {pedido.cliente?.nome || 'Consumidor'}
              </Text>
              {pedido.cliente?.telefone && (
                <Text style={styles.ticketTextLeft}>
                  <Text style={styles.bold}>FONE: </Text>
                  {pedido.cliente.telefone}
                </Text>
              )}
              {pedido.cliente?.logradouro && (
                <Text style={styles.ticketTextLeft}>
                  <Text style={styles.bold}>END: </Text>
                  {pedido.cliente.logradouro}, {pedido.cliente.numero || 'S/N'}
                </Text>
              )}
              {pedido.cliente?.bairro && (
                <Text style={styles.ticketTextLeft}>
                  <Text style={styles.bold}>BAIRRO: </Text>
                  {pedido.cliente.bairro}
                </Text>
              )}
              {pedido.cliente?.pontoReferencia && (
                <Text style={styles.ticketTextLeft}>
                  <Text style={styles.bold}>REF: </Text>
                  {pedido.cliente.pontoReferencia}
                </Text>
              )}

              <Text style={styles.ticketDivider}>--------------------------------</Text>

              {/* Tabela de Itens */}
              <View style={styles.itemRowHeader}>
                <Text style={[styles.ticketMono, styles.bold]}>QTD ITEM</Text>
                <Text style={[styles.ticketMono, styles.bold]}>TOTAL</Text>
              </View>
              <Text style={styles.ticketDivider}>--------------------------------</Text>

              {pedido.itens.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.ticketItemName} numberOfLines={1}>
                    {item.quantidade}x {item.produto?.nome || 'Produto'}
                  </Text>
                  <Text style={styles.ticketItemPrice}>R$ {item.total.toFixed(2)}</Text>
                </View>
              ))}

              <Text style={styles.ticketDivider}>--------------------------------</Text>

              {/* Totais */}
              <View style={styles.totalRow}>
                <Text style={styles.ticketMono}>Subtotal:</Text>
                <Text style={styles.ticketMono}>R$ {pedido.subtotal.toFixed(2)}</Text>
              </View>
              {pedido.desconto > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.ticketMono}>Desconto:</Text>
                  <Text style={styles.ticketMono}>-R$ {pedido.desconto.toFixed(2)}</Text>
                </View>
              )}
              {pedido.acrescimo > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.ticketMono}>Taxa/Acréscimo:</Text>
                  <Text style={styles.ticketMono}>+R$ {pedido.acrescimo.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.totalRow, { marginTop: 4 }]}>
                <Text style={[styles.ticketMono, styles.bold, { fontSize: 15 }]}>TOTAL:</Text>
                <Text style={[styles.ticketMono, styles.bold, { fontSize: 15 }]}>
                  R$ {pedido.total.toFixed(2)}
                </Text>
              </View>

              <Text style={styles.ticketDivider}>--------------------------------</Text>

              {/* Pagamento */}
              <Text style={styles.ticketTextLeft}>
                <Text style={styles.bold}>PAGAMENTO: </Text>
                {pedido.formaPagamento || 'A COMBINAR'}
              </Text>

              {empresa?.chavePix && (
                <View style={{ marginTop: 4 }}>
                  <Text style={[styles.ticketTextCenter, styles.bold]}>CHAVE PIX:</Text>
                  <Text style={[styles.ticketTextCenter, { fontSize: 11 }]}>
                    {empresa.chavePix}
                  </Text>
                </View>
              )}

              {pedido.observacoes && (
                <Text style={[styles.ticketTextLeft, { marginTop: 4 }]}>
                  <Text style={styles.bold}>OBS: </Text>
                  {pedido.observacoes}
                </Text>
              )}

              {/* Linha de Assinatura */}
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.ticketTextCenter}>Assinatura do Recebedor</Text>
              </View>

              <Text style={styles.ticketDivider}>--------------------------------</Text>

              {/* Rodapé */}
              <Text style={[styles.ticketTextCenter, styles.bold, { marginTop: 4 }]}>
                OBRIGADO PELA PREFERÊNCIA!
              </Text>
              <Text style={[styles.ticketTextCenter, { fontSize: 10 }]}>
                Água Gestão SaaS — App Mobile
              </Text>
            </View>
          </ScrollView>

          {/* Botões de Ação na Base */}
          <View style={[styles.footerActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.8}
            >
              {isSharing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Share2 size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>WhatsApp (PDF)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1.2 }]}
              onPress={handlePrint}
              disabled={isPrinting}
              activeOpacity={0.8}
            >
              {isPrinting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Printer size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Imprimir Térmica</Text>
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
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  widthSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  switchText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  ticketScroll: {
    maxHeight: 440,
    backgroundColor: '#334155',
  },
  ticketScrollContent: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ticketBody: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  ticketEmpresaNome: {
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'center',
    color: '#000',
  },
  ticketTextCenter: {
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'center',
    color: '#000',
  },
  ticketTextLeft: {
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'left',
    color: '#000',
    marginTop: 2,
  },
  ticketOrderTitle: {
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 13,
    textAlign: 'center',
    color: '#000',
  },
  ticketDivider: {
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'center',
    color: '#000',
    letterSpacing: -1,
    marginVertical: 3,
  },
  ticketMono: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#000',
  },
  bold: {
    fontWeight: 'bold',
  },
  itemRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  ticketItemName: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#000',
    flex: 1,
    marginRight: 4,
  },
  ticketItemPrice: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    marginTop: 20,
    alignItems: 'center',
  },
  signatureLine: {
    width: '80%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginBottom: 4,
  },
  footerActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    flex: 1,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
