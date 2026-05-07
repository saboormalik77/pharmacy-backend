export const documentsSchemas = {
  UploadedDocument: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      pharmacy_id: {
        type: 'string',
        format: 'uuid',
      },
      file_name: {
        type: 'string',
        example: 'credit_report_2024_01_15.pdf',
      },
      file_size: {
        type: 'integer',
        example: 1024000,
      },
      file_type: {
        type: 'string',
        example: 'application/pdf',
        nullable: true,
      },
      file_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
      },
      reverse_distributor_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
      },
      source: {
        type: 'string',
        enum: ['manual_upload', 'email_forward', 'portal_fetch', 'api'],
        example: 'manual_upload',
      },
      status: {
        type: 'string',
        enum: ['uploading', 'processing', 'completed', 'failed', 'needs_review'],
        example: 'completed',
      },
      uploaded_at: {
        type: 'string',
        format: 'date-time',
      },
      processed_at: {
        type: 'string',
        format: 'date-time',
        nullable: true,
      },
      error_message: {
        type: 'string',
        nullable: true,
      },
      extracted_items: {
        type: 'integer',
        example: 25,
      },
      total_credit_amount: {
        type: 'number',
        example: 1250.75,
        nullable: true,
      },
      processing_progress: {
        type: 'integer',
        example: 100,
        nullable: true,
      },
    },
  },
  DocumentsListResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/UploadedDocument',
        },
      },
      total: {
        type: 'integer',
        example: 50,
      },
    },
  },
};

