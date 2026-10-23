/**
 * Modelos de Dados e Entidades do Aplicativo Mobile Água Gestão SaaS
 * Compatibilidade 100% rigorosa com o Prisma Schema do SaaS e Turso/LibSQL
 */

export type Role = 'SUPER_ADMIN' | 'EMPRESA_ADMIN' | 'EMPRESA_OPERADOR';
export type Plano = 'BASICO' | 'PRO' | 'ENTERPRISE';
export type StatusEmpresa = 'ATIVO' | 'BLOQUEADO' | 'CANCELADO';

export type CategoriaProduto =
  | 'AGUA_20L'
  | 'GAS_P13'
  | 'GAS_P45'
  | 'GARRAFAO_NOVO'
  | 'SUPORTE'
  | 'BOMBA'
  | 'ACESSORIOS'
  | string;

export type StatusGarrafao =
  | 'DISPONIVEL'
  | 'CHEIO'
  | 'VAZIO'
  | 'DANIFICADO'
  | 'QUEBRADO'
  | 'VENCIDO'
  | 'DESCARTADO';

export type StatusPedido = 'PENDENTE' | 'EM_ANDAMENTO' | 'ENTREGUE' | 'CANCELADO';

export type FormaPagamento =
  | 'PIX'
  | 'DINHEIRO'
  | 'DEBITO'
  | 'CREDITO'
  | 'FIADO'
  | 'BOLETO';

export type SituacaoFiado = 'ABERTO' | 'PARCIAL' | 'QUITADO';

export type StatusBoleto = 'PENDENTE' | 'VENCIDA' | 'PAGA' | 'CANCELADA';

export type CategoriaDespesa =
  | 'COMBUSTIVEL'
  | 'MANUTENCAO'
  | 'FORNECEDOR'
  | 'PESSOAL'
  | 'CONTAS_FIXAS'
  | 'IMPOSTOS'
  | 'OUTROS';

export type TipoMovimentacao =
  | 'ENTRADA'
  | 'SAIDA'
  | 'AJUSTE'
  | 'DEVOLUCAO'
  | 'PERDA'
  | 'DANIFICADO'
  | 'QUEBRADO'
  | 'DESCARTE';

export interface Empresa {
  id: string;
  nome: string;
  slug: string;
  cnpj?: string | null;
  inscricaoEstadual?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  chavePix?: string | null;
  plano: Plano | string;
  status: StatusEmpresa | string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  empresaId: string | null;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  empresa?: Empresa | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientePrecoProduto {
  id: string;
  clienteId: string;
  produtoId: string;
  preco: number;
  produto?: Produto;
}

export interface Cliente {
  id: string;
  empresaId: string;
  nome: string;
  cpfCnpj?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pontoReferencia?: string | null;
  observacoes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ativo: boolean;
  precosEspeciais?: ClientePrecoProduto[];
  createdAt: string;
  updatedAt: string;
}

export interface EstoqueProduto {
  id: string;
  produtoId: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  updatedAt: string;
}

export interface Produto {
  id: string;
  empresaId: string;
  nome: string;
  categoria: CategoriaProduto;
  unidade: string;
  precoVenda: number;
  ativo: boolean;
  observacoes?: string | null;
  estoque?: EstoqueProduto | null;
  createdAt: string;
  updatedAt: string;
}

export interface EstoqueGarrafao {
  id: string;
  empresaId: string;
  anoFabricacao: number;
  anoValidade: number;
  quantidade: number;
  status: StatusGarrafao;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovimentacaoEstoque {
  id: string;
  empresaId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  produtoId?: string | null;
  produto?: Produto | null;
  estoqueGarrafaoId?: string | null;
  estoqueGarrafao?: EstoqueGarrafao | null;
  motivo?: string | null;
  pedidoId?: string | null;
  data: string;
}

export interface PedidoItem {
  id?: string;
  pedidoId?: string;
  produtoId: string;
  produto?: Produto;
  quantidade: number;
  valorUnitario: number;
  desconto?: number;
  total: number;
}

export interface Pagamento {
  id: string;
  pedidoId: string;
  forma: FormaPagamento;
  valor: number;
  dataPagamento: string;
  observacoes?: string | null;
}

export interface FiadoHistorico {
  id: string;
  fiadoId: string;
  valorPago: number;
  dataPagamento: string;
  formaPagamento: FormaPagamento;
  observacoes?: string | null;
}

export interface Fiado {
  id: string;
  empresaId: string;
  pedidoId: string;
  pedido?: Pedido;
  clienteId: string;
  cliente?: Cliente;
  valorOriginal: number;
  valorPago: number;
  saldo: number;
  situacao: SituacaoFiado;
  createdAt: string;
  updatedAt: string;
  historico?: FiadoHistorico[];
}

export interface BoletoParcela {
  id: string;
  boletoReceberId: string;
  numeroParcela: number;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string | null;
  status: StatusBoleto;
}

export interface BoletoReceber {
  id: string;
  empresaId: string;
  pedidoId: string;
  clienteId: string;
  numero: string;
  quantidadeParcelas: number;
  valorTotal: number;
  createdAt: string;
  parcelas?: BoletoParcela[];
}

export interface Pedido {
  id: string;
  empresaId: string;
  numero: number;
  clienteId: string;
  cliente?: Cliente;
  data: string;
  status: StatusPedido;
  formaPagamento?: string | null;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  total: number;
  observacoes?: string | null;
  itens: PedidoItem[];
  pagamentos?: Pagamento[];
  fiado?: Fiado | null;
  boletoReceber?: BoletoReceber | null;
  createdAt: string;
  updatedAt: string;
  offlineCreated?: boolean;
}

export interface Despesa {
  id: string;
  empresaId: string;
  categoria: CategoriaDespesa;
  descricao: string;
  valor: number;
  data: string;
  formaPagamento: FormaPagamento;
  status: 'PAGA' | 'PENDENTE';
  observacoes?: string | null;
  createdAt: string;
}

export interface DashboardData {
  periodo: string;
  faturamento: number;
  recebido: number;
  emAberto: number;
  despesas: number;
  resultado: number;
  pedidosRealizados: number;
  pedidosPendentes: number;
  garrafoesCheios: number;
  garrafoesVazios: number;
  garrafoesDanificados: number;
  garrafoesVencidos: number;
  recebimentoPorForma: {
    forma: string;
    valor: number;
    quantidade: number;
  }[];
  pedidosPorStatus: {
    status: StatusPedido;
    quantidade: number;
    valorTotal: number;
  }[];
}

export interface RecompraOportunidade {
  clienteId: string;
  nome: string;
  telefone?: string | null;
  whatsapp?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  totalPedidos: number;
  ultimoPedidoData: string;
  diasSemComprar: number;
  intervaloMedioDias: number;
  diasAtraso: number;
  urgencia: 'ALTA' | 'MEDIA' | 'NORMAL';
}

export interface SyncQueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'PENDENTE' | 'PROCESSANDO' | 'FALHA';
  errorMessage?: string;
  descricaoOperacao: string;
}
