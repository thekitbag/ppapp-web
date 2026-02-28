import { api } from './client'
import type { ReportSummary } from '../types'

export interface ReportSummaryParams {
  start_date: string
  end_date: string
}

export async function getReportSummary(params: ReportSummaryParams): Promise<ReportSummary> {
  const { data } = await api.get('/reports/summary', { params })
  return data as ReportSummary
}
