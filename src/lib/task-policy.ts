export type PolicyClassification = 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';

export interface TaskCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  policy: PolicyClassification;
  requiresIdVerification: boolean;
  maxRewardCents: number;
  safetyGuidelines: string;
}

export const TASK_CATEGORIES: TaskCategory[] = [
  {
    id: 'package-transport',
    name: 'Package Transport',
    description: 'Peer-to-peer parcel carry between neighborhoods (e.g. Kadıköy to Beşiktaş).',
    icon: 'Package',
    policy: 'ALLOWED',
    requiresIdVerification: false,
    maxRewardCents: 50000,
    safetyGuidelines: 'Mandatory open package inspection. Contents must be visible and verified before transit.',
  },
  {
    id: 'grocery-pickup',
    name: 'Grocery Pickup',
    description: 'Picking up groceries, market goods, or daily staples from local stores.',
    icon: 'ShoppingBag',
    policy: 'ALLOWED',
    requiresIdVerification: false,
    maxRewardCents: 40000,
    safetyGuidelines: 'Store receipt must accompany pickup. Store receipt verification required.',
  },
  {
    id: 'product-pickup',
    name: 'Local Store Pickup',
    description: 'Picking up an item or order from a nearby local merchant or artisan.',
    icon: 'Store',
    policy: 'ALLOWED',
    requiresIdVerification: false,
    maxRewardCents: 45000,
    safetyGuidelines: 'Pickups must occur at official merchant store counters in public business hours.',
  },
  {
    id: 'pet-care',
    name: 'Pet Transport & Walk',
    description: 'Accompanying or transporting domestic pets to veterinary clinics or parks.',
    icon: 'HeartHandshake',
    policy: 'RESTRICTED',
    requiresIdVerification: true,
    maxRewardCents: 60000,
    safetyGuidelines: 'Requires carrier bag or leash. Medical notes or vet contact required.',
  },
  {
    id: 'item-return',
    name: 'Item Return & Drop-off',
    description: 'Returning a borrowed library book, store return, or dropping off dry cleaning.',
    icon: 'RotateCcw',
    policy: 'ALLOWED',
    requiresIdVerification: false,
    maxRewardCents: 35000,
    safetyGuidelines: 'Provide return slip or order barcode directly via in-app instructions.',
  },
  {
    id: 'traveler-carry',
    name: 'Traveler Carry-Along',
    description: 'Carry a lightweight item along a route you are already traveling (e.g. Ferry or Marmaray).',
    icon: 'Compass',
    policy: 'ALLOWED',
    requiresIdVerification: false,
    maxRewardCents: 50000,
    safetyGuidelines: 'Must meet in public transit hubs (e.g. ferry pier, metro station concourse).',
  },
  {
    id: 'local-favor',
    name: 'Neighborhood Favor',
    description: 'Small community assist: plant watering in shared garden, tool lending, community task.',
    icon: 'Users',
    policy: 'ALLOWED',
    requiresIdVerification: false,
    maxRewardCents: 30000,
    safetyGuidelines: 'Strictly prohibited from requiring solo entry into private locked residences.',
  },
  {
    id: 'key-holding',
    name: 'Physical Key Holding',
    description: 'Holding physical house or apartment keys for strangers.',
    icon: 'Key',
    policy: 'PROHIBITED',
    requiresIdVerification: true,
    maxRewardCents: 0,
    safetyGuidelines: 'Prohibited by safety architecture due to lock cylinder decoding & burglary reconnaissance risks.',
  },
];

// Deterministic prohibited keywords dictionary (evaluated BEFORE AI moderation)
export const PROHIBITED_KEYWORDS = [
  'silah', 'gun', 'weapon', 'tabanca', 'mermi', 'bıçak',
  'uyuşturucu', 'drug', 'narcotic', 'ot', 'marijuana', 'weed', 'kokain', 'esrar', 'hap', 'substance',
  'anahtar teslim', 'hold my key', 'anahtarımı tut', 'anahtar sakla',
  'evime gir', 'enter my bedroom', 'enter residence', 'içeri gir', 'kapıyı aç',
  'mühürlü kutu açma', 'do not open', 'açma', 'sakın açma', 'unopened sealed box', 'uninspected',
  'nakit para taşı', 'cash delivery', 'elden para', 'kara para',
  'reçeteli ilaç', 'prescription medication', 'regulated medical',
  'çocuk bakımı', 'babysit', 'child care', // requires specialized regulated licenses
  'şifre', 'password', 'kredi kartı', 'bank card', 'credit card pin',
];

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  flaggedKeywords: string[];
}

/**
 * Deterministic policy evaluator:
 * Guarantees that forbidden requests cannot bypass safety filters even if an LLM is deceived.
 */
export function evaluateTaskPolicy(
  categoryId: string,
  title: string,
  description: string
): PolicyEvaluationResult {
  const category = TASK_CATEGORIES.find(c => c.id === categoryId);
  if (!category) {
    return {
      allowed: false,
      reason: 'Unknown or unapproved task category.',
      flaggedKeywords: [],
    };
  }

  if (category.policy === 'PROHIBITED') {
    return {
      allowed: false,
      reason: `Category "${category.name}" is strictly prohibited by neighborhood safety policy (${category.safetyGuidelines}).`,
      flaggedKeywords: [category.id],
    };
  }

  const combinedText = `${title} ${description}`.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const kw of PROHIBITED_KEYWORDS) {
    if (combinedText.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  if (matchedKeywords.length > 0) {
    return {
      allowed: false,
      reason: `Request contains prohibited or high-risk content: [${matchedKeywords.join(', ')}]. Community guidelines forbid transporting sealed/uninspected goods, keys, weapons, prescription drugs, or in-home private residence entry.`,
      flaggedKeywords: matchedKeywords,
    };
  }

  return {
    allowed: true,
    flaggedKeywords: [],
  };
}
