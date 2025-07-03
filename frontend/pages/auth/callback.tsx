import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Head from 'next/head'
import posthog from '../../posthog'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (!session) {
          throw new Error('No session')
        }

        // Identify user with PostHog after successful OAuth login
        posthog.identify(session.user.id, {
          email: session.user.email,
          signup_method: session.user.user_metadata?.provider ?? 'email',
          invitation: session.user.user_metadata?.invitation ?? false,
        })
        
        posthog.capture('user_login', {
          login_method: session.user.user_metadata?.provider || 'oauth'
        })

        // Always redirect to dashboard after successful authentication
        router.replace('/dashboard')
      } catch (error) {
        router.replace('/login')
      }
    }

    handleAuthCallback()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
      <Head>
        <title>Logging you in – BaseLodge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="flex flex-col items-center space-y-4 animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10B981" className="w-10 h-10 sm:w-12 sm:h-12">
          <path d="M12 2c-1.7 0-3 1.2-3 2.7v4.5c0 .4.1.7.3 1.1.3.5.7.9 1.2 1.2.2.1.3.2.5.2V22h2v-10.3c.2 0 .3-.1.5-.2.5-.3.9-.7 1.2-1.2.2-.3.3-.7.3-1.1V4.7C15 3.2 13.7 2 12 2zm0 2c.6 0 1 .4 1 .7v4.5c0 .1 0 .2-.1.3-.1.2-.2.3-.4.4-.3.2-.7.2-1 0-.2-.1-.3-.2-.4-.4-.1-.1-.1-.2-.1-.3V4.7c0-.3.4-.7 1-.7z"/>
        </svg>
        <h1 className="text-lg sm:text-xl font-semibold text-[#10B981]">Get your mallows ready...</h1>
      </div>
    </div>
  )
} 