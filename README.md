# 📱 Água Gestão Mobile Pro — Edição Comercial (Google Play Store)

Aplicativo Android profissional, ultra-rápido (60 FPS), 100% autônomo e offline-first desenvolvido para distribuidoras de água mineral e gás.

Projetado como produto comercial independente para publicação e revenda direta na **Google Play Store**, sem necessidade de servidores externos.

---

## 🚀 Destaques da Versão Comercial

### 💎 1. Modelo de Monetização Google Play & Teste Grátis
- **14 Dias de Teste Grátis**: Ao abrir o aplicativo pela primeira vez, o cliente preenche os dados da distribuidora no onboarding e ganha 14 dias de teste com todas as funcionalidades liberadas.
- **Paywall Google Play**:
  - Plano Mensal: **R$ 39,90 / mês**
  - Plano Anual: **R$ 349,90 / ano** (~27% de economia)
- **Bloqueio Automático**: Bloqueio seguro pós-trial e desbloqueio instantâneo via assinatura Google Play.

### ⚡ 2. Banco de Dados Local de Alta Performance (SQLite)
- Engine nativa embutida com `expo-sqlite` v16 (`aguagestao_standalone.db`).
- **Zero custos de hospedagem**: Os dados ficam salvos com segurança no aparelho do usuário.
- Funciona 100% offline, inclusive em locais sem sinal de internet ou áreas rurais.

### 🛒 3. Pedidos & PDV Rápido em Rota
- Lançamento de pedidos em menos de 10 segundos.
- Tabela de preços especiais por cliente.
- Formas de pagamento: PIX, Dinheiro (com calculadora de troco), Cartão e Fiado.
- **Ações de 1 Toque**:
  - 🗺️ Abrir rota no Google Maps / Waze.
  - 💬 Disparar conversa no WhatsApp.
  - 🖨️ Imprimir cupom fiscal térmico ESC/POS (58mm/80mm) via Bluetooth ou Smart POS.

### 🛢️ 4. Controle de Estoque & Vasilhames (Regra ANP 3 Anos)
- Débito e crédito automático: vender Galão de Água 20L baixa os cheios e soma os vazios devolvidos.
- Rastreamento por ano de fabricação e validade de 3 anos conforme norma ANP.
- Registro de chegada de caminhão da fábrica (carga e envase).
- Controle de perdas, avarias e garrafões trincados.

### 👥 5. CRM de Clientes & Recompra Inteligente
- Cadastro completo com captura de coordenadas GPS.
- Algoritmo que calcula o intervalo médio de consumo do cliente.
- Alertas de pós-venda para clientes com água acabando e disparo de mensagem no WhatsApp em 1 clique.

### 💰 6. Financeiro, Caderneta de Fiados e DRE
- Caderneta digital de fiados com baixa parcial ou total.
- Registro de despesas de rota (combustível, manutenção, alimentação).
- DRE simplificado e fluxo de caixa diário.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: React Native 0.76 & Expo SDK 52
- **Linguagem**: TypeScript 5.3 (100% tipado, 0 erros no `tsc`)
- **Banco de Dados**: `expo-sqlite` v16 (Nativo C / SQLite)
- **Navegação**: React Navigation (Bottom Tabs)
- **Design System**: Material You (Modo Claro e Modo Escuro com auto-detecção)
- **Impressão Térmica**: Driver ESC/POS para mini impressoras Bluetooth e Smart POS Android (Sunmi, Elgin, Stone, etc.)

---

## 📲 Como Rodar Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npx expo start
```
