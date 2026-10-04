import { api } from './client'
import type { ReportSummary, ReportBreakdown, ReportTrends, TrendGranularity } from '../types'

export interface ReportSummaryParams {
  start_date: string
  end_date: string
}

export async function getReportSummary(params: ReportSummaryParams): Promise<ReportSummary> {
  const { data } = await api.get('/reports/summary', { params })
  return data as ReportSummary
}

export interface ReportBreakdownParams {
  start_date: string
  end_date: string
  parent_goal_id?: string
}

export async function getReportBreakdown(params: ReportBreakdownParams): Promise<ReportBreakdown> {
  const { data } = await api.get('/reports/breakdown', { params })
  return data as ReportBreakdown
}

export interface ReportTrendsParams {
  start_date: string
  end_date: string
  granularity: TrendGranularity
  parent_goal_id?: string
}

export async function getReportTrends(params: ReportTrendsParams): Promise<ReportTrends> {
  const { data } = await api.get('/reports/trends', { params })
  return data as ReportTrends
}
