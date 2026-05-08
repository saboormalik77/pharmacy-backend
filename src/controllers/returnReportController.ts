import { Request, Response, NextFunction } from 'express';
import { processReturnReport, saveReturnReport, getReturnReportsByDistributorAndNdc, transformToGraphFormat } from '../services/returnReportService';
import { createDocument, uploadFileToStorage } from '../services/documentsService';
import { findOrCreateReverseDistributor } from '../services/reverseDistributorsService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

const getPharmacyId = (req: Request): string => {
  return (req.body.pharmacy_id || req.query.pharmacy_id) as string;
};

export const processReturnReportHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new AppError('Please upload a PDF file', 400);
    }

    // Check if file is PDF
    if (req.file.mimetype !== 'application/pdf') {
      throw new AppError('Only PDF files are allowed', 400);
    }

    // Get pharmacy_id from request
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    // Get reverse_distributor_id from form data if provided
    const reverseDistributorId = req.body.reverse_distributor_id as string | undefined;

    // Process the PDF
    const pdfBuffer = req.file.buffer;
    const structuredData = await processReturnReport(pdfBuffer);

    // Find or create reverse distributor from processed data
    let distributorId = reverseDistributorId;
    
    // Use reverseDistributorInfo if available, otherwise fall back to reverseDistributor name
    const distributorName = structuredData.reverseDistributorInfo?.name || structuredData.reverseDistributor;
    
    if (!distributorId && distributorName) {
      try {
        console.log('🔍 Looking for reverse distributor:', distributorName);
        
        // Prepare distributor info for saving
        const distributorInfo = structuredData.reverseDistributorInfo || 
          (structuredData.reverseDistributor ? { name: structuredData.reverseDistributor } : undefined);
        
        // Add report date to distributor info for fee rate tracking
        if (distributorInfo && structuredData.reportDate) {
          distributorInfo.reportDate = structuredData.reportDate;
        }
        
        // Log what we're about to save
        if (distributorInfo) {
          console.log('📦 Distributor Info to Save:');
          console.log('   Name:', distributorInfo.name);
          console.log('   Email:', distributorInfo.contactEmail || 'Not provided');
          console.log('   Phone:', distributorInfo.contactPhone || 'Not provided');
          console.log('   Address:', distributorInfo.address ? JSON.stringify(distributorInfo.address) : 'Not provided');
          console.log('   Portal URL:', distributorInfo.portalUrl || 'Not provided');
          console.log('   Supported Formats:', distributorInfo.supportedFormats || 'Not provided');
          if (distributorInfo.serviceFee) {
            console.log('   💰 Service Fee:');
            console.log('      Percentage:', distributorInfo.serviceFee.percentage !== null && distributorInfo.serviceFee.percentage !== undefined ? `${distributorInfo.serviceFee.percentage}%` : 'Not provided');
            console.log('      Payment Period:', distributorInfo.serviceFee.paymentPeriodDays !== null && distributorInfo.serviceFee.paymentPeriodDays !== undefined ? `${distributorInfo.serviceFee.paymentPeriodDays} days` : 'Not provided');
          }
          console.log('   Report Date:', distributorInfo.reportDate || 'Not provided');
        }
        
        distributorId = await findOrCreateReverseDistributor(distributorName, distributorInfo);
        console.log('✅ Reverse distributor ID:', distributorId);
      } catch (error: any) {
        console.error('⚠️ Failed to find/create reverse distributor:', error.message);
        // Continue without distributor ID if it fails
      }
    }

    // Upload file to Supabase Storage
    let fileUrl: string | undefined;
    try {
      fileUrl = await uploadFileToStorage({
        fileBuffer: pdfBuffer,
        fileName: req.file.originalname || 'document.pdf',
        pharmacyId: pharmacyId,
        fileType: req.file.mimetype,
      });
      console.log('✅ File uploaded to Supabase Storage:', fileUrl);
    } catch (error: any) {
      console.error('⚠️ Failed to upload file to storage:', error.message);
      // Continue without file URL if upload fails
    }

    // Save document to database
    let savedDocument;
    try {
      savedDocument = await createDocument({
        pharmacy_id: pharmacyId,
        file_name: req.file.originalname || 'document.pdf',
        file_size: req.file.size,
        file_type: req.file.mimetype,
        file_url: fileUrl, // Include the file URL from Supabase Storage
        reverse_distributor_id: distributorId,
        source: 'manual_upload',
        extracted_items: structuredData.totalItems || structuredData.items?.length || 0,
        total_credit_amount: structuredData.totalCreditAmount || 0,
        report_date: structuredData.reportDate, // Save report date from extracted data
        status: 'completed',
      });
      console.log('✅ Document saved with distributor ID:', distributorId, 'and report date:', structuredData.reportDate);
    } catch (error: any) {
      console.error('Failed to save document to database:', error);
      // Still return the processed data even if saving fails
    }

    // Save return report data to database (one record per item)
    let savedReturnReports;
    if (savedDocument?.id) {
      try {
        savedReturnReports = await saveReturnReport({
          document_id: savedDocument.id,
          pharmacy_id: pharmacyId,
          data: structuredData,
        });
        console.log(`✅ Return report data saved: ${savedReturnReports.length} items stored as separate records`);
      } catch (error: any) {
        console.error('Failed to save return report data:', error);
        // Continue even if saving return report fails
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Return report processed successfully',
      data: structuredData,
      document: savedDocument, // Include saved document info
    });
  }
);

export const getReturnReportsByDistributorAndNdcHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const distributorId = req.query.distributor_id as string;
    const ndcCode = req.query.ndc_code as string;
    const pharmacyId = req.query.pharmacy_id as string | undefined;
    const type = req.query.type as 'full' | 'partial' | undefined;
    const format = req.query.format as string | undefined; // Optional: 'graph' or default

    if (!distributorId) {
      throw new AppError('distributor_id query parameter is required', 400);
    }

    if (!ndcCode) {
      throw new AppError('ndc_code query parameter is required', 400);
    }

    // Validate type parameter if provided
    if (type && type !== 'full' && type !== 'partial') {
      throw new AppError('type parameter must be either "full" or "partial"', 400);
    }

    const results = await getReturnReportsByDistributorAndNdc(distributorId, ndcCode, pharmacyId, type);

    // If format=graph is requested, return graph format
    if (format === 'graph') {
      const graphData = transformToGraphFormat(results);
      return res.status(200).json({
        status: 'success',
        message: 'Return reports retrieved successfully in graph format',
        data: graphData,
      });
    }

    // Default format (original format)
    res.status(200).json({
      status: 'success',
      message: 'Return reports retrieved successfully',
      data: results,
      totalMatches: results.reduce((sum, group) => sum + group.count, 0),
    });
  }
);

