/**
 * Excel Export Utility Functions
 */

/**
 * Download Excel file with multiple sheets
 * Uses xlsx library to create proper Excel files with multiple sheets
 */
export function downloadExcel(sheets: { name: string; data: Record<string, any>[] }[], filename: string): void {
  // Dynamic import to avoid SSR issues
  import('xlsx').then((XLSX) => {
    try {
      const workbook = XLSX.utils.book_new();

      // Create a worksheet for each sheet
      sheets.forEach((sheet) => {
        if (sheet.data.length === 0) {
          // Skip empty sheets or create a placeholder
          return;
        }

        // Convert array of objects to worksheet
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      });

      // Write workbook and download
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Error creating Excel file:', error);
      alert('Failed to create Excel file. Please try again or contact support.');
    }
  }).catch((error) => {
    console.error('Error loading xlsx library:', error);
    alert('Excel export requires the xlsx package. Please install it: yarn add xlsx\n\nOr contact your administrator.');
  });
}

