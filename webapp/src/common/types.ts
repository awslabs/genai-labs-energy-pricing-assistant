export interface NavigationPanelState {
  collapsed?: boolean;
  collapsedSections?: Record<number, boolean>;
}

export interface UserState {
  email: string;
  alias: string;
  name: string;
  idToken: string;
}

type ConsentCookie = {
  advertising: boolean;
  essential: boolean;
  functional: boolean;
  performance: boolean;
};

export interface CookieConsent {
  checkForCookieConsent: () => void;
  getConsentCookie: () => ConsentCookie;
}