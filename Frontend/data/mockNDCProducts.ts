// Mock NDC Product Database with real pharmaceutical data
export interface NDCProduct {
  ndc: string;
  labelerCode: string;
  productCode: string;
  packageCode: string;
  proprietaryName?: string;
  nonProprietaryName: string;
  dosageForm: string;
  strength: string;
  routeOfAdministration: string[];
  deaSchedule?: 'CI' | 'CII' | 'CIII' | 'CIV' | 'CV';
  rxRequired: boolean;
  labelerName: string;
  manufacturerName: string;
  packageDescription: string;
  packageSize: number;
  packageUnit: string;
  wac: number;
  awp: number;
  returnEligibility: {
    eligible: boolean;
    returnWindow: number;
    creditPercentage: number;
    destructionRequired: boolean;
    requiresDEAForm: boolean;
    requiresWitnessDestruction: boolean;
    hazardousWaste: boolean;
  };
}

export const mockNDCProducts: NDCProduct[] = [
  // Over-the-Counter Medications
  {
    ndc: '69618-010-01',
    labelerCode: '69618',
    productCode: '010',
    packageCode: '01',
    proprietaryName: 'Tylenol',
    nonProprietaryName: 'acetaminophen',
    dosageForm: 'TABLET',
    strength: '325 mg',
    routeOfAdministration: ['ORAL'],
    rxRequired: false,
    labelerName: 'McNeil Consumer Healthcare',
    manufacturerName: 'McNeil Consumer Healthcare',
    packageDescription: '100 TABLET in 1 BOTTLE',
    packageSize: 100,
    packageUnit: 'TABLET',
    wac: 0.12,
    awp: 0.15,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 85,
      destructionRequired: false,
      requiresDEAForm: false,
      requiresWitnessDestruction: false,
      hazardousWaste: false,
    },
  },
  {
    ndc: '00573-0201-30',
    labelerCode: '00573',
    productCode: '0201',
    packageCode: '30',
    proprietaryName: 'Advil',
    nonProprietaryName: 'ibuprofen',
    dosageForm: 'TABLET, FILM COATED',
    strength: '200 mg',
    routeOfAdministration: ['ORAL'],
    rxRequired: false,
    labelerName: 'Pfizer Consumer Healthcare',
    manufacturerName: 'Pfizer',
    packageDescription: '30 TABLET, FILM COATED in 1 BOTTLE',
    packageSize: 30,
    packageUnit: 'TABLET',
    wac: 0.18,
    awp: 0.22,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 85,
      destructionRequired: false,
      requiresDEAForm: false,
      requiresWitnessDestruction: false,
      hazardousWaste: false,
    },
  },
  // Common Prescription Medications
  {
    ndc: '00093-2263-01',
    labelerCode: '00093',
    productCode: '2263',
    packageCode: '01',
    nonProprietaryName: 'amoxicillin',
    dosageForm: 'CAPSULE',
    strength: '500 mg',
    routeOfAdministration: ['ORAL'],
    rxRequired: true,
    labelerName: 'Teva Pharmaceuticals USA',
    manufacturerName: 'Teva',
    packageDescription: '100 CAPSULE in 1 BOTTLE',
    packageSize: 100,
    packageUnit: 'CAPSULE',
    wac: 0.25,
    awp: 0.35,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 100,
      destructionRequired: false,
      requiresDEAForm: false,
      requiresWitnessDestruction: false,
      hazardousWaste: false,
    },
  },
  {
    ndc: '00006-0019-58',
    labelerCode: '00006',
    productCode: '0019',
    packageCode: '58',
    proprietaryName: 'Prinivil',
    nonProprietaryName: 'lisinopril',
    dosageForm: 'TABLET',
    strength: '10 mg',
    routeOfAdministration: ['ORAL'],
    rxRequired: true,
    labelerName: 'Merck Sharp & Dohme',
    manufacturerName: 'Merck',
    packageDescription: '90 TABLET in 1 BOTTLE',
    packageSize: 90,
    packageUnit: 'TABLET',
    wac: 0.28,
    awp: 0.40,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 100,
      destructionRequired: false,
      requiresDEAForm: false,
      requiresWitnessDestruction: false,
      hazardousWaste: false,
    },
  },
  {
    ndc: '00093-7214-01',
    labelerCode: '00093',
    productCode: '7214',
    packageCode: '01',
    nonProprietaryName: 'metformin hydrochloride',
    dosageForm: 'TABLET',
    strength: '500 mg',
    routeOfAdministration: ['ORAL'],
    rxRequired: true,
    labelerName: 'Teva Pharmaceuticals USA',
    manufacturerName: 'Teva',
    packageDescription: '100 TABLET in 1 BOTTLE',
    packageSize: 100,
    packageUnit: 'TABLET',
    wac: 0.15,
    awp: 0.22,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 100,
      destructionRequired: false,
      requiresDEAForm: false,
      requiresWitnessDestruction: false,
      hazardousWaste: false,
    },
  },
  {
    ndc: '00071-0156-23',
    labelerCode: '00071',
    productCode: '0156',
    packageCode: '23',
    proprietaryName: 'Lipitor',
    nonProprietaryName: 'atorvastatin calcium',
    dosageForm: 'TABLET, FILM COATED',
    strength: '20 mg',
    routeOfAdministration: ['ORAL'],
    rxRequired: true,
    labelerName: 'Parke-Davis Div of Pfizer Inc',
    manufacturerName: 'Pfizer',
    packageDescription: '90 TABLET, FILM COATED in 1 BOTTLE',
    packageSize: 90,
    packageUnit: 'TABLET',
    wac: 5.50,
    awp: 7.25,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 100,
      destructionRequired: false,
      requiresDEAForm: false,
      requiresWitnessDestruction: false,
      hazardousWaste: false,
    },
  },
  // Controlled Substances
  {
    ndc: '00009-0029-01',
    labelerCode: '00009',
    productCode: '0029',
    packageCode: '01',
    proprietaryName: 'Xanax',
    nonProprietaryName: 'alprazolam',
    dosageForm: 'TABLET',
    strength: '0.5 mg',
    routeOfAdministration: ['ORAL'],
    deaSchedule: 'CIV',
    rxRequired: true,
    labelerName: 'Pfizer Inc',
    manufacturerName: 'Pfizer',
    packageDescription: '100 TABLET in 1 BOTTLE',
    packageSize: 100,
    packageUnit: 'TABLET',
    wac: 1.20,
    awp: 1.75,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 0,
      destructionRequired: true,
      requiresDEAForm: false,
      requiresWitnessDestruction: true,
      hazardousWaste: false,
    },
  },
  {
    ndc: '00406-8530-01',
    labelerCode: '00406',
    productCode: '8530',
    packageCode: '01',
    nonProprietaryName: 'oxycodone hydrochloride',
    dosageForm: 'TABLET',
    strength: '5 mg',
    routeOfAdministration: ['ORAL'],
    deaSchedule: 'CII',
    rxRequired: true,
    labelerName: 'Mallinckrodt Inc',
    manufacturerName: 'Mallinckrodt',
    packageDescription: '100 TABLET in 1 BOTTLE',
    packageSize: 100,
    packageUnit: 'TABLET',
    wac: 2.50,
    awp: 3.50,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 0,
      destructionRequired: true,
      requiresDEAForm: true,
      requiresWitnessDestruction: true,
      hazardousWaste: false,
    },
  },
  {
    ndc: '00406-0125-01',
    labelerCode: '00406',
    productCode: '0125',
    packageCode: '01',
    proprietaryName: 'Hydrocodone/APAP',
    nonProprietaryName: 'hydrocodone bitartrate and acetaminophen',
    dosageForm: 'TABLET',
    strength: '5 mg/325 mg',
    routeOfAdministration: ['ORAL'],
    deaSchedule: 'CII',
    rxRequired: true,
    labelerName: 'Mallinckrodt Inc',
    manufacturerName: 'Mallinckrodt',
    packageDescription: '100 TABLET in 1 BOTTLE',
    packageSize: 100,
    packageUnit: 'TABLET',
    wac: 1.85,
    awp: 2.65,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 0,
      destructionRequired: true,
      requiresDEAForm: true,
      requiresWitnessDestruction: true,
      hazardousWaste: false,
    },
  },
  {
    ndc: '00555-0787-02',
    labelerCode: '00555',
    productCode: '0787',
    packageCode: '02',
    proprietaryName: 'Adderall XR',
    nonProprietaryName: 'dextroamphetamine saccharate, amphetamine aspartate, dextroamphetamine sulfate, and amphetamine sulfate',
    dosageForm: 'CAPSULE, EXTENDED RELEASE',
    strength: '20 mg',
    routeOfAdministration: ['ORAL'],
    deaSchedule: 'CII',
    rxRequired: true,
    labelerName: 'Barr Laboratories Inc',
    manufacturerName: 'Barr Labs',
    packageDescription: '100 CAPSULE, EXTENDED RELEASE in 1 BOTTLE',
    packageSize: 100,
    packageUnit: 'CAPSULE',
    wac: 4.20,
    awp: 5.85,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 0,
      destructionRequired: true,
      requiresDEAForm: true,
      requiresWitnessDestruction: true,
      hazardousWaste: false,
    },
  },
  // Additional Common Medications
  {
    ndc: '00113-0912-71',
    labelerCode: '00113',
    productCode: '0912',
    packageCode: '71',
    proprietaryName: 'Prilosec OTC',
    nonProprietaryName: 'omeprazole',
    dosageForm: 'TABLET, DELAYED RELEASE',
    strength: '20 mg',
    routeOfAdministration: ['ORAL'],
    rxRequired: false,
    labelerName: 'Procter & Gamble Manufacturing Company',
    manufacturerName: 'Procter & Gamble',
    packageDescription: '14 TABLET, DELAYED RELEASE in 1 BOTTLE',
    packageSize: 14,
    packageUnit: 'TABLET',
    wac: 0.95,
    awp: 1.35,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 85,
      destructionRequired: false,
      requiresDEAForm: false,
      requiresWitnessDestruction: false,
      hazardousWaste: false,
    },
  },
  {
    ndc: '00045-5010-30',
    labelerCode: '00045',
    productCode: '5010',
    packageCode: '30',
    proprietaryName: 'Claritin',
    nonProprietaryName: 'loratadine',
    dosageForm: 'TABLET',
    strength: '10 mg',
    routeOfAdministration: ['ORAL'],
    rxRequired: false,
    labelerName: 'Schering-Plough Healthcare Products',
    manufacturerName: 'Schering',
    packageDescription: '30 TABLET in 1 BOTTLE',
    packageSize: 30,
    packageUnit: 'TABLET',
    wac: 0.65,
    awp: 0.88,
    returnEligibility: {
      eligible: true,
      returnWindow: 180,
      creditPercentage: 85,
      destructionRequired: false,
      requiresDEAForm: false,
      requiresWitnessDestruction: false,
      hazardousWaste: false,
    },
  },
];

// Helper function to find product by NDC
export function findProductByNDC(ndc: string): NDCProduct | undefined {
  // Normalize NDC format
  const normalized = ndc.replace(/\D/g, '');
  return mockNDCProducts.find((product) => product.ndc.replace(/\D/g, '') === normalized);
}

// Helper function to format NDC
export function formatNDC(ndc: string): string {
  const digits = ndc.replace(/\D/g, '');

  if (digits.length === 10) {
    // Convert 10-digit to 11-digit format (5-4-2)
    return `0${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 10)}`;
  } else if (digits.length === 11) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9, 11)}`;
  }

  return ndc;
}

// Helper function to validate NDC format
export function isValidNDCFormat(ndc: string): boolean {
  // Check for 5-4-2, 4-4-2, or 5-3-2 formats
  const patterns = [
    /^\d{5}-\d{4}-\d{2}$/,
    /^\d{4}-\d{4}-\d{2}$/,
    /^\d{5}-\d{3}-\d{2}$/,
  ];
  return patterns.some((pattern) => pattern.test(ndc));
}
