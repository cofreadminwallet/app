/**
 * CofreAdmin Internationalization (i18n) Comprehensive Dictionary
 * Supported languages:
 *  - 'pt-BR': Portuguese (Brazil) - Official Default for Portuguese/Spanish locales
 *  - 'en-US': English (US) - Default for international with Gen Z / Web3 energy
 */

export type AppLanguage = 'pt-BR' | 'en-US';

const STORAGE_LANG_KEY = 'cofreadmin_user_language';

// Brazilian and Lusophone timezones for precise geographic detection
const PT_TIMEZONES = new Set([
  'America/Sao_Paulo',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/Cuiaba',
  'America/Manaus',
  'America/Porto_Velho',
  'America/Boa_Vista',
  'America/Rio_Branco',
  'America/Noronha',
  'America/Araguaina',
  'America/Maceio',
  'America/Bahia',
  'America/Campo_Grande',
  'America/Santarem',
  'America/Eirunepe',
  'America/Porto_Acre',
  'Brazil/Acre',
  'Brazil/DeNoronha',
  'Brazil/East',
  'Brazil/West',
  'Europe/Lisbon',
  'Atlantic/Madeira',
  'Atlantic/Azores',
  'Africa/Luanda',
  'Africa/Maputo',
  'Atlantic/Cape_Verde',
  'Africa/Bissau',
  'Africa/Sao_Tome',
]);

/**
 * Robust and intelligent locale & region autodetection:
 * 1. Checks user's explicit saved preference in localStorage.
 * 2. Checks browser & system primary language (navigator.languages / navigator.language / mobile WebViews).
 * 3. Checks device timezone & geographic region (Intl.DateTimeFormat API).
 * 4. Automatically assigns 'pt-BR' for Brazil & Lusophone regions and 'en-US' for the rest of the world.
 */
export function detectInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'pt-BR';

  try {
    // 1. Saved user preference takes top priority
    const saved = localStorage.getItem(STORAGE_LANG_KEY);
    if (saved === 'pt-BR' || saved === 'en-US') {
      return saved;
    }

    // 2. Check browser & WebView languages
    const nav = window.navigator as any;
    const browserLangs: string[] = [];

    if (Array.isArray(nav.languages) && nav.languages.length > 0) {
      browserLangs.push(...nav.languages);
    }
    if (nav.language) browserLangs.push(nav.language);
    if (nav.userLanguage) browserLangs.push(nav.userLanguage);
    if (nav.browserLanguage) browserLangs.push(nav.browserLanguage);

    const primaryLang = (browserLangs[0] || '').toLowerCase().trim();

    // If primary language is explicitly Portuguese
    if (primaryLang.startsWith('pt')) {
      return 'pt-BR';
    }

    // If primary language is explicitly English
    if (primaryLang.startsWith('en')) {
      return 'en-US';
    }

    // 3. Check device geographic timezone
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone) {
        if (
          PT_TIMEZONES.has(timeZone) ||
          timeZone.startsWith('Brazil/') ||
          timeZone.startsWith('America/Sao_') ||
          timeZone.startsWith('America/Recife') ||
          timeZone.startsWith('America/Fortaleza') ||
          timeZone.startsWith('America/Belem') ||
          timeZone.startsWith('America/Manaus') ||
          timeZone.startsWith('America/Cuiaba')
        ) {
          return 'pt-BR';
        }
      }
    } catch {}

    // 4. Check if any preferred language is Portuguese
    for (const l of browserLangs) {
      const lower = (l || '').toLowerCase().trim();
      if (lower.startsWith('pt')) {
        return 'pt-BR';
      }
      if (lower.startsWith('en')) {
        return 'en-US';
      }
    }

    // 5. Default for global/international users
    return 'en-US';
  } catch {
    return 'en-US';
  }
}

export function detectDefaultSecondaryCurrency(lang: AppLanguage): 'BRL' | 'USD' {
  return lang === 'pt-BR' ? 'BRL' : 'USD';
}

export const DICTIONARY = {
  'pt-BR': {
    // Navigation
    nav_home: 'Início',
    nav_vaults: 'Cofres',
    nav_pay: 'Pagar',
    nav_analytics: 'Análise',
    nav_activity: 'Extrato',
    nav_settings: 'Ajustes',

    // Header & Connectivity
    header_online: 'ON',
    header_offline: 'OFF',
    header_share: 'Compartilhar',
    header_logout: 'Sair',
    header_settings_title: 'Ajustes',
    header_greeting: 'Olá',

    // Hero Balance Card
    balance_total: 'SALDO TOTAL',
    balance_available: 'LIVRE PRA GASTAR',
    balance_locked_vaults: 'PRESO EM COFRES',
    balance_hide: 'Ocultar saldo',
    balance_show: 'Exibir saldo',
    balance_rate_label: 'Cotação USDC',
    balance_syncing: 'Atualizando...',
    balance_copy_address: 'Copiar Endereço',
    balance_copied_address: 'Copiado!',
    balance_7d_delta: '7 dias',
    balance_in_vaults: 'Cofres:',
    balance_no_wallet: 'Offline',

    // Quick Actions
    action_pay: 'Pagar',
    action_pay_sub: 'Escanear',
    action_receive: 'Receber',
    action_receive_sub: 'QR Code',
    action_new_vault: 'Novo Cofre',
    action_new_vault_sub: 'Metas',
    action_extract: 'Extrato',
    action_extract_sub: 'Histórico',

    // Daily Budget
    budget_title: 'Meta Diária',
    budget_spent_today: 'Hoje',
    budget_limit: 'Limite:',
    budget_remaining: 'Restam',
    budget_exceeded: 'Excedeu',
    budget_no_limit: 'Definir meta',
    budget_set_limit: 'Definir',
    budget_adjust_limit: 'Ajustar',
    budget_optional: 'Opcional',
    budget_sub_has: 'Limite diário',
    budget_sub_none: 'Definir teto',

    // Vaults Screen
    vaults_header_badge: 'Cofres',
    vaults_active_title: 'Cofres Ativos',
    vaults_empty_active: 'Nenhum cofre ativo',
    vaults_empty_desc: 'Crie metas para guardar saldo.',
    vaults_completed_title: 'Metas Concluídas',
    vaults_completed_badge: 'concluídos!',
    vaults_create_modal_title: 'Novo Cofre 🎯',
    vaults_btn_deposit: 'Guardar',
    vaults_btn_withdraw: 'Resgatar',
    vaults_target: 'Meta:',
    vaults_remaining_prefix: 'Falta',
    vaults_completed_pct: 'Concluído',
    vaults_see_all: 'Ver todos',
    vaults_new_btn: 'Novo',

    // Transactions / Ledger Screen
    tx_title_extrato: 'Extrato',
    tx_title_analytics: 'Análises',
    tx_title_onchain: 'On-Chain',
    tx_sub_extrato: 'Histórico',
    tx_sub_analytics: 'Categorias',
    tx_sub_onchain: 'Base L2',
    tx_search_placeholder: 'Buscar...',
    tx_tab_organized: 'Extrato',
    tx_tab_analytics: 'Análises',
    tx_tab_ledger: 'On-Chain',
    tx_period_day: 'Dia',
    tx_period_week: 'Semana',
    tx_period_month: 'Mês',
    tx_period_year: 'Ano',
    tx_period_all: 'Todos',
    tx_sum_incomes: 'Entradas',
    tx_sum_expenses: 'Gastos',
    tx_sum_net: 'Resultado',
    tx_sum_saved: 'Guardado',
    tx_sum_withdrawn: 'Resgatado',
    tx_sum_retained: 'Retido',
    tx_filter_all: 'Todos',
    tx_filter_expense: 'Gastos',
    tx_filter_income: 'Entradas',
    tx_filter_vault: 'Cofres',
    tx_filter_unorganized: 'Sem Categoria',
    tx_empty_title: 'Nenhum lançamento no período',
    tx_empty_desc: 'Adicione um lançamento ou receba USDC.',
    tx_btn_add: '+ Adicionar',
    tx_detail_title: 'Detalhes',

    // Analytics Screen
    analytics_timeframe_month: 'Mês Atual',
    analytics_timeframe_year: 'Ano Atual',
    analytics_tab_expenses: 'Gastos',
    analytics_tab_income: 'Entradas',
    analytics_tab_all: 'Fluxo Geral',
    analytics_summary_expenses: 'Gastos',
    analytics_summary_income: 'Entradas',
    analytics_summary_balance: 'Saldo',
    analytics_chart_title: 'Evolução',
    analytics_category_breakdown: 'Categorias',
    analytics_btn_rayx: '⚡ Raio-X',
    analytics_empty: 'Sem dados suficientes para gráficos neste período.',

    // Settings / Profile
    settings_title: 'Ajustes',
    settings_language: 'Idioma',
    settings_currency: 'Moeda',
    settings_profile_name: 'Nome',
    settings_haptics: 'Vibração',
    settings_haptics_desc: 'Vibração ao tocar em botões',
    settings_save_profile: 'Salvar',
    settings_saved_feedback: 'Perfil Atualizado! ✨',
    settings_backup_key: 'Backup da Chave',
    settings_delete_cloud: 'Excluir Conta',
    settings_tab_profile: 'Perfil',
    settings_tab_categories: 'Categorias',
    settings_tab_security: 'Segurança',
    settings_tab_backup: 'Backup',
    settings_feedback_title: 'Feedback',
    settings_privacy_policy: 'Política de Privacidade',

    // Modals & General
    modal_close: 'Fechar',
    modal_confirm: 'Confirmar',
    modal_cancel: 'Cancelar',
    modal_save: 'Salvar',
    guest_banner: 'Modo Offline',
    guest_banner_text: 'Dados salvos no aparelho',
    guest_login_btn: 'Entrar',
  },

  'en-US': {
    // Navigation
    nav_home: 'Home',
    nav_vaults: 'Vaults',
    nav_pay: 'Pay',
    nav_analytics: 'Insights',
    nav_activity: 'Activity',
    nav_settings: 'Settings',

    // Header & Connectivity
    header_online: 'LIVE',
    header_offline: 'OFF',
    header_share: 'Share',
    header_logout: 'Logout',
    header_settings_title: 'Settings',
    header_greeting: 'Hey',

    // Hero Balance Card
    balance_total: 'TOTAL BALANCE',
    balance_available: 'AVAILABLE TO SPEND',
    balance_locked_vaults: 'LOCKED IN VAULTS',
    balance_hide: 'Hide balance',
    balance_show: 'Show balance',
    balance_rate_label: 'USDC Rate',
    balance_syncing: 'Syncing...',
    balance_copy_address: 'Copy Address',
    balance_copied_address: 'Copied!',
    balance_7d_delta: '7 days',
    balance_in_vaults: 'Vaults:',
    balance_no_wallet: 'Offline',

    // Quick Actions
    action_pay: 'Pay',
    action_pay_sub: 'Scan',
    action_receive: 'Receive',
    action_receive_sub: 'QR Code',
    action_new_vault: 'New Vault',
    action_new_vault_sub: 'Goals',
    action_extract: 'Activity',
    action_extract_sub: 'History',

    // Daily Budget
    budget_title: 'Daily Budget',
    budget_spent_today: 'Today',
    budget_limit: 'Cap:',
    budget_remaining: 'Left:',
    budget_exceeded: 'Over by:',
    budget_no_limit: 'Set cap',
    budget_set_limit: 'Set Cap',
    budget_adjust_limit: 'Adjust',
    budget_optional: 'Optional',
    budget_sub_has: 'Daily limit',
    budget_sub_none: 'Set cap',

    // Vaults Screen
    vaults_header_badge: 'Vaults',
    vaults_active_title: 'Active Vaults',
    vaults_empty_active: 'No active vaults',
    vaults_empty_desc: 'Create targets to save funds.',
    vaults_completed_title: 'Completed Goals',
    vaults_completed_badge: 'completed! 🚀',
    vaults_create_modal_title: 'New Vault 🎯',
    vaults_btn_deposit: 'Deposit',
    vaults_btn_withdraw: 'Unlock',
    vaults_target: 'Goal:',
    vaults_remaining_prefix: 'Remaining',
    vaults_completed_pct: 'Done',
    vaults_see_all: 'See all',
    vaults_new_btn: 'New',

    // Transactions / Ledger Screen
    tx_title_extrato: 'Activity',
    tx_title_analytics: 'Insights',
    tx_title_onchain: 'On-Chain',
    tx_sub_extrato: 'History',
    tx_sub_analytics: 'Categories',
    tx_sub_onchain: 'Base L2',
    tx_search_placeholder: 'Search...',
    tx_tab_organized: 'Activity',
    tx_tab_analytics: 'Insights',
    tx_tab_ledger: 'On-Chain',
    tx_period_day: 'Day',
    tx_period_week: 'Week',
    tx_period_month: 'Month',
    tx_period_year: 'Year',
    tx_period_all: 'All',
    tx_sum_incomes: 'Inflow',
    tx_sum_expenses: 'Outflow',
    tx_sum_net: 'Net Total',
    tx_sum_saved: 'Locked',
    tx_sum_withdrawn: 'Unlocked',
    tx_sum_retained: 'Retained',
    tx_filter_all: 'All',
    tx_filter_expense: 'Outflows',
    tx_filter_income: 'Inflows',
    tx_filter_vault: 'Vaults',
    tx_filter_unorganized: 'Uncategorized',
    tx_empty_title: 'No activity in this period',
    tx_empty_desc: 'Add a transaction or receive USDC.',
    tx_btn_add: '+ Add',
    tx_detail_title: 'Details',

    // Analytics Screen
    analytics_timeframe_month: 'This Month',
    analytics_timeframe_year: 'This Year',
    analytics_tab_expenses: 'Expenses',
    analytics_tab_income: 'Incomes',
    analytics_tab_all: 'Overview',
    analytics_summary_expenses: 'Expenses',
    analytics_summary_income: 'Income',
    analytics_summary_balance: 'Balance',
    analytics_chart_title: 'Trend',
    analytics_category_breakdown: 'Categories',
    analytics_btn_rayx: '⚡ X-Ray',
    analytics_empty: 'Not enough data for charts.',

    // Settings / Profile
    settings_title: 'Settings',
    settings_language: 'Language',
    settings_currency: 'Currency',
    settings_profile_name: 'Name',
    settings_haptics: 'Vibration',
    settings_haptics_desc: 'Vibration on tap',
    settings_save_profile: 'Save',
    settings_saved_feedback: 'Profile Updated! ✨',
    settings_backup_key: 'Backup Key',
    settings_delete_cloud: 'Delete Account',
    settings_tab_profile: 'Profile',
    settings_tab_categories: 'Tags',
    settings_tab_security: 'Security',
    settings_tab_backup: 'Backup',
    settings_feedback_title: 'Feedback',
    settings_privacy_policy: 'Privacy Policy',

    // Modals & General
    modal_close: 'Close',
    modal_confirm: 'Confirm',
    modal_cancel: 'Cancel',
    modal_save: 'Save',
    guest_banner: 'Offline Mode',
    guest_banner_text: 'Data stored locally on device',
    guest_login_btn: 'Sign In',
  },
} as const;

export type TranslationKey = keyof typeof DICTIONARY['pt-BR'];

let currentLanguage: AppLanguage = detectInitialLanguage();
const languageSubscribers = new Set<(lang: AppLanguage) => void>();

export class I18nService {
  public static getLanguage(): AppLanguage {
    return currentLanguage;
  }

  public static syncDocumentHtml(lang: AppLanguage = currentLanguage): void {
    if (typeof document === 'undefined') return;
    const isEn = lang === 'en-US';
    
    // Dynamically update <html lang="..."> attribute for screen readers, browsers and PWAs
    document.documentElement.lang = isEn ? 'en' : 'pt-BR';

    // Dynamically update document title
    document.title = isEn 
      ? 'CofreAdmin — Self-Custodial Web3 Personal Finance' 
      : 'CofreAdmin — Carteira Digital Web3 & Gerenciador Financeiro';

    // Dynamically update SEO meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        isEn
          ? 'Self-custodial Web3 personal finance manager and digital wallet on Base. Send and receive payments, track expenses, and save in crypto vaults.'
          : 'Carteira digital Web3 & Gerenciador financeiro autocustodial na Base. Envie e receba pagamentos, organize gastos e poupe em cofres cripto.'
      );
    }
  }

  public static setLanguage(lang: AppLanguage): void {
    if (lang !== currentLanguage) {
      currentLanguage = lang;
      try {
        localStorage.setItem(STORAGE_LANG_KEY, lang);
      } catch {}

      // Immediately sync document element lang, title and description
      I18nService.syncDocumentHtml(lang);

      languageSubscribers.forEach((cb) => {
        try {
          cb(lang);
        } catch {}
      });
    }
  }

  public static subscribe(cb: (lang: AppLanguage) => void): () => void {
    languageSubscribers.add(cb);
    return () => {
      languageSubscribers.delete(cb);
    };
  }

  public static t(key: TranslationKey, customLang?: AppLanguage): string {
    const lang = customLang || currentLanguage;
    const table = DICTIONARY[lang] || DICTIONARY['pt-BR'];
    return (table as any)[key] || DICTIONARY['pt-BR'][key] || key;
  }
}

// Initial synchronization on client startup
if (typeof document !== 'undefined') {
  I18nService.syncDocumentHtml(currentLanguage);
}

export { useI18n } from '../hooks/useI18n';

