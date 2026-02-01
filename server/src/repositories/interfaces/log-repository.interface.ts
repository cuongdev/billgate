export interface WebhookLogEntry {
    id?: number | string;
    configId?: number;
    configName: string;
    transactionId: string;
    status: string;
    statusCode: number;
    requestPayload: string; // JSON string
    responseBody: string; // JSON string or text
    createdAt?: number | string; // Timestamp
}

export interface ILogRepository {
    save(entry: WebhookLogEntry): Promise<void>;
    find(query: {
        limit?: number;
        offset?: number;
        configId?: number;
        transactionId?: string;
        status?: string;
    }): Promise<WebhookLogEntry[]>;
    getStats(startDate?: number): Promise<{ 
        total: number; 
        success: number; 
        failed: number;
        errorBreakdown: { type: string; count: number }[]; 
    }>;
}
