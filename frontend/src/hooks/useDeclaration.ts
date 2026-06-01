import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyDeclaration, createDeclaration, submitDeclaration } from '../api/declarations'

const FISCAL_YEAR = 2026

export const useDeclaration = () => {
  const queryClient = useQueryClient()

  const {
    data: declaration,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['declaration', 'me', FISCAL_YEAR],
    queryFn: () => getMyDeclaration(FISCAL_YEAR),
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: () => createDeclaration(FISCAL_YEAR),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declaration', 'me', FISCAL_YEAR] })
    },
  })

  const submitMutation = useMutation({
    mutationFn: (id: number) => submitDeclaration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declaration', 'me', FISCAL_YEAR] })
    },
  })

  return {
    declaration,
    isLoading,
    error,
    createDeclaration: createMutation.mutateAsync,
    submitDeclaration: submitMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isSubmitting: submitMutation.isPending,
    FISCAL_YEAR,
  }
}
