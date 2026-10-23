import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Pedido, Empresa } from '../database/models';
import { Platform } from 'react-native';

export interface PrinterConfig {
  paperWidth: 58 | 80;
  autoPrint?: boolean;
  macAddress?: string;
  printerName?: string;
}

export const PrinterService = {
  // 1. Gerador de Bytes ESC/POS Puros para Mini Impressoras Bluetooth e Smart POS
  generateEscPosBytes(pedido: Pedido, empresa?: Empresa | null, paperWidth: 58 | 80 = 58): Uint8Array {
    const bytes: number[] = [];

    const append = (...codes: number[]) => bytes.push(...codes);
    const appendText = (text: string) => {
      // Normalizar acentuação para padrão ASCII das impressoras térmicas
      const normalized = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      for (let i = 0; i < normalized.length; i++) {
        bytes.push(normalized.charCodeAt(i) & 0xff);
      }
    };
    const appendLine = (text: string = '') => {
      appendText(text);
      append(0x0a);
    };

    const maxCols = paperWidth === 80 ? 48 : 32;
    const divider = '-'.repeat(maxCols);

    // ESC @: Inicializa impressora
    append(0x1b, 0x40);

    // Centralizado
    append(0x1b, 0x61, 0x01);

    // Título / Nome da Empresa (Negrito + Dobro de Altura)
    append(0x1b, 0x45, 0x01); // Bold ON
    append(0x1d, 0x21, 0x01); // Double height
    appendLine(empresa?.nome || 'DISTRIBUIDORA DE AGUA E GAS');
    append(0x1d, 0x21, 0x00); // Normal size
    append(0x1b, 0x45, 0x00); // Bold OFF

    if (empresa?.cnpj) appendLine(`CNPJ: ${empresa.cnpj}`);
    if (empresa?.telefone || empresa?.whatsapp) appendLine(`TEL: ${empresa.whatsapp || empresa.telefone}`);
    if (empresa?.endereco) appendLine(`${empresa.endereco} - ${empresa.cidade || ''}`);

    appendLine(divider);

    // Número do Pedido e Data
    append(0x1b, 0x45, 0x01); // Bold ON
    appendLine(`COMPROVANTE DE ENTREGA #${pedido.numero}`);
    append(0x1b, 0x45, 0x00); // Bold OFF

    const dataFormatada = new Date(pedido.data).toLocaleString('pt-BR');
    appendLine(`Data/Hora: ${dataFormatada}`);
    appendLine(divider);

    // Alinhamento à Esquerda: Dados do Cliente
    append(0x1b, 0x61, 0x00);
    appendLine(`CLIENTE: ${pedido.cliente?.nome || 'Consumidor Final'}`);
    if (pedido.cliente?.telefone || pedido.cliente?.whatsapp) {
      appendLine(`FONE: ${pedido.cliente.whatsapp || pedido.cliente.telefone}`);
    }
    if (pedido.cliente?.logradouro) {
      const end = `${pedido.cliente.logradouro}, ${pedido.cliente.numero || 'S/N'}`;
      appendLine(`END: ${end}`);
      if (pedido.cliente.bairro) appendLine(`BAIRRO: ${pedido.cliente.bairro}`);
      if (pedido.cliente.pontoReferencia) appendLine(`REF: ${pedido.cliente.pontoReferencia}`);
    }

    appendLine(divider);

    // Cabeçalho da Tabela de Itens
    append(0x1b, 0x45, 0x01);
    if (paperWidth === 80) {
      appendLine('QTD  DESCRICAO                      UNIT    TOTAL');
    } else {
      appendLine('QTD DESCRICAO            TOTAL');
    }
    append(0x1b, 0x45, 0x00);
    appendLine(divider);

    // Lista de Itens
    for (const item of pedido.itens) {
      const qtdStr = `${item.quantidade}x`.padEnd(4);
      const totalStr = `R$ ${item.total.toFixed(2)}`;
      const nomeProd = item.produto?.nome || 'Produto';

      if (paperWidth === 80) {
        const unitStr = `R$ ${(item.valorUnitario || 0).toFixed(2)}`.padEnd(9);
        const descLen = maxCols - qtdStr.length - unitStr.length - totalStr.length - 2;
        const desc = nomeProd.substring(0, Math.max(10, descLen)).padEnd(descLen);
        appendLine(`${qtdStr} ${desc} ${unitStr} ${totalStr}`);
      } else {
        const descLen = maxCols - qtdStr.length - totalStr.length - 1;
        const desc = nomeProd.substring(0, Math.max(8, descLen)).padEnd(descLen);
        appendLine(`${qtdStr}${desc} ${totalStr}`);
      }
    }

    appendLine(divider);

    // Totais e Pagamento (Alinhamento à Direita)
    append(0x1b, 0x61, 0x02);
    appendLine(`Subtotal: R$ ${pedido.subtotal.toFixed(2)}`);
    if (pedido.desconto > 0) appendLine(`Desconto: -R$ ${pedido.desconto.toFixed(2)}`);
    if (pedido.acrescimo > 0) appendLine(`Taxa/Acrescimo: +R$ ${pedido.acrescimo.toFixed(2)}`);

    append(0x1b, 0x45, 0x01); // Bold ON
    append(0x1d, 0x21, 0x01); // Double height
    appendLine(`TOTAL: R$ ${pedido.total.toFixed(2)}`);
    append(0x1d, 0x21, 0x00);
    append(0x1b, 0x45, 0x00);

    // Alinhamento à Esquerda
    append(0x1b, 0x61, 0x00);
    appendLine(`FORMA DE PAGAMENTO: ${pedido.formaPagamento || 'A COMBINAR'}`);

    if (empresa?.chavePix) {
      appendLine(divider);
      append(0x1b, 0x61, 0x01);
      append(0x1b, 0x45, 0x01);
      appendLine('CHAVE PIX PARA PAGAMENTO:');
      append(0x1b, 0x45, 0x00);
      appendLine(empresa.chavePix);
    }

    if (pedido.observacoes) {
      appendLine(divider);
      append(0x1b, 0x61, 0x00);
      appendLine(`OBS: ${pedido.observacoes}`);
    }

    // Linha Pontilhada de Assinatura do Recebedor
    appendLine(divider);
    append(0x1b, 0x61, 0x01); // Centralizado
    appendLine();
    appendLine('________________________________');
    appendLine('Assinatura do Recebedor');
    appendLine();

    // Rodapé
    append(0x1b, 0x45, 0x01);
    appendLine('OBRIGADO PELA PREFERENCIA!');
    appendLine('Agua Gestao SaaS - App Mobile');
    append(0x1b, 0x45, 0x00);

    // Pula linhas e Corta o Papel (GS V 66 0)
    append(0x0a, 0x0a, 0x0a, 0x0a);
    append(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(bytes);
  },

  // 2. Gerador de Cupom HTML Formatado para Impressão Nativa Android e Envio WhatsApp
  generateCupomHtml(pedido: Pedido, empresa?: Empresa | null, paperWidth: 58 | 80 = 58): string {
    const widthPx = paperWidth === 80 ? '380px' : '280px';
    const dataFormatada = new Date(pedido.data).toLocaleString('pt-BR');

    const itensRows = pedido.itens
      .map(
        (item) => `
        <tr>
          <td style="text-align: left; padding: 3px 0;">${item.quantidade}x ${item.produto?.nome || 'Item'}</td>
          <td style="text-align: right; padding: 3px 0; font-weight: bold;">R$ ${item.total.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Cupom Pedido #${pedido.numero}</title>
        <style>
          @page { size: auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${widthPx};
            margin: 0 auto;
            padding: 10px;
            color: #000;
            background-color: #fff;
            font-size: 13px;
            line-height: 1.3;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .company-name { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
          .order-title { font-size: 15px; font-weight: bold; margin: 4px 0; }
          .total-box { font-size: 16px; font-weight: 900; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; }
          .signature-area { margin-top: 25px; text-align: center; }
          .signature-line { border-top: 1px solid #000; width: 85%; margin: 0 auto 4px auto; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="company-name">${empresa?.nome || 'DISTRIBUIDORA ÁGUA & GÁS'}</div>
          ${empresa?.cnpj ? `<div>CNPJ: ${empresa.cnpj}</div>` : ''}
          ${empresa?.whatsapp || empresa?.telefone ? `<div>WhatsApp/Tel: ${empresa.whatsapp || empresa.telefone}</div>` : ''}
          ${empresa?.endereco ? `<div>${empresa.endereco}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="text-center">
          <div class="order-title">PEDIDO #${pedido.numero}</div>
          <div>Data/Hora: ${dataFormatada}</div>
        </div>

        <div class="divider"></div>

        <div>
          <div><span class="bold">Cliente:</span> ${pedido.cliente?.nome || 'Consumidor'}</div>
          ${pedido.cliente?.telefone ? `<div><span class="bold">Telefone:</span> ${pedido.cliente.telefone}</div>` : ''}
          ${
            pedido.cliente?.logradouro
              ? `<div><span class="bold">End:</span> ${pedido.cliente.logradouro}, ${pedido.cliente.numero || 'S/N'}</div>`
              : ''
          }
          ${pedido.cliente?.bairro ? `<div><span class="bold">Bairro:</span> ${pedido.cliente.bairro}</div>` : ''}
          ${pedido.cliente?.pontoReferencia ? `<div><span class="bold">Ref:</span> ${pedido.cliente.pontoReferencia}</div>` : ''}
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; padding-bottom: 4px;">ITEM</th>
              <th style="text-align: right; padding-bottom: 4px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itensRows}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="text-right">
          <div>Subtotal: R$ ${pedido.subtotal.toFixed(2)}</div>
          ${pedido.desconto > 0 ? `<div>Desconto: -R$ ${pedido.desconto.toFixed(2)}</div>` : ''}
          ${pedido.acrescimo > 0 ? `<div>Taxa Entrega: +R$ ${pedido.acrescimo.toFixed(2)}</div>` : ''}
          <div class="total-box">TOTAL: R$ ${pedido.total.toFixed(2)}</div>
        </div>

        <div>
          <div><span class="bold">Forma de Pagto:</span> ${pedido.formaPagamento || 'Não especificada'}</div>
          ${
            empresa?.chavePix
              ? `<div style="margin-top: 4px;"><span class="bold">Chave PIX:</span> ${empresa.chavePix}</div>`
              : ''
          }
          ${pedido.observacoes ? `<div style="margin-top: 4px;"><span class="bold">Obs:</span> ${pedido.observacoes}</div>` : ''}
        </div>

        <div class="signature-area">
          <div class="signature-line"></div>
          <div>Assinatura do Recebedor</div>
        </div>

        <div class="divider"></div>

        <div class="text-center" style="font-size: 11px; margin-top: 6px;">
          <div class="bold">OBRIGADO PELA PREFERÊNCIA!</div>
          <div>Água Gestão SaaS — www.aguagestao.com.br</div>
        </div>
      </body>
      </html>
    `;
  },

  // 3. Imprimir Cupom via Android Print Service ou Bluetooth
  async printCupom(pedido: Pedido, empresa?: Empresa | null, config: PrinterConfig = { paperWidth: 58 }): Promise<void> {
    try {
      const html = this.generateCupomHtml(pedido, empresa, config.paperWidth);
      await Print.printAsync({ html });
    } catch (error) {
      console.warn('Erro ao disparar impressão nativa:', error);
      throw error;
    }
  },

  // 4. Compartilhar Cupom em PDF via WhatsApp
  async shareCupomPdf(pedido: Pedido, empresa?: Empresa | null, paperWidth: 58 | 80 = 58): Promise<void> {
    try {
      const html = this.generateCupomHtml(pedido, empresa, paperWidth);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Comprovante de Pedido #${pedido.numero}`,
        });
      }
    } catch (error) {
      console.warn('Erro ao compartilhar cupom:', error);
      throw error;
    }
  },
};
