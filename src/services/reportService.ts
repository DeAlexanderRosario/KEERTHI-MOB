/**
 * Server Report & Analytics Service
 * Executes official ERPNext server reports (General Ledger, Trial Balance, P&L, etc.)
 */

import { httpClient } from './httpClient';
import type { ReportResult } from './types';

export interface ReportRunParams {
  report_name: string;
  filters?: Record<string, any>;
  user?: string;
}

class ReportService {
  /**
   * Runs an authorized server-side ERPNext report
   */
  public async runReport(
    reportName: string,
    filters: Record<string, any> = {}
  ): Promise<ReportResult> {
    const payload: ReportRunParams = {
      report_name: reportName,
      filters,
    };

    return httpClient<ReportResult>('/api/erp/reports/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Retrieves General Ledger entries from ERPNext
   */
  public async getGeneralLedger(filters: {
    company?: string;
    from_date?: string;
    to_date?: string;
    account?: string;
    voucher_no?: string;
  }): Promise<ReportResult> {
    return this.runReport('General Ledger', filters);
  }

  /**
   * Retrieves Accounts Receivable summary
   */
  public async getAccountsReceivable(filters: {
    company?: string;
    report_date?: string;
    customer?: string;
  }): Promise<ReportResult> {
    return this.runReport('Accounts Receivable', filters);
  }

  /**
   * Retrieves Accounts Payable summary
   */
  public async getAccountsPayable(filters: {
    company?: string;
    report_date?: string;
    supplier?: string;
  }): Promise<ReportResult> {
    return this.runReport('Accounts Payable', filters);
  }

  /**
   * Retrieves Trial Balance statement
   */
  public async getTrialBalance(filters: {
    company?: string;
    fiscal_year?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<ReportResult> {
    return this.runReport('Trial Balance', filters);
  }

  /**
   * Retrieves Profit and Loss statement
   */
  public async getProfitAndLoss(filters: {
    company?: string;
    fiscal_year?: string;
    periodicity?: 'Monthly' | 'Quarterly' | 'Yearly';
  }): Promise<ReportResult> {
    return this.runReport('Profit and Loss Statement', filters);
  }

  /**
   * Retrieves Balance Sheet statement
   */
  public async getBalanceSheet(filters: {
    company?: string;
    fiscal_year?: string;
    periodicity?: 'Monthly' | 'Quarterly' | 'Yearly';
  }): Promise<ReportResult> {
    return this.runReport('Balance Sheet', filters);
  }

  /**
   * Retrieves Stock Balance report
   */
  public async getStockBalance(filters: {
    company?: string;
    warehouse?: string;
    item_code?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<ReportResult> {
    return this.runReport('Stock Balance', filters);
  }
}

export const reportService = new ReportService();
