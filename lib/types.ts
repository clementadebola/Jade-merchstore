export type PrintifyImage = {
  src?: string;
  is_default?: boolean;
  variant_ids?: number[];
  position?: string;
};

export type PrintifyOptionValue = {
  id: number;
  title: string;
  colors?: string[];
};

export type PrintifyOption = {
  name: string;
  type?: string;
  values?: PrintifyOptionValue[];
};

export type PrintifyVariant = {
  id: number;
  title: string;
  price: number;
  cost?: number;
  is_enabled: boolean;
  is_available?: boolean;
  is_default?: boolean;
  options?: number[];
};

export type PrintifyProduct = {
  id: string;
  title: string;
  description?: string;
  images?: PrintifyImage[];
  options?: PrintifyOption[];
  variants?: PrintifyVariant[];
  tags?: string[];
  visible?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type StoreVariant = {
  id: number;
  title: string;
  retailPriceCents: number;
  printifyCostCents: number | null;
  enabled: boolean;
  available: boolean;
  isDefault: boolean;
  optionValues: Record<string, string>;
};

export type StoreProduct = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  images: PrintifyImage[];
  variants: StoreVariant[];
  options: PrintifyOption[];
  tags: string[];
};
