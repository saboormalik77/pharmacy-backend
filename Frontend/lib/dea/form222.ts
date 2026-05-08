// DEA Form 222 Management System
import type { DEAForm222, DEAForm222LineItem, DEAForm41 } from './types';

// Re-export types for backward compatibility
export type { DEAForm222, DEAForm222LineItem, DEAForm41 };

export class DEAForm222Generator {
  private static readonly MAX_LINES = 10; // DEA Form 222 has max 10 lines

  static generateForm(
    registrant: any,
    items: any[]
  ): DEAForm222[] {
    const forms: DEAForm222[] = [];
    const chunks = this.chunkItems(items, this.MAX_LINES);

    chunks.forEach((chunk, index) => {
      const form: DEAForm222 = {
        formNumber: this.generateFormNumber(registrant.deaNumber, index),
        registrantInfo: {
          name: registrant.businessName,
          deaNumber: registrant.deaNumber,
          address: registrant.addresses.registered.street,
          city: registrant.addresses.registered.city,
          state: registrant.addresses.registered.state,
          zip: registrant.addresses.registered.zip,
        },
        lineItems: chunk.map((item, lineIndex) => ({
          lineNumber: lineIndex + 1,
          numberOfPackages: item.quantity,
          sizeOfPackage: item.packageSize?.toString() || '100',
          ndc: item.ndc,
          nameOfItem: `${item.nonProprietaryName || item.productName} ${item.strength} ${item.dosageForm}`,
          dateReceived: undefined,
          packagesReceived: undefined,
        })),
        totalLines: chunk.length,
        dateExecuted: new Date(),
        signature: undefined,
        status: 'DRAFT',
      };

      forms.push(form);
    });

    return forms;
  }

  private static chunkItems<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  private static generateFormNumber(deaNumber: string, index: number): string {
    const timestamp = Date.now();
    return `${deaNumber}-${timestamp}-${index + 1}`;
  }

  static validateForm(form: DEAForm222): string[] {
    const errors: string[] = [];

    if (!form.registrantInfo.deaNumber) {
      errors.push('DEA number is required');
    }

    // Validate DEA number format (2 letters + 7 digits)
    const deaPattern = /^[A-Z]{2}\d{7}$/;
    if (!deaPattern.test(form.registrantInfo.deaNumber)) {
      errors.push('Invalid DEA number format (should be 2 letters + 7 digits)');
    }

    if (form.lineItems.length === 0) {
      errors.push('At least one line item is required');
    }

    if (form.lineItems.length > this.MAX_LINES) {
      errors.push(`Maximum ${this.MAX_LINES} line items per form`);
    }

    form.lineItems.forEach((item, index) => {
      if (!item.ndc) {
        errors.push(`Line ${index + 1}: NDC is required`);
      }
      if (!item.nameOfItem) {
        errors.push(`Line ${index + 1}: Item name is required`);
      }
      if (item.numberOfPackages <= 0) {
        errors.push(`Line ${index + 1}: Quantity must be greater than 0`);
      }
    });

    return errors;
  }

  static exportToPDF(form: DEAForm222): Blob {
    // In production, this would use a PDF library like jsPDF or pdfmake
    // For now, return a placeholder
    const content = `
      DEA Form 222
      Form Number: ${form.formNumber}

      Registrant Information:
      Name: ${form.registrantInfo.name}
      DEA Number: ${form.registrantInfo.deaNumber}
      Address: ${form.registrantInfo.address}
      City: ${form.registrantInfo.city}, ${form.registrantInfo.state} ${form.registrantInfo.zip}

      Line Items:
      ${form.lineItems.map((item) => `
        Line ${item.lineNumber}: ${item.nameOfItem}
        NDC: ${item.ndc}
        Packages: ${item.numberOfPackages} x ${item.sizeOfPackage}
      `).join('\n')}

      Date Executed: ${form.dateExecuted.toLocaleDateString()}
    `;

    return new Blob([content], { type: 'application/pdf' });
  }
}

export class DEAForm41Generator {
  static generateForm(data: {
    registrantInfo: any;
    substancesDestroyed: any[];
    methodOfDestruction: string;
    dateOfDestruction: Date;
    location: string;
    witnesses: any[];
    notes?: string;
  }): DEAForm41 {
    return {
      id: `DEA41-${Date.now()}`,
      registrantInfo: data.registrantInfo,
      substancesDestroyed: data.substancesDestroyed,
      methodOfDestruction: data.methodOfDestruction as any,
      dateOfDestruction: data.dateOfDestruction,
      location: data.location,
      witnesses: data.witnesses,
      notes: data.notes,
    };
  }

  static validateForm(form: DEAForm41): string[] {
    const errors: string[] = [];

    if (!form.registrantInfo.deaNumber) {
      errors.push('DEA number is required');
    }

    if (form.substancesDestroyed.length === 0) {
      errors.push('At least one substance must be listed for destruction');
    }

    if (form.witnesses.length < 2) {
      errors.push('At least two witnesses are required for controlled substance destruction');
    }

    if (!form.methodOfDestruction) {
      errors.push('Method of destruction is required');
    }

    return errors;
  }

  static exportToPDF(form: DEAForm41): Blob {
    // In production, would use a PDF library
    const content = `
      DEA Form 41
      Registrants Inventory of Drugs Surrendered

      Registrant: ${form.registrantInfo.name}
      DEA Number: ${form.registrantInfo.deaNumber}

      Substances Destroyed:
      ${form.substancesDestroyed.map((item) => `
        ${item.name} ${item.strength}
        NDC: ${item.ndc} | Lot: ${item.lotNumber}
        Schedule: ${item.deaSchedule} | Quantity: ${item.quantity}
      `).join('\n')}

      Method of Destruction: ${form.methodOfDestruction}
      Date: ${form.dateOfDestruction.toLocaleDateString()}
      Location: ${form.location}

      Witnesses:
      ${form.witnesses.map((w) => `${w.name} - ${w.title}`).join('\n')}

      ${form.notes ? `Notes: ${form.notes}` : ''}
    `;

    return new Blob([content], { type: 'application/pdf' });
  }
}
