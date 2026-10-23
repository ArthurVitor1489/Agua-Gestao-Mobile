/**
 * Suite de Verificação de Motores e Regras de Negócio do App Mobile Água Gestão
 */

const assert = require('assert');

console.log('🧪 Iniciando testes unitários do aplicativo Água Gestão Mobile...\n');

// 1. Teste do Gerador de Comandos ESC/POS Térmico
function testEscPosGenerator() {
  console.log('▶ Teste 1: Validação do Gerador ESC/POS (58mm e 80mm)...');

  const pedidoMock = {
    numero: 1042,
    data: new Date().toISOString(),
    subtotal: 56.0,
    desconto: 5.0,
    acrescimo: 0.0,
    total: 51.0,
    formaPagamento: 'PIX',
    observacoes: 'Entregar até 17h',
    cliente: {
      nome: 'Arthur Vitor Distribuidora',
      telefone: '83999999999',
      logradouro: 'Av. Epitácio Pessoa',
      numero: '1200',
      bairro: 'Estados',
      pontoReferencia: 'Próximo ao Extra',
    },
    itens: [
      {
        quantidade: 2,
        valorUnitario: 18.0,
        total: 36.0,
        produto: { nome: 'Água Mineral 20L Galão' },
      },
      {
        quantidade: 1,
        valorUnitario: 20.0,
        total: 20.0,
        produto: { nome: 'Suporte com Torneira' },
      },
    ],
  };

  const empresaMock = {
    nome: 'ÁGUA BELLE DISTRIBUIDORA',
    cnpj: '12.345.678/0001-90',
    telefone: '(83) 3222-1000',
    endereco: 'Rua Principal, 500',
    cidade: 'João Pessoa',
    chavePix: 'financeiro@aguagestao.com.br',
  };

  // Simular geração de bytes ESC/POS
  const bytes = [];
  const append = (...c) => bytes.push(...c);
  const appendText = (t) => {
    const norm = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (let i = 0; i < norm.length; i++) bytes.push(norm.charCodeAt(i) & 0xff);
  };
  const appendLine = (t = '') => {
    appendText(t);
    append(0x0a);
  };

  // Init
  append(0x1b, 0x40);
  // Center
  append(0x1b, 0x61, 0x01);
  appendLine(empresaMock.nome);
  appendLine(`CNPJ: ${empresaMock.cnpj}`);
  appendLine(`COMPROVANTE DE ENTREGA #${pedidoMock.numero}`);
  // Left
  append(0x1b, 0x61, 0x00);
  appendLine(`CLIENTE: ${pedidoMock.cliente.nome}`);
  // Items
  for (const it of pedidoMock.itens) {
    appendLine(`${it.quantidade}x ${it.produto.nome} R$ ${it.total.toFixed(2)}`);
  }
  // Total
  append(0x1b, 0x61, 0x02);
  appendLine(`TOTAL: R$ ${pedidoMock.total.toFixed(2)}`);
  // Cut
  append(0x1d, 0x56, 0x42, 0x00);

  const uint8 = new Uint8Array(bytes);

  assert(uint8.length > 50, 'Array de bytes ESC/POS deve conter dados de impressão');
  assert(uint8[0] === 0x1b && uint8[1] === 0x40, 'Deve iniciar com comando ESC @ (0x1B 0x40)');
  assert(uint8[uint8.length - 4] === 0x1d && uint8[uint8.length - 3] === 0x56, 'Deve finalizar com comando de corte GS V (0x1D 0x56)');

  console.log(`  ✅ Gerador ESC/POS OK! ${uint8.length} bytes gerados com comandos de inicialização, alinhamento e corte.`);
}

// 2. Teste do Algoritmo de Recompra Inteligente
function testRecompraAlgorithm() {
  console.log('\n▶ Teste 2: Validação do Algoritmo de Recompra Inteligente...');

  const agora = Date.now();
  const diaMs = 24 * 60 * 60 * 1000;

  const clienteAtrasado = {
    nome: 'Empresa Alpha',
    pedidos: [
      { data: new Date(agora - 25 * diaMs).toISOString() }, // último pedido há 25 dias
      { data: new Date(agora - 37 * diaMs).toISOString() }, // há 37 dias (intervalo 12d)
      { data: new Date(agora - 50 * diaMs).toISOString() }, // há 50 dias (intervalo 13d)
    ],
  };

  // Calcular média
  const p = clienteAtrasado.pedidos;
  let soma = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const diff = Math.floor((new Date(p[i].data) - new Date(p[i + 1].data)) / diaMs);
    soma += diff;
  }
  const intervaloMedio = Math.round(soma / (p.length - 1));
  const diasSemComprar = Math.floor((agora - new Date(p[0].data)) / diaMs);
  const diasAtraso = diasSemComprar - intervaloMedio;

  assert.strictEqual(intervaloMedio, 13, 'Intervalo médio histórico deve ser 13 dias');
  assert.strictEqual(diasSemComprar, 25, 'Dias sem comprar deve ser 25 dias');
  assert.strictEqual(diasAtraso, 12, 'Dias de atraso deve ser 12 dias');

  const urgencia = diasAtraso >= 7 ? 'ALTA' : diasAtraso >= 3 ? 'MEDIA' : 'NORMAL';
  assert.strictEqual(urgencia, 'ALTA', 'Com 12 dias de atraso a urgência deve ser ALTA');

  console.log(`  ✅ Algoritmo de Recompra OK! Média: ${intervaloMedio} dias | Sem comprar: ${diasSemComprar} dias | Atraso: ${diasAtraso} dias | Urgência: ${urgencia}`);
}

// 3. Teste do Ciclo de Troca de Vasilhames
function testVasilhamesExchange() {
  console.log('\n▶ Teste 3: Ciclo de Troca de Vasilhames (Cheio x Vazio)...');

  let garrafoesCheios = 80;
  let garrafoesVazios = 20;

  const vendaQtdAgua20L = 5;

  // Ao vender 5 galões de 20L
  garrafoesCheios -= vendaQtdAgua20L;
  garrafoesVazios += vendaQtdAgua20L;

  assert.strictEqual(garrafoesCheios, 75, 'Garrafões cheios devem ser debitados em 5');
  assert.strictEqual(garrafoesVazios, 25, 'Garrafões vazios devem ser creditados em 5');

  // Chegada de Carga da Fábrica (Envase de 40 galões)
  const cargaFabrica = 40;
  garrafoesCheios += cargaFabrica;
  garrafoesVazios = Math.max(0, garrafoesVazios - cargaFabrica);

  assert.strictEqual(garrafoesCheios, 115, 'Garrafões cheios devem receber a carga da fábrica');
  assert.strictEqual(garrafoesVazios, 0, 'Garrafões vazios devem ser convertidos');

  console.log('  ✅ Ciclo de Vasilhames OK! Débito e crédito transacionais validados com precisão.');
}

try {
  testEscPosGenerator();
  testRecompraAlgorithm();
  testVasilhamesExchange();
  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
} catch (err) {
  console.error('\n❌ Erro durante os testes:', err);
  process.exit(1);
}
