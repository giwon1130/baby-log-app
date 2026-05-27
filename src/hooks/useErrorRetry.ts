import { useCallback, useState } from 'react'

/**
 * 화면 저장/삭제/수정 흐름에서 흔히 쓰는 에러 + 재시도 패턴.
 *
 *   const { error, retry, showError, dismissError } = useErrorRetry()
 *
 *   try { ... } catch (e) {
 *     showError(extractErrorMessage(e, 'X 실패'), () => doX())  // 재시도 가능
 *   }
 *
 *   <ErrorBanner message={error} onDismiss={dismissError} onRetry={retry ?? undefined} />
 *
 * 4개 화면(Feed/Diaper/Sleep/Growth)이 같은 헬퍼를 복붙해 두었던 패턴을 통합.
 */
export function useErrorRetry() {
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState<(() => void) | null>(null)

  const showError = useCallback((msg: string, onRetry?: () => void) => {
    setError(msg)
    setRetry(() => onRetry ?? null)
  }, [])

  const dismissError = useCallback(() => {
    setError(null)
    setRetry(null)
  }, [])

  return { error, retry, showError, dismissError }
}
