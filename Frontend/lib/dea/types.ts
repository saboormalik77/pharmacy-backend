// DEA Form Types - Type-only exports for client components
export interface DEAForm222 {
  formNumber: string;
  registrantInfo: {
    name: string;
    deaNumber: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  lineItems: DEAForm222LineItem[];
  totalLines: number;
  dateExecuted: Date;
  signature?: string;
  powerOfAttorney?: {
    name: string;
    title: string;
    dateGranted: Date;
  };
  status: 'DRAFT' | 'PENDING' | 'SUBMITTED' | 'COMPLETED';
  pdfUrl?: string;
}

export interface DEAForm222LineItem {
  lineNumber: number;
  numberOfPackages: number;
  sizeOfPackage: string;
  ndc: string;
  nameOfItem: string;
  dateReceived?: Date;
  packagesReceived?: number;
}

export interface DEAForm41 {
  id: string;
  registrantInfo: {
    name: string;
    deaNumber: string;
    address: string;
  };
  substancesDestroyed: {
    ndc: string;
    name: string;
    strength: string;
    quantity: number;
    deaSchedule: string;
    lotNumber: string;
  }[];
  methodOfDestruction: 'INCINERATION' | 'CHEMICAL' | 'OTHER';
  dateOfDestruction: Date;
  location: string;
  witnesses: {
    name: string;
    title: string;
    signature?: string;
  }[];
  notes?: string;
  certificateUrl?: string;
}

