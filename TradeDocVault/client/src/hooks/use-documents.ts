import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { 
  Document, 
  DocumentFlag, 
  ShippingBillData, 
  InvoiceData, 
  LogisticsData, 
  FiraFircData 
} from "@/lib/types";

export function useDocuments(customerId: number) {
  return useQuery<Document[]>({
    queryKey: [`/api/customers/${customerId}/documents`],
    enabled: !!customerId,
  });
}

export function useDocumentFlags(customerId: number) {
  return useQuery<DocumentFlag[]>({
    queryKey: [`/api/customers/${customerId}/document-flags`],
    enabled: !!customerId,
  });
}

export function useShippingBillData(customerId: number) {
  return useQuery<ShippingBillData[]>({
    queryKey: [`/api/customers/${customerId}/shipping-bills`],
    enabled: !!customerId,
  });
}

export function useInvoiceData(customerId: number) {
  return useQuery<InvoiceData[]>({
    queryKey: [`/api/customers/${customerId}/invoices`],
    enabled: !!customerId,
  });
}

export function useLogisticsData(customerId: number) {
  return useQuery<LogisticsData[]>({
    queryKey: [`/api/customers/${customerId}/logistics`],
    enabled: !!customerId,
  });
}

export function useTransactionData(customerId: number) {
  return useQuery<FiraFircData[]>({
    queryKey: [`/api/customers/${customerId}/transactions`],
    enabled: !!customerId,
  });
}

export function useUploadDocuments(customerId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/customers/${customerId}/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "document-flags"] });
    },
  });
}

export function useResolveDocumentFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (flagId: string) => {
      const response = await apiRequest("PATCH", `/api/document-flags/${flagId}/resolve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
  });
}
