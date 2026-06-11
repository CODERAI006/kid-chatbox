import { apiClient } from '@/services/api';

export interface CompetitiveTopicsResponse {
  success: boolean;
  trackId: string;
  topics: string[];
  updatedAt?: string | null;
  source?: 'ai' | 'defaults';
}

export const competitiveTopicsApi = {
  getSaved: async (trackId: string): Promise<CompetitiveTopicsResponse> => {
    const { data } = await apiClient.get<CompetitiveTopicsResponse>(
      `/competitive-topics/${encodeURIComponent(trackId)}`
    );
    return data;
  },

  save: async (trackId: string, topics: string[]): Promise<CompetitiveTopicsResponse> => {
    const { data } = await apiClient.put<CompetitiveTopicsResponse>(
      `/competitive-topics/${encodeURIComponent(trackId)}`,
      { topics }
    );
    return data;
  },

  generate: async (
    trackId: string,
    gradeLevel?: string
  ): Promise<CompetitiveTopicsResponse> => {
    const { data } = await apiClient.post<CompetitiveTopicsResponse>(
      `/competitive-topics/${encodeURIComponent(trackId)}/generate`,
      { gradeLevel: gradeLevel || undefined }
    );
    return data;
  },
};
