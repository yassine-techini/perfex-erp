/**
 * Language Context
 * Provides i18n support for FR, AR, EN
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'ar' | 'en';

interface Translations {
  [key: string]: string | Translations;
}

// French translations (default)
const fr: Translations = {
  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    add: 'Ajouter',
    search: 'Rechercher',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    confirm: 'Confirmer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    close: 'Fermer',
    yes: 'Oui',
    no: 'Non',
    actions: 'Actions',
    status: 'Statut',
    date: 'Date',
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    address: 'Adresse',
    description: 'Description',
    amount: 'Montant',
    total: 'Total',
    settings: 'Paramètres',
    language: 'Langue',
  },
  auth: {
    login: 'Connexion',
    logout: 'Déconnexion',
    register: 'Inscription',
    email: 'Adresse email',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    rememberMe: 'Se souvenir de moi',
    noAccount: "Vous n'avez pas de compte ?",
    hasAccount: 'Vous avez déjà un compte ?',
    signUp: "S'inscrire",
    signIn: 'Se connecter',
  },
  profile: {
    title: 'Mon Profil',
    subtitle: 'Gérez vos informations personnelles',
    personalInfo: 'Informations personnelles',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Adresse email',
    avatar: 'Photo de profil',
    avatarUrl: 'URL de la photo',
    changePassword: 'Changer le mot de passe',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    preferences: 'Préférences',
    language: 'Langue',
    theme: 'Thème',
    notifications: 'Notifications',
    updateSuccess: 'Profil mis à jour avec succès',
    updateError: 'Erreur lors de la mise à jour du profil',
  },
  nav: {
    dashboard: 'Tableau de bord',
    finance: 'Finance',
    crm: 'CRM',
    projects: 'Projets',
    inventory: 'Inventaire',
    hr: 'Ressources Humaines',
    procurement: 'Achats',
    sales: 'Ventes',
    manufacturing: 'Production',
    assets: 'Immobilisations',
    workflows: 'Automatisations',
    integrations: 'Intégrations',
    help: 'Aide',
    settings: 'Paramètres',
  },
  languages: {
    fr: 'Français',
    en: 'English',
    ar: 'العربية',
  },
};

// English translations
const en: Translations = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    description: 'Description',
    amount: 'Amount',
    total: 'Total',
    settings: 'Settings',
    language: 'Language',
  },
  auth: {
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    email: 'Email address',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    rememberMe: 'Remember me',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    signUp: 'Sign up',
    signIn: 'Sign in',
  },
  profile: {
    title: 'My Profile',
    subtitle: 'Manage your personal information',
    personalInfo: 'Personal Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    avatar: 'Profile Picture',
    avatarUrl: 'Picture URL',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    preferences: 'Preferences',
    language: 'Language',
    theme: 'Theme',
    notifications: 'Notifications',
    updateSuccess: 'Profile updated successfully',
    updateError: 'Error updating profile',
  },
  nav: {
    dashboard: 'Dashboard',
    finance: 'Finance',
    crm: 'CRM',
    projects: 'Projects',
    inventory: 'Inventory',
    hr: 'Human Resources',
    procurement: 'Procurement',
    sales: 'Sales',
    manufacturing: 'Manufacturing',
    assets: 'Assets',
    workflows: 'Workflows',
    integrations: 'Integrations',
    help: 'Help',
    settings: 'Settings',
  },
  languages: {
    fr: 'Français',
    en: 'English',
    ar: 'العربية',
  },
};

// Arabic translations
const ar: Translations = {
  common: {
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجاح',
    confirm: 'تأكيد',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    close: 'إغلاق',
    yes: 'نعم',
    no: 'لا',
    actions: 'الإجراءات',
    status: 'الحالة',
    date: 'التاريخ',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    address: 'العنوان',
    description: 'الوصف',
    amount: 'المبلغ',
    total: 'المجموع',
    settings: 'الإعدادات',
    language: 'اللغة',
  },
  auth: {
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    register: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    rememberMe: 'تذكرني',
    noAccount: 'ليس لديك حساب؟',
    hasAccount: 'لديك حساب بالفعل؟',
    signUp: 'إنشاء حساب',
    signIn: 'تسجيل الدخول',
  },
  profile: {
    title: 'ملفي الشخصي',
    subtitle: 'إدارة معلوماتك الشخصية',
    personalInfo: 'المعلومات الشخصية',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني',
    avatar: 'صورة الملف الشخصي',
    avatarUrl: 'رابط الصورة',
    changePassword: 'تغيير كلمة المرور',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    preferences: 'التفضيلات',
    language: 'اللغة',
    theme: 'السمة',
    notifications: 'الإشعارات',
    updateSuccess: 'تم تحديث الملف الشخصي بنجاح',
    updateError: 'خطأ في تحديث الملف الشخصي',
  },
  nav: {
    dashboard: 'لوحة التحكم',
    finance: 'المالية',
    crm: 'إدارة العملاء',
    projects: 'المشاريع',
    inventory: 'المخزون',
    hr: 'الموارد البشرية',
    procurement: 'المشتريات',
    sales: 'المبيعات',
    manufacturing: 'الإنتاج',
    assets: 'الأصول',
    workflows: 'الأتمتة',
    integrations: 'التكاملات',
    help: 'المساعدة',
    settings: 'الإعدادات',
  },
  languages: {
    fr: 'Français',
    en: 'English',
    ar: 'العربية',
  },
};

const translations: Record<Language, Translations> = { fr, en, ar };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved && ['fr', 'ar', 'en'].includes(saved) ? saved : 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    // Update HTML attributes for RTL support
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  // Set initial direction on mount
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Translation function with nested key support (e.g., "profile.title")
  const t = (key: string): string => {
    const keys = key.split('.');
    let result: Translations | string = translations[language];

    for (const k of keys) {
      if (typeof result === 'object' && result !== null && k in result) {
        result = result[k];
      } else {
        // Fallback to French if key not found
        let fallback: Translations | string = translations.fr;
        for (const fk of keys) {
          if (typeof fallback === 'object' && fallback !== null && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return key; // Return key if not found in fallback either
          }
        }
        return typeof fallback === 'string' ? fallback : key;
      }
    }

    return typeof result === 'string' ? result : key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
