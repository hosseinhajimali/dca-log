import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Asset, ApiResponse } from '@/types';

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Asset[]>>('/assets');
      return res.data.data;
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { symbol: string; name: string; assetType: string; coingeckoId?: string; color?: string; athOverride?: number }) => {
      const res = await api.post<ApiResponse<Asset>>('/assets', data);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; color?: string | null; coingeckoId?: string; athOverride?: number | null } }) => {
      const res = await api.patch<ApiResponse<Asset>>(`/assets/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/assets/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
