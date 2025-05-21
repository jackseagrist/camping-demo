import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [debugMessages, setDebugMessages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const addDebugMessage = (message: string) => {
    console.log(`AUTH CALLBACK: ${message}`);
    setDebugMessages(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  useEffect(() => {
    const handleAuthCallback = async () => {
      addDebugMessage('Auth callback starting')
      const { redirect } = router.query
      
      addDebugMessage(`Redirect URL: ${redirect || '/dashboard'}`)

      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          addDebugMessage(`Auth error: ${error.message}`)
          setError(error.message)
          return
        }

        if (!session) {
          addDebugMessage('No session found')
          setError('No session found')
          return
        }

        addDebugMessage(`Session found, user: ${session.user.email}`)
        addDebugMessage(`Redirecting to: ${redirect || '/dashboard'}`)
        
        // Use direct navigation
        window.location.href = (redirect as string) || '/dashboard'
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        addDebugMessage(`Exception: ${errorMessage}`)
        setError(errorMessage)
      }
    }

    if (router.isReady) {
      handleAuthCallback()
    }
  }, [router, router.isReady, supabase])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] p-4">
      <h1 className="text-[#10B981] text-xl font-semibold mb-4">Setting up your session...</h1>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 max-w-lg w-full">
          <h2 className="font-bold">Error</h2>
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-gray-50 p-4 rounded-lg max-w-lg w-full text-sm font-mono">
        <h2 className="font-bold mb-2 text-gray-700">Debug Log</h2>
        {debugMessages.map((msg, i) => (
          <div key={i} className="py-1 text-gray-600">{msg}</div>
        ))}
        {debugMessages.length === 0 && <div className="text-gray-400">Waiting...</div>}
      </div>
    </div>
  )
} 