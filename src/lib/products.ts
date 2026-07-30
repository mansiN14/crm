import type { ProductType } from './supabase';

export type ProductCatalogItem = {
  key: ProductType;
  label: string;
  description: string;
  highlights: string[];
};

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  {
    key: 'career_counselling',
    label: 'Career Counselling',
    description: 'Guided support for interests, strengths, and career direction.',
    highlights: ['Interest mapping', 'Strength analysis', 'Career pathway planning'],
  },
  {
    key: 'mentoring',
    label: 'Mentoring',
    description: 'Personalized mentoring for academic and career growth.',
    highlights: ['Mentor allocation', 'Goal tracking', 'Progress reviews'],
  },
  {
    key: 'college_admissions',
    label: 'College Admission',
    description: 'End-to-end admissions support for college and university applications.',
    highlights: ['Course selection', 'Application support', 'Intake planning'],
  },
  {
    key: 'psychometric_test',
    label: 'Psychometric Test',
    description: 'Assessment-driven insight into aptitude, personality, and fit.',
    highlights: ['Test scheduling', 'Result tracking', 'Report generation'],
  },
];

export const PRODUCT_LABELS: Record<ProductType, string> = PRODUCT_CATALOG.reduce(
  (labels, product) => {
    labels[product.key] = product.label;
    return labels;
  },
  {} as Record<ProductType, string>
);

export const getProductLabel = (productType: ProductType) => PRODUCT_LABELS[productType];
