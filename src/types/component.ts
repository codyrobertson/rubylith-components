export enum ComponentType {
  BUTTON = 'button',
  INPUT = 'input',
  CARD = 'card',
  MODAL = 'modal',
  FORM = 'form',
  LAYOUT = 'layout',
  NAVIGATION = 'navigation',
  DATA_DISPLAY = 'data-display',
  FEEDBACK = 'feedback',
  OTHER = 'other'
}

export enum ComponentLifecycle {
  ALPHA = 'alpha',
  BETA = 'beta',
  STABLE = 'stable',
  DEPRECATED = 'deprecated'
}

export interface Component {
  id: string;
  name: string;
  version: string;
  type: ComponentType;
  lifecycle: ComponentLifecycle;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  contractId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComponentCreateRequest {
  name: string;
  version: string;
  type: ComponentType;
  lifecycle: ComponentLifecycle;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  contractId?: string;
  metadata?: Record<string, any>;
}